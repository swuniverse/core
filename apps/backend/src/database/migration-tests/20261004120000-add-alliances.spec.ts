import { QueryRunner } from 'typeorm';
import { AddAlliances20261004120000 } from '../migrations/20261004120000-add-alliances';

const compact = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

const recordingQueryRunner = () => {
  const queries: string[] = [];
  const queryRunner = {
    query: jest.fn(async (sql: string) => {
      queries.push(compact(sql));
    }),
  } as unknown as QueryRunner;

  return { queries, queryRunner };
};

const indexOfQuery = (queries: string[], fragment: string): number => {
  const index = queries.findIndex((query) => query.includes(fragment));
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
};

describe('AddAlliances20261004120000 migration', () => {
  it('creates alliances, memberships and applications with cascading foreign keys', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAlliances20261004120000().up(queryRunner);

    const alliances = queries[indexOfQuery(queries, 'CREATE TABLE "alliances"')];
    expect(alliances).toContain('"acceptsApplications" boolean NOT NULL DEFAULT false');
    expect(alliances).toContain(`"presidentTitle" varchar(30) NOT NULL DEFAULT 'Präsident'`);
    expect(alliances).toContain(`"viceTitle" varchar(30) NOT NULL DEFAULT 'Vize-Präsident'`);
    expect(alliances).toContain(`"diplomatTitle" varchar(30) NOT NULL DEFAULT 'Diplomat'`);
    expect(alliances).toContain('"color" varchar(7)');
    expect(alliances).toContain(
      'FOREIGN KEY ("factionId") REFERENCES "factions"("id")',
    );

    const memberships =
      queries[indexOfQuery(queries, 'CREATE TABLE "alliance_memberships"')];
    expect(memberships).toContain(
      'FOREIGN KEY ("allianceId") REFERENCES "alliances"("id") ON DELETE CASCADE',
    );
    expect(memberships).toContain(
      'FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE',
    );

    const applications =
      queries[indexOfQuery(queries, 'CREATE TABLE "alliance_applications"')];
    expect(applications).toContain(
      'FOREIGN KEY ("allianceId") REFERENCES "alliances"("id") ON DELETE CASCADE',
    );
    expect(applications).toContain(
      'FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE',
    );
  });

  it('creates the uniqueness constraints that guard concurrent requests', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAlliances20261004120000().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain(
      'CREATE UNIQUE INDEX "UQ_alliances_name_lower" ON "alliances" (lower("name"))',
    );
    expect(sql).toContain(
      'CREATE UNIQUE INDEX "UQ_alliance_memberships_user" ON "alliance_memberships" ("userId")',
    );
    expect(sql).toContain(
      `CREATE UNIQUE INDEX "UQ_alliance_memberships_president" ON "alliance_memberships" ("allianceId") WHERE "role" = 'PRESIDENT'`,
    );
    expect(sql).toContain(
      'CREATE UNIQUE INDEX "UQ_alliance_applications_alliance_user" ON "alliance_applications" ("allianceId", "userId")',
    );
    expect(
      indexOfQuery(queries, 'CREATE TABLE "alliance_memberships"'),
    ).toBeLessThan(indexOfQuery(queries, 'UQ_alliance_memberships_president'));
  });

  it('drops dependent tables before the alliances table', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAlliances20261004120000().down(queryRunner);

    const dropAlliances = indexOfQuery(queries, 'DROP TABLE "alliances"');
    expect(indexOfQuery(queries, 'DROP TABLE "alliance_applications"')).toBeLessThan(
      dropAlliances,
    );
    expect(indexOfQuery(queries, 'DROP TABLE "alliance_memberships"')).toBeLessThan(
      dropAlliances,
    );
  });
});
