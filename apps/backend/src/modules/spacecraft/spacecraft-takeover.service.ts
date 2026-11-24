import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { isVacationEffective, type SpacecraftTakeoverDto } from '@swuniverse/shared';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { GameEventService } from '../events/game-event.service';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService, type TransactionalNotifications } from '../messaging/messaging.service';
import { PrestigeService } from '../prestige/prestige.service';
import { CrewEnhancementService } from './crew-enhancement.service';
import { CrewEnhancementEvent } from './crew-expertise';
import { Spacecraft, SpacecraftKind, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftTakeover } from './entities/spacecraft-takeover.entity';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';

const TAKEOVER_TICKS = 10;
const BASE_PRESTIGE = 5;
const PRESTIGE_PER_MODULE_LEVEL = 3;

@Injectable()
export class SpacecraftTakeoverService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly prestige: PrestigeService,
    private readonly messaging: MessagingService,
    private readonly gameEvents: GameEventService,
    private readonly crewEnhancement: CrewEnhancementService,
    private readonly runtimeState: SpacecraftRuntimeStateService,
  ) {}

  async start(attackerId: number, targetId: number, userId: number): Promise<SpacecraftTakeoverDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      if (attackerId === targetId) throw new BadRequestException('Ungültiges Ziel');
      const ships = await manager.find(Spacecraft, {
        where: { id: In([attackerId, targetId]) },
        relations: { user: true, modules: true },
        // Postgres rejects FOR UPDATE on the nullable side of the relation joins.
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      const attacker = ships.find((ship) => ship.id === attackerId);
      const target = ships.find((ship) => ship.id === targetId);
      if (!attacker || attacker.userId !== userId) throw new NotFoundException('Spacecraft not found');
      if (!target) throw new BadRequestException('Ziel nicht gefunden');
      this.validate(attacker, target);
      const assigned = await manager.count(CrewAssignment, { where: { spacecraftId: attacker.id } });
      if (assigned < Math.max(1, attacker.crewRequired)) throw new BadRequestException('Nicht genug Crew');
      const existing = await manager.findOne(SpacecraftTakeover, {
        where: [{ attackerId }, { targetId }, { attackerId: targetId }, { targetId: attackerId }],
      });
      if (existing) throw new BadRequestException('Ein beteiligtes Schiff ist bereits in einer Übernahme');
      const prestigeCost = BASE_PRESTIGE + (target.modules ?? []).reduce((sum, module) => sum + module.level * PRESTIGE_PER_MODULE_LEVEL, 0);
      if ((attacker.user?.prestige ?? 0) < prestigeCost) throw new BadRequestException('Nicht genug Prestige');
      await this.prestige.change(userId, -prestigeCost, `Übernahme von ${target.name} gestartet`, manager);
      return manager.save(manager.create(SpacecraftTakeover, {
        attackerId, targetId, attackerUserId: userId, targetUserId: target.userId,
        ticksRemaining: TAKEOVER_TICKS, prestigeCost,
      }));
    });
    await this.notify(result, `Die Übernahme läuft über ${TAKEOVER_TICKS} Hauptticks.`);
    return this.toDto(result);
  }

  async cancel(attackerId: number, userId: number): Promise<SpacecraftTakeoverDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const takeover = await manager.findOne(SpacecraftTakeover, { where: { attackerId, attackerUserId: userId }, lock: { mode: 'pessimistic_write' } });
      if (!takeover) throw new NotFoundException('Keine laufende Übernahme');
      await this.cancelInManager(manager, takeover);
      return takeover;
    });
    await this.notify(result, 'Die Übernahme wurde abgebrochen; das eingesetzte Prestige wurde erstattet.');
    return this.toDto(result);
  }

  async cancelForShip(shipId: number, reason = 'Flug oder Zerstörung eines beteiligten Schiffs'): Promise<boolean> {
    const result = await this.dataSource.transaction(async (manager) => {
      const takeover = await manager.findOne(SpacecraftTakeover, { where: [{ attackerId: shipId }, { targetId: shipId }], lock: { mode: 'pessimistic_write' } });
      if (!takeover) return null;
      await this.cancelInManager(manager, takeover);
      return takeover;
    });
    if (!result) return false;
    await this.notify(result, `Die Übernahme wurde abgebrochen: ${reason}. Das eingesetzte Prestige wurde erstattet.`);
    return true;
  }

  async cancelForShipsInTransaction(
    shipIds: number[],
    transaction: TransactionalNotifications,
    reason = 'Flug oder Zerstörung eines beteiligten Schiffs',
  ): Promise<void> {
    const takeovers = await transaction.manager.find(SpacecraftTakeover, {
      where: [{ attackerId: In(shipIds) }, { targetId: In(shipIds) }],
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write', onLocked: 'nowait' },
    });
    for (const takeover of takeovers) {
      await this.cancelInManager(transaction.manager, takeover);
      await this.notify(takeover, `Die Übernahme wurde abgebrochen: ${reason}. Das eingesetzte Prestige wurde erstattet.`, transaction);
    }
  }

  async processTick(shipId: number): Promise<SpacecraftTakeoverDto | null> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const takeover = await manager.findOne(SpacecraftTakeover, { where: { attackerId: shipId }, lock: { mode: 'pessimistic_write' } });
      if (!takeover) return null;
      takeover.ticksRemaining -= 1;
      if (takeover.ticksRemaining > 0) { await manager.save(takeover); return { takeover, completed: false, target: null as Spacecraft | null }; }
      const target = await manager.findOne(Spacecraft, { where: { id: takeover.targetId }, relations: { location: true }, lock: { mode: 'pessimistic_write', tables: ['spacecraft'] } });
      const attacker = await manager.findOne(Spacecraft, { where: { id: takeover.attackerId }, lock: { mode: 'pessimistic_write' } });
      if (!target || !attacker) { await this.cancelInManager(manager, takeover); return { takeover, completed: false, target: null }; }
      target.userId = takeover.attackerUserId;
      target.user = attacker.user;
      target.fleetId = null;
      target.fleet = null;
      const puller = await manager.findOne(Spacecraft, { where: { tractoredShipId: target.id }, lock: { mode: 'pessimistic_write' } });
      if (puller) {
        puller.tractoredShipId = null;
        puller.tractoredShip = null;
        const systems = this.runtimeState.initialize(puller);
        if (systems.TRACTOR_BEAM) systems.TRACTOR_BEAM.active = false;
        puller.runtimeSystems = systems;
        await manager.save(puller);
      }
      target.tractoredShipId = null;
      target.tractoredShip = null;
      await manager.update(CrewAssignment, { spacecraftId: attacker.id }, { userId: takeover.attackerUserId });
      await manager.save(target);
      await this.crewEnhancement.enhanceSpacecraft(attacker.id, CrewEnhancementEvent.SPACECRAFT_TAKEOVER, manager);
      await manager.remove(takeover);
      return { takeover, completed: true, target };
    });
    if (!outcome) return null;
    if (outcome.completed && outcome.target) {
      await this.gameEvents.recordSpacecraft(`${outcome.target.name} wurde übernommen.`, outcome.target);
      await this.notify(outcome.takeover, `${outcome.target.name} wurde erfolgreich übernommen.`);
    }
    return this.toDto(outcome.takeover, outcome.completed);
  }

  private validate(attacker: Spacecraft, target: Spacecraft) {
    if (target.kind !== SpacecraftKind.SHIP || target.userId === attacker.userId) throw new BadRequestException('Nur fremde Schiffe können übernommen werden');
    if (attacker.locationId !== target.locationId) throw new BadRequestException('Ziel muss sich auf demselben Feld befinden');
    if (attacker.status !== SpacecraftStatus.IDLE || target.status !== SpacecraftStatus.IDLE) throw new BadRequestException('Beide Schiffe müssen stillstehen');
    if (target.crew > 0) throw new BadRequestException('Das Zielschiff ist bemannt');
    if (target.user?.isNpc) throw new BadRequestException('NPC-Schiffe können nicht übernommen werden');
    if (target.user && isVacationEffective(target.user)) throw new BadRequestException('Der Spieler befindet sich im Urlaubsmodus');
  }

  private async cancelInManager(manager: EntityManager, takeover: SpacecraftTakeover) {
    await this.prestige.change(takeover.attackerUserId, takeover.prestigeCost, 'Abgebrochene Schiffsübernahme erstattet', manager);
    await manager.remove(takeover);
  }

  private async notify(takeover: SpacecraftTakeover, body: string, transaction?: TransactionalNotifications) {
    await Promise.all([
      this.messaging.sendSystem(takeover.attackerUserId, body, undefined, MessageFolder.SHIP, undefined, false, transaction),
      this.messaging.sendSystem(takeover.targetUserId, body, undefined, MessageFolder.SHIP, undefined, false, transaction),
    ]);
  }

  private toDto(takeover: SpacecraftTakeover, completed = false): SpacecraftTakeoverDto {
    return { attackerId: takeover.attackerId, targetId: takeover.targetId, ticksRemaining: takeover.ticksRemaining, totalTicks: TAKEOVER_TICKS, prestigeCost: takeover.prestigeCost, completed };
  }
}
