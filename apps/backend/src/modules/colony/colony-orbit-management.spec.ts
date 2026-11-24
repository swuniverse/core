jest.mock('../starmap/entities/space-location.entity', () => ({
  SpaceLocation: class SpaceLocation {},
}));

import { ColonyOrbitService } from './colony-orbit.service';
import { ShipManagementService } from '../spacecraft/ship-management.service';

const systemField = { id: 5, starSystemId: 10, sx: 3, sy: 4 };
const location = { id: 50, kind: 'SYSTEM_FIELD', systemFieldId: 5, systemField };

function ship(id: number, userId: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    userId,
    name: `Ship ${id}`,
    shipClassId: 1,
    status: 'IDLE',
    locationId: 50,
    location,
    fleetId: null,
    fleet: null,
    user: { id: userId, username: `Spieler ${userId}` },
    modules: [],
    crew: 3,
    crewMax: 5,
    battery: 0,
    batteryMax: 20,
    reactorFuel: 0,
    reactorFuelMax: 0,
    cargoMax: 10,
    runtimeSystems: {},
    ...overrides,
  };
}

const torpedoTypes = [
  { id: 1, name: 'Photon', commodityId: 501 },
  { id: 2, name: 'Plasma', commodityId: 502 },
  { id: 3, name: 'Quanten', commodityId: 503 },
];

function setup(
  ships: ReturnType<typeof ship>[],
  friend = false,
  {
    storage = [] as Array<{ commodityId: number; amount: number }>,
    cargo = [] as Array<{ spacecraftId: number; commodityId: number; amount: number }>,
    torpedoes = [] as Array<{ spacecraftId: number; torpedoTypeId: number; amount: number }>,
  } = {},
) {
  const colony = {
    id: 1,
    userId: 1,
    name: 'Heimat',
    systemField,
    storage,
    changeable: { energy: 100, maxEnergy: 100 },
  };
  const shipRepo = {
    find: jest.fn(async () => ships),
    findOne: jest.fn(async ({ where }: { where: { id: number } }) =>
      ships.find((entry) => entry.id === where.id) ?? null,
    ),
    manager: { save: jest.fn(async (value: unknown) => value) },
  };
  const empty = { find: jest.fn(async () => []) };
  const cargoRepo = { find: jest.fn(async () => cargo) };
  const torpedoRepo = { find: jest.fn(async () => torpedoes) };
  const gameData = {
    isSmallCraftCommodity: (id: number) => id >= 20000,
    getCommodity: (id: number) => ({ name: `Ware ${id}` }),
    getTorpedoType: (id: number) => torpedoTypes.find((type) => type.id === id),
  };
  // Ship 1 fires types 1 and 2; other ships carry no torpedoes.
  const torpedoService = {
    getCompatibleTorpedoTypes: jest.fn(async (target: { id: number }) =>
      target.id === 1 ? torpedoTypes.slice(0, 2) : [],
    ),
  };
  const shuttles = {
    rampStatus: (target: { id: number }) =>
      target.id === 1 ? { capacity: 4, blockReason: null } : { capacity: 0, blockReason: 'Keine Shuttleplätze' },
  };
  const messaging = { sendSystem: jest.fn(async () => undefined) };
  const relationships = {
    resolve: jest.fn(async () => ({ mayProvisionProtectedShip: friend })),
  };
  const service = new ColonyOrbitService(
    { manager: { getRepository: () => torpedoRepo } } as never,
    { save: jest.fn(async (value: unknown) => value) } as never,
    empty as never,
    shipRepo as never,
    cargoRepo as never,
    empty as never,
    {} as never,
    empty as never,
    { findOwnedColony: jest.fn(async () => colony) } as never,
    gameData as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    new ShipManagementService(gameData as never, torpedoService as never),
    {} as never,
    undefined,
    undefined,
    messaging as never,
    shuttles as never,
    relationships as never,
  );
  return { service, colony, messaging, relationships };
}

const shielded = { runtimeSystems: { SHIELDS: { active: true } } };

describe('ColonyOrbitService orbital management (STU ShowOrbitManagement)', () => {
  it('lists uncloaked foreign ships with owner and fleet but without their state', async () => {
    const { service } = setup([
      ship(1, 1),
      ship(2, 2, { fleetId: 9, fleet: { id: 9, name: 'Rot' } }),
      ship(3, 2, { runtimeSystems: { CLOAK: { active: true } } }),
      ship(4, 2, { status: 'DESTROYED' }),
    ]);
    const { ships } = await service.getManagement(1, 1);
    expect(ships.map((entry) => entry.id)).toEqual([1, 2]);
    expect(ships[1]).toMatchObject({
      foreign: true,
      ownerName: 'Spieler 2',
      fleetName: 'Rot',
      crew: null,
      cargo: null,
      battery: { current: null, max: 20 },
    });
    expect(ships[0]).toMatchObject({ foreign: false, crew: { current: 3 } });
  });

  it('rejects crew changes on foreign ships', async () => {
    const { service } = setup([ship(2, 2)]);
    const { results } = await service.executeManagement(1, 1, [
      { shipId: 2, targetCrew: 1 },
    ]);
    expect(results[0].rejected).toEqual(['Crew nur bei eigenen Schiffen']);
  });

  it('refuses a cloaked foreign ship', async () => {
    const { service } = setup([ship(3, 2, { runtimeSystems: { CLOAK: { active: true } } })]);
    const { results } = await service.executeManagement(1, 1, [
      { shipId: 3, batteryCharge: 5 },
    ]);
    expect(results[0].rejected).toEqual(['Schiff ist nicht im Kolonieorbit']);
  });

  it('charges a shielded foreign battery only for friends and tells the owner', async () => {
    const stranger = setup([ship(2, 2, shielded)]);
    const refused = await stranger.service.executeManagement(1, 1, [
      { shipId: 2, batteryCharge: 5 },
    ]);
    expect(refused.results[0].rejected[0]).toContain('Schilde');
    expect(stranger.relationships.resolve).toHaveBeenCalledWith(2, 1);

    const friend = setup([ship(2, 2, shielded)], true);
    const charged = await friend.service.executeManagement(1, 1, [
      { shipId: 2, batteryCharge: 5 },
    ]);
    expect(charged.results[0].applied).toEqual(['Batterie: +5']);
    expect(friend.colony.changeable.energy).toBe(95);
    expect(friend.messaging.sendSystem).toHaveBeenCalledWith(
      2,
      expect.stringContaining('Batterie: +5'),
      undefined,
      'SHIP',
    );
  });

  it('offers compatible torpedo types the colony stocks or the ship already carries', async () => {
    const { service } = setup([ship(1, 1)], false, {
      storage: [{ commodityId: 501, amount: 12 }, { commodityId: 503, amount: 9 }],
      torpedoes: [{ spacecraftId: 1, torpedoTypeId: 2, amount: 3 }],
    });
    const { ships } = await service.getManagement(1, 1);
    expect(ships[0].possibleTorpedoTypes).toEqual([
      { id: 1, name: 'Photon', commodityId: 501, stock: 12 },
      { id: 2, name: 'Plasma', commodityId: 502, stock: 0 },
    ]);
  });

  it('lists shuttle stock of ship and colony only for ships with a ramp', async () => {
    const { service } = setup([ship(1, 1), ship(2, 1)], false, {
      storage: [{ commodityId: 20061, amount: 2 }, { commodityId: 7, amount: 50 }],
      cargo: [{ spacecraftId: 1, commodityId: 21401, amount: 1 }],
    });
    const { ships } = await service.getManagement(1, 1);
    expect(ships[0].shuttles).toEqual({
      capacity: 4,
      blockReason: null,
      items: [
        { commodityId: 21401, name: 'Ware 21401', ship: 1, colony: 0 },
        { commodityId: 20061, name: 'Ware 20061', ship: 0, colony: 2 },
      ],
    });
    expect(ships[1].shuttles).toBeNull();
  });

  it('rejects a torpedo type the ship cannot fire', async () => {
    const { service } = setup([ship(1, 1)], false, {
      storage: [{ commodityId: 503, amount: 9 }],
    });
    const { results } = await service.executeManagement(1, 1, [
      { shipId: 1, torpedoTypeId: 3, torpedoLoad: 2 },
    ]);
    expect(results[0].rejected).toEqual(['Torpedotyp ist für dieses Schiff nicht möglich']);
  });
});
