import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { DataSource, EntityManager, Not } from 'typeorm';
import { User as UserEntity } from '../auth/user.entity';
import { ColonyShipBuildplan } from '../colony/entities/colony-ship-buildplan.entity';
import { ColonyTimingService } from '../colony/colony-timing.service';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
  ShipBuildSource,
} from '../colony/entities/colony-ship-build-queue.entity';
import {
  AlertState,
  Spacecraft,
  SpacecraftKind,
  SpacecraftStatus,
} from './entities/spacecraft.entity';
import { SpacecraftStatsService } from './spacecraft-stats.service';
import { initializeSpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';
import type { ShipModuleSelection } from '@swuniverse/shared';
import type { User } from '../auth/user.entity';
import { ColonyFabricationQueueType } from '../colony/entities/colony-fabrication-queue.entity';
import { GameDataService } from '../game-data/game-data.service';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';

export interface PreparedShipModule {
  slotId: string;
  commodityId: number;
  moduleType: string;
  category: string;
  level: number;
}

export interface PreparedShipBuild {
  moduleSelections: ShipModuleSelection[];
  moduleCommodityIds: number[];
  moduleTypes: string[];
  modules: PreparedShipModule[];
  materialCosts: Array<{ commodityId: number; amount: number }>;
  crewRequired: number;
}

export interface ShipBuildRequest {
  userId: number;
  shipClassId?: number;
  name: string;
  moduleSelections?: ShipModuleSelection[];
  buildPlanId?: number;
  buildPlanName?: string;
}

export interface ShipbuildingSourceAdapter {
  source: ShipBuildSource;
  sourceId: number;
  reserve(
    manager: EntityManager,
    hull: ShipClassDef,
  ): Promise<{ buildingFunctionId: number | null }>;
  inventory(
    manager: EntityManager,
  ): Promise<Array<{ commodityId: number; amount: number }>>;
  consume(
    manager: EntityManager,
    costs: Array<{ commodityId: number; amount: number }>,
  ): Promise<void>;
  placement(
    manager: EntityManager,
  ): Promise<{ locationId: number; dockedAtId: number | null } | null>;
}

export type ShipbuildingCompletionHandler = (manager: EntityManager, ship: Spacecraft) => Promise<void>;

@Injectable()
export class ShipbuildingCoreService {
  constructor(
    private readonly gameData: GameDataService,
    private readonly unlocks: UnlockResolverService,
    private readonly dataSource: DataSource,
    private readonly stats: SpacecraftStatsService,
    private readonly timing: ColonyTimingService,
  ) {}

  signature(
    shipClassId: number,
    moduleSelections: ShipModuleSelection[],
  ): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          shipClassId,
          moduleSelections: [...moduleSelections].sort((a, b) =>
            a.slotId.localeCompare(b.slotId),
          ),
        }),
      )
      .digest('hex');
  }

  async startBuild(
    request: ShipBuildRequest,
    adapter: ShipbuildingSourceAdapter,
  ): Promise<ColonyShipBuildQueue> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, {
        where: { id: request.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Player not found');
      const sourcePlan =
        request.buildPlanId == null
          ? null
          : await manager.findOne(ColonyShipBuildplan, {
              where: { id: request.buildPlanId, userId: request.userId },
            });
      if (request.buildPlanId != null && !sourcePlan)
        throw new NotFoundException('Buildplan not found');
      const shipClassId = sourcePlan?.shipClassId ?? request.shipClassId;
      if (shipClassId == null)
        throw new BadRequestException('Ship class is required');
      const hull = await manager.findOne(ShipClassDef, {
        where: { id: shipClassId },
      });
      if (!hull || hull.isNpc)
        throw new BadRequestException('Unknown ship class');
      if (this.gameData.getShipClassDefByKey(hull.key)?.station)
        throw new BadRequestException(
          'Station hulls require station construction',
        );
      if (!(await this.unlocks.isShipClassUnlocked(request.userId, hull.id)))
        throw new BadRequestException('Ship class is not unlocked');
      if (hull.isColonizer) {
        if (
          await manager.count(Spacecraft, {
            where: {
              userId: request.userId,
              status: Not(SpacecraftStatus.DESTROYED),
              shipClass: { isColonizer: true },
            },
          })
        ) {
          throw new BadRequestException(
            'Only one operational colonization ship is allowed',
          );
        }
        if (
          await manager.count(ColonyShipBuildQueue, {
            where: {
              userId: request.userId,
              status: ColonyShipBuildQueueStatus.QUEUED,
              mode: ColonyShipBuildQueueMode.BUILD,
              shipClass: { isColonizer: true },
            },
          })
        ) {
          throw new BadRequestException(
            'A colonization ship is already under construction',
          );
        }
      }
      const build = await this.prepare(
        request.userId,
        hull,
        sourcePlan?.moduleSelections ?? request.moduleSelections ?? [],
        user.faction,
      );
      const reservation = await adapter.reserve(manager, hull);
      const required = new Map<number, number>();
      for (const cost of build.materialCosts)
        required.set(
          cost.commodityId,
          (required.get(cost.commodityId) ?? 0) + cost.amount,
        );
      for (const id of build.moduleCommodityIds)
        required.set(id, (required.get(id) ?? 0) + 1);
      const inventory = await adapter.inventory(manager);
      const costs = [...required]
        .sort(([a], [b]) => a - b)
        .map(([commodityId, amount]) => ({ commodityId, amount }));
      for (const cost of costs) {
        if (
          (inventory.find((item) => item.commodityId === cost.commodityId)
            ?.amount ?? 0) < cost.amount
        )
          throw new BadRequestException(
            `Not enough resources for commodity #${cost.commodityId}`,
          );
      }
      const signature = this.signature(hull.id, build.moduleSelections);
      const plan =
        sourcePlan ??
        (await this.persistBuildplan(
          manager,
          request.userId,
          hull,
          build,
          request.buildPlanName,
          true,
        ));
      await adapter.consume(manager, costs);
      const queue = manager.create(ColonyShipBuildQueue, {
        source: adapter.source,
        colonyId:
          adapter.source === ShipBuildSource.COLONY ? adapter.sourceId : null,
        stationId:
          adapter.source === ShipBuildSource.STATION ? adapter.sourceId : null,
        userId: request.userId,
        shipClassId: hull.id,
        buildingFunctionId: reservation.buildingFunctionId,
        name: request.name?.trim() || hull.name,
        buildPlanId: plan.id,
        buildPlanName: plan.name,
        buildPlanSignature: signature,
        moduleSelections: build.moduleSelections,
        moduleTypes: build.moduleTypes,
        moduleCommodityIds: build.moduleCommodityIds,
        crewRequired: build.crewRequired,
        buildSnapshot: {
          version: 1,
          modules: build.modules,
          crewRequired: build.crewRequired,
        },
        mode: ColonyShipBuildQueueMode.BUILD,
        spacecraftId: null,
        repairSnapshot: null,
        retrofitSnapshot: null,
        // buildTimeTicks are seconds (STU: finish_date = time() + buildtime).
        finishesAt: this.timing.dateAfterScaledSeconds(
          Math.max(1, hull.buildTimeTicks || 1),
        ),
        stoppedAt: null,
        status: ColonyShipBuildQueueStatus.QUEUED,
      });
      return manager.save(ColonyShipBuildQueue, queue);
    });
  }

  async completeBuild(
    jobId: number,
    adapter: ShipbuildingSourceAdapter,
    onCompleted?: ShipbuildingCompletionHandler,
  ): Promise<Spacecraft | null> {
    return this.dataSource.transaction(async (manager) => {
      const candidate = await manager.findOne(ColonyShipBuildQueue, {
        where: { id: jobId },
        select: { userId: true },
      });
      if (!candidate) return null;
      // Match admission's player/source/queue order, including ship foreign keys.
      const user = await manager.findOne(UserEntity, {
        where: { id: candidate.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) return null;
      const placement = await adapter.placement(manager);
      if (!placement) return null;
      const job = await manager.findOne(ColonyShipBuildQueue, {
        where: { id: jobId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !job ||
        job.source !== adapter.source ||
        (adapter.source === ShipBuildSource.COLONY
          ? job.colonyId
          : job.stationId) !== adapter.sourceId ||
        job.mode !== ColonyShipBuildQueueMode.BUILD ||
        job.status !== ColonyShipBuildQueueStatus.QUEUED ||
        job.finishesAt > new Date()
      )
        return null;
      const hull = await manager.findOne(ShipClassDef, {
        where: { id: job.shipClassId },
      });
      if (!hull) return null;
      const modules =
        job.buildSnapshot?.modules ??
        (job.moduleSelections ?? []).map((selection) => {
          const item = this.gameData.getFabricationItemByOutputCommodity(
            selection.commodityId,
          );
          if (!item?.moduleType)
            throw new BadRequestException(
              `Missing queued module #${selection.commodityId}`,
            );
          return {
            ...selection,
            moduleType: item.moduleType,
            category: item.shipyardType ?? 'UNKNOWN',
            level: item.moduleLevel ?? 1,
          };
        });
      const crewRequired =
        job.buildSnapshot?.crewRequired ??
        job.crewRequired ??
        hull.crewMin +
          modules.reduce(
            (sum, module) =>
              sum +
              (this.gameData.getFabricationItemByOutputCommodity(
                module.commodityId,
              )?.shipyardModuleStats?.crew ?? 0),
            0,
          );
      const ship = await manager.save(
        Spacecraft,
        manager.create(Spacecraft, {
          name: job.name,
          shipClassId: hull.id,
          userId: job.userId,
          ...placement,
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
          crewRequired,
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
        }),
      );
      const installed = this.createModules(ship.id, { modules });
      if (installed.length) await manager.save(SpacecraftModule, installed);
      this.stats.applyStats(ship, hull, installed);
      ship.crewRequired = crewRequired;
      ship.crewMax = Math.max(ship.crewMax, crewRequired);
      ship.modules = installed;
      ship.shipClass = hull;
      if (['SHUTTLE', 'WORKBEE'].includes(hull.role)) {
        ship.shuttleCommodityId =
          this.gameData.getHangarShipDef?.(hull.key)?.hangarCommodityId ?? null;
      }
      initializeSpacecraftRuntimeSystems(ship);
      await manager.save(Spacecraft, ship);
      job.status = ColonyShipBuildQueueStatus.COMPLETED;
      await manager.save(ColonyShipBuildQueue, job);
      await onCompleted?.(manager, ship);
      return ship;
    });
  }

  async createBuildplan(
    request: {
      userId: number;
      shipClassId: number;
      name: string;
      moduleSelections: ShipModuleSelection[];
    },
    reuseExisting = false,
  ): Promise<ColonyShipBuildplan> {
    const name = this.validateBuildplanName(request.name);
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, {
        where: { id: request.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Player not found');
      const hull = await manager.findOne(ShipClassDef, {
        where: { id: request.shipClassId },
      });
      if (!hull || hull.isNpc)
        throw new BadRequestException('Unknown ship class');
      const build = await this.prepare(
        request.userId,
        hull,
        request.moduleSelections,
        user.faction,
      );
      return this.persistBuildplan(
        manager,
        request.userId,
        hull,
        build,
        name,
        reuseExisting,
      );
    });
  }

  private async persistBuildplan(
    manager: EntityManager,
    userId: number,
    hull: ShipClassDef,
    build: PreparedShipBuild,
    requestedName: string | undefined,
    reuseExisting: boolean,
  ): Promise<ColonyShipBuildplan> {
    if (
      !reuseExisting &&
      (await manager.findOne(ColonyShipBuildplan, {
        where: { userId, name: requestedName },
      }))
    )
      throw new BadRequestException('Buildplan name already exists');
    const signature = this.signature(hull.id, build.moduleSelections);
    const existing = await manager.findOne(ColonyShipBuildplan, {
      where: { userId, signature },
    });
    if (existing) {
      if (reuseExisting) return existing;
      throw new BadRequestException(
        `Ein Bauplan mit dieser Konfiguration existiert bereits: ${existing.name}`,
      );
    }
    const baseName = this.validateBuildplanName(
      requestedName ?? `${hull.name} Buildplan`,
    );
    let name = baseName;
    let suffix = 2;
    while (
      reuseExisting &&
      (await manager.findOne(ColonyShipBuildplan, { where: { userId, name } }))
    ) {
      if (requestedName != null)
        throw new BadRequestException('Buildplan name already exists');
      const ending = ` (${suffix++})`;
      name = `${[...baseName].slice(0, 255 - ending.length).join('')}${ending}`;
    }
    return manager.save(
      ColonyShipBuildplan,
      manager.create(ColonyShipBuildplan, {
        userId,
        shipClassId: hull.id,
        name,
        signature,
        moduleSelections: build.moduleSelections,
        moduleCommodityIds: build.moduleCommodityIds,
        moduleTypes: build.moduleTypes,
      }),
    );
  }

  validateBuildplanName(name: string): string {
    const trimmed = name?.trim();
    if (!trimmed) throw new BadRequestException('Buildplan name is required');
    if (/\p{Cc}/u.test(trimmed))
      throw new BadRequestException(
        'Buildplan name contains control characters',
      );
    if ([...trimmed].length > 255)
      throw new BadRequestException('Buildplan name is too long');
    return trimmed;
  }

  async prepare(
    userId: number,
    shipClass: ShipClassDef,
    selections: ShipModuleSelection[],
    faction: User['faction'],
  ): Promise<PreparedShipBuild> {
    const layout =
      this.gameData.getShipClassSlotRuleForShipClass?.(shipClass) ??
      this.gameData.getShipClassSlotRule(shipClass.category);
    if (!layout) {
      throw new BadRequestException(
        `Missing ship layout for ${shipClass.category}`,
      );
    }

    const fixed = this.gameData.getHangarShipDef?.(shipClass.key);
    if (fixed) {
      const free = new Map<string, string[]>();
      for (const slot of layout.slots)
        free.set(slot.moduleCategory, [
          ...(free.get(slot.moduleCategory) ?? []),
          slot.slotId,
        ]);
      const defaults = (fixed.defaultModuleCommodityIds ?? []).map(
        (commodityId) => {
          const item =
            this.gameData.getFabricationItemByOutputCommodity(commodityId);
          const slotId = free.get(item?.shipyardType ?? '')?.shift();
          if (!slotId)
            throw new BadRequestException('Missing fixed hangar module slot');
          return { slotId, commodityId };
        },
      );
      if (
        selections.length &&
        this.signature(shipClass.id, selections) !==
          this.signature(shipClass.id, defaults)
      )
        throw new BadRequestException(
          `${shipClass.name} uses a fixed module layout and cannot be customized`,
        );
      selections = defaults;
    }
    const slots = new Map(layout.slots.map((slot) => [slot.slotId, slot]));
    const seen = new Set<string>();
    const seenSlots = new Set<string>();
    const modules: PreparedShipModule[] = [];

    for (const selection of selections ?? []) {
      const slotId = String(selection?.slotId ?? '').trim();
      const commodityId = Number(selection?.commodityId);
      const slot = slots.get(slotId);
      if (!slot || !Number.isInteger(commodityId)) {
        throw new BadRequestException('Invalid module selection');
      }
      if (
        seenSlots.has(slotId) ||
        (slot.moduleCategory !== 'SPECIAL' && seen.has(slot.moduleCategory))
      ) {
        throw new BadRequestException(
          `Duplicate module selection for ${slot.moduleCategory}`,
        );
      }

      const item =
        this.gameData.getFabricationItemByOutputCommodity(commodityId);
      if (
        !item ||
        item.queueType !== ColonyFabricationQueueType.MODULE ||
        !item.moduleType
      ) {
        throw new BadRequestException(
          `Commodity #${commodityId} is not a ship module`,
        );
      }
      if (item.faction != null && item.faction !== faction) {
        throw new BadRequestException('Ship module is faction-locked');
      }
      if ((item.shipyardType ?? 'UNKNOWN') !== slot.moduleCategory) {
        throw new BadRequestException(
          `${item.displayName ?? `Module #${commodityId}`} does not fit ${slot.label}`,
        );
      }
      if (!this.gameData.isShipyardModuleAllowedForShipClass(item, shipClass)) {
        throw new BadRequestException(
          `${item.displayName ?? `Module #${commodityId}`} is not allowed for ${shipClass.name}`,
        );
      }
      if (
        item.researchId != null &&
        !(await this.unlocks.hasTech(userId, item.researchId))
      ) {
        throw new BadRequestException(
          `Research required: ${item.researchRequired || item.researchId}`,
        );
      }

      seen.add(slot.moduleCategory);
      seenSlots.add(slotId);
      modules.push({
        slotId,
        commodityId,
        moduleType: item.moduleType,
        category: item.shipyardType ?? 'UNKNOWN',
        level: item.moduleLevel ?? 1,
      });
    }

    const special = modules.filter(
      (module) => slots.get(module.slotId)?.moduleCategory === 'SPECIAL',
    ).length;
    if (special > (layout.moduleSlots.SPECIAL ?? 0)) {
      throw new BadRequestException(
        'More special modules selected than the hull allows',
      );
    }

    const crewRequired =
      shipClass.crewMin +
      modules.reduce(
        (sum, module) =>
          sum +
          (this.gameData.getFabricationItemByOutputCommodity(module.commodityId)
            ?.shipyardModuleStats?.crew ?? 0),
        0,
      );
    if (crewRequired > shipClass.crewMax) {
      throw new BadRequestException(
        `Crew maximum exceeded: build requires ${crewRequired}, hull allows ${shipClass.crewMax}`,
      );
    }

    return {
      moduleSelections: modules.map(({ slotId, commodityId }) => ({
        slotId,
        commodityId,
      })),
      moduleCommodityIds: modules.map((module) => module.commodityId),
      moduleTypes: modules.map((module) => module.moduleType),
      modules,
      materialCosts: (
        this.gameData.getShipClassDefByKey(shipClass.key)?.buildCosts ?? []
      ).filter(
        (cost) =>
          cost.amount > 0 &&
          !modules.some((module) => module.commodityId === cost.commodityId),
      ),
      crewRequired,
    };
  }

  createModules(
    spacecraftId: number,
    build: Pick<PreparedShipBuild, 'modules'>,
  ): SpacecraftModule[] {
    return build.modules.map((module) =>
      Object.assign(new SpacecraftModule(), {
        spacecraftId,
        slotId: module.slotId,
        moduleType: module.moduleType,
        category: module.category,
        level: module.level,
        integrity: 100,
        cooldown: 0,
        isActive: true,
      }),
    );
  }
}
