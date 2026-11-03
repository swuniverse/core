import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ShipModuleSelection } from '@swuniverse/shared';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import {
  FabricationItemDef,
  GameDataService,
} from '../game-data/game-data.service';
import { ColonyTimingService } from '../colony/colony-timing.service';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
  ShipBuildSource,
} from '../colony/entities/colony-ship-build-queue.entity';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { CargoItem } from './entities/cargo-item.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import {
  AlertState,
  Spacecraft,
  SpacecraftKind,
  SpacecraftStatus,
  StationRole,
} from './entities/spacecraft.entity';
import { initializeSpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';
import {
  PreparedShipBuild,
  ShipbuildingCoreService,
} from './shipbuilding-core.service';
import { SpacecraftStatsService } from './spacecraft-stats.service';

export interface StationShipBuildRequest {
  shipClassId: number;
  name: string;
  moduleSelections?: ShipModuleSelection[];
}

@Injectable()
export class StationShipyardService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ColonyShipBuildQueue)
    private readonly queueRepo: Repository<ColonyShipBuildQueue>,
    @InjectRepository(ShipClassDef)
    private readonly classRepo: Repository<ShipClassDef>,
    private readonly core: ShipbuildingCoreService,
    private readonly stats: SpacecraftStatsService,
    private readonly timing: ColonyTimingService,
    private readonly unlocks: UnlockResolverService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly gameData: GameDataService,
  ) {}

  async overview(stationId: number, userId: number) {
    const station = await this.ownedShipyard(
      this.dataSource.manager,
      stationId,
      userId,
    );
    const [classes, cargo, queues, user] = await Promise.all([
      this.classRepo.find({ where: { isNpc: false }, order: { id: 'ASC' } }),
      this.dataSource.manager.find(CargoItem, {
        where: { spacecraftId: stationId },
      }),
      this.queueRepo.find({
        where: {
          stationId,
          source: ShipBuildSource.STATION,
          status: ColonyShipBuildQueueStatus.QUEUED,
        },
        order: { finishesAt: 'ASC' },
      }),
      this.userRepo.findOne({ where: { id: userId } }),
    ]);
    const amount = new Map(cargo.map((item) => [item.commodityId, item.amount]));
    const options = [];
    for (const hull of classes) {
      if (!(await this.unlocks.isShipClassUnlocked(userId, hull.id))) continue;
      const prepared = await this.core.prepare(
        userId,
        hull,
        [],
        user?.faction ?? null,
      );
      const layout = this.gameData.getShipClassSlotRuleForShipClass(hull);
      if (!layout) continue;
      const definition = this.gameData.getShipClassDefByKey(hull.key);
      const rumpStats = this.gameData.getShipyardRumpStats(
        definition?.stuRumpId,
      );
      options.push({
        ...hull,
        buildCosts: prepared.materialCosts.map((cost) => ({
          ...cost,
          stored: amount.get(cost.commodityId) ?? 0,
        })),
        layout: {
          shipClassId: hull.id,
          imageKey: layout.imageKey,
          layoutKey: layout.layoutKey,
          stuRumpId: definition?.stuRumpId ?? null,
          baseStats: {
            moduleLevel: rumpStats?.moduleLevel ?? 0,
            baseCrew: hull.crewMin,
            baseEvadeChance: hull.evadeBase,
            baseHull: hull.hullBase,
            baseShield: hull.shieldBase,
            baseDamage: 0,
            baseSensorRange: 0,
            baseWarpdrive: hull.warpdriveBase,
            baseEps: hull.epsBase,
            baseReactor: hull.reactorBase,
          },
          slots: layout.slots,
        },
      });
    }
    const availableModules = await this.availableModules(
      userId,
      classes,
      amount,
      user?.faction ?? null,
    );
    return {
      stationId,
      role: station.stationRole,
      options,
      availableModules,
      queues,
    };
  }

  async build(
    stationId: number,
    userId: number,
    request: StationShipBuildRequest,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const station = await this.ownedShipyard(manager, stationId, userId, true);
      if (
        await manager.count(ColonyShipBuildQueue, {
          where: {
            stationId,
            source: ShipBuildSource.STATION,
            status: ColonyShipBuildQueueStatus.QUEUED,
          },
        })
      ) {
        throw new BadRequestException(
          'In dieser Raumwerft wird bereits ein Schiff gebaut',
        );
      }
      const hull = await this.classRepo.findOneBy({ id: request.shipClassId });
      if (
        !hull ||
        hull.isNpc ||
        !(await this.unlocks.isShipClassUnlocked(userId, hull.id))
      ) {
        throw new BadRequestException('Unknown or locked ship class');
      }
      const user = await this.userRepo.findOne({ where: { id: userId } });
      const prepared = await this.core.prepare(
        userId,
        hull,
        request.moduleSelections ?? [],
        user?.faction ?? null,
      );
      const required = this.requiredCargo(prepared);
      const cargo = await manager.find(CargoItem, {
        where: { spacecraftId: station.id },
        lock: { mode: 'pessimistic_write' },
      });
      for (const [commodityId, amount] of required) {
        if (
          (cargo.find((item) => item.commodityId === commodityId)?.amount ?? 0) <
          amount
        ) {
          throw new BadRequestException(
            `Not enough commodity #${commodityId}`,
          );
        }
      }
      for (const [commodityId, amount] of required) {
        cargo.find((item) => item.commodityId === commodityId)!.amount -= amount;
      }
      await manager.save(CargoItem, cargo);
      const queue = manager.create(ColonyShipBuildQueue, {
        source: ShipBuildSource.STATION,
        colonyId: null,
        stationId,
        userId,
        shipClassId: hull.id,
        mode: ColonyShipBuildQueueMode.BUILD,
        buildingFunctionId: null,
        spacecraftId: null,
        name: request.name?.trim() || hull.name,
        buildPlanName: null,
        buildPlanId: null,
        buildPlanSignature: null,
        moduleSelections: prepared.moduleSelections,
        moduleCommodityIds: prepared.moduleCommodityIds,
        moduleTypes: prepared.moduleTypes,
        crewRequired: prepared.crewRequired,
        repairSnapshot: null,
        retrofitSnapshot: null,
        finishesAt: this.timing.dateAfterScaledMinutes(
          Math.max(1, hull.buildTimeTicks || 1),
        ),
        stoppedAt: null,
        status: ColonyShipBuildQueueStatus.QUEUED,
      });
      return manager.save(ColonyShipBuildQueue, queue);
    });
  }

  async processTick(stationId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const station = await manager.findOne(Spacecraft, {
        where: { id: stationId, kind: SpacecraftKind.STATION },
        lock: { mode: 'pessimistic_write' },
      });
      if (!station || station.stationRole !== StationRole.SHIPYARD) return;
      const due = await manager.find(ColonyShipBuildQueue, {
        where: {
          stationId,
          source: ShipBuildSource.STATION,
          mode: ColonyShipBuildQueueMode.BUILD,
          status: ColonyShipBuildQueueStatus.QUEUED,
        },
        relations: { shipClass: true },
        order: { finishesAt: 'ASC', id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      for (const job of due) {
        if (job.finishesAt > new Date()) continue;
        if (
          (await manager.count(Spacecraft, {
            where: { dockedAtId: station.id },
          })) >= station.dockCapacity
        ) {
          return;
        }
        const hull =
          job.shipClass ??
          (await manager.findOne(ShipClassDef, {
            where: { id: job.shipClassId },
          }));
        if (!hull) return;
        await this.complete(manager, station, job, hull);
      }
    });
  }

  private async complete(
    manager: EntityManager,
    station: Spacecraft,
    job: ColonyShipBuildQueue,
    hull: ShipClassDef,
  ): Promise<void> {
    const ship = manager.create(Spacecraft, {
      name: job.name,
      shipClassId: hull.id,
      userId: job.userId,
      locationId: station.locationId,
      dockedAtId: station.id,
      kind: SpacecraftKind.SHIP,
      status: SpacecraftStatus.IDLE,
      alertState: AlertState.GREEN,
      hull: hull.hullBase,
      hullMax: hull.hullBase,
      shields: hull.shieldBase,
      shieldsMax: hull.shieldBase,
      energy: hull.epsBase,
      energyMax: hull.epsBase,
      epsMax: hull.epsBase,
      warpSpeed: hull.warpdriveBase,
      warpdrive: hull.warpdriveBase,
      warpdriveMax: hull.warpdriveBase,
      crew: 0,
      crewRequired: job.crewRequired ?? hull.crewMin,
      crewMax: hull.crewMax,
      cargoUsed: 0,
      cargoMax: hull.cargoCapacity,
      battery: hull.batteryBase,
      batteryMax: hull.batteryBase,
      reactorOutput: hull.reactorBase,
      reactorFuel: 0,
      reactorFuelMax: 0,
      evadeChance: hull.evadeBase,
      buildPlanId: job.buildPlanId,
    });
    const saved = await manager.save(Spacecraft, ship);
    const prepared = await this.rehydrateBuild(job, hull);
    const modules = this.core.createModules(saved.id, prepared);
    if (modules.length) await manager.save(SpacecraftModule, modules);
    saved.modules = modules;
    saved.crewRequired = prepared.crewRequired;
    this.stats.applyStats(saved, hull, modules);
    saved.crewMax = Math.max(saved.crewMax, saved.crewRequired);
    initializeSpacecraftRuntimeSystems(saved);
    await manager.save(Spacecraft, saved);
    job.status = ColonyShipBuildQueueStatus.COMPLETED;
    await manager.save(ColonyShipBuildQueue, job);
  }

  private async rehydrateBuild(
    job: ColonyShipBuildQueue,
    hull: ShipClassDef,
  ): Promise<PreparedShipBuild> {
    const user = await this.userRepo.findOne({ where: { id: job.userId } });
    const prepared = await this.core.prepare(
      job.userId,
      hull,
      job.moduleSelections ?? [],
      user?.faction ?? null,
    );
    return {
      ...prepared,
      crewRequired: job.crewRequired ?? prepared.crewRequired,
    };
  }

  private async availableModules(
    userId: number,
    classes: ShipClassDef[],
    amount: Map<number, number>,
    faction: User['faction'],
  ) {
    const modules = [];
    for (const item of this.gameData.getAllFabricationItems()) {
      if (!item.moduleType || !item.shipyardType) continue;
      if (item.faction != null && item.faction !== faction) continue;
      if (
        item.researchId != null &&
        !(await this.unlocks.hasTech(userId, item.researchId))
      ) {
        continue;
      }
      const compatibleShipClassIds = classes
        .filter((shipClass) =>
          this.gameData.isShipyardModuleAllowedForShipClass(item, shipClass),
        )
        .map((shipClass) => shipClass.id);
      if (!compatibleShipClassIds.length) continue;
      modules.push(
        this.toAvailableModule(item, amount, compatibleShipClassIds),
      );
    }
    return modules;
  }

  private toAvailableModule(
    item: FabricationItemDef,
    amount: Map<number, number>,
    compatibleShipClassIds: number[],
  ) {
    const stats = item.shipyardModuleStats;
    return {
      commodityId: item.outputCommodityId,
      commodityName:
        this.gameData.getCommodity(item.outputCommodityId)?.name ??
        item.displayName,
      amount: amount.get(item.outputCommodityId) ?? 0,
      moduleType: item.moduleType!,
      moduleCategory: item.moduleCategory ?? item.shipyardType!,
      shipyardGroup: item.shipyardGroup ?? 'UTILITY',
      shipyardType: item.shipyardType!,
      moduleLevel: stats?.level ?? item.moduleLevel ?? 0,
      moduleClass: item.moduleClass ?? 0,
      researchRequired: item.researchRequired ?? null,
      faction: item.faction ?? null,
      displayName: item.displayName,
      crewRequired: stats?.crew ?? 0,
      effects: [],
      shipyardModuleStats: stats
        ? {
            level: stats.level,
            upgradeFactor: stats.upgradeFactor,
            downgradeFactor: stats.downgradeFactor,
            crew: stats.crew,
            energyCost: stats.energyCost,
            defaultFactor: stats.defaultFactor,
          }
        : null,
      compatibleShipClassIds,
    };
  }

  private requiredCargo(build: PreparedShipBuild): Map<number, number> {
    const required = new Map<number, number>();
    for (const cost of build.materialCosts) {
      required.set(
        cost.commodityId,
        (required.get(cost.commodityId) ?? 0) + cost.amount,
      );
    }
    for (const commodityId of build.moduleCommodityIds) {
      required.set(commodityId, (required.get(commodityId) ?? 0) + 1);
    }
    return required;
  }

  private async ownedShipyard(
    manager: EntityManager,
    id: number,
    userId: number,
    lock = false,
  ): Promise<Spacecraft> {
    const station = await manager.findOne(Spacecraft, {
      where: { id, userId, kind: SpacecraftKind.STATION },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!station) throw new NotFoundException('Station nicht gefunden');
    if (station.stationRole !== StationRole.SHIPYARD) {
      throw new BadRequestException('Diese Station ist keine Raumwerft');
    }
    return station;
  }
}
