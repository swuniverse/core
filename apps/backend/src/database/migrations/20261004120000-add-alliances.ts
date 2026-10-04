import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAlliances20261004120000 implements MigrationInterface {
  name = 'AddAlliances20261004120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "alliances" (
        "id" SERIAL NOT NULL,
        "name" varchar(40) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "homepage" varchar(255) NOT NULL DEFAULT '',
        "color" varchar(7),
        "factionId" integer NOT NULL,
        "acceptsApplications" boolean NOT NULL DEFAULT false,
        "presidentTitle" varchar(30) NOT NULL DEFAULT 'Präsident',
        "viceTitle" varchar(30) NOT NULL DEFAULT 'Vize-Präsident',
        "diplomatTitle" varchar(30) NOT NULL DEFAULT 'Diplomat',
        "foundedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alliances" PRIMARY KEY ("id"),
        CONSTRAINT "FK_alliances_faction" FOREIGN KEY ("factionId") REFERENCES "factions"("id")
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_alliances_name_lower" ON "alliances" (lower("name"))',
    );

    await queryRunner.query(`
      CREATE TABLE "alliance_memberships" (
        "id" SERIAL NOT NULL,
        "allianceId" integer NOT NULL,
        "userId" integer NOT NULL,
        "role" varchar(16) NOT NULL DEFAULT 'NONE',
        "joinedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alliance_memberships" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_alliance_memberships_role" CHECK ("role" IN ('NONE', 'PRESIDENT', 'VICE', 'DIPLOMAT')),
        CONSTRAINT "FK_alliance_memberships_alliance" FOREIGN KEY ("allianceId") REFERENCES "alliances"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_memberships_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_alliance_memberships_user" ON "alliance_memberships" ("userId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_alliance_memberships_alliance" ON "alliance_memberships" ("allianceId")',
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_alliance_memberships_president" ON "alliance_memberships" ("allianceId") WHERE "role" = 'PRESIDENT'`,
    );

    await queryRunner.query(`
      CREATE TABLE "alliance_applications" (
        "id" SERIAL NOT NULL,
        "allianceId" integer NOT NULL,
        "userId" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alliance_applications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_alliance_applications_alliance" FOREIGN KEY ("allianceId") REFERENCES "alliances"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_applications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_alliance_applications_alliance_user" ON "alliance_applications" ("allianceId", "userId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_alliance_applications_user" ON "alliance_applications" ("userId")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "alliance_applications"');
    await queryRunner.query('DROP TABLE "alliance_memberships"');
    await queryRunner.query('DROP TABLE "alliances"');
  }
}
