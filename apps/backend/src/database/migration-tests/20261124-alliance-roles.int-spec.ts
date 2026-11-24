import { DataSource } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { AllianceRoles20261124220000 } from '../migrations/20261124220000-alliance-roles';

/** soc-AUD-09a: fixed offices become standard roles and back. */
describe('alliance roles migration (PostgreSQL)', () => {
  let source: DataSource;
  const migration = new AllianceRoles20261124220000();
  const run = async (direction: 'up' | 'down') => {
    const runner = source.createQueryRunner();
    try {
      await migration[direction](runner);
    } finally {
      await runner.release();
    }
  };

  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => {
    await resetDatabase(source);
    await run('down');
  });
  afterAll(async () => {
    await run('up');
    await source?.destroy();
  });

  async function seed() {
    const rebels = await factionId(source, Faction.REBEL_ALLIANCE);
    const [alliance] = await source.query(
      `INSERT INTO alliances (name, "factionId", "viceTitle") VALUES ('Rogue', $1, 'Vize') RETURNING id`,
      [rebels],
    );
    const users: Record<string, number> = {};
    for (const role of ['PRESIDENT', 'VICE', 'DIPLOMAT', 'NONE']) {
      const user = await createUser(source, { factionId: rebels });
      users[role] = user.id;
      await source.query(
        `INSERT INTO alliance_memberships ("allianceId", "userId", role) VALUES ($1, $2, $3)`,
        [alliance.id, user.id, role],
      );
    }
    return { allianceId: alliance.id as number, users };
  }

  const rolesOf = async (userId: number) =>
    (
      await source.query(
        `SELECT r.title, r.permissions, r.founder FROM alliance_member_roles mr
         JOIN alliance_roles r ON r.id = mr."roleId"
         JOIN alliance_memberships m ON m.id = mr."membershipId"
         WHERE m."userId" = $1 ORDER BY r.sort`,
        [userId],
      )
    ).map((r: { title: string; permissions: string[]; founder: boolean }) => [
      r.title,
      r.permissions,
      r.founder,
    ]);

  it('creates the three standard roles with former titles and keeps holders', async () => {
    const { allianceId, users } = await seed();

    await run('up');
    await run('up');

    expect(
      (
        await source.query(
          `SELECT title, sort FROM alliance_roles WHERE "allianceId" = $1 ORDER BY sort`,
          [allianceId],
        )
      ).map((r: { title: string; sort: number }) => [r.title, r.sort]),
    ).toEqual([
      ['Präsident', 1],
      ['Vize', 2],
      ['Diplomat', 3],
    ]);
    expect(await rolesOf(users.PRESIDENT)).toEqual([
      ['Präsident', ['FOUNDER'], true],
    ]);
    expect((await rolesOf(users.VICE))[0][1]).toContain(
      'VIEW_ALLIANCE_HISTORY',
    );
    expect(await rolesOf(users.DIPLOMAT)).toEqual([
      [
        'Diplomat',
        ['DIPLOMATIC', 'CREATE_AGREEMENTS', 'EDIT_DIPLOMATIC_DOCUMENTS'],
        false,
      ],
    ]);
    expect(await rolesOf(users.NONE)).toEqual([]);
    const dropped = await source.query(
      `SELECT column_name FROM information_schema.columns
       WHERE (table_name = 'alliance_memberships' AND column_name = 'role')
          OR (table_name = 'alliances' AND column_name LIKE '%Title')`,
    );
    expect(dropped).toEqual([]);
  });

  it('allows only one holder of the founder role', async () => {
    const { allianceId, users } = await seed();
    await run('up');

    await expect(
      source.query(
        `INSERT INTO alliance_member_roles ("membershipId", "roleId", founder)
         SELECT m.id, r.id, true FROM alliance_memberships m, alliance_roles r
         WHERE m."userId" = $1 AND r."allianceId" = $2 AND r.founder`,
        [users.VICE, allianceId],
      ),
    ).rejects.toThrow(/UQ_alliance_member_roles_founder/);
  });

  it('restores offices and titles on down', async () => {
    const { allianceId, users } = await seed();
    await run('up');

    await run('down');

    const offices = Object.fromEntries(
      (
        await source.query(
          `SELECT "userId", role FROM alliance_memberships WHERE "allianceId" = $1`,
          [allianceId],
        )
      ).map((r: { userId: number; role: string }) => [r.userId, r.role]),
    );
    expect(offices).toEqual({
      [users.PRESIDENT]: 'PRESIDENT',
      [users.VICE]: 'VICE',
      [users.DIPLOMAT]: 'DIPLOMAT',
      [users.NONE]: 'NONE',
    });
    const [titles] = await source.query(
      `SELECT "presidentTitle", "viceTitle", "diplomatTitle" FROM alliances WHERE id = $1`,
      [allianceId],
    );
    expect(titles).toEqual({
      presidentTitle: 'Präsident',
      viceTitle: 'Vize',
      diplomatTitle: 'Diplomat',
    });
  });
});
