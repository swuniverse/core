import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { StationShipBuildRequestDto } from '@swuniverse/shared';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import {
  FabricationItemDef,
  GameDataService,
} from '../game-data/game-data.service';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
  ShipBuildSource,
} from '../colony/entities/colony-ship-build-queue.entity';
import { ColonyShipBuildplan } from '../colony/entities/colony-ship-buildplan.entity';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { CargoItem } from './entities/cargo-item.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import {
  Spacecraft,
  SpacecraftKind,
  SpacecraftStatus,
  StationRole,
} from './entities/spacecraft.entity';
import {
  ShipbuildingSourceAdapter,
  ShipbuildingCoreService,
  type ShipbuildingCompletionHandler,
} from './shipbuilding-core.service';

export type StationShipBuildRequest = StationShipBuildRequestDto;

@Injectable()
export class StationShipyardService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ColonyShipBuildQueue)
    private readonly queueRepo: Repository<ColonyShipBuildQueue>,
    @InjectRepository(ShipClassDef)
    private readonly classRepo: Repository<ShipClassDef>,
    private readonly core: ShipbuildingCoreService,
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
    const amount = new Map(
      cargo.map((item) => [item.commodityId, item.amount]),
    );
    const options = [];
    for (const hull of classes) {
      if (this.gameData.getShipClassDefByKey(hull.key)?.station) continue;
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
      buildplans: await this.dataSource.manager.find(ColonyShipBuildplan, {
        where: { userId },
        order: { name: 'ASC' },
      }),
    };
  }

  async build(
    stationId: number,
    userId: number,
    request: StationShipBuildRequest,
  ) {
    return this.core.startBuild(
      { ...request, userId },
      this.sourceAdapter(stationId, userId),
    );
  }

  async processTick(stationId: number): Promise<void> {
    const jobs = await this.queueRepo.find({
      where: {
        stationId,
        source: ShipBuildSource.STATION,
        mode: ColonyShipBuildQueueMode.BUILD,
        status: ColonyShipBuildQueueStatus.QUEUED,
      },
      order: { finishesAt: 'ASC', id: 'ASC' },
    });
    for (const job of jobs) {
      if (job.finishesAt <= new Date())
        await this.core.completeBuild(
          job.id,
          this.sourceAdapter(stationId, job.userId),
        );
    }
  }

  async completeJob(job: ColonyShipBuildQueue, onCompleted?: ShipbuildingCompletionHandler): Promise<Spacecraft | null> {
    if (job.source !== ShipBuildSource.STATION || job.stationId == null ||
        job.mode !== ColonyShipBuildQueueMode.BUILD) return null;
    return this.core.completeBuild(job.id, this.sourceAdapter(job.stationId, job.userId), onCompleted);
  }

  private sourceAdapter(
    stationId: number,
    userId: number,
  ): ShipbuildingSourceAdapter {
    return {
      source: ShipBuildSource.STATION,
      sourceId: stationId,
      reserve: async (manager) => {
        await this.ownedShipyard(manager, stationId, userId, true);
        if (
          await manager.count(ColonyShipBuildQueue, {
            where: {
              stationId,
              source: ShipBuildSource.STATION,
              status: In([
                ColonyShipBuildQueueStatus.QUEUED,
                ColonyShipBuildQueueStatus.PAUSED,
              ]),
            },
          })
        )
          throw new BadRequestException(
            'In dieser Raumwerft wird bereits ein Schiff gebaut',
          );
        return { buildingFunctionId: null };
      },
      inventory: (manager) =>
        manager.find(CargoItem, {
          where: { spacecraftId: stationId },
          order: { commodityId: 'ASC' },
          lock: { mode: 'pessimistic_write' },
        }),
      consume: async (manager, costs) => {
        for (const cost of costs) {
          const cargo = await manager.findOneOrFail(CargoItem, {
            where: { spacecraftId: stationId, commodityId: cost.commodityId },
          });
          cargo.amount -= cost.amount;
          await manager.save(CargoItem, cargo);
        }
        const total = await manager
          .createQueryBuilder(CargoItem, 'cargo')
          .select('COALESCE(SUM(cargo.amount), 0)', 'total')
          .where('cargo.spacecraftId = :stationId', { stationId })
          .getRawOne();
        await manager.update(Spacecraft, stationId, {
          cargoUsed: Number(total.total),
        });
      },
      placement: async (manager) => {
        const station = await manager.findOne(Spacecraft, {
          where: { id: stationId, userId, kind: SpacecraftKind.STATION },
          lock: { mode: 'pessimistic_write' },
        });
        if (
          !station ||
          station.stationRole !== StationRole.SHIPYARD ||
          station.status === SpacecraftStatus.DESTROYED
        )
          return null;
        if (
          (await manager.count(Spacecraft, {
            where: { dockedAtId: stationId },
          })) >= station.dockCapacity
        )
          return null;
        return { locationId: station.locationId, dockedAtId: stationId };
      },
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
    if (station.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Diese Raumwerft wurde zerstört');
    }
    return station;
  }
}
