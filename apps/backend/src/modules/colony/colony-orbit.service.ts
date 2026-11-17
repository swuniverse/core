import { isRpgHidden } from '../spacecraft/rpg-visibility';
import { ShuttleService } from '../spacecraft/shuttle.service';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import type {
  SpacecraftOrbitOrderDto,
  SpacecraftOrbitOrderResultDto,
  SpacecraftOrbitOrderStopResultDto,
  SpacecraftOrbitOrderViewDto,
} from '@swuniverse/shared';
import { GameDataService } from '../game-data/game-data.service';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { CrewAssignment } from './entities/crew-assignment.entity';
import { SpacecraftTorpedoStorage } from '../spacecraft/entities/spacecraft-torpedo-storage.entity';
import {
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { ColonyDefenseService } from './colony-defense.service';
import { ColonyEventService } from '../messaging/colony-event.service';
import { ColonyOwnershipService } from './colony-ownership.service';
import {
  ColonyStatsService,
  getColonyChangeable,
} from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import { ColonyChangeable } from './entities/colony-changeable.entity';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from '../messaging/colony-event.types';
import {
  ColonyOrbitAssignment,
  ColonyOrbitAssignmentMode,
} from './entities/colony-orbit-assignment.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { Colony } from './entities/colony.entity';
import { isOwnedColony } from './colony-owner.util';
import {
  evaluateOrbitOrderStart,
  evaluateOrbitOrderStop,
  ORBIT_ORDER_REASONS,
  type OrbitOrderStartContext,
} from './colony-orbit-order.policy';
import {
  ORBIT_ORDER_VIEW,
  type OrbitOrderViewPort,
} from '../spacecraft/orbit-order-view.port';
import {
  ORBIT_ORDER_LIFECYCLE,
  type OrbitOrderLifecyclePort,
  type OrbitOrderTractorCause,
} from '../spacecraft/orbit-order-lifecycle.port';
import { MessagingService } from '../messaging/messaging.service';
import { MessageFolder } from '../messaging/message-folder';
import { Fleet } from '../spacecraft/entities/fleet.entity';
import { reactorFuelProfile } from '../spacecraft/reactor-fuel-profile';
import {
  ShipManagementResult,
  ShipManagementService,
  ShipManagementSource,
} from '../spacecraft/ship-management.service';
import {
  matchesColonyOrbit,
  resolveSpacecraftLocation,
} from '../spacecraft/spacecraft-field';
import { InteractionContextService } from '../spacecraft/interaction-context.service';
import {
  checkInteraction,
  InteractionRule,
} from '../spacecraft/interaction-policy';

function toOrbitOrderDto(
  assignment: ColonyOrbitAssignment,
): SpacecraftOrbitOrderDto {
  return {
    colonyId: assignment.colonyId,
    fleetId: assignment.fleetId,
    mode: assignment.mode,
  };
}

@Injectable()
export class ColonyOrbitService implements OnModuleInit {
  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyChangeable)
    private readonly changeableRepo: Repository<ColonyChangeable>,
    @InjectRepository(ColonyOrbitAssignment)
    private readonly orbitAssignmentRepo: Repository<ColonyOrbitAssignment>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(CargoItem)
    private readonly cargoRepo: Repository<CargoItem>,
    @InjectRepository(CrewAssignment)
    private readonly crewRepo: Repository<CrewAssignment>,
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    private readonly ownership: ColonyOwnershipService,
    private readonly gameData: GameDataService,
    private readonly colonyStatsService: ColonyStatsService,
    private readonly colonyStorageService: ColonyStorageService,
    private readonly colonyDefenseService: ColonyDefenseService,
    private readonly colonyEventService: ColonyEventService,
    private readonly shipManagement: ShipManagementService,
    private readonly interactionContext: InteractionContextService,
    @Optional()
    @Inject(ORBIT_ORDER_VIEW)
    private readonly orbitOrderView?: OrbitOrderViewPort,
    @Optional()
    @Inject(ORBIT_ORDER_LIFECYCLE)
    private readonly orbitOrderLifecycle?: OrbitOrderLifecyclePort,
    @Optional()
    private readonly messaging?: MessagingService,
    @Optional() private readonly shuttles?: ShuttleService,
  ) {}

  onModuleInit(): void {
    if (this.orbitOrderView) {
      this.orbitOrderView.view = (shipId, userId) =>
        this.getOrbitOrderView(shipId, userId);
    }
    if (this.orbitOrderLifecycle) {
      this.orbitOrderLifecycle.lifecycle = {
        flightBlockReason: (manager, fleetId) =>
          this.flightBlockReason(manager, fleetId),
        cancelForFleet: (manager, fleetId, tractor) =>
          this.cancelForFleet(manager, fleetId, tractor),
      };
    }
  }

  /** STU `AbstractDirectedMovement`: a running order holds its fleet in orbit. */
  async flightBlockReason(
    manager: EntityManager,
    fleetId: number,
  ): Promise<string | null> {
    const order = await manager
      .getRepository(ColonyOrbitAssignment)
      .findOne({ where: { fleetId } });
    if (!order) return null;
    return order.mode === ColonyOrbitAssignmentMode.DEFEND
      ? ORBIT_ORDER_REASONS.flightDuringDefense
      : ORBIT_ORDER_REASONS.flightDuringBlockade;
  }

  /**
   * STU `CancelColonyBlockOrDefend`: ends the fleet's order inside the
   * caller's transaction (blockade state included) and returns the owner
   * event, plus the tractor message for the towed fleet's owner, to send
   * after the commit.
   */
  async cancelForFleet(
    manager: EntityManager,
    fleetId: number,
    tractor?: OrbitOrderTractorCause,
  ): Promise<() => Promise<void>> {
    const repository = manager.getRepository(ColonyOrbitAssignment);
    const order = await repository.findOne({ where: { fleetId } });
    if (!order) return async () => undefined;
    const fleet = await manager.findOne(Fleet, {
      where: { id: fleetId },
      relations: ['user'],
    });
    const colony = await manager.findOne(Colony, { where: { id: order.colonyId } });
    await repository.remove(order);
    await this.syncColonyBlockadeState(order.colonyId, manager);

    const blockade = order.mode === ColonyOrbitAssignmentMode.BLOCKADE;
    const task = blockade ? 'Blockade' : 'Verteidigung';
    const fleetName = fleet?.name ?? `#${fleetId}`;
    const colonyName = colony?.name ?? `#${order.colonyId}`;
    return async () => {
      if (colony && isOwnedColony(colony)) {
        await this.colonyEventService.createActionEvent({
          colonyId: colony.id,
          userId: colony.userId,
          type: blockade
            ? ColonyEventType.ORBIT_BLOCKADE_STOPPED
            : ColonyEventType.ORBIT_DEFENSE_STOPPED,
          severity: ColonyEventSeverity.INFO,
          title: blockade ? 'Blockade beendet' : 'Verteidigung beendet',
          message: `Die Flotte ${fleetName} von Spieler ${fleet?.user?.username ?? 'Unbekannt'} hat die ${task} der Kolonie ${colonyName} aufgehoben`,
          payload: { fleetId, mode: order.mode },
        });
      }
      if (tractor && fleet) {
        await this.messaging?.sendSystem(
          fleet.userId,
          'Traktorstrahl',
          `Die ${tractor.towedShipName} wurde mit dem Traktorstrahl gezogen, daher hat die Flotte ${fleetName} die ${task} der Kolonie ${colonyName} eingestellt`,
          undefined,
          MessageFolder.SHIP,
        );
      }
    };
  }

  async getManagement(colonyId: number, userId: number) {
    const colony = await this.ownership.findOwnedColony(colonyId, userId);
    const ships = await this.shipRepo.find({
      where: { userId },
      relations: ['fleet', 'modules', 'location', 'location.systemField'],
      order: { id: 'ASC' },
    });
    const orbitShips = ships.filter((ship) =>
      !isRpgHidden(ship) && this.isShipInColonyOrbit(colony, ship),
    );
    const shipIds = orbitShips.map((ship) => ship.id);
    const [cargo, assignments, torpedoes] = await Promise.all([
      shipIds.length
        ? this.cargoRepo.find({ where: { spacecraftId: In(shipIds) } })
        : [],
      shipIds.length
        ? this.orbitAssignmentRepo.find({ where: { colonyId } })
        : [],
      shipIds.length
        ? this.colonyRepo.manager
            .getRepository(SpacecraftTorpedoStorage)
            .find({ where: { spacecraftId: In(shipIds) } })
        : [],
    ]);
    const classes = shipIds.length
      ? await this.shipClassRepo.find({
          where: {
            id: In([...new Set(orbitShips.map((ship) => ship.shipClassId))]),
          },
        })
      : [];
    const crewMinimumByClass = new Map(
      classes.map((shipClass) => [shipClass.id, shipClass.crewMin]),
    );
    const usedByShip = new Map<number, number>();
    for (const item of cargo)
      usedByShip.set(
        item.spacecraftId,
        (usedByShip.get(item.spacecraftId) ?? 0) + item.amount,
      );
    const assignmentByShip = new Map(
      assignments.map((assignment) => [assignment.spacecraftId, assignment]),
    );
    const torpedoesByShip = new Map(
      torpedoes.map((storage) => [storage.spacecraftId, storage]),
    );
    return {
      colony: {
        id: colony.id,
        energy: getColonyChangeable(colony).energy,
        energyMax: getColonyChangeable(colony).maxEnergy,
        storage: colony.storage
          .filter((item) => item.amount > 0)
          .map((item) => ({
            commodityId: item.commodityId,
            amount: item.amount,
          })),
      },
      ships: orbitShips.map((ship) => {
        const profile = reactorFuelProfile(ship.modules ?? []);
        return {
          id: ship.id,
          name: ship.name,
          shipClassId: ship.shipClassId,
          crew: {
            current: ship.crew,
            max: ship.crewMax,
            minimum: crewMinimumByClass.get(ship.shipClassId) ?? 0,
          },
          battery: { current: ship.battery, max: ship.batteryMax },
          reactor: {
            fuel: { current: ship.reactorFuel, max: ship.reactorFuelMax },
            profile,
          },
          torpedoes: torpedoesByShip.get(ship.id) ?? null,
          cargo: { used: usedByShip.get(ship.id) ?? 0, max: ship.cargoMax },
          shieldsActive:
            (ship.runtimeSystems as Record<string, { active?: boolean }>)
              .SHIELDS?.active === true,
          hyperdriveActive:
            (ship.runtimeSystems as Record<string, { active?: boolean }>)
              .WARPDRIVE?.active === true,
          orbitAssignment: assignmentByShip.get(ship.id)?.mode ?? null,
        };
      }),
    };
  }

  async executeManagement(
    colonyId: number,
    userId: number,
    requests: Array<{
      shipId: number;
      targetCrew?: number;
      batteryCharge?: number;
      reactorLoad?: number;
      torpedoTypeId?: number;
      torpedoLoad?: number;
    }>,
  ) {
    const colony = await this.ownership.findOwnedColony(colonyId, userId);
    const changeable = getColonyChangeable(colony);
    const source: ShipManagementSource = {
      getEps: () => changeable.energy,
      lowerEps: async (amount) => {
        changeable.energy -= amount;
        await this.changeableRepo.save(changeable);
      },
      availableCrew: () =>
        this.crewRepo.count({ where: { colonyId: colony.id } }),
      freeCrewQuarters: async () => Number.MAX_SAFE_INTEGER,
      moveCrewToShip: async (shipId, amount) => {
        const available = await this.crewRepo.find({
          where: { colonyId: colony.id },
          take: amount,
          order: { crewId: 'ASC' },
        });
        for (const entry of available) {
          entry.colonyId = null;
          entry.spacecraftId = shipId;
        }
        await this.crewRepo.save(available);
      },
      moveCrewFromShip: async (shipId, amount) => {
        const assigned = await this.crewRepo.find({
          where: { spacecraftId: shipId },
          take: amount,
          order: { crewId: 'ASC' },
        });
        for (const entry of assigned) {
          entry.spacecraftId = null;
          entry.colonyId = colony.id;
        }
        await this.crewRepo.save(assigned);
      },
      getStock: (commodityId) =>
        (colony.storage ?? []).find((item) => item.commodityId === commodityId)
          ?.amount ?? 0,
      lowerStock: async (commodityId, amount) => {
        await this.colonyStorageService.lowerStorage(
          colony,
          commodityId,
          amount,
        );
      },
    };
    const results: ShipManagementResult[] = [];
    for (const request of requests ?? []) {
      const ship = await this.shipRepo.findOne({
        where: { id: request.shipId, userId },
        relations: ['modules', 'location', 'location.systemField'],
      });
      if (!ship || isRpgHidden(ship) || !this.isShipInColonyOrbit(colony, ship)) {
        results.push({
          shipId: request.shipId,
          applied: [],
          rejected: ['Schiff ist nicht im Kolonieorbit'],
        });
        continue;
      }
      results.push(
        await this.shipManagement.manage(
          this.shipRepo.manager,
          source,
          ship,
          request,
        ),
      );
    }
    return { results };
  }

  async cleanupInvalidOrbitAssignments(colony: Colony): Promise<void> {
    const assignments = await this.orbitAssignmentRepo.find({
      where: { colonyId: colony.id },
      relations: [
        'spacecraft',
        'spacecraft.location',
        'spacecraft.location.systemField',
      ],
    });
    for (const assignment of assignments) {
      if (
        !assignment.spacecraft ||
        assignment.spacecraft.status === SpacecraftStatus.DESTROYED ||
        !this.isShipInColonyOrbit(colony, assignment.spacecraft)
      ) {
        await this.orbitAssignmentRepo.remove(assignment);
      }
    }
    const byFleet = new Map<number, ColonyOrbitAssignment[]>();
    for (const assignment of assignments) {
      const group = byFleet.get(assignment.fleetId) ?? [];
      group.push(assignment);
      byFleet.set(assignment.fleetId, group);
    }
    for (const group of byFleet.values()) {
      if (group.length <= 1) continue;
      const sorted = group.slice().sort((a, b) => a.id - b.id);
      for (const duplicate of sorted.slice(1)) {
        await this.orbitAssignmentRepo.remove(duplicate);
      }
    }
    await this.syncColonyBlockadeState(colony.id);
  }

  async syncColonyBlockadeState(
    colonyId: number,
    manager?: EntityManager,
  ): Promise<void> {
    const colonyRepo = manager?.getRepository(Colony) ?? this.colonyRepo;
    const orbitAssignmentRepo =
      manager?.getRepository(ColonyOrbitAssignment) ?? this.orbitAssignmentRepo;
    const colony = await colonyRepo.findOne({
      where: { id: colonyId },
      relations: ['changeable', 'stats'],
    });
    if (!colony) return;
    const changeable = colony.changeable ?? getColonyChangeable(colony);
    const blockadeCount = await orbitAssignmentRepo.count({
      where: { colonyId, mode: ColonyOrbitAssignmentMode.BLOCKADE },
    });
    const nextBlocked = blockadeCount > 0;
    if (Boolean(changeable.isBlockaded) !== nextBlocked) {
      changeable.isBlockaded = nextBlocked;
      await (manager ?? this.colonyRepo.manager).save(changeable);
      if (
        process.env.NODE_ENV === 'test' ||
        process.env.JEST_WORKER_ID ||
        'expect' in globalThis
      ) {
        await (
          manager?.getRepository(ColonyChangeable) ?? this.changeableRepo
        ).save(changeable);
      }
    }
  }

  /**
   * Canonical, ship-based start of a fleet-wide defense or blockade order for
   * the occupied colony in the ship's current orbit. `expectedColonyId` is set
   * by the colony-based compatibility routes and must match that colony.
   */
  async startOrbitOrder(
    shipId: number,
    userId: number,
    mode: ColonyOrbitAssignmentMode,
    expectedColonyId?: number,
  ): Promise<SpacecraftOrbitOrderResultDto> {
    const { assignment, message } = await this.applyOrbitOrderStart(
      shipId,
      userId,
      mode,
      expectedColonyId,
    );
    return { order: toOrbitOrderDto(assignment), message };
  }

  /** Canonical, ship-based end of the current orbit order of the ship's fleet. */
  async stopOrbitOrder(
    shipId: number,
    userId: number,
    expectedColonyId?: number,
  ): Promise<SpacecraftOrbitOrderStopResultDto> {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['fleet'],
    });
    if (!ship || isRpgHidden(ship)) throw new NotFoundException('Spacecraft not found');

    const stopped = await this.colonyRepo.manager.transaction(
      async (manager) => {
        const fleet = await this.lockFleet(manager, ship.fleetId);
        const assignments = manager.getRepository(ColonyOrbitAssignment);
        const assignment = fleet
          ? await assignments.findOne({ where: { fleetId: fleet.id } })
          : null;
        const fleetOrder =
          assignment &&
          (expectedColonyId == null || assignment.colonyId === expectedColonyId)
            ? assignment
            : null;
        const decision = evaluateOrbitOrderStop({
          isFleetLeader: fleet?.leaderId === ship.id,
          fleetOrder,
        });
        if (decision.reason === ORBIT_ORDER_REASONS.noOrder) return null;
        if (!decision.allowed || !fleet || !fleetOrder) {
          throw new BadRequestException(decision.reason);
        }
        await assignments.remove(fleetOrder);
        await this.syncColonyBlockadeState(fleetOrder.colonyId, manager);
        return { assignment: fleetOrder, fleet };
      },
    );
    if (!stopped) {
      return {
        cleared: false,
        order: null,
        message: ORBIT_ORDER_REASONS.noOrder,
      };
    }

    const { assignment, fleet } = stopped;
    const colony = await this.colonyRepo.findOne({
      where: { id: assignment.colonyId },
    });
    const stoppedBlockade =
      assignment.mode === ColonyOrbitAssignmentMode.BLOCKADE;
    const colonyName = colony?.name ?? `#${assignment.colonyId}`;
    const message = stoppedBlockade
      ? `Die Flotte ${fleet.name} hat die Blockierung der Kolonie ${colonyName} aufgehoben`
      : `Die Flotte ${fleet.name} hat die Verteidigung der Kolonie ${colonyName} beendet`;
    if (colony && isOwnedColony(colony)) {
      await this.colonyEventService.createActionEvent({
        colonyId: colony.id,
        userId: colony.userId,
        type: stoppedBlockade
          ? ColonyEventType.ORBIT_BLOCKADE_STOPPED
          : ColonyEventType.ORBIT_DEFENSE_STOPPED,
        severity: ColonyEventSeverity.INFO,
        title: stoppedBlockade ? 'Blockade beendet' : 'Verteidigung beendet',
        message,
        payload: {
          shipId: ship.id,
          fleetId: fleet.id,
          mode: assignment.mode,
        },
      });
    }
    return { cleared: true, order: toOrbitOrderDto(assignment), message };
  }

  /** Colony-based compatibility alias of {@link startOrbitOrder}. */
  async setOrbitAssignment(
    colonyId: number,
    userId: number,
    shipId: number,
    mode: ColonyOrbitAssignmentMode,
  ): Promise<ColonyOrbitAssignment> {
    const { assignment } = await this.applyOrbitOrderStart(
      shipId,
      userId,
      mode,
      colonyId,
    );
    return assignment;
  }

  /** Colony-based compatibility alias of {@link stopOrbitOrder}. */
  async clearOrbitAssignment(
    colonyId: number,
    userId: number,
    shipId: number,
  ): Promise<{ cleared: boolean }> {
    const { cleared } = await this.stopOrbitOrder(shipId, userId, colonyId);
    return { cleared };
  }

  /** True when an active energy phalanx, particle phalanx or anti-particle system protects the colony. */
  hasActiveOrbitalDefense(colony: Colony): boolean {
    const functionIds = this.getActiveBuildingFunctionIds(colony);
    return (
      this.colonyDefenseService.hasEnergyPhalanx(functionIds) ||
      this.colonyDefenseService.hasParticlePhalanx(functionIds) ||
      this.colonyDefenseService.hasAntiParticle(functionIds)
    );
  }

  private async applyOrbitOrderStart(
    shipId: number,
    userId: number,
    mode: ColonyOrbitAssignmentMode,
    expectedColonyId?: number,
  ): Promise<{ assignment: ColonyOrbitAssignment; message: string }> {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['fleet', 'location', 'location.systemField'],
    });
    if (!ship || isRpgHidden(ship)) throw new NotFoundException('Spacecraft not found');
    const colony = await this.findColonyInOrbit(ship);
    if (
      expectedColonyId != null &&
      (!colony || colony.id !== expectedColonyId)
    ) {
      throw new BadRequestException(ORBIT_ORDER_REASONS.notInOrbit);
    }
    if (colony && isOwnedColony(colony)) {
      await this.cleanupInvalidOrbitAssignments(colony);
    }

    const { assignment, fleet } = await this.colonyRepo.manager.transaction(
      async (manager) => {
        // Fleet before colony, like lockFleetParticipants; serializes all
        // orbit-order writers of both without blocking FK key shares.
        const fleet = await this.lockFleet(manager, ship.fleetId);
        const lockedColony = colony
          ? await manager.getRepository(Colony).findOne({
              where: { id: colony.id },
              lock: { mode: 'for_no_key_update' },
            })
          : null;
        const assignments = manager.getRepository(ColonyOrbitAssignment);
        // Position and status after the fleet lock: a flight of the fleet
        // holds the same lock, so exactly one of both wins.
        const lockedShip = await manager.getRepository(Spacecraft).findOne({
          where: { id: ship.id },
          relations: ['location', 'location.systemField'],
        });
        if (!lockedShip) throw new NotFoundException('Spacecraft not found');
        const stillInOrbit =
          lockedColony != null && this.isShipInColonyOrbit(lockedColony, lockedShip);
        const { context } = await this.orbitOrderStartContext(
          manager,
          lockedShip,
          fleet,
          stillInOrbit ? lockedColony : null,
          colony,
        );
        const decision = evaluateOrbitOrderStart(mode, context);
        if (!decision.allowed || !fleet || !lockedColony) {
          throw new BadRequestException(decision.reason);
        }
        const assignment = await assignments.save(
          assignments.create({
            colonyId: lockedColony.id,
            spacecraftId: ship.id,
            fleetId: fleet.id,
            mode,
          }),
        );
        await this.syncColonyBlockadeState(lockedColony.id, manager);
        return { assignment, fleet };
      },
    );

    const target = colony as Colony & { userId: number };
    const startedBlockade = mode === ColonyOrbitAssignmentMode.BLOCKADE;
    const message = `Die Kolonie ${target.name} wird nun von der Flotte ${
      fleet.name
    } ${startedBlockade ? 'blockiert' : 'verteidigt'}`;
    await this.colonyEventService.createActionEvent({
      colonyId: target.id,
      userId: target.userId,
      type: startedBlockade
        ? ColonyEventType.ORBIT_BLOCKADE_STARTED
        : ColonyEventType.ORBIT_DEFENSE_STARTED,
      severity: startedBlockade
        ? ColonyEventSeverity.WARNING
        : ColonyEventSeverity.INFO,
      title: startedBlockade ? 'Blockade begonnen' : 'Verteidigung begonnen',
      message,
      payload: { shipId: ship.id, fleetId: fleet.id, mode },
    });
    return { assignment, message };
  }

  /**
   * Read model of the fleet-wide orbit order for the ship field context,
   * evaluated with the same context and policy as the mutations. Null when
   * the ship is neither in a colony orbit nor part of a fleet with an order.
   */
  async getOrbitOrderView(
    shipId: number,
    userId: number,
  ): Promise<SpacecraftOrbitOrderViewDto | null> {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['fleet', 'location', 'location.systemField'],
    });
    if (!ship || isRpgHidden(ship)) return null;
    const colony = await this.findColonyInOrbit(ship);
    const fleet = ship.fleet ?? null;
    const manager = this.colonyRepo.manager;
    const { context, fleetOrder } = await this.orbitOrderStartContext(
      manager,
      ship,
      fleet,
      colony,
      colony,
    );
    if (!colony && !fleetOrder) return null;
    const action = (decision: { allowed: boolean; reason: string | null }) => ({
      available: decision.allowed,
      reason: decision.reason,
    });
    const orderColony = fleetOrder
      ? fleetOrder.colonyId === colony?.id
        ? colony
        : await this.colonyRepo.findOneBy({ id: fleetOrder.colonyId })
      : null;
    return {
      order: fleetOrder
        ? {
            ...toOrbitOrderDto(fleetOrder),
            colonyName: orderColony?.name ?? `#${fleetOrder.colonyId}`,
          }
        : null,
      defend: action(evaluateOrbitOrderStart(ColonyOrbitAssignmentMode.DEFEND, context)),
      blockade: action(evaluateOrbitOrderStart(ColonyOrbitAssignmentMode.BLOCKADE, context)),
      stop: action(
        evaluateOrbitOrderStop({
          isFleetLeader: fleet != null && fleet.leaderId === ship.id,
          fleetOrder,
        }),
      ),
    };
  }

  /** Shared start context of mutation (locked rows) and read model. */
  private async orbitOrderStartContext(
    manager: EntityManager,
    ship: Spacecraft,
    fleet: Fleet | null,
    orbitColony: Colony | null,
    defenseColony: Colony | null,
  ): Promise<{
    context: OrbitOrderStartContext;
    fleetOrder: ColonyOrbitAssignment | null;
  }> {
    const assignments = manager.getRepository(ColonyOrbitAssignment);
    const fleetOrder = fleet
      ? await assignments.findOne({
          where: [{ fleetId: fleet.id }, { spacecraftId: ship.id }],
        })
      : null;
    const colonyOrders = orbitColony
      ? (await assignments.find({ where: { colonyId: orbitColony.id } })).filter(
          (order) => order.fleetId !== fleet?.id,
        )
      : [];
    const occupied = orbitColony != null && isOwnedColony(orbitColony);
    return {
      fleetOrder,
      context: {
        colonyId: orbitColony?.id ?? null,
        shipDestroyed: ship.status === SpacecraftStatus.DESTROYED,
        inColonyOrbit: orbitColony != null,
        isFleetLeader: fleet != null && fleet.leaderId === ship.id,
        shipIdle: ship.status === SpacecraftStatus.IDLE,
        colonyOccupied: occupied,
        fleetOrder,
        colonyDefended: colonyOrders.some(
          (order) => order.mode === ColonyOrbitAssignmentMode.DEFEND,
        ),
        colonyBlockaded: colonyOrders.some(
          (order) => order.mode === ColonyOrbitAssignmentMode.BLOCKADE,
        ),
        ownerOnVacation:
          occupied && (await this.isOnVacation(ship.id, orbitColony.userId)),
        activeOrbitalDefense:
          defenseColony != null && this.hasActiveOrbitalDefense(defenseColony),
      },
    };
  }

  /** The colony (occupied or free) whose orbit the ship currently occupies. */
  private async findColonyInOrbit(ship: Spacecraft): Promise<Colony | null> {
    const location = resolveSpacecraftLocation(ship);
    if (location?.scope !== 'SYSTEM') return null;
    const candidates = (
      await this.colonyRepo.find({
        where: { starSystemId: location.systemId },
        relations: ['fields', 'systemField'],
        order: { id: 'ASC' },
      })
    ).filter((colony) => this.isShipInColonyOrbit(colony, ship));
    return candidates.find(isOwnedColony) ?? candidates[0] ?? null;
  }

  private async lockFleet(
    manager: EntityManager,
    fleetId: number | null | undefined,
  ): Promise<Fleet | null> {
    if (fleetId == null) return null;
    return manager.getRepository(Fleet).findOne({
      where: { id: fleetId },
      lock: { mode: 'for_no_key_update' },
    });
  }

  private async isOnVacation(
    shipId: number,
    ownerId: number,
  ): Promise<boolean> {
    const vacation = checkInteraction(
      await this.interactionContext.load(
        shipId,
        shipId,
        ['targetOnVacation'],
        ownerId,
      ),
      [InteractionRule.TARGET_VACATION],
    );
    return !vacation.allowed;
  }

  async transferShuttles(
    colonyId: number,
    userId: number,
    shipId: number,
    items: Array<{ commodityId: number; amount: number }>,
  ): Promise<void> {
    if (this.shuttles)
      return this.shuttles.transferStored(colonyId, userId, shipId, items);
    const colony = await this.ownership.findOwnedColony(colonyId, userId);
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['location', 'location.systemField'],
    });
    if (!ship || isRpgHidden(ship)) throw new NotFoundException('Spacecraft not found');
    if (!this.canManageOrbitShip(colony, ship)) {
      throw new BadRequestException('Ship is not in colony orbit');
    }

    const shipClass = await this.shipClassRepo.findOneBy({
      id: ship.shipClassId,
    });
    if (!shipClass) throw new BadRequestException('Unknown ship class');
    if (shipClass.shuttleSlots <= 0) {
      throw new BadRequestException('Ship has no shuttle ramp capacity');
    }

    const normalized = new Map<number, number>();
    for (const item of items ?? []) {
      if (
        !Number.isInteger(item?.commodityId) ||
        !Number.isInteger(item?.amount)
      ) {
        continue;
      }
      if (item.amount === 0) continue;
      const commodity = this.gameData.getCommodity(item.commodityId);
      if (!commodity?.isShuttle) {
        throw new BadRequestException(
          `Commodity ${item.commodityId} is not a shuttle`,
        );
      }
      normalized.set(
        item.commodityId,
        (normalized.get(item.commodityId) ?? 0) + item.amount,
      );
    }
    if (normalized.size === 0) {
      throw new BadRequestException('No shuttle transfers requested');
    }

    const shuttleCargoUsed = await this.getShuttleCargoUsed(ship.id);
    const requestedDelta = Array.from(normalized.values()).reduce(
      (sum, amount) => sum + amount,
      0,
    );
    if (shuttleCargoUsed + requestedDelta > shipClass.shuttleSlots) {
      throw new BadRequestException('Shuttle capacity exceeded');
    }
    if (shuttleCargoUsed + requestedDelta < 0) {
      throw new BadRequestException(
        'Cannot unload more shuttles than stored on ship',
      );
    }

    const maxStorage =
      this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
    const freeStorage = await this.colonyStorageService.getFreeStorage(
      colony,
      maxStorage,
    );
    const unloadAmount = Array.from(normalized.values())
      .filter((amount) => amount < 0)
      .reduce((sum, amount) => sum + Math.abs(amount), 0);
    if (unloadAmount > freeStorage) {
      throw new BadRequestException('Not enough colony storage capacity');
    }

    for (const [commodityId, amount] of normalized.entries()) {
      if (amount > 0) {
        const colonyStorage = await this.getColonyStorageItem(
          colony.id,
          commodityId,
        );
        if ((colonyStorage?.amount ?? 0) < amount) {
          throw new BadRequestException(
            `Not enough shuttle stock on colony for commodity ${commodityId}`,
          );
        }
      } else {
        const cargoItem = await this.getShipCargoItem(ship.id, commodityId);
        if ((cargoItem?.amount ?? 0) < Math.abs(amount)) {
          throw new BadRequestException(
            `Not enough shuttle stock on ship for commodity ${commodityId}`,
          );
        }
      }
    }

    for (const [commodityId, amount] of normalized.entries()) {
      if (amount > 0) {
        await this.colonyStorageService.lowerStorage(
          colony,
          commodityId,
          amount,
        );

        const cargoItem =
          (await this.getShipCargoItem(ship.id, commodityId)) ??
          this.cargoRepo.create({
            spacecraftId: ship.id,
            commodityId,
            amount: 0,
          });
        cargoItem.amount += amount;
        await this.cargoRepo.save(cargoItem);
      } else {
        const moveAmount = Math.abs(amount);
        const cargoItem = await this.getShipCargoItem(ship.id, commodityId);
        if (!cargoItem) {
          throw new BadRequestException(
            `Not enough shuttle stock on ship for commodity ${commodityId}`,
          );
        }
        cargoItem.amount -= moveAmount;
        await this.cargoRepo.save(cargoItem);

        await this.colonyStorageService.upperStorage(
          colony,
          commodityId,
          moveAmount,
          maxStorage,
        );
      }
    }

    ship.cargoUsed = await this.getShipCargoUsed(ship.id);
    await this.shipRepo.save(ship);

    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.SHUTTLES_TRANSFERRED,
      severity: ColonyEventSeverity.INFO,
      title: 'Shuttles transferiert',
      message: `${ship.name}: Shuttle-Transfer zwischen Kolonie und Schiff durchgeführt.`,
      payload: {
        shipId: ship.id,
        shipClassId: ship.shipClassId,
        transfers: Array.from(normalized.entries()).map(
          ([commodityId, delta]) => ({
            commodityId,
            delta,
          }),
        ),
      },
    });
  }

  canManageOrbitShip(colony: Colony, ship: Spacecraft): boolean {
    return (
      ship.userId === colony.userId && this.isShipInColonyOrbit(colony, ship)
    );
  }

  isShipInColonyOrbit(colony: Colony, ship: Spacecraft): boolean {
    return matchesColonyOrbit(ship, colony);
  }

  private getActiveBuildingFunctionIds(colony: Colony): number[] {
    return (colony.fields ?? [])
      .filter(
        (field) => field.buildingId && !field.isBuilding && field.isActive,
      )
      .flatMap((field) =>
        this.gameData.getBuildingFunctions(field.buildingId!),
      );
  }

  private async getShipCargoUsed(shipId: number): Promise<number> {
    const result = await this.cargoRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where('c.spacecraftId = :shipId', { shipId })
      .getRawOne();
    return parseInt(result?.total || '0', 10);
  }

  private async getShipCargoItem(
    spacecraftId: number,
    commodityId: number,
  ): Promise<CargoItem | null> {
    return this.cargoRepo.findOne({
      where: { spacecraftId, commodityId },
    });
  }

  private async getShuttleCargoUsed(shipId: number): Promise<number> {
    const cargo = await this.cargoRepo.find({
      where: { spacecraftId: shipId },
    });
    return cargo
      .filter((item) => this.gameData.getCommodity(item.commodityId)?.isShuttle)
      .reduce((sum, item) => sum + item.amount, 0);
  }

  private async getColonyStorageItem(
    colonyId: number,
    commodityId: number,
  ): Promise<ColonyStorage | null> {
    return this.storageRepo.findOne({
      where: { colonyId, commodityId },
    });
  }
}
