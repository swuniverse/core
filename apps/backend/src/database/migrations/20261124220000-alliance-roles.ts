import { MigrationInterface, QueryRunner } from 'typeorm';

// Frozen copies: later changes to the standard roles must not alter this migration.
const VICE_PERMISSIONS = [
  'SUCCESSOR',
  'ALLIANCE_LEADERSHIP',
  'EDIT_ALLIANCE',
  'MANAGE_APPLICATIONS',
  'MANAGE_JOBS',
  'VIEW_COLONIES',
  'VIEW_MEMBER_DATA',
  'VIEW_SHIPS',
  'VIEW_ALLIANCE_STORAGE',
  'VIEW_ALLIANCE_HISTORY',
];
const DIPLOMAT_PERMISSIONS = [
  'DIPLOMATIC',
  'CREATE_AGREEMENTS',
  'EDIT_DIPLOMATIC_DOCUMENTS',
];

/**
 * soc-AUD-09a: the three fixed offices become STU-style roles. Each alliance
 * gets Präsident (FOUNDER), Vize (SUCCESSOR with all children) and Diplomat
 * (DIPLOMATIC with children) with its former titles; holders keep their office.
 */
export class AllianceRoles20261124220000 implements MigrationInterface {
  name = 'AllianceRoles20261124220000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "alliance_roles" (
        "id" SERIAL NOT NULL,
        "allianceId" integer NOT NULL,
        "title" varchar(30) NOT NULL,
        "sort" integer NOT NULL,
        "permissions" varchar(32)[] NOT NULL DEFAULT '{}',
        "founder" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_alliance_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_alliance_roles_id_founder" UNIQUE ("id", "founder"),
        CONSTRAINT "CHK_alliance_roles_founder" CHECK ("founder" = ('FOUNDER' = ANY("permissions"))),
        CONSTRAINT "FK_alliance_roles_alliance" FOREIGN KEY ("allianceId") REFERENCES "alliances"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_alliance_roles_alliance" ON "alliance_roles" ("allianceId")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_alliance_roles_founder" ON "alliance_roles" ("allianceId") WHERE "founder"',
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "alliance_member_roles" (
        "membershipId" integer NOT NULL,
        "roleId" integer NOT NULL,
        "founder" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_alliance_member_roles" PRIMARY KEY ("membershipId", "roleId"),
        CONSTRAINT "FK_alliance_member_roles_membership" FOREIGN KEY ("membershipId") REFERENCES "alliance_memberships"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_member_roles_role" FOREIGN KEY ("roleId", "founder") REFERENCES "alliance_roles"("id", "founder") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_alliance_member_roles_role" ON "alliance_member_roles" ("roleId")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_alliance_member_roles_founder" ON "alliance_member_roles" ("roleId") WHERE "founder"',
    );

    if (!(await queryRunner.hasColumn('alliance_memberships', 'role'))) return;

    for (const [office, titleColumn, sort, permissions] of [
      ['PRESIDENT', 'presidentTitle', 1, ['FOUNDER']],
      ['VICE', 'viceTitle', 2, VICE_PERMISSIONS],
      ['DIPLOMAT', 'diplomatTitle', 3, DIPLOMAT_PERMISSIONS],
    ] as const) {
      const founder = office === 'PRESIDENT';
      await queryRunner.query(
        `INSERT INTO "alliance_roles" ("allianceId", "title", "sort", "permissions", "founder")
         SELECT a."id", a."${titleColumn}", $1, $2::varchar[], $3 FROM "alliances" a`,
        [sort, permissions, founder],
      );
      await queryRunner.query(
        `INSERT INTO "alliance_member_roles" ("membershipId", "roleId", "founder")
         SELECT m."id", r."id", r."founder"
         FROM "alliance_memberships" m
         JOIN "alliance_roles" r ON r."allianceId" = m."allianceId" AND r."sort" = $1
         WHERE m."role" = $2`,
        [sort, office],
      );
    }

    await queryRunner.query(
      'DROP INDEX IF EXISTS "UQ_alliance_memberships_president"',
    );
    await queryRunner.query(
      'ALTER TABLE "alliance_memberships" DROP CONSTRAINT IF EXISTS "CHK_alliance_memberships_role"',
    );
    await queryRunner.query(
      'ALTER TABLE "alliance_memberships" DROP COLUMN "role"',
    );
    await queryRunner.query(
      'ALTER TABLE "alliances" DROP COLUMN IF EXISTS "presidentTitle", DROP COLUMN IF EXISTS "viceTitle", DROP COLUMN IF EXISTS "diplomatTitle"',
    );
  }

  /**
   * Back to fixed offices: the founder role holder becomes president, any other
   * SUCCESSOR holder vice, any other DIPLOMATIC holder diplomat. Titles come
   * from the first such role. Other roles and further holders are lost.
   */
  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('alliance_memberships', 'role'))) {
      await queryRunner.query(`
        ALTER TABLE "alliances"
          ADD COLUMN "presidentTitle" varchar(30) NOT NULL DEFAULT 'Präsident',
          ADD COLUMN "viceTitle" varchar(30) NOT NULL DEFAULT 'Vize-Präsident',
          ADD COLUMN "diplomatTitle" varchar(30) NOT NULL DEFAULT 'Diplomat'
      `);
      await queryRunner.query(
        `ALTER TABLE "alliance_memberships" ADD COLUMN "role" varchar(16) NOT NULL DEFAULT 'NONE'`,
      );
      await queryRunner.query(
        `ALTER TABLE "alliance_memberships" ADD CONSTRAINT "CHK_alliance_memberships_role" CHECK ("role" IN ('NONE', 'PRESIDENT', 'VICE', 'DIPLOMAT'))`,
      );
      for (const [column, permission] of [
        ['presidentTitle', 'FOUNDER'],
        ['viceTitle', 'SUCCESSOR'],
        ['diplomatTitle', 'DIPLOMATIC'],
      ] as const) {
        await queryRunner.query(
          `UPDATE "alliances" a SET "${column}" = r."title"
           FROM (
             SELECT DISTINCT ON ("allianceId") "allianceId", "title"
             FROM "alliance_roles"
             WHERE $1 = ANY("permissions")
             ORDER BY "allianceId", "sort", "id"
           ) r
           WHERE r."allianceId" = a."id"`,
          [permission],
        );
      }
      // Highest office wins: diplomat first, then vice, then president.
      for (const [office, permission] of [
        ['DIPLOMAT', 'DIPLOMATIC'],
        ['VICE', 'SUCCESSOR'],
        ['PRESIDENT', 'FOUNDER'],
      ] as const) {
        await queryRunner.query(
          `UPDATE "alliance_memberships" m SET "role" = $1
           WHERE EXISTS (
             SELECT 1 FROM "alliance_member_roles" mr
             JOIN "alliance_roles" r ON r."id" = mr."roleId"
             WHERE mr."membershipId" = m."id" AND $2 = ANY(r."permissions")
           )`,
          [office, permission],
        );
      }
      await queryRunner.query(
        `CREATE UNIQUE INDEX "UQ_alliance_memberships_president" ON "alliance_memberships" ("allianceId") WHERE "role" = 'PRESIDENT'`,
      );
    }
    await queryRunner.query('DROP TABLE IF EXISTS "alliance_member_roles"');
    await queryRunner.query('DROP TABLE IF EXISTS "alliance_roles"');
  }
}
