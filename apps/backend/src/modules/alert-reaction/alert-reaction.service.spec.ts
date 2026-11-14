import type { ResolvedStance } from '../alliance/relationship-resolver.service';
import {
  AlertState,
  SpacecraftOperatingMode,
  SpacecraftStatus,
  type Spacecraft,
} from '../spacecraft/entities/spacecraft.entity';
import type { MovementReaction, MovementReactionContext } from '../spacecraft/movement-reaction.port';
import { AlertReactionService, reactsToIncoming } from './alert-reaction.service';

type Stance = 'FRIEND' | 'NEUTRAL' | 'ENEMY';
const stance = (status: Stance): ResolvedStance =>
  ({ status, isFriend: status === 'FRIEND', isEnemy: status === 'ENEMY' }) as ResolvedStance;

const INCOMING = 1;
const LOCATION = 50;
const VACATION_LONG_AGO = new Date('2020-01-01T00:00:00.000Z');

function ship(id: number, userId: number, overrides: Partial<Spacecraft> = {}): Spacecraft {
  return {
    id,
    userId,
    name: `Schiff ${id}`,
    locationId: LOCATION,
    status: SpacecraftStatus.IDLE,
    operatingMode: SpacecraftOperatingMode.NORMAL,
    alertState: AlertState.GREEN,
    fleetId: null,
    runtimeSystems: {},
    user: { id: userId, vacationMode: false, vacationStartedAt: null },
    ...overrides,
  } as unknown as Spacecraft;
}

function createService(options: {
  ships: Spacecraft[];
  stances?: Record<number, Stance>;
  fleets?: Array<{ id: number; leaderId: number }>;
  destroyed?: number[] | ((call: number) => number[]);
}) {
  const resolve = jest.fn(async (alertOwner: number) => stance(options.stances?.[alertOwner] ?? 'NEUTRAL'));
  let calls = 0;
  const battle = jest.fn(async (input: { attackers: Spacecraft[]; defenders: Spacecraft[] }) => ({
    parties: {
      attacker: input.attackers.map((member) => ({ id: member.id, name: member.name, destroyed: false })),
      defender: input.defenders.map((member) => ({ id: member.id, name: member.name, destroyed: false })),
    },
    rounds: [],
    outcome: {
      winner: 'ATTACKER',
      destroyedShipIds:
        typeof options.destroyed === 'function' ? options.destroyed(++calls) : (options.destroyed ?? []),
    },
  }));
  const sendSystem = jest.fn(async () => undefined);
  const registry: MovementReaction[] = [];
  const service = new AlertReactionService(
    registry,
    { find: jest.fn(async () => options.ships.map((entry) => ({ ...entry }))) } as never,
    { findBy: jest.fn(async () => options.fleets ?? []) } as never,
    { resolve } as never,
    { resolve: battle } as never,
    { sendSystem } as never,
  );
  return { service, resolve, battle, registry, sendSystem };
}

function context(participants: Spacecraft[]): MovementReactionContext {
  return {
    scope: 'GALAXY',
    fieldId: 7,
    coordinate: { x: 2, y: 1 },
    leader: participants[0],
    participants,
  };
}

describe('reactsToIncoming', () => {
  it.each([
    [AlertState.GREEN, 'FRIEND', false],
    [AlertState.GREEN, 'NEUTRAL', false],
    [AlertState.GREEN, 'ENEMY', false],
    [AlertState.YELLOW, 'FRIEND', false],
    [AlertState.YELLOW, 'NEUTRAL', false],
    [AlertState.YELLOW, 'ENEMY', true],
    [AlertState.RED, 'FRIEND', false],
    [AlertState.RED, 'NEUTRAL', true],
    [AlertState.RED, 'ENEMY', true],
  ] as const)('%s against %s reacts: %s', (alert, status, expected) => {
    expect(reactsToIncoming(alert, stance(status))).toBe(expected);
  });
});

describe('AlertReactionService', () => {
  const incoming = () => ship(10, INCOMING);

  it('registers itself once in the movement reaction port', () => {
    const { service, registry } = createService({ ships: [] });
    service.onModuleInit();
    service.onModuleInit();
    expect(registry).toEqual([service]);
  });

  it.each([
    [AlertState.GREEN, 'ENEMY', false],
    [AlertState.YELLOW, 'NEUTRAL', false],
    [AlertState.YELLOW, 'ENEMY', true],
    [AlertState.RED, 'FRIEND', false],
    [AlertState.RED, 'NEUTRAL', true],
  ] as const)('a %s ship of a %s owner starts a fight: %s', async (alert, status, fights) => {
    const mover = incoming();
    const { service, battle } = createService({
      ships: [mover, ship(20, 2, { alertState: alert })],
      stances: { 2: status },
    });

    const outcome = await service.afterTransition(context([mover]));

    expect(battle).toHaveBeenCalledTimes(fights ? 1 : 0);
    expect(Boolean(outcome?.reports?.length)).toBe(fights);
    expect(outcome?.stop).toBeUndefined();
  });

  it('asks the central resolver from the alerted owner towards the incoming player', async () => {
    const mover = incoming();
    const { service, resolve } = createService({
      ships: [mover, ship(20, 2, { alertState: AlertState.YELLOW })],
      stances: { 2: 'ENEMY' },
    });

    await service.afterTransition(context([mover]));

    expect(resolve).toHaveBeenCalledWith(2, INCOMING);
  });

  it('makes the alerted ship attacker and the incoming party defender without stopping the flight', async () => {
    const mover = incoming();
    const wingman = ship(11, INCOMING);
    const { service, battle } = createService({
      ships: [mover, wingman, ship(20, 2, { alertState: AlertState.RED })],
    });

    const outcome = await service.afterTransition(context([mover, wingman]));

    expect(battle).toHaveBeenCalledWith(
      expect.objectContaining({
        initiatorShipId: 20,
        targetShipId: 10,
        attackerUserId: 2,
        defenderUserId: INCOMING,
      }),
    );
    const input = battle.mock.calls[0][0];
    expect(input.attackers.map((member) => member.id)).toEqual([20]);
    expect(input.defenders.map((member) => member.id)).toEqual([10, 11]);
    expect(outcome).toEqual({
      reports: [expect.objectContaining({ outcome: expect.objectContaining({ winner: 'ATTACKER' }) })],
      changedParticipants: true,
    });
  });

  it('ignores own ships and both sides in effective vacation', async () => {
    const mover = incoming();
    const onVacation = { id: 3, vacationMode: true, vacationStartedAt: VACATION_LONG_AGO };
    const cases = [
      [mover, ship(20, INCOMING, { alertState: AlertState.RED })],
      [mover, ship(21, 3, { alertState: AlertState.RED, user: onVacation as never })],
    ];
    for (const ships of cases) {
      const { service, battle } = createService({ ships });
      await service.afterTransition(context([mover]));
      expect(battle).not.toHaveBeenCalled();
    }

    const resting = ship(10, INCOMING, { user: { ...onVacation, id: INCOMING } as never });
    const { service, battle } = createService({
      ships: [resting, ship(20, 2, { alertState: AlertState.RED })],
    });
    await service.afterTransition(context([resting]));
    expect(battle).not.toHaveBeenCalled();
  });

  it('uses the central cloak rule for alerted and incoming ships', async () => {
    const cloak = { CLOAK: { active: true } } as never;
    const mover = incoming();
    const hiddenAlert = createService({
      ships: [mover, ship(20, 2, { alertState: AlertState.YELLOW, runtimeSystems: cloak })],
      stances: { 2: 'ENEMY' },
    });
    await hiddenAlert.service.afterTransition(context([mover]));
    expect(hiddenAlert.battle).not.toHaveBeenCalled();

    const cloakedMover = ship(10, INCOMING, { runtimeSystems: cloak });
    const hiddenIncoming = createService({
      ships: [cloakedMover, ship(20, 2, { alertState: AlertState.RED })],
    });
    await hiddenIncoming.service.afterTransition(context([cloakedMover]));
    expect(hiddenIncoming.battle).not.toHaveBeenCalled();
  });

  it('lets every eligible party fight in shuffled order (STU shuffle)', async () => {
    const mover = incoming();
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const { service, battle } = createService({
        ships: [
          mover,
          ship(25, 3, { alertState: AlertState.YELLOW }),
          ship(30, 4, { alertState: AlertState.RED }),
          ship(40, 5, { alertState: AlertState.RED }),
        ],
        stances: { 3: 'NEUTRAL' },
      });

      const outcome = await service.afterTransition(context([mover]));

      // Fisher-Yates with random() = 0 turns [30, 40] into [40, 30].
      expect(battle.mock.calls.map(([input]) => input.attackers[0].id)).toEqual([40, 30]);
      expect(outcome && outcome.reports).toHaveLength(2);
    } finally {
      random.mockRestore();
    }
  });

  it('stops attacking once the incoming party is defeated', async () => {
    const mover = incoming();
    const { service, battle } = createService({
      ships: [
        mover,
        ship(30, 4, { alertState: AlertState.RED }),
        ship(40, 5, { alertState: AlertState.RED }),
      ],
      destroyed: [10],
    });

    await service.afterTransition(context([mover]));

    expect(battle).toHaveBeenCalledTimes(1);
    expect(mover.status).toBe(SpacecraftStatus.DESTROYED);
  });

  it('only lets survivors of an earlier fight defend in the next one', async () => {
    const mover = incoming();
    const wingman = ship(11, INCOMING);
    const { service, battle } = createService({
      ships: [
        mover,
        wingman,
        ship(30, 4, { alertState: AlertState.RED }),
        ship(40, 5, { alertState: AlertState.RED }),
      ],
      destroyed: (call) => (call === 1 ? [11] : []),
    });

    await service.afterTransition(context([mover, wingman]));

    expect(battle.mock.calls.map(([input]) => input.defenders.map((member) => member.id))).toEqual([
      [10, 11],
      [10],
    ]);
  });

  it('sends both sides the fight log like STU', async () => {
    const mover = incoming();
    const { service, sendSystem } = createService({
      ships: [mover, ship(20, 2, { alertState: AlertState.RED, kind: 'STATION' as never })],
    });

    await service.afterTransition(context([mover]));

    expect(sendSystem).toHaveBeenCalledWith(
      2,
      'Eigene Schiffe auf Alarm-Rot',
      expect.stringContaining('Kampf in Sektor 2|1'),
      undefined,
      'STATION',
    );
    expect(sendSystem).toHaveBeenCalledWith(
      INCOMING,
      'Fremde Schiffe auf Alarm-Rot',
      expect.stringContaining('Kampf in Sektor 2|1'),
      undefined,
      'SHIP',
    );
  });

  it('reacts with the fleet of an alerted fleet leader only', async () => {
    const mover = incoming();
    const { service, battle } = createService({
      ships: [
        mover,
        ship(20, 2, { alertState: AlertState.RED, fleetId: 9 }),
        ship(21, 2, { alertState: AlertState.RED, fleetId: 9 }),
        ship(22, 2, { alertState: AlertState.GREEN, fleetId: 9 }),
      ],
      fleets: [{ id: 9, leaderId: 21 }],
    });

    await service.afterTransition(context([mover]));

    expect(battle).toHaveBeenCalledTimes(1);
    expect(battle.mock.calls[0][0]).toMatchObject({ initiatorShipId: 21 });
    expect(battle.mock.calls[0][0].attackers.map((member) => member.id)).toEqual([20, 21, 22]);
  });

  it('marks destroyed moving ships so the flight stops them', async () => {
    const mover = incoming();
    const wingman = ship(11, INCOMING);
    const { service } = createService({
      ships: [mover, wingman, ship(20, 2, { alertState: AlertState.RED })],
      destroyed: [11],
    });

    await service.afterTransition(context([mover, wingman]));

    expect(mover.status).toBe(SpacecraftStatus.IDLE);
    expect(wingman.status).toBe(SpacecraftStatus.DESTROYED);
  });
});
