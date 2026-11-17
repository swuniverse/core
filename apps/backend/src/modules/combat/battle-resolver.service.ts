import { requirePlayerSpacecraft } from '../spacecraft/rpg-visibility';
import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RpgActionLockService } from '../spacecraft/rpg-action-lock.service';
import {
  FieldEffect,
  knownFieldEffects,
  WsEventType,
} from '@swuniverse/shared';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import { SpacecraftDestructionService } from '../spacecraft/spacecraft-destruction.service';
import { GameGateway } from '../websocket/game.gateway';
import {
  COMBATS_EVENT,
  DESTROYED_SHIPS_EVENT,
} from '../statistics/statistic-events';
import { StatisticsService } from '../statistics/statistics.service';
import { CombatEngine } from './combat.engine';
import { CombatReportFormatter } from './combat-report.formatter';

/**
 * Already authoritatively determined parties of a battle. The resolver never
 * checks ownership or authorization; callers (manual attack adapter, alarm
 * reactions) decide who fights.
 */
export interface BattleResolutionInput {
  attackers: Spacecraft[];
  defenders: Spacecraft[];
  /** Ship that triggered the battle (for combat-started events). */
  initiatorShipId: number;
  /** Ship that was targeted (for combat-started events). */
  targetShipId: number;
  /** User credited with kills of defending ships. */
  attackerUserId: number;
  /** User credited with kills of attacking ships. */
  defenderUserId: number;
}

/** Context-free battle execution: engine, destruction, statistics, report. */
@Injectable()
export class BattleResolverService {
  constructor(
    @InjectRepository(SpacecraftModule)
    private readonly moduleRepo: Repository<SpacecraftModule>,
    private readonly engine: CombatEngine,
    private readonly gateway: GameGateway,
    private readonly destructionService: SpacecraftDestructionService,
    private readonly reportFormatter: CombatReportFormatter,
    private readonly statisticsService: StatisticsService,
    @Optional() private readonly actions?: RpgActionLockService,
  ) {}

  async resolve(
    input: BattleResolutionInput,
  ): Promise<ReturnType<CombatReportFormatter['formatBattle']>> {
    if (!this.actions) return this.resolveVisible(input);
    const ids = [...input.attackers, ...input.defenders].map((ship) => ship.id);
    return this.actions.runPlayer(ids, async (manager) => {
      const current = await manager.find(Spacecraft, { where: { id: In(ids) } });
      for (const id of ids)
        requirePlayerSpacecraft(current.find((ship) => ship.id === id));
      return this.resolveVisible(input);
    });
  }

  private async resolveVisible(
    input: BattleResolutionInput,
  ): Promise<ReturnType<CombatReportFormatter['formatBattle']>> {
    const { attackers, defenders } = input;
    const participants = [...attackers, ...defenders];
    for (const ship of participants) requirePlayerSpacecraft(ship);
    const modules = await this.moduleRepo.find({
      where: participants.map((ship) => ({ spacecraftId: ship.id })),
    });
    const party = (ships: Spacecraft[]) =>
      ships.map((ship) => ({
        ship,
        modules: modules.filter((module) => module.spacecraftId === ship.id),
        ...this.fieldEffectContext(ship),
      }));

    for (const ownerId of new Set(participants.map((ship) => ship.userId))) {
      this.gateway.emitToUser(ownerId, WsEventType.COMBAT_STARTED, {
        attackerId: input.initiatorShipId,
        defenderId: input.targetShipId,
      });
    }

    const result = await this.engine.resolveBattle(
      party(attackers),
      party(defenders),
    );
    const destroyedIds = new Set(result.destroyedShipIds);
    const report = this.reportFormatter.formatBattle(result, attackers, defenders);
    for (const ship of participants) {
      if (destroyedIds.has(ship.id)) {
        const destroyerUserId = attackers.some(
          (participant) => participant.id === ship.id,
        )
          ? input.defenderUserId
          : input.attackerUserId;
        await this.destructionService.destroyFromCombat(
          ship.id,
          destroyerUserId,
        );
      } else {
        ship.lastCombatReport = report;
        await this.destructionService.saveCombatSurvivor(ship);
      }
    }
    await this.moduleRepo.save(modules);
    await this.countCombat(destroyedIds.size);

    return report;
  }

  private fieldEffectContext(ship: Spacecraft): {
    fieldEffects: FieldEffect[];
    fieldTypeName?: string;
  } {
    const field =
      ship.location.kind === 'SYSTEM_FIELD'
        ? ship.location.systemField
        : ship.location.galaxyField;
    return {
      fieldEffects: knownFieldEffects([
        ...(field?.fieldType?.effects ?? []),
        ...(field && 'effects' in field ? (field.effects ?? []) : []),
      ]),
      fieldTypeName: field?.fieldType?.name,
    };
  }

  private async countCombat(destroyedShips: number): Promise<void> {
    await this.statisticsService.countEvent(COMBATS_EVENT);
    if (destroyedShips > 0) {
      await this.statisticsService.countEvent(
        DESTROYED_SHIPS_EVENT,
        destroyedShips,
      );
    }
  }
}
