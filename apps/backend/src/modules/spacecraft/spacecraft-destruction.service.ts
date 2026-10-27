import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SpacecraftSelfDestructResultDto } from '@swuniverse/shared';
import { WsEventType } from '@swuniverse/shared';
import { DataSource, EntityManager } from 'typeorm';
import { ColonyFabricationQueueType } from '../colony/entities/colony-fabrication-queue.entity';
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
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { resolveSpacecraftLocation } from './spacecraft-field';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { PrestigeService } from '../prestige/prestige.service';
import { GameDataService } from '../game-data/game-data.service';
import { User } from '../auth/user.entity';
import { CrewEnhancementService } from './crew-enhancement.service';
import { CrewEnhancementEvent } from './crew-expertise';

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
    private readonly prestige: PrestigeService,
    private readonly gameData: GameDataService,
    private readonly crewEnhancement: CrewEnhancementService = {
      enhanceSpacecraft: async () => undefined,
    } as unknown as CrewEnhancementService,
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
      if (ship.crewRequired > 0 && assignments.length === 0) {
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
      if (ship) {
        const location = await this.loadLocation(ship);
        const coordinates = resolveSpacecraftLocation({
          locationId: ship.locationId,
          location,
        });
        await this.gameEvents.recordSpacecraft(
          GameEventType.SHIP,
          `${ship.name} hat sich in Sektor ${coordinates?.x ?? '?'}|${coordinates?.y ?? '?'} selbst zerstört.`,
          ship,
        );
      }
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

  async destroyFromCombat(
    shipId: number,
    destroyerUserId?: number,
  ): Promise<void> {
    const result = await this.dataSource.transaction(async (manager) => {
      const ship = await manager.findOne(Spacecraft, {
        where: { id: shipId },
        relations: ['shipClass'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!ship || ship.status === SpacecraftStatus.DESTROYED) return null;
      const destroyer =
        destroyerUserId == null
          ? null
          : await manager.findOne(User, { where: { id: destroyerUserId } });
      await this.finalizeInManager(manager, ship, 'COMBAT');
      if (destroyerUserId != null) {
        const destroyerShip = await manager.findOne(Spacecraft, {
          where: { userId: destroyerUserId },
          order: { id: 'ASC' },
        });
        if (destroyerShip) {
          await this.crewEnhancement.enhanceSpacecraft(
            destroyerShip.id,
            CrewEnhancementEvent.SPACECRAFT_DESTRUCTION,
            manager,
          );
        }
      }
      if (destroyerUserId != null && ship.shipClass.prestige !== 0) {
        await this.prestige.change(
          destroyerUserId,
          ship.shipClass.prestige,
          `${ship.shipClass.prestige} Prestige erhalten für die Zerstörung von: ${ship.shipClass.name}`,
          manager,
        );
      }
      return { ownerId: ship.userId, ship, destroyerName: destroyer?.username };
    });
    if (result) {
      await this.gameEvents.recordSpacecraft(
        GameEventType.SHIP,
        `${result.destroyerName ?? 'Unbekannt'} zerstörte ${result.ship.name} (${result.ship.shipClass.name}).`,
        result.ship,
      );
      this.emitDestroyed(result.ownerId, shipId, 'Im Kampf zerstört');
      await this.messagingService.sendSystem(
        result.ownerId,
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
    const [cargo, torpedoes, installedModules] = await Promise.all([
      manager.find(CargoItem, { where: { spacecraftId: ship.id } }),
      manager.find(SpacecraftTorpedoStorage, {
        where: { spacecraftId: ship.id },
      }),
      manager.find(SpacecraftModule, { where: { spacecraftId: ship.id } }),
    ]);
    const intactModules = installedModules.filter(
      (module) => module.integrity > 0,
    );
    const modules = intactModules
      .map((module) => ({ module, order: Math.random() }))
      .sort((left, right) => left.order - right.order)
      .slice(0, Math.ceil(intactModules.length / 2))
      .map(({ module }) => module)
      .flatMap((module) => {
        const item = this.gameData
          .getAllFabricationItems()
          .find(
            (candidate) =>
              candidate.queueType === ColonyFabricationQueueType.MODULE &&
              candidate.moduleType === module.moduleType &&
              (candidate.shipyardType ?? module.category) === module.category &&
              (candidate.moduleLevel ?? module.level) === module.level,
          );
        return item ? [{ commodityId: item.outputCommodityId, amount: 1 }] : [];
      });
    const location = ship.location ?? (await this.loadLocation(ship, manager));
    await manager.save(
      manager.create(SpacecraftWreck, {
        formerShipClassId: ship.shipClassId,
        locationId: ship.locationId,
        location,
        hull: Math.ceil(ship.hullMax / 20),
        crewCount: ship.crew,
        cargo: cargo.map((item) => ({
          commodityId: item.commodityId,
          amount: item.amount,
        })),
        modules,
        torpedoes: torpedoes.map((item) => ({
          torpedoTypeId: item.torpedoTypeId,
          commodityId: item.commodityId,
          amount: item.amount,
        })),
      }),
    );
    ship.hull = 0;
    ship.status = SpacecraftStatus.DESTROYED;
    ship.arrivalAt = null;
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

  private async loadLocation(
    ship: Spacecraft,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<SpaceLocation> {
    const location = await manager.findOne(SpaceLocation, {
      where: { id: ship.locationId },
      relations: ['galaxyField', 'systemField'],
    });
    if (!location) throw new NotFoundException('Spacecraft location not found');
    return location;
  }
}
