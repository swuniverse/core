jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {}, SpacecraftKind: { SHIP: 'SHIP', STATION: 'STATION' }, SpacecraftStatus: { DESTROYED: 'DESTROYED', UNDER_CONSTRUCTION: 'UNDER_CONSTRUCTION' },
}));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../starmap/entities/space-location.entity', () => ({ SpaceLocation: class SpaceLocation {} }));
jest.mock('../spacecraft/entities/spacecraft-module.entity', () => ({ SpacecraftModule: class SpacecraftModule {} }));
jest.mock('./entities/anomaly.entity', () => ({ Anomaly: class Anomaly {} }));
import { VACATION_DELAY_MS } from '@swuniverse/shared';
import { SpacecraftIonStormEffects } from '../spacecraft/ion-storm-effects';
import { SubspaceEllipseHandler } from './subspace-ellipse.handler';

const NOW = 1800000000000;
function fixture(age: number) {
  const users = [
    { id: 1, vacationMode: true, vacationStartedAt: new Date(NOW - age) },
    { id: 2, vacationMode: true, vacationStartedAt: new Date(NOW - 49 * 60 * 60 * 1000) },
  ];
  const ships = users.map((user) => ({ id: user.id, userId: user.id, name: `Ship ${user.id}`, kind: 'SHIP', status: 'IDLE', locationId: 5,
    hull: 100, hullMax: 100, shields: 50, shieldsMax: 50, runtimeSystems: { SHIELDS: { active: true, integrity: 100 } },
  }));
  const update = jest.fn();
  const location = { id: 5, galaxyField: { cx: 1, cy: 2 } };
  const repositories: Record<string, any> = {
    Spacecraft: { find: jest.fn(async () => ships), update },
    User: { find: jest.fn(async () => users) },
    SpaceLocation: { find: jest.fn(async () => [location]), findOneOrFail: jest.fn(async () => location) },
    SpacecraftModule: { find: jest.fn(async () => []) },
  };
  const manager = { getRepository: (entity: { name: string }) => repositories[entity.name] };
  const messaging = { sendSystem: jest.fn() };
  return { ships, manager, messaging, update, repositories };
}

describe('anomalies use effective vacation rather than the request flag', () => {
  it.each([47 * 60 * 60 * 1000, VACATION_DELAY_MS, VACATION_DELAY_MS + 1, 49 * 60 * 60 * 1000])('ion storm evaluates a request aged %i ms', async (age) => {
    const f = fixture(age);
    const effects = new SpacecraftIonStormEffects({
      random: { integer: (min) => Math.max(min, 1), normal: () => 10, skewed: () => 0 },
      messaging: f.messaging as never, destruction: { destroyInManager: jest.fn() },
      crewEnhancement: { enhanceSpacecraft: jest.fn() }, hasIonStormReduction: () => false, now: () => NOW,
    });
    // No active shield: actual hull damage proves the pending owner is not spared.
    for (const ship of f.ships) ship.runtimeSystems.SHIELDS.active = false;
    await effects.affectStormFields(f.manager as never, [{ locationId: 5, intensity: 100 }]);
    expect(f.ships[0].hull).toBe(age > VACATION_DELAY_MS ? 100 : 90);
    expect(f.ships[1].hull).toBe(100);
    expect(f.repositories.User.find).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ vacationStartedAt: true }) }));
    expect(f.messaging.sendSystem).toHaveBeenCalledTimes(age > VACATION_DELAY_MS ? 0 : 1);
  });

  it.each([47 * 60 * 60 * 1000, VACATION_DELAY_MS, VACATION_DELAY_MS + 1, 49 * 60 * 60 * 1000])('subspace ellipse evaluates a request aged %i ms', async (age) => {
    jest.useFakeTimers().setSystemTime(NOW);
    try {
      const f = fixture(age);
      await new SubspaceEllipseHandler(f.messaging as never, { integer: () => 5 }).handleTick({ locationId: 5 } as never, f.manager as never);
      expect(f.ships[0].shields).toBe(age > VACATION_DELAY_MS ? 50 : 0);
      expect(f.ships[1].shields).toBe(50);
      expect(f.messaging.sendSystem).toHaveBeenCalledTimes(age > VACATION_DELAY_MS ? 0 : 1);
    } finally { jest.useRealTimers(); }
  });
});
