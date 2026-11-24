import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../../modules/auth/user.entity';
import { Research, ResearchStatus } from '../../modules/research/entities/research.entity';
import { BackfillStationsAward20261124120000 } from '../migrations/20261124120000-backfill-stations-award';

/** sc-AUD-28: Raumkonstrukt researched before the award existed. */
describe('stations award backfill migration (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  const run = async () => {
    const runner = source.createQueryRunner();
    try {
      await new BackfillStationsAward20261124120000().up(runner);
    } finally {
      await runner.release();
    }
  };
  const research = (userId: number, techId: number, status: ResearchStatus) =>
    source.getRepository(Research).save({ userId, techId, status });
  const awards = async (userId: number) =>
    Number(
      (
        await source.query(
          `SELECT count(*) AS n FROM user_awards WHERE "userId" = $1 AND "awardKey" = 'RESEARCH_STATIONS'`,
          [userId],
        )
      )[0].n,
    );
  const prestige = async (userId: number) =>
    (await source.getRepository(User).findOneByOrFail({ id: userId })).prestige;

  it('grants the award and its prestige once to finished Raumkonstrukt researchers', async () => {
    const rebel = await createUser(source, { prestige: 0 });
    const imperial = await createUser(source, { prestige: 5 });
    const pending = await createUser(source, { prestige: 0 });
    const npc = await createUser(source, { prestige: 0, isNpc: true });
    await research(rebel.id, 12001201, ResearchStatus.COMPLETED);
    await research(imperial.id, 12001203, ResearchStatus.COMPLETED);
    await research(pending.id, 12001201, ResearchStatus.IN_PROGRESS);
    await research(npc.id, 12001201, ResearchStatus.COMPLETED);

    await run();
    await run();

    expect(await awards(rebel.id)).toBe(1);
    expect(await awards(imperial.id)).toBe(1);
    expect(await awards(pending.id)).toBe(0);
    expect(await awards(npc.id)).toBe(1);
    expect(await prestige(rebel.id)).toBe(10);
    expect(await prestige(imperial.id)).toBe(15);
    expect(await prestige(npc.id)).toBe(0);
    const history = await source.query(
      `SELECT amount FROM prestige_history_entries WHERE "userId" = $1`,
      [rebel.id],
    );
    expect(history).toEqual([{ amount: 10 }]);
  });
});
