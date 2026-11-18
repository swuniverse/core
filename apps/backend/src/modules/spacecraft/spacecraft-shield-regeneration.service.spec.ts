jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
}));
jest.mock('../colony/entities/crew-assignment.entity', () => ({
  CrewAssignment: class CrewAssignment {},
}));
jest.mock('../anomaly/entities/anomaly.entity', () => ({
  Anomaly: class Anomaly {},
}));
jest.mock('../websocket/game.gateway', () => ({
  GameGateway: class GameGateway {},
}));
import {
  getShieldRegenerationRate,
  SHIELD_REGENERATION_INTERVAL_MS,
  WsEventType,
} from '@swuniverse/shared';
import { SpacecraftShieldRegenerationService } from './spacecraft-shield-regeneration.service';
import { spacecraftShieldRegenerationRate } from './spacecraft-shield-regeneration';

const NOW = 1_800_000_000_000;
const input = () => ({
  shields: 50,
  shieldsMax: 101,
  crew: 2,
  crewRequired: 2,
  shieldSystem: {
    active: false,
    integrity: 100,
    regenerationStartedAt: NOW - SHIELD_REGENERATION_INTERVAL_MS,
  },
  fieldEffects: [] as string[],
  anomalyTypes: [] as string[],
  status: 'IDLE',
  rpgHidden: false,
});

describe('shared STU shield regeneration policy', () => {
  it('rounds up ten percent, caps missing shields and considers positive integrity healthy as STU does', () => {
    expect(getShieldRegenerationRate(input(), NOW)).toBe(11);
    expect(getShieldRegenerationRate({ ...input(), shields: 100 }, NOW)).toBe(
      1,
    );
    expect(
      getShieldRegenerationRate(
        { ...input(), shieldSystem: { ...input().shieldSystem, integrity: 1 } },
        NOW,
      ),
    ).toBe(11);
  });
  it('waits until exactly fifteen minutes and never catches up multiple steps', () => {
    expect(getShieldRegenerationRate(input(), NOW - 1)).toBe(0);
    expect(getShieldRegenerationRate(input(), NOW)).toBe(11);
    expect(
      getShieldRegenerationRate(
        input(),
        NOW + 10 * SHIELD_REGENERATION_INTERVAL_MS,
      ),
    ).toBe(11);
    expect(
      getShieldRegenerationRate(
        { ...input(), shieldSystem: { active: false, integrity: 100 } },
        NOW,
      ),
    ).toBe(11);
  });
  it.each([
    'active',
    'missing',
    'destroyed',
    'crew',
    'full',
    'zero-max',
    'field',
    'storm',
    'ellipse',
    'future',
    'invalid-time',
    'destroyed-ship',
    'construction',
    'scrapping',
    'hidden',
  ])('does not regenerate for %s', (reason) => {
    const value: any = input();
    if (reason === 'active') value.shieldSystem.active = true;
    if (reason === 'missing') delete value.shieldSystem;
    if (reason === 'destroyed') value.shieldSystem.integrity = 0;
    if (reason === 'crew') value.crew = 1;
    if (reason === 'full') value.shields = 101;
    if (reason === 'zero-max') value.shieldsMax = 0;
    if (reason === 'field') value.fieldEffects = ['SHIELD_MALFUNCTION'];
    if (reason === 'storm') value.anomalyTypes = ['ION_STORM'];
    if (reason === 'ellipse') value.anomalyTypes = ['SUBSPACE_ELLIPSE'];
    if (reason === 'future') value.shieldSystem.regenerationStartedAt = NOW + 1;
    if (reason === 'invalid-time')
      value.shieldSystem.regenerationStartedAt = NaN;
    if (reason === 'destroyed-ship') value.status = 'DESTROYED';
    if (reason === 'construction') value.status = 'UNDER_CONSTRUCTION';
    if (reason === 'scrapping') value.status = 'UNDER_SCRAPPING';
    if (reason === 'hidden') value.rpgHidden = true;
    expect(getShieldRegenerationRate(value, NOW)).toBe(0);
  });
  it('the backend adapter includes both field definition and per-field effects', () => {
    for (const location of [
      { galaxyField: { fieldType: { effects: ['SHIELD_MALFUNCTION'] } } },
      { systemField: { effects: ['SHIELD_MALFUNCTION'] } },
    ]) {
      const ship = {
        shields: 50,
        shieldsMax: 101,
        runtimeSystems: { SHIELDS: input().shieldSystem },
        location,
      };
      expect(spacecraftShieldRegenerationRate(ship as any, 2, 2, [], NOW)).toBe(
        0,
      );
    }
  });
});

function fixture() {
  let ship: any = {
    id: 1,
    userId: 10,
    hull: 1000,
    shields: 50,
    shieldsMax: 101,
    energy: 0,
    crewRequired: 2,
    status: 'IDLE',
    rpgHidden: false,
    locationId: 5,
    location: { galaxyField: {} },
    modules: [
      {
        category: 'SHIELDS',
        moduleType: 'Schilde',
        isActive: true,
        integrity: 100,
        cooldown: 0,
      },
    ],
    runtimeSystems: { SHIELDS: input().shieldSystem },
  };
  let crew = 2;
  let anomalies: any[] = [];
  let contested = false;
  const candidates: any = {};
  for (const method of ['select', 'where', 'andWhere', 'orderBy'])
    candidates[method] = jest.fn(() => candidates);
  candidates.getRawMany = jest.fn(async () => [{ id: 1 }]);
  const manager: any = {
    findOne: jest.fn(async () => (contested ? null : structuredClone(ship))),
    count: jest.fn(async () => crew),
    find: jest.fn(async () => anomalies),
    update: jest.fn(async (_entity, _id, values) => {
      ship = { ...ship, ...values };
    }),
  };
  const db = {
    getRepository: () => ({ createQueryBuilder: () => candidates }),
    transaction: async (work: any) => work(manager),
  };
  const gateway = { emitToUser: jest.fn() };
  return {
    service: new SpacecraftShieldRegenerationService(db as any, gateway as any),
    manager,
    candidates,
    gateway,
    get ship() {
      return ship;
    },
    setCrew: (value: number) => {
      crew = value;
    },
    setAnomalies: (value: any[]) => {
      anomalies = value;
    },
    setContested: () => {
      contested = true;
    },
  };
}

describe('SpacecraftShieldRegenerationService independent run', () => {
  it('credits one free step, persists its timer and suppresses a repeated run until the next deadline', async () => {
    const f = fixture();
    expect(await f.service.regenerate(NOW)).toBe(1);
    expect(f.ship.shields).toBe(61);
    expect(f.ship.energy).toBe(0);
    expect(f.ship.runtimeSystems.SHIELDS).toMatchObject({
      active: false,
      regenerationStartedAt: NOW,
      current: 61,
    });
    expect(await f.service.regenerate(NOW)).toBe(0);
    expect(
      await f.service.regenerate(NOW + SHIELD_REGENERATION_INTERVAL_MS - 1),
    ).toBe(0);
    expect(
      await f.service.regenerate(NOW + SHIELD_REGENERATION_INTERVAL_MS),
    ).toBe(1);
    expect(f.ship.shields).toBe(72);
    expect(f.gateway.emitToUser).toHaveBeenCalledWith(
      10,
      WsEventType.SPACECRAFT_EVENT,
      expect.objectContaining({ shipId: 1, type: 'SHIELDS_REGENERATED' }),
    );
    expect(f.manager.findOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        lock: {
          mode: 'pessimistic_write',
          tables: ['spacecraft'],
          onLocked: 'skip_locked',
        },
      }),
    );
    expect(f.manager.update).toHaveBeenCalledWith(
      expect.anything(),
      1,
      expect.not.objectContaining({ energy: expect.anything() }),
    );
  });
  it.each([
    'active',
    'crew',
    'integrity',
    'field',
    'storm',
    'ellipse',
    'locked',
  ])(
    'rechecks %s after candidate selection and does not persist a rejected gain',
    async (reason) => {
      const f = fixture();
      if (reason === 'active') f.ship.runtimeSystems.SHIELDS.active = true;
      if (reason === 'crew') f.setCrew(1);
      if (reason === 'integrity') f.ship.runtimeSystems.SHIELDS.integrity = 0;
      if (reason === 'field')
        f.ship.location.galaxyField.fieldType = {
          effects: ['SHIELD_MALFUNCTION'],
        };
      if (reason === 'storm') f.setAnomalies([{ type: { key: 'ION_STORM' } }]);
      if (reason === 'ellipse')
        f.setAnomalies([{ type: { key: 'SUBSPACE_ELLIPSE' } }]);
      if (reason === 'locked') f.setContested();
      expect(await f.service.regenerate(NOW)).toBe(0);
      expect(f.manager.update).not.toHaveBeenCalled();
      expect(f.gateway.emitToUser).not.toHaveBeenCalled();
    },
  );
  it('does not emit success if persistence fails', async () => {
    const f = fixture();
    f.manager.update.mockRejectedValue(new Error('save failed'));
    await expect(f.service.regenerate(NOW)).rejects.toThrow('save failed');
    expect(f.gateway.emitToUser).not.toHaveBeenCalled();
  });
});
