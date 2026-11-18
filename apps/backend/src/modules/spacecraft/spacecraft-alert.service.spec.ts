jest.mock('./entities/spacecraft.entity', () => ({
  AlertState: { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' },
  SpacecraftOperatingMode: { NORMAL: 'NORMAL', STANDBY: 'STANDBY' },
  Spacecraft: class Spacecraft {},
}));
import { AlertState } from './entities/spacecraft.entity';
import { SpacecraftAlertService } from './spacecraft-alert.service';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';

function fixture() {
  const ship: any = {
    alertState: AlertState.GREEN,
    crew: 2,
    crewRequired: 2,
    energy: 20,
    shields: 100,
    dockedAtId: 9,
    runtimeSystems: {},
    modules: [
      ['SHIELDS', 'Schilde'],
      ['SENSORS', 'Sensoren'],
      ['WEAPONS', 'Laser'],
      ['PROJECTILE', 'Torpedobank'],
      ['EPS', 'Energieverteiler'],
      ['SPECIAL', 'Tarnvorrichtung'],
    ].map(([category, moduleType]) => ({
      category,
      moduleType,
      isActive: true,
      integrity: 100,
      cooldown: 0,
    })),
  };
  const runtime = new SpacecraftRuntimeStateService();
  runtime.initialize(ship);
  return { ship, runtime, service: new SpacecraftAlertService(runtime) };
}

describe('SpacecraftAlertService shared reactions', () => {
  it('manual yellow activates shields, NBS and energy weapons, uncloaks and pays each activation once', () => {
    const { ship, service } = fixture();
    ship.runtimeSystems.CLOAK.active = true;
    const result = service.apply(ship, AlertState.YELLOW);
    for (const key of ['SHIELDS', 'SHORT_RANGE_SENSORS', 'WEAPONS'])
      expect(ship.runtimeSystems[key].active).toBe(true);
    expect(ship.runtimeSystems.TORPEDO_BANK.active).toBe(false);
    expect(ship.runtimeSystems.CLOAK.active).toBe(false);
    expect(ship.energy).toBe(16); // 1 level change + 3 activations
    expect(ship.dockedAtId).toBeNull();
    expect(result.rejections).toEqual([]);
    service.apply(ship, AlertState.YELLOW);
    expect(ship.energy).toBe(16);
  });

  it('red additionally activates projectiles and green preserves cloak while switching weapons/shields off', () => {
    const { ship, service } = fixture();
    ship.runtimeSystems.CLOAK.active = true;
    service.apply(ship, AlertState.RED);
    expect(ship.runtimeSystems.TORPEDO_BANK.active).toBe(true);
    expect(ship.runtimeSystems.CLOAK.active).toBe(false);
    expect(ship.energy).toBe(14); // 2 level change + 4 activations
    ship.runtimeSystems.CLOAK.active = true;
    service.apply(ship, AlertState.GREEN);
    expect(ship.runtimeSystems.CLOAK.active).toBe(true);
    expect(ship.runtimeSystems.SHIELDS.active).toBe(false);
    expect(ship.runtimeSystems.WEAPONS.active).toBe(false);
    expect(ship.runtimeSystems.TORPEDO_BANK.active).toBe(false);
  });

  it('STU combat GREEN only raises the level on this cycle', () => {
    const { ship, service } = fixture();
    service.apply(ship, AlertState.YELLOW, { activateSystems: false });
    expect(ship.alertState).toBe(AlertState.YELLOW);
    expect(ship.runtimeSystems.SHIELDS.active).toBe(false);
    expect(ship.runtimeSystems.WEAPONS.active).toBe(false);
    expect(ship.energy).toBe(19);
  });

  it('insufficient level-change EPS leaves the alert level and switches intact', () => {
    const { ship, service } = fixture();
    ship.energy = 0;
    expect(() => service.apply(ship, AlertState.YELLOW)).toThrow(
      'Nicht genügend EPS',
    );
    expect(ship.alertState).toBe(AlertState.GREEN);
    expect(ship.runtimeSystems.SHIELDS.active).toBe(false);
  });

  it('reports per-system EPS shortages without charging for already active or rejected systems', () => {
    const { ship, service } = fixture();
    ship.alertState = AlertState.YELLOW;
    ship.energy = 1;
    const result = service.apply(ship, AlertState.YELLOW);
    expect(ship.runtimeSystems.SHIELDS.active).toBe(true);
    expect(ship.energy).toBe(0);
    expect(result.rejections.map((entry) => entry.systemKey)).toEqual([
      'SHORT_RANGE_SENSORS',
      'WEAPONS',
    ]);
  });

  it.each([
    'destroyed',
    'cooldown',
    'crew',
    'tractor',
    'empty-shields',
    'field',
    'anomaly',
    'held',
  ])(
    'rejects shield activation for %s and leaves charge untouched',
    (reason) => {
      const { ship, service } = fixture();
      ship.alertState = AlertState.YELLOW;
      const options: any = {};
      if (reason === 'destroyed') ship.runtimeSystems.SHIELDS.integrity = 0;
      if (reason === 'cooldown') ship.runtimeSystems.SHIELDS.cooldown = 1;
      if (reason === 'crew') options.hasEnoughCrew = false;
      if (reason === 'tractor') ship.tractoredShipId = 8;
      if (reason === 'empty-shields') ship.shields = 0;
      if (reason === 'field')
        ship.location = {
          galaxyField: { fieldType: { effects: ['SHIELD_MALFUNCTION'] } },
        };
      if (reason === 'anomaly') options.shieldBlocked = 'Ionensturm am Ort';
      if (reason === 'held')
        options.shieldBlocked =
          'Das Schiff wird von einem Traktorstrahl gehalten';
      const result = service.apply(ship, AlertState.YELLOW, options);
      expect(ship.runtimeSystems.SHIELDS.active).toBe(false);
      expect(result.rejections).toContainEqual(
        expect.objectContaining({ systemKey: 'SHIELDS' }),
      );
      expect(ship.energy).toBe(reason === 'crew' ? 20 : 18);
    },
  );

  it('enforces NBS colony and field cooldown prerequisites', () => {
    for (const condition of ['colony', 'cooldown']) {
      const { ship, service } = fixture();
      ship.alertState = AlertState.YELLOW;
      if (condition === 'cooldown')
        ship.shortRangeSensorsCooldownUntil = new Date(2000);
      const result = service.apply(ship, AlertState.YELLOW, {
        hasColony: condition !== 'colony',
        now: 1000,
      });
      expect(result.rejections).toContainEqual(
        expect.objectContaining({ systemKey: 'SHORT_RANGE_SENSORS' }),
      );
      expect(ship.runtimeSystems.SHORT_RANGE_SENSORS.active).toBe(false);
    }
  });
});
