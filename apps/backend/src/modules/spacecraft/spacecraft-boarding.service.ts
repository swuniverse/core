import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  isVacationEffective,
  type SpacecraftBoardingResultDto,
} from '@swuniverse/shared';
import { Crew } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import { PrestigeService } from '../prestige/prestige.service';
import { STU_PRESTIGE } from '../prestige/prestige.constants';
import { resolveBoardingCombat, type BoardingRandom } from './boarding-combat';
import { CrewEnhancementService } from './crew-enhancement.service';
import { CrewEnhancementEvent } from './crew-expertise';
import { Spacecraft, SpacecraftKind, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { buildNearbyInteractionContext, decideNearbyInteraction } from './nearby-interaction';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';

export const TROOP_QUARTERS_MODULE_TYPE = 'Truppenquartiere';

@Injectable()
export class SpacecraftBoardingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly runtimeState: SpacecraftRuntimeStateService,
    private readonly prestige: PrestigeService,
    private readonly crewEnhancement: CrewEnhancementService,
    private readonly messaging: MessagingService,
    private readonly random: BoardingRandom = {
      integer: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    },
  ) {}

  async board(
    attackerId: number,
    targetId: number,
    userId: number,
  ): Promise<SpacecraftBoardingResultDto> {
    const result = await this.dataSource.transaction((manager) =>
      this.boardInTransaction(manager, attackerId, targetId, userId),
    );
    await Promise.all([
      this.messaging.sendSystem(
        result.attackerUserId,
        'Enterversuch',
        result.message,
        undefined,
        MessageFolder.SHIP,
      ),
      this.messaging.sendSystem(
        result.targetUserId,
        'Enterversuch',
        result.message,
        undefined,
        MessageFolder.SHIP,
      ),
    ]);
    return result;
  }

  private async boardInTransaction(
    manager: EntityManager,
    attackerId: number,
    targetId: number,
    userId: number,
  ): Promise<SpacecraftBoardingResultDto & { attackerUserId: number; targetUserId: number }> {
    if (attackerId === targetId) throw new BadRequestException('Ungültiges Ziel');
    const ids = [attackerId, targetId].sort((a, b) => a - b);
    const locked = await manager.find(Spacecraft, {
      where: { id: In(ids) },
      relations: {
        user: true,
        modules: true,
        location: { galaxyField: true, systemField: true },
      },
      lock: { mode: 'pessimistic_write' },
    });
    const attacker = locked.find((ship) => ship.id === attackerId);
    const target = locked.find((ship) => ship.id === targetId);
    if (!attacker || attacker.userId !== userId || !target) {
      throw new BadRequestException('Schiff nicht gefunden');
    }
    if (target.userId === userId) {
      throw new BadRequestException('Eigene Schiffe können nicht geentert werden');
    }
    if (target.kind !== SpacecraftKind.SHIP) {
      throw new BadRequestException('Nur Schiffe können geentert werden');
    }
    if (target.user?.isNpc) {
      throw new BadRequestException('NPC-Schiffe können nicht geentert werden');
    }

    const context = buildNearbyInteractionContext(
      attacker,
      this.runtimeState.initialize(attacker),
      target,
      this.runtimeState.initialize(target),
      target.user != null && isVacationEffective(target.user),
    );
    context.sourceHasSufficientCrew = attacker.crew > 0;
    context.sourceDestroyed = attacker.status === SpacecraftStatus.DESTROYED;
    context.targetDestroyed = target.status === SpacecraftStatus.DESTROYED;
    const decision = decideNearbyInteraction('BOARDING', context);
    if (!decision.allowed) {
      throw new BadRequestException(decision.reason ?? 'Entern nicht möglich');
    }
    if (!hasTroopQuarters(attacker.modules ?? [])) {
      throw new BadRequestException('Keine einsatzfähigen Truppenquartiere vorhanden');
    }

    const assignments = await manager.find(CrewAssignment, {
      where: { spacecraftId: In(ids) },
      relations: { crew: true },
      order: { crewId: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
    const attackerCrew = assignments.filter((entry) => entry.spacecraftId === attacker.id);
    const defenderCrew = assignments.filter((entry) => entry.spacecraftId === target.id);
    if (attackerCrew.length === 0) {
      throw new BadRequestException('Aktion nicht möglich, keine Crew vorhanden!');
    }
    if (defenderCrew.length === 0) {
      throw new BadRequestException('Das Ziel hat keine Crew');
    }

    const prestigeCost = Math.ceil(
      (STU_PRESTIGE.BOARDING_BASE_LOSS +
        (target.modules ?? []).reduce(
          (sum, module) => sum + module.level * STU_PRESTIGE.BOARDING_MODULE_LEVEL_LOSS,
          0,
        )) /
        25,
    );
    if ((attacker.user?.prestige ?? 0) < prestigeCost) {
      throw new BadRequestException(`Nicht genügend Prestige vorhanden, benötigt wird: ${prestigeCost}`);
    }

    const combat = resolveBoardingCombat(
      attackerCrew.map((entry) => ({ id: entry.crewId, type: entry.crew.type })),
      defenderCrew.map((entry) => ({ id: entry.crewId, type: entry.crew.type })),
      this.random,
    );
    const casualtyIds = [...combat.attackerLossIds, ...combat.defenderLossIds];
    if (casualtyIds.length > 0) await manager.delete(Crew, { id: In(casualtyIds) });
    attacker.crew = attackerCrew.length - combat.attackerLossIds.length;
    target.crew = defenderCrew.length - combat.defenderLossIds.length;
    await manager.save([attacker, target]);
    await this.prestige.change(
      userId,
      -prestigeCost,
      `-${prestigeCost} Prestige für einen Enterversuch auf die ${target.name}`,
      manager,
    );
    if (combat.winner === 'ATTACKER' && target.crew === 0) {
      await this.crewEnhancement.enhanceSpacecraft(
        attacker.id,
        CrewEnhancementEvent.SPACECRAFT_TAKEOVER,
        manager,
      );
    }

    const message =
      combat.winner === 'DEFENDER'
        ? 'Der Enterversuch ist gescheitert.'
        : target.crew === 0
          ? `Die Crew der ${target.name} wurde getötet.`
          : `Es leben noch ${target.crew} Crewmitglieder auf der ${target.name}.`;
    return {
      attackerId,
      targetId,
      attackerUserId: attacker.userId,
      targetUserId: target.userId,
      outcome: combat.winner === 'ATTACKER' ? 'ATTACKER_VICTORY' : 'DEFENDER_VICTORY',
      attackerCrewBefore: attackerCrew.length,
      attackerCrewLost: combat.attackerLossIds.length,
      attackerCrewAfter: attacker.crew,
      defenderCrewBefore: defenderCrew.length,
      defenderCrewLost: combat.defenderLossIds.length,
      defenderCrewAfter: target.crew,
      prestigeCost,
      message,
    };
  }
}

export function hasTroopQuarters(modules: SpacecraftModule[]): boolean {
  return modules.some(
    (module) =>
      module.moduleType === TROOP_QUARTERS_MODULE_TYPE &&
      module.integrity > 0 &&
      module.isActive,
  );
}
