import type { EntityManager } from 'typeorm';
import type { GameDataService } from '../game-data/game-data.service';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import {
  Spacecraft,
  SpacecraftKind,
  SpacecraftStatus,
  AlertState,
  SpacecraftOperatingMode,
} from './entities/spacecraft.entity';
import type { ShipClassDef } from './entities/ship-class-def.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { SpacecraftStatsService } from './spacecraft-stats.service';
import { initializeSpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';

export function prepareSmallCraft(
  hull: ShipClassDef,
  gameData?: GameDataService,
  moduleCommodityIds?: readonly number[],
) {
  const hangar = gameData?.getHangarShipDef?.(hull.key);
  const modules = (
    moduleCommodityIds ??
    hangar?.defaultModuleCommodityIds ??
    []
  ).flatMap((id) => {
    const item = gameData?.getFabricationItemByOutputCommodity?.(id);
    return item?.moduleType
      ? [
          Object.assign(new SpacecraftModule(), {
            moduleType: item.moduleType,
            category: item.shipyardType ?? item.moduleCategory,
            level: item.moduleLevel ?? 1,
            integrity: 100,
            cooldown: 0,
            isActive: true,
          }),
        ]
      : [];
  });
  const stats = gameData?.getAllModules
    ? new SpacecraftStatsService(gameData).calculateStats(hull, modules)
    : null;
  return {
    modules,
    crewRequired: hangar?.crewRequired ?? hull.crewMin,
    energyCost: stats?.epsMax ?? hull.epsBase,
    stats,
  };
}

/** Shared launch/initial docking for shuttles and station-construction Workbees. */
export async function createSmallCraft(
  manager: EntityManager,
  hull: ShipClassDef,
  placement: Pick<Spacecraft, 'name' | 'userId' | 'locationId'> &
    Partial<Pick<Spacecraft, 'location' | 'dockedAtId' | 'shuttleCommodityId'>>,
  gameData?: GameDataService,
  moduleCommodityIds?: readonly number[],
): Promise<Spacecraft> {
  const plan = prepareSmallCraft(hull, gameData, moduleCommodityIds);
  const repo = manager.getRepository(Spacecraft);
  const ship = repo.create({
    ...placement,
    shipClassId: hull.id,
    kind: SpacecraftKind.SHIP,
    stationRole: null,
    dockCapacity: 0,
    status: SpacecraftStatus.IDLE,
    alertState: AlertState.GREEN,
    operatingMode: SpacecraftOperatingMode.NORMAL,
    hull: hull.hullBase,
    hullMax: hull.hullBase,
    shields: 0,
    shieldsMax: plan.stats?.shieldsMax ?? hull.shieldBase,
    energy: plan.energyCost,
    energyMax: plan.energyCost,
    epsMax: plan.energyCost,
    crew: 0,
    crewRequired: plan.crewRequired,
    crewMax: Math.max(plan.stats?.crewMax ?? hull.crewMax, plan.crewRequired),
    cargoUsed: 0,
    cargoMax: plan.stats?.cargoMax ?? hull.cargoCapacity,
    battery: plan.stats?.batteryMax ?? hull.batteryBase,
    batteryMax: plan.stats?.batteryMax ?? hull.batteryBase,
    reactorOutput: plan.stats?.reactorOutput ?? hull.reactorBase,
    reactorFuel: (plan.stats?.reactorOutput ?? hull.reactorBase) * 10,
    reactorFuelMax: (plan.stats?.reactorOutput ?? hull.reactorBase) * 10,
    warpSpeed: plan.stats?.warpSpeed ?? hull.warpdriveBase,
    warpdrive: plan.stats?.warpdriveMax ?? hull.warpdriveBase,
    warpdriveMax: plan.stats?.warpdriveMax ?? hull.warpdriveBase,
    evadeChance: plan.stats?.evadeChance ?? hull.evadeBase,
    runtimeSystems: {},
  });
  const saved = await repo.save(ship);
  saved.shipClass = hull;
  if (plan.modules.length) {
    for (const module of plan.modules) module.spacecraftId = saved.id;
    await manager.getRepository(SpacecraftModule).save(plan.modules);
  }
  saved.modules = plan.modules;
  const systems = initializeSpacecraftRuntimeSystems(saved);
  if (systems.SHIELDS) systems.SHIELDS.active = false;
  if (systems.WARPDRIVE) systems.WARPDRIVE.active = false;
  // The launch fills EPS and warp reserve; the drive itself stays off.
  await repo.save(saved);
  return saved;
}

/** Caller reserves the source's required crew and passes only excess assignments. */
export async function assignSmallCraftCrew(
  manager: EntityManager,
  assignments: CrewAssignment[],
  ships: Spacecraft[],
): Promise<void> {
  let offset = 0;
  for (const ship of ships) {
    const crew = assignments.slice(offset, offset + ship.crewRequired);
    if (crew.length !== ship.crewRequired)
      throw new Error('Reserved small craft crew is incomplete');
    for (const assignment of crew) {
      assignment.spacecraftId = ship.id;
      assignment.colonyId = null;
      assignment.escapePodId = null;
      assignment.tradePostId = null;
      assignment.slot = null;
    }
    offset += crew.length;
    ship.crew = crew.length;
  }
  if (offset) {
    await manager
      .getRepository(CrewAssignment)
      .save(assignments.slice(0, offset));
    await manager.getRepository(Spacecraft).save(ships);
  }
}
