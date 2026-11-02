import { BadRequestException } from '@nestjs/common';
jest.mock('../starmap/entities/space-location.entity', () => ({ SpaceLocation: class SpaceLocation {} }));
import { StationRole } from './entities/spacecraft.entity';
import { StationShipyardService } from './station-shipyard.service';

describe('StationShipyardService', () => {
  const station = { id: 10, userId: 2, kind: 'STATION', stationRole: StationRole.SHIPYARD, dockCapacity: 1, energy: 50, locationId: 9 };
  const hull = { id: 4, name: 'Corvette', key: 'CORVETTE', isNpc: false, buildTimeTicks: 2, epsBase: 10 };
  const queueRepo = { create: jest.fn((x) => x), find: jest.fn(), save: jest.fn(async (x) => ({ id: 1, ...x })) };
  const state: any = { cargo: [{ spacecraftId: 10, commodityId: 1, amount: 1 }, { spacecraftId: 10, commodityId: 7, amount: 4 }], ships: [] };
  const manager: any = {
    findOne: jest.fn(async (entity: any, options: any) => entity.name === 'Spacecraft' ? (options.where.id === 10 ? station : null) : null),
    find: jest.fn(async (entity: any, options: any) => entity.name === 'CargoItem' ? state.cargo : state.ships),
    count: jest.fn(async () => state.ships.filter((s: any) => s.dockedAtId === 10).length),
    save: jest.fn(async (_entity: any, value: any) => value),
  };
  const core: any = { prepare: jest.fn(() => ({ moduleSelections: [{ slotId: 'w', commodityId: 1 }], moduleCommodityIds: [1], moduleTypes: ['ENERGY_WEAPON'], materialCosts: [{ commodityId: 7, amount: 4 }], crewRequired: 2 })) };
  const service = new StationShipyardService(
    { transaction: (fn: any) => fn(manager), manager } as never,
    queueRepo as never,
    { findOneBy: jest.fn(async () => hull) } as never,
    { save: jest.fn(), create: jest.fn((x) => x) } as never,
    { save: jest.fn(async (x) => x), create: jest.fn((x) => x) } as never,
    core,
    { dateAfterScaledMinutes: jest.fn(() => new Date()) } as never,
    { isShipClassUnlocked: jest.fn(async () => true) } as never,
    { findOne: jest.fn(async () => ({ faction: null })) } as never,
  );

  beforeEach(() => { jest.clearAllMocks(); state.cargo.forEach((x: any) => x.amount = x.commodityId === 1 ? 1 : 4); state.ships = []; });

  it('atomically consumes station cargo and creates a STATION-origin queue', async () => {
    const queue = await service.build(10, 2, { shipClassId: 4, name: 'Hope', moduleSelections: [{ slotId: 'w', commodityId: 1 }] });
    expect(queue).toMatchObject({ source: 'STATION', stationId: 10, colonyId: null, userId: 2 });
    expect(state.cargo.map((x: any) => x.amount)).toEqual([0, 0]);
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
