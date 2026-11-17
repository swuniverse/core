import { BadRequestException } from '@nestjs/common';
jest.mock('../starmap/entities/space-location.entity', () => ({ SpaceLocation: class SpaceLocation {} }));
import { GameDataService } from '../game-data/game-data.service';
import { StationRole } from './entities/spacecraft.entity';
import { ShipbuildingCoreService } from './shipbuilding-core.service';
import { StationShipyardService } from './station-shipyard.service';

describe('StationShipyardService', () => {
  const station = { id: 10, userId: 2, kind: 'STATION', stationRole: StationRole.SHIPYARD, dockCapacity: 1, energy: 50, locationId: 9 };
  const hull = { id: 4, name: 'Corvette', key: 'CORVETTE', isNpc: false, buildTimeTicks: 2, hullBase: 100, shieldBase: 50, epsBase: 10, batteryBase: 4, reactorBase: 3, warpdriveBase: 2, evadeBase: 1, cargoCapacity: 20, crewMin: 2, crewMax: 8 };
  const queueRepo = { create: jest.fn((x) => x), find: jest.fn(), save: jest.fn(async (x) => ({ id: 1, ...x })) };
  const state: any = { cargo: [{ spacecraftId: 10, commodityId: 1, amount: 1 }, { spacecraftId: 10, commodityId: 7, amount: 4 }], ships: [] };
  const manager: any = {
    findOne: jest.fn(async (entity: any, options: any) => entity.name === 'Spacecraft' ? (options.where.id === 10 ? station : null) : entity.name === 'User' ? { id: 2, faction: null } : entity.name === 'ShipClassDef' ? hull : entity.name === 'ColonyShipBuildQueue' ? (await queueRepo.find())?.find((job: any) => job.id === options.where.id) : null),
    find: jest.fn(async (entity: any, options: any) => {
      if (entity.name === 'CargoItem') return state.cargo;
      if (entity.name === 'ColonyShipBuildQueue') return queueRepo.find();
      return state.ships;
    }),
    count: jest.fn(async (entity: any) => entity.name === 'ColonyShipBuildQueue' ? 0 : state.ships.filter((s: any) => s.dockedAtId === 10).length),
    findOneOrFail: jest.fn(async (_entity: any, options: any) => state.cargo.find((item: any) => item.commodityId === options.where.commodityId)),
    update: jest.fn(async () => ({})),
    createQueryBuilder: jest.fn(() => ({ select: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getRawOne: jest.fn(async () => ({ total: state.cargo.reduce((sum: number, item: any) => sum + item.amount, 0) })) })),
    create: jest.fn((_entity: any, value: any) => value),
    save: jest.fn(async (_entity: any, value: any) => {
      if (Array.isArray(value)) return value;
      if (_entity.name === 'Spacecraft' && value.id == null) value.id = 50;
      if (_entity.name === 'ColonyShipBuildplan' && value.id == null) value.id = 1;
      return value;
    }),
  };
  const prepared = { moduleSelections: [{ slotId: 'w', commodityId: 1 }], moduleCommodityIds: [1], moduleTypes: ['M1'], modules: [{ slotId: 'w', commodityId: 1, moduleType: 'M1', category: 'ENERGY_WEAPON', level: 3 }], materialCosts: [{ commodityId: 7, amount: 4 }], crewRequired: 4 };
  const stats: any = { applyStats: jest.fn((ship: any) => { ship.hullMax = 125; ship.cargoMax = 30; return ship; }) };
  const gameData: any = {
    getShipClassSlotRuleForShipClass: jest.fn(() => ({
      imageKey: 'corvette',
      layoutKey: 'corvette',
      moduleSlots: { SPECIAL: 0 },
      slots: [{ slotId: 'w', moduleCategory: 'ENERGY_WEAPON', label: 'Waffe', anchorX: 0, anchorY: 0, calloutSide: 'left', order: 0 }],
    })),
    getShipClassDefByKey: jest.fn(() => ({ stuRumpId: 4, buildCosts: [{ commodityId: 7, amount: 4 }] })),
    getShipyardRumpStats: jest.fn(() => ({ moduleLevel: 1, specialSlots: 0 })),
    getFabricationItemByOutputCommodity: jest.fn(() => ({ queueType: 'MODULE', moduleType: 'M1', shipyardType: 'ENERGY_WEAPON', moduleLevel: 3, shipyardModuleStats: { crew: 2 } })),
    getAllFabricationItems: jest.fn(() => [{
      outputCommodityId: 1,
      displayName: 'Laserkanone',
      moduleType: 'M1',
      moduleCategory: 'ENERGY_WEAPON',
      shipyardGroup: 'WEAPONS',
      shipyardType: 'ENERGY_WEAPON',
      moduleLevel: 3,
      moduleClass: 1,
      researchId: null,
      researchRequired: null,
      faction: null,
      shipyardModuleStats: { crew: 2, level: 3, upgradeFactor: 1, downgradeFactor: 1, energyCost: 0, defaultFactor: 1 },
    }]),
    isShipyardModuleAllowedForShipClass: jest.fn(() => true),
    getCommodity: jest.fn(() => ({ name: 'Laserkanone' })),
  };
  const dataSource: any = { transaction: (fn: any) => fn(manager), manager };
  const core = new ShipbuildingCoreService(gameData as never, { isShipClassUnlocked: async () => true, hasTech: async () => true } as never, dataSource, stats as never, { dateAfterScaledMinutes: () => new Date(), dateAfterScaledSeconds: () => new Date() } as never);
  const service = new StationShipyardService(
    { transaction: (fn: any) => fn(manager), manager } as never,
    queueRepo as never,
    { find: jest.fn(async () => [hull]), findOneBy: jest.fn(async () => hull) } as never,
    core,
    { isShipClassUnlocked: jest.fn(async () => true) } as never,
    { findOne: jest.fn(async () => ({ faction: null })) } as never,
    gameData as GameDataService,
  );

  beforeEach(() => { jest.clearAllMocks(); state.cargo.forEach((x: any) => x.amount = x.commodityId === 1 ? 1 : 4); state.ships = []; });

  it('exposes unlocked hull layouts and researched modules with station inventory', async () => {
    const overview = await service.overview(10, 2);

    expect(overview.options[0]).toMatchObject({
      id: 4,
      layout: {
        shipClassId: 4,
        imageKey: 'corvette',
        baseStats: { baseCrew: 2 },
      },
    });
    expect(overview.availableModules).toEqual([
      expect.objectContaining({
        commodityId: 1,
        amount: 1,
        displayName: 'Laserkanone',
        crewRequired: 2,
        compatibleShipClassIds: [4],
      }),
    ]);
  });

  it('atomically consumes station cargo and creates a STATION-origin queue', async () => {
    const queue = await service.build(10, 2, { shipClassId: 4, name: 'Hope', moduleSelections: [{ slotId: 'w', commodityId: 1 }] });
    expect(queue).toMatchObject({ source: 'STATION', stationId: 10, colonyId: null, userId: 2, buildPlanId: 1, buildPlanName: 'Corvette Buildplan' });
    expect(state.cargo.map((x: any) => x.amount)).toEqual([0, 0]);
  });

  it('persists canonical modules and derived stats when a berth is available', async () => {
    const job: any = { id: 1, stationId: 10, source: 'STATION', status: 'QUEUED', mode: 'BUILD', shipClassId: 4, shipClass: hull, userId: 2, name: 'Hope', moduleSelections: prepared.moduleSelections, moduleTypes: prepared.moduleTypes, moduleCommodityIds: prepared.moduleCommodityIds, finishesAt: new Date(0) };
    queueRepo.find.mockResolvedValue([job]);

    await service.processTick(10);

    expect(manager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ buildPlanId: undefined, crewRequired: 4 }));
    expect(manager.save).toHaveBeenCalledWith(expect.anything(), expect.arrayContaining([
      expect.objectContaining({ moduleType: 'M1', category: 'ENERGY_WEAPON', level: 3 }),
    ]));
    expect(stats.applyStats).toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      id: 50,
      dockedAtId: 10,
      crewRequired: 4,
      hullMax: 125,
      cargoMax: 30,
    }));
    expect(job.status).toBe('COMPLETED');
  });

  it('keeps a due job queued when authoritative dock capacity is full', async () => {
    state.ships = [{ id: 99, dockedAtId: 10 }];
    const job: any = { id: 1, stationId: 10, source: 'STATION', status: 'QUEUED', mode: 'BUILD', shipClassId: 4, userId: 2, name: 'Hope', moduleSelections: [], finishesAt: new Date(0) };
    queueRepo.find.mockResolvedValue([job]);
    await service.processTick(10);
    expect(job.status).toBe('QUEUED');
    expect(manager.save).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ dockedAtId: 10, name: 'Hope' }));
  });

  it('rejects construction outside a Raumwerft role', async () => {
    station.stationRole = StationRole.DEPOT_SMALL;
    await expect(service.build(10, 2, { shipClassId: 4, name: 'Nope', moduleSelections: [] })).rejects.toThrow(BadRequestException);
    station.stationRole = StationRole.SHIPYARD;
  });
});
