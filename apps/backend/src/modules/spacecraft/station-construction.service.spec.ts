jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftKind: { SHIP: 'SHIP', STATION: 'STATION' },
  StationRole: {
    CONSTRUCTION: 'CONSTRUCTION',
    DEPOT_SMALL: 'DEPOT_LARGE',
    DEPOT_LARGE: 'DEPOT_LARGE',
    SHIPYARD: 'SHIPYARD',
    SENSOR: 'SENSOR',
    OUTPOST: 'OUTPOST',
    BASE: 'BASE',
  },
  SpacecraftStatus: { IDLE: 'IDLE', UNDER_CONSTRUCTION: 'UNDER_CONSTRUCTION' },
  AlertState: { GREEN: 'GREEN' },
  SpacecraftOperatingMode: { NORMAL: 'NORMAL' },
}));
jest.mock('./entities/cargo-item.entity', () => ({ CargoItem: class CargoItem {} }));
jest.mock('./entities/ship-class-def.entity', () => ({ ShipClassDef: class ShipClassDef {} }));
jest.mock('../colony/entities/crew-assignment.entity', () => ({ CrewAssignment: class CrewAssignment {} }));

import { StationConstructionService } from './station-construction.service';
import {
  Spacecraft,
  SpacecraftKind,
  StationRole,
  SpacecraftStatus,
} from './entities/spacecraft.entity';

function repository<T extends object>() {
  return {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    countBy: jest.fn(),
    find: jest.fn(),
    create: jest.fn((value: T) => value),
    save: jest.fn(async (value: T) => ({ id: 100, ...value })),
    remove: jest.fn(),
    delete: jest.fn(),
  };
}

describe('StationConstructionService', () => {
  const shipRepo = repository<Spacecraft>();
  const cargoRepo = repository<any>();
  const classRepo = repository<any>();
  const crewRepo = repository<any>();
  const manager = {
    getRepository: jest.fn((entity: { name: string }) => {
      if (entity.name === 'Spacecraft') return shipRepo;
      if (entity.name === 'CargoItem') return cargoRepo;
      if (entity.name === 'ShipClassDef') return classRepo;
      return crewRepo;
    }),
  };
  const dataSource = { transaction: jest.fn((run: (value: unknown) => unknown) => run(manager)) } as any;
  const gameData = {
    getShipClassDefByKey: jest.fn(),
    getCommodity: jest.fn().mockReturnValue({ name: 'Stationsmodul' }),
  };
  const service = new StationConstructionService(dataSource, gameData as any);

  beforeEach(() => {
    jest.clearAllMocks();
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 3,
      status: SpacecraftStatus.IDLE,
      kind: SpacecraftKind.SHIP,
      locationId: 44,
      location: { kind: 'SYSTEM_FIELD', systemField: { effects: [] } },
      user: { faction: 'REBEL_ALLIANCE' },
      energy: 120,
      crewRequired: 0,
      modules: [{category: 'SPECIAL', moduleType: 'Shuttlerampe', integrity:100,isActive:true}],
      shields: 0,
      runtimeSystems: { SHUTTLE_RAMP: { active: true, integrity: 100 } },
    });
    shipRepo.countBy.mockResolvedValue(0);
    classRepo.findOneBy
      .mockResolvedValueOnce({ id: 9, key: 'REBEL_WORKBEE_DROID', role: 'WORKBEE', crewMin: 0, hullBase: 50, shieldBase: 0, epsBase: 20, crewMax: 1, cargoCapacity: 0, batteryBase: 20, reactorBase: 20, warpdriveBase: 0 })
      .mockResolvedValueOnce({ id: 10, key: 'REBEL_CONSTRUCTION', name: 'Konstrukt', role: 'CONSTRUCTION', hullBase: 500, shieldBase: 0, epsBase: 0, crewMax: 0, cargoCapacity: 100, batteryBase: 0, reactorBase: 0, warpdriveBase: 0 });
    cargoRepo.find.mockResolvedValue([
      { id: 1, commodityId: 20061, amount: 5 },
      { id: 2, commodityId: 2, amount: 100 },
      { id: 3, commodityId: 21, amount: 50 },
    ]);
    crewRepo.find.mockResolvedValue([]);
    shipRepo.find.mockResolvedValue([]);
  });

  it('creates a construction and launches five docked Workbees atomically', async () => {
    const result = await service.build(7, 3);

    expect(result.station.stationRole).toBe(StationRole.CONSTRUCTION);
    expect(shipRepo.save).toHaveBeenCalledWith(expect.objectContaining({id:7,energy:20,cargoUsed:0}));
    expect(shipRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: SpacecraftKind.STATION,
        stationRole: StationRole.CONSTRUCTION,
        dockCapacity: 50,
        hull: 500,
      }),
    );
    expect(shipRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ dockedAtId: 100, shipClassId: 9 }),
    );
    expect(cargoRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ commodityId: 20061, amount: 0 }),
      ]),
    );
  });

  it.each([
    ['another station is present', async () => shipRepo.find.mockResolvedValue([{ id: 8, kind: SpacecraftKind.STATION }]), 'Hier ist bereits eine Station errichtet'],
    ['the player owns two constructions', async () => shipRepo.countBy.mockResolvedValue(2), 'Es können nur 2 Konstrukte errichtet werden'],
    ['the field forbids stations', async () => shipRepo.findOne.mockResolvedValue({ ...(await shipRepo.findOne()), location: { kind: 'SYSTEM_FIELD', systemField: { effects: ['NO_STATION_CONSTRUCTION'] } } }), 'In diesem Sektor kann keine Station errichtet werden'],
  ])('rejects construction when %s', async (_name, arrange, message) => {
    await arrange();
    await expect(service.build(7, 3)).rejects.toThrow(message);
  });

  describe('station expansion', () => {
    const construction = {
      id: 100,
      userId: 3,
      user: { faction: 'REBEL_ALLIANCE' },
      kind: SpacecraftKind.STATION,
      stationRole: StationRole.CONSTRUCTION,
      status: SpacecraftStatus.IDLE,
      location: { kind: 'SYSTEM_FIELD', systemField: { starSystem: { id: 4 } } },
      locationId: 44,
    };
    const stationClass = {
      id: 20,
      key: 'REBEL_DEPOT_LARGE',
      name: 'Großes Versorgungsdepot',
      role: 'DEPOT_LARGE',
      category: 'STATION',
      buildTimeTicks: 30,
      hullBase: 1000,
      shieldBase: 2000,
      epsBase: 100,
      crewMax: 10,
      cargoCapacity: 50000,
      batteryBase: 25,
      reactorBase: 25,
      warpdriveBase: 0,
    };

    beforeEach(() => {
      gameData.getShipClassDefByKey.mockReturnValue({
        buildCosts: [{ commodityId: 10101, amount: 4 }],
        station: {
          location: 'INSIDE_SYSTEM',
          buildLimit: 1,
          requiredWorkbees: 20,
          dockCapacity: 20,
        },
      });
      shipRepo.save.mockImplementation(async (value: any) => ({ id: value.id ?? 100, ...value }));
      shipRepo.findOne.mockResolvedValue({ ...construction });
      shipRepo.find.mockResolvedValue(Array.from({ length: 20 }, (_, index) => ({
        id: 200 + index,
        dockedAtId: 100,
        shipClass: { role: 'WORKBEE' },
      })));
      classRepo.findOneBy.mockReset().mockResolvedValue(stationClass);
      cargoRepo.find.mockResolvedValue([
        { id: 1, spacecraftId: 100, commodityId: 10101, amount: 4 },
      ]);
    });

    it('returns costs and readiness for every faction station class', async () => {
      classRepo.find.mockResolvedValue([stationClass]);

      await expect(service.getExpansionOptions(100, 3)).resolves.toEqual([
        expect.objectContaining({
          classKey: 'REBEL_DEPOT_LARGE',
          role: 'DEPOT_LARGE',
          workbees: { docked: 20, required: 20, sufficient: true },
          location: { rule: 'INSIDE_SYSTEM', allowed: true },
          limit: { maximum: 1, current: 0, reached: false },
          modules: [
            expect.objectContaining({ commodityId: 10101, stored: 4, required: 4, sufficient: true }),
          ],
          canStart: true,
        }),
      ]);
    });

    it('starts expansion only with valid location, limit, Workbees and modules', async () => {
      classRepo.find.mockResolvedValue([stationClass]);
      shipRepo.save.mockImplementation(async (value: any) => ({ id: value.id ?? 100, ...value }));

      const result = await service.expand(100, 3, 'REBEL_DEPOT_LARGE');

      expect(result.status).toBe(SpacecraftStatus.UNDER_CONSTRUCTION);
      expect(result.stationRole).toBe(StationRole.DEPOT_LARGE);
      expect(result.constructionTicksRemaining).toBe(30);
      expect(cargoRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ commodityId: 10101, amount: 0 })]),
      );
    });

    const enoughWorkbees = Array.from({ length: 20 }, (_, index) => ({
      id: 300 + index,
      shipClass: { role: 'WORKBEE' },
    }));

    it.each([
      ['wrong location', { ...construction, location: { kind: 'GALAXY_FIELD', galaxyField: { starSystem: null } } }, enoughWorkbees, 0, 'nur innerhalb eines Systems'],
      ['role limit', construction, enoughWorkbees, 1, 'limit'],
      ['too few Workbees', construction, [{ id: 201, shipClass: { role: 'WORKBEE' } }], 0, 'Nicht genügend Workbees'],
    ])('rejects expansion for %s', async (_name, station, workbees, count, message) => {
      shipRepo.findOne.mockResolvedValue({ ...construction, ...station, status: SpacecraftStatus.IDLE, stationRole: StationRole.CONSTRUCTION });
      shipRepo.find.mockResolvedValue(workbees);
      shipRepo.countBy.mockResolvedValue(count);
      await expect(service.expand(100, 3, 'REBEL_DEPOT_LARGE')).rejects.toThrow(message);
    });

    it('refuses an outpost on a field that already has a trade post', async () => {
      const posts = { locationTaken: jest.fn().mockResolvedValue(true) };
      const withPosts = new StationConstructionService(dataSource, gameData as never, undefined, posts as never);
      classRepo.findOneBy.mockResolvedValue({ ...stationClass, key: 'REBEL_OUTPOST', role: 'OUTPOST' });
      shipRepo.countBy.mockResolvedValue(0);

      await expect(withPosts.expand(100, 3, 'REBEL_OUTPOST')).rejects.toThrow('An diesem Ort befindet sich bereits ein Handelsposten');
      expect(posts.locationTaken).toHaveBeenCalledWith(manager, 44);

      posts.locationTaken.mockResolvedValue(false);
      await expect(withPosts.expand(100, 3, 'REBEL_OUTPOST')).resolves.toMatchObject({ stationRole: 'OUTPOST' });
    });

    it('pauses an expansion without enough docked Workbees', async () => {
      shipRepo.findOne.mockResolvedValue({
        ...construction,
        status: SpacecraftStatus.UNDER_CONSTRUCTION,
        stationRole: StationRole.DEPOT_SMALL,
        constructionTicksRemaining: 2,
        shipClass: stationClass,
      });
      shipRepo.find.mockResolvedValue([]);

      await expect(service.processTick(100)).resolves.toEqual(
        expect.objectContaining({ paused: true, completed: false }),
      );
      expect(shipRepo.save).not.toHaveBeenCalled();
    });

    it('finishes an expansion with full class values', async () => {
      shipRepo.findOne.mockResolvedValue({
        ...construction,
        status: SpacecraftStatus.UNDER_CONSTRUCTION,
        stationRole: StationRole.DEPOT_SMALL,
        constructionTicksRemaining: 1,
        shipClass: stationClass,
      });

      const result = await service.processTick(100);

      expect(result).toEqual(expect.objectContaining({ completed: true }));
      expect(shipRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        status: SpacecraftStatus.IDLE,
        hull: 1000,
        hullMax: 1000,
        shields: 2000,
        shieldsMax: 2000,
        cargoMax: 50000,
        constructionTicksRemaining: 0,
      }));
    });
  });

  it('removes an owned construction and undocks its Workbees', async () => {
    shipRepo.findOne.mockResolvedValue({ id: 100, userId: 3, kind: SpacecraftKind.STATION, stationRole: StationRole.CONSTRUCTION });
    shipRepo.find.mockResolvedValue([{ id: 101, dockedAtId: 100 }]);

    await service.remove(100, 3);

    expect(shipRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 101, dockedAtId: null }),
      ]),
    );
    expect(shipRepo.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 100 }));
  });
});
