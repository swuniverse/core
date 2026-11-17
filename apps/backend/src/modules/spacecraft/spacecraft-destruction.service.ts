import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { SpacecraftSelfDestructResultDto } from '@swuniverse/shared';
import { WsEventType } from '@swuniverse/shared';
import { DataSource, EntityManager } from 'typeorm';
import { ColonyFabricationQueueType } from '../colony/entities/colony-fabrication-queue.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import {
  MessagingService,
  type TransactionalNotifications,
} from '../messaging/messaging.service';
import { GameGateway } from '../websocket/game.gateway';
import { ShipDistressSignal } from './entities/ship-distress-signal.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { SpacecraftTorpedoStorage } from './entities/spacecraft-torpedo-storage.entity';
import { SpacecraftWreck } from './entities/spacecraft-wreck.entity';
import {
  Spacecraft,
  SpacecraftKind,
  SpacecraftStatus,
} from './entities/spacecraft.entity';
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
import { EscapePodService } from './escape-pod.service';
import { EscapePodLaunchReason } from './entities/escape-pod.entity';
import { SpacecraftTakeoverService } from './spacecraft-takeover.service';
import { SpacecraftTrackerService } from './spacecraft-tracker.service';
import { PlayerTradePostService } from '../trade/player-trade-post.service';
import {
  applyMovementState,
  assertMovementState,
  type MovementState,
} from './movement-state';
import { leaveFleetOnDestruction } from './fleet-leadership';
import { ORBIT_ORDER_LIFECYCLE, type OrbitOrderLifecyclePort } from './orbit-order-lifecycle.port';

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
    private readonly escapePods: EscapePodService = {
      launchForShip: async () => null,
    } as unknown as EscapePodService,
    private readonly takeoverService: SpacecraftTakeoverService = {
      cancelForShip: async () => false,
    } as unknown as SpacecraftTakeoverService,
    private readonly trackerService: SpacecraftTrackerService = {
      clearTrackingTarget: async () => undefined,
    } as unknown as SpacecraftTrackerService,
    @Optional() private readonly playerTradePosts?: PlayerTradePostService,
    @Optional()
    @Inject(ORBIT_ORDER_LIFECYCLE)
    private readonly orbitOrders?: OrbitOrderLifecyclePort,
  ) {}

  async selfDestruct(
    shipId: number,
    userId: number,
  ): Promise<SpacecraftSelfDestructResultDto> {
    let evacuatedCrew = 0;
    let afterCommit: () => Promise<void> = async () => undefined;
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
      const finalized = await this.finalizeInManager(manager, ship, 'SELF_DESTRUCT');
      evacuatedCrew = finalized.evacuatedCrew;
      afterCommit = finalized.notifyAfterCommit;
      return {
        spacecraftId: ship.id,
        status: 'DESTROYED' as const,
        alreadyDestroyed: false,
      };
    });
    await afterCommit();

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
        `Schiff #${shipId} wurde durch Selbstzerstörung vernichtet.${this.evacuationNote(evacuatedCrew)}`,
      );
    }
    return result;
  }

  async saveUnlessDestroyed(
    ship: Spacecraft,
    original?: MovementState,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const persisted = await manager.findOne(Spacecraft, {
        where: { id: ship.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!persisted || persisted.status === SpacecraftStatus.DESTROYED) {
        return false;
      }
      // A surviving combat participant must retain its ongoing scrapping lifecycle.
      if (persisted.status === SpacecraftStatus.UNDER_SCRAPPING) {
        ship.status = SpacecraftStatus.UNDER_SCRAPPING;
        ship.runtimeSystems = {};
      }
      if (original) {
        if (original.modules) {
          persisted.modules = await manager.find(SpacecraftModule, {
            where: { spacecraftId: ship.id },
            order: { id: 'ASC' },
            lock: { mode: 'pessimistic_write', onLocked: 'nowait' },
          });
        }
        assertMovementState(persisted, original);
        applyMovementState(persisted, ship);
      }
      await manager.save(original ? persisted : ship);
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
    let afterCommit: () => Promise<void> = async () => undefined;
    const result = await this.dataSource.transaction(async (manager) => {
      const ship = await manager.findOne(Spacecraft, {
        where: { id: shipId },
        relations: ['shipClass'],
        // Lock the ship row only; Postgres refuses FOR UPDATE on the outer join.
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      if (!ship || ship.status === SpacecraftStatus.DESTROYED) return null;
      const destroyer =
        destroyerUserId == null
          ? null
          : await manager.findOne(User, { where: { id: destroyerUserId } });
      const { evacuatedCrew, notifyAfterCommit } = await this.finalizeInManager(
        manager,
        ship,
        'COMBAT',
      );
      afterCommit = notifyAfterCommit;
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
      return {
        ownerId: ship.userId,
        ship,
        destroyerName: destroyer?.username,
        evacuatedCrew,
      };
    });
    await afterCommit();
    if (result) {
      await this.gameEvents.recordSpacecraft(
        GameEventType.SHIP,
        `${result.destroyerName ?? 'Unbekannt'} zerstörte ${result.ship.name} (${result.ship.shipClass.name}).`,
        result.ship,
      );
      if (!result.ship.rpgHidden) this.emitDestroyed(result.ownerId, shipId, 'Im Kampf zerstört');
      await this.messagingService.sendSystem(
        result.ownerId,
        'Schiff zerstört',
        `Schiff #${shipId} wurde im Kampf zerstört.${this.evacuationNote(result.evacuatedCrew)}`,
      );
    }
  }

  /**
   * Destroys a spacecraft inside the caller's transaction, e.g. through an
   * anomaly or field damage. Notifications follow the commit when a
   * transaction is given; `detail` replaces the default destruction notice.
   */
  async destroyInManager(
    manager: EntityManager,
    shipId: number,
    reason: 'ANOMALY' | 'FIELD_DAMAGE',
    transaction?: TransactionalNotifications,
    detail?: string,
  ): Promise<{ evacuatedCrew: number } | null> {
    const ship = await manager.findOne(Spacecraft, {
      where: { id: shipId },
      relations: ['shipClass'],
      // Lock the ship row only; Postgres refuses FOR UPDATE on the outer join.
      lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
    });
    if (!ship || ship.status === SpacecraftStatus.DESTROYED) return null;
    const ownerId = ship.userId;
    const { notifyAfterCommit, ...result } = await this.finalizeInManager(manager, ship, reason);
    const notify = () => {
      if (ship.rpgHidden) {
        void notifyAfterCommit();
        return;
      }
      this.emitDestroyed(
        ownerId,
        shipId,
        detail ?? (reason === 'FIELD_DAMAGE' ? 'Durch Feldschaden zerstört' : 'Durch eine Anomalie zerstört'),
      );
      void notifyAfterCommit();
    };
    if (transaction) transaction.afterCommit.push(notify);
    else notify();
    return result;
  }

  private evacuationNote(evacuatedCrew: number): string {
    return evacuatedCrew > 0
      ? ` ${evacuatedCrew} Crewmitglieder konnten sich in Rettungskapseln retten.`
      : '';
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
    reason: 'COMBAT' | 'SELF_DESTRUCT' | 'ANOMALY' | 'FIELD_DAMAGE',
  ): Promise<{ evacuatedCrew: number; notifyAfterCommit: () => Promise<void> }> {
    await this.takeoverService.cancelForShip(
      ship.id,
      'ein beteiligtes Schiff wurde zerstört',
    );
    const orbitOrderNotify = await leaveFleetOnDestruction(
      manager,
      ship,
      this.orbitOrders?.lifecycle,
    );
    await this.trackerService.clearTrackingTarget(manager, ship.id);
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
    // STU `TradepostDestruction`: part of the post's stock joins the wreck.
    // Its messages are stored here; their live notice is skipped like on deletion.
    const salvage =
      ship.kind === SpacecraftKind.STATION && this.playerTradePosts
        ? await this.playerTradePosts.destroyForStation(manager, ship, {
            manager,
            afterCommit: [],
          })
        : [];
    const wreckCargo = new Map<number, number>();
    for (const item of [...cargo, ...salvage]) {
      wreckCargo.set(
        item.commodityId,
        (wreckCargo.get(item.commodityId) ?? 0) + item.amount,
      );
    }
    // Crew moves into a pod, so the wreck must not count it a second time.
    const evacuation = await this.escapePods.launchForShip(
      manager,
      ship,
      reason === 'COMBAT'
        ? EscapePodLaunchReason.COMBAT_DESTRUCTION
        : reason === 'ANOMALY'
          ? EscapePodLaunchReason.ANOMALY_DESTRUCTION
          : reason === 'FIELD_DAMAGE'
            ? EscapePodLaunchReason.FIELD_DAMAGE_DESTRUCTION
            : EscapePodLaunchReason.SELF_DESTRUCTION,
    );
    await manager.save(
      manager.create(SpacecraftWreck, {
        formerShipClassId: ship.shipClassId,
        locationId: ship.locationId,
        location,
        hull: Math.ceil(ship.hullMax / 20),
        crewCount: 0,
        cargo: [...wreckCargo].map(([commodityId, amount]) => ({
          commodityId,
          amount,
        })),
        modules,
        torpedoes: torpedoes.map((item) => ({
          torpedoTypeId: item.torpedoTypeId,
          commodityId: item.commodityId,
          amount: item.amount,
        })),
      }),
    );
    const puller = await manager.findOne(Spacecraft, {
      where: { tractoredShipId: ship.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (puller) {
      puller.tractoredShipId = null;
      puller.tractoredShip = null;
      const pullerSystems = this.runtimeState.initialize(puller);
      if (pullerSystems.TRACTOR_BEAM) pullerSystems.TRACTOR_BEAM.active = false;
      puller.runtimeSystems = pullerSystems;
      await manager.save(puller);
    }
    ship.tractoredShipId = null;
    ship.tractoredShip = null;
    ship.hull = 0;
    ship.status = SpacecraftStatus.DESTROYED;
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
    return {
      evacuatedCrew: evacuation?.crewCount ?? 0,
      notifyAfterCommit: orbitOrderNotify,
    };
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
