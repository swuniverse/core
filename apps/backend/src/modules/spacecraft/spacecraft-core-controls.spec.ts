jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../faction/entities/faction.entity', () => ({
  FactionEntity: class FactionEntity {},
}));
jest.mock('../faction/entities/faction-modifier.entity', () => ({
  FactionModifier: class FactionModifier {},
}));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../starmap/entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('../starmap/entities/layer.entity', () => ({
  Layer: class Layer {},
}));
jest.mock('../starmap/entities/celestial-object.entity', () => ({
  CelestialObject: class CelestialObject {},
}));
jest.mock('../starmap/entities/galaxy-field.entity', () => ({
  GalaxyField: class GalaxyField {},
}));
jest.mock('../starmap/entities/system-field.entity', () => ({
  SystemField: class SystemField {},
}));
jest.mock('../starmap/generator/planet-generator.service', () => ({
  PlanetGeneratorService: class PlanetGeneratorService {},
}));
jest.mock('../starmap/generator/stu-planet-surface.generator', () => ({
  supportsStuSurface: jest.fn(() => true),
}));
jest.mock('./entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('./entities/fleet.entity', () => ({ Fleet: class Fleet {} }));
jest.mock('./entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));
jest.mock('./entities/spacecraft.entity', () => ({
  AlertState: { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' },
  SpacecraftOperatingMode: { NORMAL: 'NORMAL', STANDBY: 'STANDBY' },
  SpacecraftLssMode: {
    DISABLED: 'DISABLED',
    TERRITORY: 'TERRITORY',
    IMPASSABLE: 'IMPASSABLE',
    CARTOGRAPHY: 'CARTOGRAPHY',
  },
  SpacecraftStatus: {
    IDLE: 'IDLE',
    IN_FLIGHT: 'IN_FLIGHT',
    IN_COMBAT: 'IN_COMBAT',
    DESTROYED: 'DESTROYED',
  },
  Spacecraft: class Spacecraft {},
}));

import {
  AlertState,
  SpacecraftOperatingMode,
} from './entities/spacecraft.entity';
import { SpacecraftService } from './spacecraft.service';

function createService() {
  const ship = {
    id: 2,
    userId: 1,
    name: 'Falke',
    shipClassId: 3,
    alertState: AlertState.GREEN,
    operatingMode: SpacecraftOperatingMode.NORMAL,
    modules: [],
    runtimeSystems: {},
    energy: 20,
    energyMax: 50,
    epsMax: 50,
    warpdrive: 2,
    warpdriveMax: 10,
    battery: 3,
    batteryMax: 5,
    reactorOutput: 8,
    reactorWarpSplit: 100,
    shields: 10,
    shieldsMax: 20,
    hull: 30,
    hullMax: 30,
    crew: 1,
    crewMax: 4,
    cargoMax: 8,
    evadeChance: 0,
    posX: 1,
    posY: 1,
  };
  const shipRepo = { save: jest.fn(async (value) => value) };
  const runtime = {
    initialize: jest.fn((value) => {
      const systems = value.runtimeSystems as Record<string, any>;
      for (const key of [
        'LIFE_SUPPORT',
        'COMPUTER',
        'LONG_RANGE_SENSORS',
        'SHORT_RANGE_SENSORS',
        'SHIELDS',
        'WEAPONS',
        'TORPEDO_BANK',
      ]) {
        systems[key] ??= { active: true, cooldown: 0, integrity: 100 };
      }
      return systems;
    }),
    requireActivation: jest.fn(),
    validateActivation: jest.fn((systems, key) => {
      const value = systems[key];
      if (!value) return 'System nicht verfügbar';
      if (value.cooldown > 0) return `Cooldown ${value.cooldown}`;
      if (value.integrity <= 0) return 'System zerstört';
      return null;
    }),
  };
  const resourceFlow = {
    calculate: jest.fn(() => ({ reactorOutput: 8 })),
    getSystemCost: jest.fn(() => 1),
    recharge: jest.fn(),
  };
  const service = new SpacecraftService(
    shipRepo as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { getAllModules: () => [] } as any,
    { findById: jest.fn(async () => ({ crewMin: 1 })) } as any,
    {} as any,
    {} as any,
    {} as any,
    {
      calculateStats: jest.fn(() => ({
        hullMax: 30,
        shieldsMax: 20,
        energyMax: 50,
        warpdriveMax: 10,
        batteryMax: 5,
        reactorOutput: 8,
        cargoMax: 8,
        crewMax: 4,
        evadeChance: 0,
      })),
    } as any,
    {
      getAssignedCrew: jest.fn(async () => []),
      hasEnoughCrew: jest.fn(async () => true),
    } as any,
    {} as any,
    resourceFlow as any,
    runtime as any,
    { emitToUser: jest.fn() } as any,
    {} as any,
    { saveUnlessDestroyed: jest.fn(async () => true) } as any,
  );
  jest.spyOn(service, 'findOne').mockResolvedValue(ship as any);
  jest.spyOn(service, 'getSensorRange').mockResolvedValue(3);
  return { service, ship, shipRepo, resourceFlow };
}

describe('spacecraft core detail controls', () => {
  it('enters standby with only life support active', async () => {
    const { service, ship } = createService();
    const result = await service.setOperatingMode(
      2,
      1,
      SpacecraftOperatingMode.STANDBY,
    );
    expect(result.operatingMode).toBe('STANDBY');
    expect(result.systems.LIFE_SUPPORT?.active).toBe(true);
    expect(result.systems.SHIELDS?.active).toBe(false);
    expect(ship.operatingMode).toBe('STANDBY');
  });

  it('changes alert state without changing active systems', async () => {
    const { service, ship, shipRepo } = createService();
    (ship.runtimeSystems as Record<string, any>).LONG_RANGE_SENSORS = {
      active: true,
      cooldown: 0,
      integrity: 100,
    };
    (ship.runtimeSystems as Record<string, any>).SHIELDS = {
      active: false,
      cooldown: 2,
      integrity: 100,
    };
    const result = await service.setAlertState(2, 1, AlertState.GREEN);
    expect(result.applied).toBe(true);
    expect(result.rejections).toEqual([]);
    expect(result.systems.LONG_RANGE_SENSORS?.active).toBe(true);
    expect(result.systems.SHIELDS?.active).toBe(false);
    expect(ship.alertState).toBe('GREEN');
    expect(shipRepo.save).toHaveBeenCalled();
  });

  it('serves authoritative details and energy flow', async () => {
    const { service, resourceFlow } = createService();
    const details = await service.getDetails(2, 1);
    expect(details.crewRoster).toEqual([]);
    expect(details.effectiveStats?.sensorRange).toBe(3);
    await service.getEnergyFlow(2, 1);
    expect(resourceFlow.calculate).toHaveBeenCalled();
  });
});
