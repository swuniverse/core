import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SpacecraftSelfDestructResultDto } from '@swuniverse/shared';
import { WsEventType } from '@swuniverse/shared';
import { DataSource, EntityManager } from 'typeorm';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { MessagingService } from '../messaging/messaging.service';
import { GameGateway } from '../websocket/game.gateway';
import { ShipDistressSignal } from './entities/ship-distress-signal.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { SpacecraftTorpedoStorage } from './entities/spacecraft-torpedo-storage.entity';
import { SpacecraftWreck } from './entities/spacecraft-wreck.entity';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { GameEventService } from '../events/game-event.service';
import { GameEventType } from '../events/entities/game-event.entity';

/**
 * Canonical terminal-state transition for destroyed ships.
 * Countdown, cancellation and blast damage are deliberately deferred; no schema
 * for those speculative mechanics belongs in the immediate-destruction model.
 */
@Injectable()
export class SpacecraftDestructionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly runtimeState: SpacecraftRuntimeStateService,
    private readonly gateway: GameGateway,
    private readonly messagingService: MessagingService,
    private readonly gameEvents: GameEventService,
  ) {}

  async selfDestruct(
    shipId: number,
    userId: number,
  ): Promise<SpacecraftSelfDestructResultDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const ship = await manager.findOne(Spacecraft, {
        where: { id: shipId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ship) throw new NotFoundException('Spacecraft not found');
      if (ship.status === SpacecraftStatus.DESTROYED) {
        return {
          spacecraftId: ship.id,
          status: 'DESTROYED' as const,
          alreadyDestroyed: true,
        };
      }
      const assignments = await manager.find(CrewAssignment, {
        where: { spacecraftId: ship.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (assignments.length === 0) {
        throw new BadRequestException(
          'At least one assigned crew member is required to self-destruct',
        );
      }
      await this.finalizeInManager(manager, ship, 'SELF_DESTRUCT');
      await manager.remove(assignments);
      return {
        spacecraftId: ship.id,
        status: 'DESTROYED' as const,
        alreadyDestroyed: false,
      };
    });

    if (!result.alreadyDestroyed) {
      const ship = await this.dataSource
        .getRepository(Spacecraft)
        .findOneBy({ id: shipId });
      if (ship)
        await this.gameEvents.recordSpacecraft(
          GameEventType.SPACECRAFT_DESTROYED,
          `${ship.name} hat sich in Sektor ${ship.posX}|${ship.posY} selbst zerstört.`,
          ship,
        );
      this.emitDestroyed(userId, shipId, 'Selbstzerstörung ausgeführt');
      await this.messagingService.sendSystem(
        userId,
        'Schiff zerstört',
        `Schiff #${shipId} wurde durch Selbstzerstörung vernichtet.`,
      );
    }
    return result;
  }

  async saveUnlessDestroyed(ship: Spacecraft): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const persisted = await manager.findOne(Spacecraft, {
        where: { id: ship.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!persisted || persisted.status === SpacecraftStatus.DESTROYED) {
        return false;
      }
      await manager.save(ship);
      return true;
    });
  }

  async saveCombatSurvivor(ship: Spacecraft): Promise<boolean> {
    ship.status = SpacecraftStatus.IDLE;
    return this.saveUnlessDestroyed(ship);
  }

  async destroyFromCombat(shipId: number): Promise<void> {
    const ownerId = await this.dataSource.transaction(async (manager) => {
      const ship = await manager.findOne(Spacecraft, {
        where: { id: shipId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ship || ship.status === SpacecraftStatus.DESTROYED) return null;
      await this.finalizeInManager(manager, ship, 'COMBAT');
      return ship.userId;
    });
    if (ownerId != null) {
      const ship = await this.dataSource
        .getRepository(Spacecraft)
        .findOneBy({ id: shipId });
      if (ship)
        await this.gameEvents.recordSpacecraft(
          GameEventType.SPACECRAFT_DESTROYED,
          `${ship.name} wurde im Kampf zerstört.`,
          ship,
        );
      this.emitDestroyed(ownerId, shipId, 'Im Kampf zerstört');
      await this.messagingService.sendSystem(
        ownerId,
        'Schiff zerstört',
        `Schiff #${shipId} wurde im Kampf zerstört.`,
      );
    }
  }

  private emitDestroyed(userId: number, shipId: number, detail: string): void {
    this.gateway.emitToUser(userId, WsEventType.SPACECRAFT_EVENT, {
      shipId,
      type: 'DESTROYED',
      detail,
    });
    this.gateway.emitToAll(WsEventType.DISTRESS_CHANGED, {
      type: 'DISTRESS_CHANGED',
      shipId,
    });
  }

  async finalizeInManager(
    manager: EntityManager,
    ship: Spacecraft,
    _reason: 'COMBAT' | 'SELF_DESTRUCT',
  ): Promise<void> {
    const [cargo, torpedoes] = await Promise.all([
      manager.find(CargoItem, { where: { spacecraftId: ship.id } }),
      manager.find(SpacecraftTorpedoStorage, {
        where: { spacecraftId: ship.id },
      }),
    ]);
    await manager.save(
      manager.create(SpacecraftWreck, {
        formerShipClassId: ship.shipClassId,
        currentLayerId: ship.currentLayerId,
        starSystemId: ship.starSystemId,
        inSystem: ship.inSystem,
        posX: ship.posX,
        posY: ship.posY,
        currentSystemFieldX: ship.currentSystemFieldX,
        currentSystemFieldY: ship.currentSystemFieldY,
        hull: Math.ceil(ship.hullMax / 20),
        crewCount: ship.crew,
        cargo: cargo.map((item) => ({
          commodityId: item.commodityId,
          amount: item.amount,
        })),
        torpedoes: torpedoes.map((item) => ({
          torpedoTypeId: item.torpedoTypeId,
          commodityId: item.commodityId,
          amount: item.amount,
        })),
      }),
    );
    ship.hull = 0;
    ship.status = SpacecraftStatus.DESTROYED;
    ship.targetSystemId = null;
    ship.targetX = null;
    ship.targetY = null;
    ship.arrivalAt = null;
    ship.flightOrigin = null;
    ship.fleetId = null;
    const systems = this.runtimeState.initialize(ship);
    for (const state of Object.values(systems)) {
      if (state) state.active = false;
    }
    ship.runtimeSystems = systems;
    await manager.save(ship);

    const distress = await manager.findOne(ShipDistressSignal, {
      where: { spacecraftId: ship.id, active: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (distress) {
      distress.active = false;
      distress.stoppedAt = new Date();
      await manager.save(distress);
    }
    await manager.remove(ship);
    void _reason;
  }
}
