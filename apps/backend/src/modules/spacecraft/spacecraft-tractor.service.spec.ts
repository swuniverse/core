jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: { IDLE: 'IDLE', IN_FLIGHT: 'IN_FLIGHT', DESTROYED: 'DESTROYED' },
  SpacecraftKind: { SHIP: 'SHIP', STATION: 'STATION' },
}));

import { SpacecraftTractorService } from './spacecraft-tractor.service';

function setup() {
  const source = {
    id: 1,
    userId: 7,
    name: 'Falcon',
    locationId: 9,
    status: 'IDLE',
    energy: 10,
    tractoredShipId: null as number | null,
    tractoredShip: null as unknown,
    modules: [{ category: 'TRACTOR_BEAM', moduleType: 'Standard-Traktorstrahl' }],
    runtimeSystems: {
      TRACTOR_BEAM: { active: false, cooldown: 0, integrity: 100 },
      SHIELDS: { active: false, cooldown: 0, integrity: 100 },
      WARPDRIVE: { active: false, cooldown: 0, integrity: 100 },
    },
  };
  const target = {
    id: 2,
    userId: 7,
    name: 'Ghost',
    locationId: 9,
    status: 'IDLE',
    energy: 50,
    hull: 100,
    hullMax: 100,
    tractoredShipId: null as number | null,
    modules: [],
    runtimeSystems: {
      SHIELDS: { active: false, cooldown: 0, integrity: 100 },
    },
    user: {
      id: 7,
      isNpc: false,
      vacationMode: false,
      vacationStartedAt: null as Date | null,
    },
  };
  const ships = [source, target];
  const manager = {
    findOne: jest.fn(async (_entity, options) =>
      ships.find((ship) =>
        options.where.id != null
          ? ship.id === options.where.id
          : ship.tractoredShipId === options.where.tractoredShipId,
      ) ?? null,
    ),
    findOneBy: jest.fn(async (_entity, where) =>
      ships.find((ship) => ship.tractoredShipId === where.tractoredShipId) ?? null,
    ),
    save: jest.fn(async (value) => value),
  };
  const dataSource = { transaction: jest.fn(async (work) => work(manager)) };
  const runtime = { initialize: jest.fn((ship) => ship.runtimeSystems) };
  const messaging = { sendSystem: jest.fn(async () => undefined) };
  const reaction = { reactToThreat: jest.fn(async (): Promise<unknown> => null) };
  return {
    service: new SpacecraftTractorService(dataSource as any, runtime as any, messaging as any, [reaction as any]),
    messaging,
    reaction,
    ships,
    source,
    target,
    manager,
  };
}

describe('SpacecraftTractorService', () => {
  it.each(['FRIEND', 'NEUTRAL', 'ENEMY'])('captures a foreign %s ship regardless of stance', async () => {
    const { service, source, target } = setup();
    target.userId = 8;
    target.user.id = 8;

    await service.activate(source.id, source.userId, target.id);

    expect(source.tractoredShipId).toBe(target.id);
  });

  it('rejects a shielded foreign target', async () => {
    const { service, source, target } = setup();
    target.userId = 8;
    target.user.id = 8;
    target.runtimeSystems.SHIELDS.active = true;

    await expect(service.activate(source.id, source.userId, target.id)).rejects.toThrow(
      'Die Ghost kann aufgrund der aktiven Schilde nicht erfasst werden',
    );
  });

  it.each([
    ['shields', (s: ReturnType<typeof setup>) => { s.source.runtimeSystems.SHIELDS.active = true; }, 'die Schilde aktiviert sind'],
    ['cloak', (s: ReturnType<typeof setup>) => { (s.source.runtimeSystems as Record<string, unknown>).CLOAK = { active: true, cooldown: 0, integrity: 100 }; }, 'die Tarnung aktiviert ist'],
    ['docked', (s: ReturnType<typeof setup>) => { (s.source as Record<string, unknown>).dockedAtId = 5; }, 'das Schiff angedockt ist'],
  ])('reports STU activation failure when the source has %s', async (_name, arrange, reason) => {
    const ctx = setup();
    arrange(ctx);

    await expect(ctx.service.activate(ctx.source.id, ctx.source.userId, ctx.target.id)).rejects.toThrow(
      `Falcon: System Traktorstrahl konnte nicht aktiviert werden, weil ${reason}`,
    );
    expect(ctx.source.tractoredShipId).toBeNull();
  });

  it('reports STU activation failure when the source is held itself', async () => {
    const { service, source, target, ships } = setup();
    ships.push({ ...target, id: 3, name: 'Hunter', tractoredShipId: source.id } as never);

    await expect(service.activate(source.id, source.userId, target.id)).rejects.toThrow(
      'Falcon: System Traktorstrahl konnte nicht aktiviert werden, weil das Schiff selbst von dem Traktorstrahl der Hunter erfasst ist',
    );
  });

  it('rejects a target whose owner has effective vacation protection', async () => {
    const { service, source, target } = setup();
    target.userId = 8;
    target.user.id = 8;
    target.user.vacationMode = true;
    target.user.vacationStartedAt = new Date(Date.now() - 49 * 60 * 60 * 1000);

    await expect(service.activate(source.id, source.userId, target.id)).rejects.toThrow(
      'Der Spieler befindet sich im Urlaubsmodus',
    );
  });

  it('captures an NPC target like STU', async () => {
    const { service, source, target } = setup();
    target.userId = 8;
    target.user.id = 8;
    target.user.isNpc = true;

    await service.activate(source.id, source.userId, target.id);

    expect(source.tractoredShipId).toBe(target.id);
  });

  describe('threat reaction (STU ThreatReaction)', () => {
    const report = { rounds: [{ round: 1, lines: [{ text: 'Ghost feuert' }] }] };

    it('lets the target react before the beam locks and returns its report', async () => {
      const { service, source, target, reaction } = setup();
      target.userId = 8;
      reaction.reactToThreat.mockImplementation(async () => {
        expect(source.tractoredShipId).toBeNull();
        return report;
      });

      const result = await service.activate(source.id, source.userId, target.id);

      expect(reaction.reactToThreat).toHaveBeenCalledWith(source.id, target.id, 'ACTIVATE_TRACTOR');
      expect(result).toEqual({ message: 'Der Traktorstrahl wurde auf die Ghost gerichtet', threatReport: report });
      expect(source.tractoredShipId).toBe(target.id);
    });

    it('does not react when the request is invalid', async () => {
      const { service, source, target, reaction } = setup();
      source.energy = 0;

      await expect(service.activate(source.id, source.userId, target.id)).rejects.toThrow();
      expect(reaction.reactToThreat).not.toHaveBeenCalled();
    });

    it('checks target shields only after the reaction', async () => {
      const { service, source, target, reaction } = setup();
      target.userId = 8;
      target.runtimeSystems.SHIELDS.active = true;
      reaction.reactToThreat.mockResolvedValue(report);

      const result = await service.activate(source.id, source.userId, target.id);

      expect(reaction.reactToThreat).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Die Ghost kann aufgrund der aktiven Schilde nicht erfasst werden',
        threatReport: report,
      });
      expect(source.tractoredShipId).toBeNull();
    });

    it('aborts with the report when the causing ship was destroyed', async () => {
      const { service, source, target, reaction, ships } = setup();
      target.userId = 8;
      reaction.reactToThreat.mockImplementation(async () => {
        ships.splice(ships.indexOf(source), 1);
        return report;
      });

      const result = await service.activate(source.id, source.userId, target.id);

      expect(result).toEqual({ message: 'Das Schiff wurde bei dem Angriff zerstört', threatReport: report });
      expect(source.tractoredShipId).toBeNull();
    });

    it('aborts when the tractor beam was destroyed in the reaction', async () => {
      const { service, source, target, reaction } = setup();
      target.userId = 8;
      reaction.reactToThreat.mockImplementation(async () => {
        source.runtimeSystems.TRACTOR_BEAM.integrity = 0;
        return report;
      });

      const result = await service.activate(source.id, source.userId, target.id);

      expect(result.message).toBe('Der Traktorstrahl wurde bei dem Angriff zerstört');
    });
  });

  it('rejects a station like STU, which only tractors ships', async () => {
    const { service, source, target } = setup();
    (target as { kind?: string }).kind = 'STATION';

    await expect(service.activate(source.id, source.userId, target.id)).rejects.toThrow(
      'Das Ziel kann nicht erfasst werden',
    );
  });

  it('notifies the foreign target owner when captured', async () => {
    const { service, source, target, messaging } = setup();
    target.userId = 8;
    target.user.id = 8;

    await service.activate(source.id, source.userId, target.id);

    expect(messaging.sendSystem).toHaveBeenCalledWith(
      8,
      'Traktorstrahl',
      'Ghost wurde vom Traktorstrahl der Falcon erfasst.',
    );
  });

  it('captures an own ship at the same field for 2 EPS', async () => {
    const { service, source, target, manager } = setup();

    await service.activate(source.id, source.userId, target.id);

    expect(source.energy).toBe(8);
    expect(source.tractoredShipId).toBe(target.id);
    expect(source.runtimeSystems.TRACTOR_BEAM.active).toBe(true);
    expect(manager.save).toHaveBeenCalledWith(source);
  });

  it('escapes on a successful STU roll for 20 EPS', async () => {
    const { service, source, target } = setup();
    source.tractoredShipId = target.id;
    source.tractoredShip = target;

    const result = await service.escape(target.id, target.userId, () => 1);

    expect(result.outcome).toBe('ESCAPED');
    expect(target.energy).toBe(30);
    expect(source.tractoredShipId).toBeNull();
  });

  it('damages shields after a failed STU roll below 55', async () => {
    const { service, source, target } = setup();
    source.tractoredShipId = target.id;
    source.tractoredShip = target;

    const rolls = [40, 10];
    const result = await service.escape(target.id, target.userId, () => rolls.shift()!);

    expect(result.outcome).toBe('SHIELD_DAMAGE');
    expect(target.runtimeSystems.SHIELDS.integrity).toBe(90);
  });

  it('damages hull by 10-25 percent after a high failed STU roll', async () => {
    const { service, source, target } = setup();
    source.tractoredShipId = target.id;
    source.tractoredShip = target;

    const rolls = [80, 20];
    const result = await service.escape(target.id, target.userId, () => rolls.shift()!);

    expect(result.outcome).toBe('HULL_DAMAGE');
    expect(target.hull).toBe(80);
  });

  it('releases the target without an EPS cost', async () => {
    const { service, source, target } = setup();
    source.tractoredShipId = target.id;
    source.tractoredShip = target;
    source.runtimeSystems.TRACTOR_BEAM.active = true;

    await service.deactivate(source.id, source.userId);

    expect(source.energy).toBe(10);
    expect(source.tractoredShipId).toBeNull();
    expect(source.runtimeSystems.TRACTOR_BEAM.active).toBe(false);
  });

  it('does not let another player release the beam', async () => {
    const { service, source, target } = setup();
    source.tractoredShipId = target.id;

    await expect(service.deactivate(source.id, source.userId + 1)).rejects.toThrow('Spacecraft not found');
    expect(source.tractoredShipId).toBe(target.id);
  });
});
