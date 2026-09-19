jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
}));

import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';

describe('SpacecraftRuntimeStateService', () => {
  it('initializes life support and preserves existing runtime state', () => {
    const service = new SpacecraftRuntimeStateService();
    const ship = {
      energy: 4,
      energyMax: 10,
      epsMax: 10,
      warpdrive: 0,
      warpdriveMax: 5,
      reactorOutput: 3,
      shields: 1,
      shieldsMax: 2,
      runtimeSystems: {
        SENSORS: { active: false, cooldown: 2, integrity: 75 },
      },
    } as never;
    const systems = service.initialize(ship);
    expect(systems.LIFE_SUPPORT).toEqual({
      active: true,
      cooldown: 0,
      integrity: 100,
    });
    expect(systems.LONG_RANGE_SENSORS).toEqual({
      active: false,
      cooldown: 2,
      integrity: 75,
    });
    expect(systems.SHORT_RANGE_SENSORS).toEqual({
      active: false,
      cooldown: 2,
      integrity: 75,
    });
    expect((systems as Record<string, unknown>).SENSORS).toBeUndefined();
    expect(service.validateActivation(systems, 'LONG_RANGE_SENSORS')).toBe(
      'Cooldown 2',
    );
  });

  it('only creates STU runtime systems backed by installed modules', () => {
    const service = new SpacecraftRuntimeStateService();
    const ship = {
      energy: 4,
      energyMax: 10,
      epsMax: 10,
      warpdrive: 0,
      warpdriveMax: 5,
      reactorOutput: 3,
      shields: 1,
      shieldsMax: 2,
      modules: [
        { category: 'SENSORS', moduleType: 'Sensorphalanx' },
        { category: 'SUBLIGHT_DRIVE', moduleType: 'Ion-Triebwerk' },
      ],
      runtimeSystems: {
        TORPEDO_BANK: { active: true, cooldown: 0, integrity: 100 },
      },
    } as never;

    const systems = service.initialize(ship);

    expect(systems.LONG_RANGE_SENSORS).toBeDefined();
    expect(systems.SHORT_RANGE_SENSORS).toBeDefined();
    expect(systems.SUBLIGHT_DRIVE).toBeDefined();
    expect(systems.LIFE_SUPPORT).toBeDefined();
    expect(systems.TORPEDO_BANK).toBeUndefined();
    expect(systems.WEAPONS).toBeUndefined();
    expect(systems.SPECIAL).toBeUndefined();
  });
});
