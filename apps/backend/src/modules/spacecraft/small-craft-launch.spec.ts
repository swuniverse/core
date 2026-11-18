jest.mock('../starmap/entities/space-location.entity', () => ({ SpaceLocation: class SpaceLocation {} }));
import { createSmallCraft } from './small-craft-launch';

describe('small craft startup', () => {
  it.each(['SHUTTLE', 'WORKBEE'])('launches %s with full capacities but switched-off drives, shields and scanners', async (role) => {
    const hull = { id: 4, key: role, role, hullBase: 100, shieldBase: 20, epsBase: 50, crewMin: 1, crewMax: 2, cargoCapacity: 10, batteryBase: 3, reactorBase: 0, warpdriveBase: 5, evadeBase: 0 };
    const definitions = [
      { name: 'Hyperantrieb', category: 'HYPERDRIVE', public: { baseWarpdriveCapacity: 10 }, secret: {} },
      { name: 'Schilde', category: 'SHIELDS', public: { baseShieldPoints: 30 }, secret: {} },
      { name: 'Hyperraumfeldscanner', category: 'SPECIAL', public: {}, secret: {} },
      { name: 'Gravitationswellenscanner', category: 'SPECIAL', public: {}, secret: {} },
    ];
    const gameData = {
      getHangarShipDef: () => ({ defaultModuleCommodityIds: [0, 1, 2, 3], crewRequired: 1 }),
      getFabricationItemByOutputCommodity: (id: number) => ({ moduleType: definitions[id].name, shipyardType: definitions[id].category, moduleLevel: 1 }),
      getAllModules: () => definitions,
    };
    const shipRepo = { create: (value: unknown) => ({ id: 10, ...(value as object) }), save: jest.fn(async (ship) => ship) };
    const moduleRepo = { save: jest.fn(async (modules) => modules) };
    const manager = { getRepository: (entity: { name: string }) => entity.name === 'Spacecraft' ? shipRepo : moduleRepo };
    const ship = await createSmallCraft(manager as never, hull as never, { userId: 1, name: role, locationId: 9 }, gameData as never);
    expect(ship).toMatchObject({ energy: 50, warpdrive: 15, warpdriveMax: 15, shieldsMax: 50 });
    for (const key of ['SHIELDS', 'WARPDRIVE', 'SUBSPACE_SCANNER', 'TACHYON_SCANNER']) {
      expect(ship.runtimeSystems?.[key]).toMatchObject({ active: false, integrity: 100 });
    }
    expect(ship.runtimeSystems?.LIFE_SUPPORT).toMatchObject({ active: true });
    expect(ship.runtimeSystems?.DEFLECTOR).toBeUndefined();
    expect(ship.modules.every((module) => module.isActive)).toBe(true);
    expect(moduleRepo.save).toHaveBeenCalled();
  });
});
