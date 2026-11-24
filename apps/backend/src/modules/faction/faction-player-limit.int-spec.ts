import { DataSource } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { FactionEntity } from './entities/faction.entity';
import { lockJoinableFaction } from './faction.service';

/** sh-AUD-06: STU player_limit, enforced under a faction row lock. */
describe('faction player limit (PostgreSQL)', () => {
  let source: DataSource;
  let empireId: number;
  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => {
    await resetDatabase(source);
    empireId = await factionId(source, Faction.GALACTIC_EMPIRE);
  });
  afterEach(() =>
    source.getRepository(FactionEntity).update(empireId, { playerLimit: 0, isSelectable: true }),
  );
  afterAll(async () => source?.destroy());

  const join = (username: string) =>
    source.transaction(async (manager) => {
      const faction = await lockJoinableFaction(manager, { id: empireId });
      await manager.getRepository(User).insert({
        username,
        email: `${username}@example.test`,
        passwordHash: 'x',
        factionId: faction.id,
      });
    });

  it('does not overbook when the last slot is taken in parallel', async () => {
    await source.getRepository(FactionEntity).update(empireId, { playerLimit: 2 });
    await createUser(source, { factionId: empireId });
    // NPCs never take a slot (STU counts players only).
    await createUser(source, { factionId: empireId, isNpc: true });

    const results = await Promise.allSettled(['a', 'b', 'c'].map(join));

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await source.getRepository(User).countBy({ factionId: empireId, isNpc: false })).toBe(2);
  });

  it('treats limit 0 as unlimited', async () => {
    await Promise.all(['a', 'b', 'c'].map(join));
    expect(await source.getRepository(User).countBy({ factionId: empireId })).toBe(3);
  });
});
