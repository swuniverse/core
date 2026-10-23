jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftKind: { SHIP: 'SHIP', STATION: 'STATION' },
  StationRole: { CONSTRUCTION: 'CONSTRUCTION' },
  SpacecraftStatus: { IDLE: 'IDLE' },
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
  const service = new StationConstructionService(dataSource);

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
    expect(shipRepo.save).toHaveBeenCalledTimes(7);
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
