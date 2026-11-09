import { Faction } from '@swuniverse/shared';
import { NpcAccountService, NpcKey } from './npc-account.service';

describe('NpcAccountService', () => {
  it('seeds all trade NPCs idempotently and resolves them by stable key', async () => {
    const users: any[] = [];
    const repository = {
      findOneBy: jest.fn(async ({ npcKey }: { npcKey: NpcKey }) =>
        users.find((user) => user.npcKey === npcKey) ?? null,
      ),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        const existing = users.find((user) => user.npcKey === value.npcKey);
        if (existing) return Object.assign(existing, value);
        const saved = { id: users.length + 1, ...value };
        users.push(saved);
        return saved;
      }),
    };
    const factions = {
      findByKey: jest.fn(async (key: Faction) => ({
        id: key === Faction.GALACTIC_EMPIRE ? 10 : 20,
      })),
    };
    const service = new NpcAccountService(repository as never, factions as never);

    await service.seed();
    await service.seed();

    expect(users).toHaveLength(3);
    await expect(service.get(NpcKey.HUTT_CARTEL)).resolves.toMatchObject({
      username: 'Hutten-Kartell',
      faction: null,
      factionId: null,
      isNpc: true,
      onboardingCompleted: true,
      passwordHash: '',
    });
    await expect(service.get(NpcKey.EMPIRE_SUPPLY)).resolves.toMatchObject({
      username: 'Imperiales Versorgungsamt',
      faction: Faction.GALACTIC_EMPIRE,
      factionId: 10,
    });
    await expect(service.get(NpcKey.REBEL_SUPPLY)).resolves.toMatchObject({
      username: 'Rebellen-Nachschub',
      displayName: 'Nachschubkommando der Rebellenallianz',
      faction: Faction.REBEL_ALLIANCE,
      factionId: 20,
    });
    expect((await service.get(NpcKey.REBEL_SUPPLY)).username.length).toBeLessThanOrEqual(32);
  });
});
