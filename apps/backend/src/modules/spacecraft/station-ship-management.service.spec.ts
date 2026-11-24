import { BadRequestException } from '@nestjs/common';
import { ShipManagementService } from './ship-management.service';
import { StationShipManagementService } from './station-ship-management.service';

jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftKind: { SHIP: 'SHIP', STATION: 'STATION' },
  StationRole: { OUTPOST: 'OUTPOST', BASE: 'BASE', SHIPYARD: 'SHIPYARD' },
}));
jest.mock('./entities/cargo-item.entity', () => ({ CargoItem: class CargoItem {} }));
jest.mock('./entities/ship-class-def.entity', () => ({ ShipClassDef: class ShipClassDef {} }));
jest.mock('./entities/spacecraft-torpedo-storage.entity', () => ({
  SpacecraftTorpedoStorage: class SpacecraftTorpedoStorage {},
}));
jest.mock('../colony/entities/crew-assignment.entity', () => ({
  CrewAssignment: class CrewAssignment {},
}));
jest.mock('./spacecraft-torpedo.service', () => ({
  SpacecraftTorpedoService: class SpacecraftTorpedoService {},
}));
jest.mock('../messaging/messaging.service', () => ({ MessagingService: class MessagingService {} }));
jest.mock('../game-data/game-data.service', () => ({ GameDataService: class GameDataService {} }));

type Row = Record<string, any>;

function setup(stationOverrides: Row = {}, shipOverrides: Row = {}) {
  const station: Row = {
    id: 100,
    userId: 1,
    name: 'Avanti',
    kind: 'STATION',
    stationRole: 'OUTPOST',
    energy: 50,
    energyMax: 100,
    crew: 8,
    crewMax: 20,
    crewRequired: 5,
    cargoUsed: 10,
    ...stationOverrides,
  };
  const ship: Row = {
    id: 7,
    userId: 1,
    name: 'Falke',
    dockedAtId: 100,
    battery: 0,
    batteryMax: 30,
    crew: 2,
    crewMax: 6,
    reactorFuel: 0,
    reactorFuelMax: 0,
    modules: [],
    runtimeSystems: {},
    ...shipOverrides,
  };
  const crewRows: Row[] = [3, 4, 5].map((crewId) => ({ crewId, spacecraftId: 100, userId: 1, slot: null }));
  const manager: Row = {
    findOne: jest.fn(async (entity: { name: string }, options: { where: Row }) => {
      if (entity.name === 'Spacecraft') {
        if (options.where.kind) return options.where.id === 100 && options.where.userId === station.userId ? station : null;
        return options.where.id === ship.id && options.where.dockedAtId === 100 ? ship : null;
      }
      return null;
    }),
    find: jest.fn(async (entity: { name: string }) => (entity.name === 'CargoItem' ? [] : [])),
    save: jest.fn(async (value: unknown) => value),
    getRepository: jest.fn(() => ({
      find: jest.fn(async (options: { where: Row; take?: number }) =>
        options.where.spacecraftId === 100 ? crewRows.slice(0, options.take) : [],
      ),
      save: jest.fn(async (value: unknown) => value),
      remove: jest.fn(),
      findOneBy: jest.fn(async () => null),
    })),
  };
  const dataSource = {
    manager,
    transaction: jest.fn(async (work: (m: Row) => unknown) => work(manager)),
  };
  const messaging = { sendSystem: jest.fn() };
  const management = new ShipManagementService({} as never, {} as never);
  const service = new StationShipManagementService(dataSource as never, management, messaging as never);
  return { service, station, ship, messaging, manager };
}

describe('StationShipManagementService', () => {
  it('charges the docked ship battery from the station EPS', async () => {
    const { service, station, ship } = setup();
    const { results } = await service.execute(100, 1, [{ shipId: 7, batteryCharge: 20 }]);
    expect(results[0].applied).toEqual(['Batterie: +20']);
    expect(ship.battery).toBe(20);
    expect(station.energy).toBe(30);
  });

  it('limits the charge by station EPS and free battery', async () => {
    const { service, station, ship } = setup({ energy: 4 });
    const { results } = await service.execute(100, 1, [{ shipId: 7, batteryCharge: 20 }]);
    expect(results[0].applied).toEqual(['Batterie: +4']);
    expect(ship.battery).toBe(4);
    expect(station.energy).toBe(0);
  });

  it('beams station crew aboard', async () => {
    const { service, station, ship } = setup();
    const { results } = await service.execute(100, 1, [{ shipId: 7, targetCrew: 4 }]);
    expect(results[0].applied).toEqual(['Crew: +2']);
    expect(ship.crew).toBe(4);
    expect(station.crew).toBe(6);
  });

  it('rejects ships that are not docked at the station', async () => {
    const { service } = setup();
    const { results } = await service.execute(100, 1, [{ shipId: 99, batteryCharge: 5 }]);
    expect(results[0].rejected).toEqual(['Schiff ist nicht an der Station angedockt']);
  });

  it('refuses stations that cannot manage ships', async () => {
    const { service } = setup({ stationRole: 'SHIPYARD' });
    await expect(service.execute(100, 1, [{ shipId: 7, batteryCharge: 5 }])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuses stations without their full crew', async () => {
    const { service } = setup({ crew: 3 });
    await expect(service.execute(100, 1, [{ shipId: 7, batteryCharge: 5 }])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('does not charge shielded foreign ships and notifies their owner otherwise', async () => {
    const shielded = setup({}, { userId: 2, runtimeSystems: { SHIELDS: { active: true } } });
    const refused = await shielded.service.execute(100, 1, [{ shipId: 7, batteryCharge: 5 }]);
    expect(refused.results[0].rejected[0]).toContain('Schilde');

    const open = setup({}, { userId: 2 });
    const { results } = await open.service.execute(100, 1, [{ shipId: 7, batteryCharge: 5 }]);
    expect(results[0].applied).toEqual(['Batterie: +5']);
    expect(open.messaging.sendSystem).toHaveBeenCalledWith(
      2,
      expect.stringContaining('Batterie: +5'),
      undefined,
      'STATION',
    );
  });

  it('toggles the battery reload switch of an owned station', async () => {
    const { service, station } = setup();
    const result = await service.setBatteryReload(100, 1, true);
    expect(station.reloadBattery).toBe(true);
    expect(result.message).toContain('aktiv');
  });
});
