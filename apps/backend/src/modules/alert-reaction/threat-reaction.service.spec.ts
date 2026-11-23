import type { ResolvedStance } from '../alliance/relationship-resolver.service';
import { CombatCause } from '../combat/combat-cause';
import {
  AlertState,
  SpacecraftOperatingMode,
  SpacecraftStatus,
  type Spacecraft,
} from '../spacecraft/entities/spacecraft.entity';
import type { ThreatReaction } from '../spacecraft/threat-reaction.port';
import { ThreatReactionService } from './threat-reaction.service';

type Stance = 'FRIEND' | 'NEUTRAL' | 'ENEMY';

const CAUSER = 1;
const OWNER = 2;

function ship(id: number, userId: number, overrides: Partial<Spacecraft> = {}): Spacecraft {
  return {
    id,
    userId,
    name: `Schiff ${id}`,
    locationId: 50,
    location: { kind: 'GALAXY_FIELD', galaxyField: { cx: 3, cy: 4 } },
    status: SpacecraftStatus.IDLE,
    operatingMode: SpacecraftOperatingMode.NORMAL,
    alertState: AlertState.GREEN,
    fleetId: null,
    runtimeSystems: {},
    user: { id: userId },
    ...overrides,
  } as unknown as Spacecraft;
}

function createService(options: {
  ships: Spacecraft[];
  stance?: Stance;
  fleetLeaderId?: number;
  lines?: string[];
}) {
  const resolve = jest.fn(
    async (): Promise<ResolvedStance> =>
      ({ isFriend: options.stance === 'FRIEND', isEnemy: options.stance === 'ENEMY' }) as ResolvedStance,
  );
  const battle = jest.fn(async (_input: { attackers: Spacecraft[]; defenders: Spacecraft[]; cause: CombatCause }) => ({
    rounds: [{ round: 1, lines: (options.lines ?? ['Treffer']).map((text) => ({ text })) }],
    outcome: { destroyedShipIds: [] },
  }));
  const sendSystem = jest.fn(async () => undefined);
  const registry: ThreatReaction[] = [];
  const byId = (id: number) => options.ships.find((entry) => entry.id === id) ?? null;
  const service = new ThreatReactionService(
    registry,
    {
      findOne: jest.fn(async ({ where }: { where: { id: number } }) => byId(where.id)),
      find: jest.fn(async () => options.ships),
    } as never,
    { findOneBy: jest.fn(async () => ({ leaderId: options.fleetLeaderId })) } as never,
    { resolve } as never,
    { resolve: battle } as never,
    { sendSystem } as never,
  );
  return { service, battle, sendSystem, registry };
}

describe('ThreatReactionService', () => {
  it('registers itself once in the threat reaction port', () => {
    const { service, registry } = createService({ ships: [] });
    service.onModuleInit();
    service.onModuleInit();
    expect(registry).toEqual([service]);
  });

  it.each(['ACTIVATE_TRACTOR', 'BOARD_SHIP'] as const)(
    'an alerted foreign target fires a one-way %s battle at the causer alone',
    async (interaction) => {
      const causer = ship(10, CAUSER, { fleetId: 5 });
      const wingman = ship(11, CAUSER, { fleetId: 5 });
      const target = ship(20, OWNER, { alertState: AlertState.YELLOW });
      const { service, battle, sendSystem } = createService({
        ships: [causer, wingman, target],
        stance: 'NEUTRAL',
      });

      const report = await service.reactToThreat(causer.id, target.id, interaction);

      expect(report).not.toBeNull();
      expect(battle).toHaveBeenCalledWith(
        expect.objectContaining({
          attackers: [target],
          defenders: [causer],
          cause: CombatCause[interaction],
          attackerUserId: OWNER,
          defenderUserId: CAUSER,
        }),
      );
      expect(sendSystem).toHaveBeenCalledWith(
        OWNER,
        'Bedrohungsreaktion',
        expect.stringContaining('Die Schiff 10 versucht die Schiff 20 in Sektor 3|4'),
        undefined,
        'SHIP',
      );
    },
  );

  it('fires with the whole fleet when the target leads it (STU AttackingBattleParty)', async () => {
    const causer = ship(10, CAUSER);
    const target = ship(20, OWNER, { alertState: AlertState.RED, fleetId: 7 });
    const member = ship(21, OWNER, { fleetId: 7 });
    const { service, battle } = createService({ ships: [causer, target, member], fleetLeaderId: 20 });

    await service.reactToThreat(causer.id, target.id, 'ACTIVATE_TRACTOR');

    expect(battle.mock.calls[0][0].attackers).toEqual([target, member]);
  });

  it.each([
    ['a green target', ship(20, OWNER), 'ENEMY'],
    ['a friendly target', ship(20, OWNER, { alertState: AlertState.RED }), 'FRIEND'],
    ['an own target', ship(20, CAUSER, { alertState: AlertState.RED }), 'ENEMY'],
  ] as const)('%s does not react', async (_label, target, stance) => {
    const causer = ship(10, CAUSER);
    const { service, battle } = createService({ ships: [causer, target], stance });

    await expect(service.reactToThreat(causer.id, target.id, 'BOARD_SHIP')).resolves.toBeNull();
    expect(battle).not.toHaveBeenCalled();
  });

  it('reports nothing when nobody could fire', async () => {
    const causer = ship(10, CAUSER);
    const target = ship(20, OWNER, { alertState: AlertState.RED });
    const { service, sendSystem } = createService({ ships: [causer, target], lines: [] });

    await expect(service.reactToThreat(causer.id, target.id, 'BOARD_SHIP')).resolves.toBeNull();
    expect(sendSystem).not.toHaveBeenCalled();
  });
});
