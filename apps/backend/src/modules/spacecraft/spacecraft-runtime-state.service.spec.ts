jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
}));

import {
  isCoolingDown,
  SpacecraftRuntimeStateService,
} from './spacecraft-runtime-state.service';

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
        {
          category: 'SENSORS',
          moduleType: 'Sensorphalanx',
          isActive: true,
          cooldown: 0,
          integrity: 100,
        },
        {
          category: 'SUBLIGHT_DRIVE',
          moduleType: 'Ion-Triebwerk',
          isActive: true,
          cooldown: 0,
          integrity: 100,
        },
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

  it('maps only Astrometrie-Labor to its dedicated runtime capability', () => {
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
        {
          category: 'SPECIAL',
          moduleType: 'Astrometrie-Labor',
          isActive: true,
          cooldown: 0,
          integrity: 100,
        },
        {
          category: 'SPECIAL',
          moduleType: 'Tarnfeld-Generator',
          isActive: true,
          cooldown: 0,
          integrity: 100,
        },
      ],
      runtimeSystems: {},
    } as never;

    const systems = service.initialize(ship);

    expect(systems.ASTROMETRY_LAB).toBeDefined();
    expect(systems.SPECIAL).toBeDefined();
  });

  it('maps the tracking beacon to an initially inactive runtime system', () => {
    const service = new SpacecraftRuntimeStateService();
    const ship = {
      modules: [
        {
          category: 'SPECIAL',
          moduleType: 'Peilsender',
          isActive: true,
          cooldown: 0,
          integrity: 100,
        },
      ],
      runtimeSystems: {},
    } as never;

    const systems = service.initialize(ship);

    expect(systems.TRACKER).toMatchObject({ active: false, integrity: 100 });
    expect(systems.SPECIAL).toBeUndefined();
  });

  it('maps tractor beam modules to an initially inactive runtime system', () => {
    const service = new SpacecraftRuntimeStateService();
    const ship = {
      modules: [
        {
          category: 'TRACTOR_BEAM',
          moduleType: 'Standard-Traktorstrahl',
          isActive: true,
          cooldown: 0,
          integrity: 100,
        },
      ],
      runtimeSystems: {},
    } as never;

    const systems = service.initialize(ship);

    expect(systems.TRACTOR_BEAM).toMatchObject({ active: false, integrity: 100 });
  });

  it('maps the Tarnvorrichtung module to an initially inactive CLOAK system', () => {
    const service = new SpacecraftRuntimeStateService();
    const ship = {
      modules: [
        {
          category: 'SPECIAL',
          moduleType: 'Tarnvorrichtung',
          isActive: true,
          cooldown: 0,
          integrity: 100,
        },
      ],
      runtimeSystems: {},
    } as never;

    const systems = service.initialize(ship);

    expect(systems.CLOAK).toMatchObject({ active: false, integrity: 100 });
    expect(systems.SPECIAL).toBeUndefined();
  });

  it('uses installed module state and category aliases consistently', () => {
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
        {
          category: 'SUBLIGHT_ENGINE',
          moduleType: 'Ion-Triebwerk',
          isActive: false,
          cooldown: 2,
          integrity: 60,
        },
        {
          category: 'SPECIAL',
          moduleType: 'Hypermaterie-Reaktor',
          isActive: true,
          cooldown: 0,
          integrity: 80,
        },
        {
          category: 'SPECIAL',
          moduleType: 'Energieverteiler',
          isActive: true,
          cooldown: 0,
          integrity: 90,
        },
      ],
      runtimeSystems: {},
    } as never;

    const systems = service.initialize(ship);

    expect(systems.SUBLIGHT_DRIVE).toMatchObject({
      active: false,
      cooldown: 2,
      integrity: 60,
    });
    expect(systems.REACTOR?.integrity).toBe(80);
    expect(systems.EPS?.integrity).toBe(90);
    expect(systems.SPECIAL).toBeUndefined();
  });

  it('treats small cooldowns as ticks and large ones as STU epoch-ms deadlines', () => {
    const now = 1_800_000_000_000;
    expect(isCoolingDown({ cooldown: 0 }, now)).toBe(false);
    expect(isCoolingDown({ cooldown: 2 }, now)).toBe(true);
    expect(isCoolingDown({ cooldown: now + 60_000 }, now)).toBe(true);
    expect(isCoolingDown({ cooldown: now - 1 }, now)).toBe(false);
    expect(isCoolingDown(undefined, now)).toBe(false);
  });

  it('rejects activation until an ion storm drive deadline has passed', () => {
    const service = new SpacecraftRuntimeStateService();
    const deadline = Date.now() + 10 * 60_000;
    const blocked = service.validateActivation(
      { WARPDRIVE: { active: false, cooldown: deadline, integrity: 100 } },
      'WARPDRIVE',
    );
    expect(blocked).toMatch(/^Cooldown noch (9|10) Min\.$/);
    expect(
      service.validateActivation(
        { WARPDRIVE: { active: false, cooldown: Date.now() - 1, integrity: 100 } },
        'WARPDRIVE',
      ),
    ).toBeNull();
  });
});
