import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyStats20260616120000 implements MigrationInterface {
  name = 'AddColonyStats20260616120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "colony_stats" (
        "colonyId" integer NOT NULL,
        "workers" integer NOT NULL DEFAULT 0,
        "workless" integer NOT NULL DEFAULT 0,
        "maxPopulation" integer NOT NULL DEFAULT 0,
        "populationLimit" integer NOT NULL DEFAULT 0,
        "immigrationEnabled" boolean NOT NULL DEFAULT true,
        "maxEnergy" integer NOT NULL DEFAULT 0,
        "maxStorage" integer NOT NULL DEFAULT 0,
        "shields" integer,
        "shieldFrequency" integer,
        "torpedoTypeId" integer,
        CONSTRAINT "PK_colony_stats" PRIMARY KEY ("colonyId"),
        CONSTRAINT "FK_colony_stats_colony" FOREIGN KEY ("colonyId") REFERENCES "colonies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      INSERT INTO "colony_stats" (
        "colonyId",
        "workers",
        "workless",
        "maxPopulation",
        "populationLimit",
        "immigrationEnabled",
        "maxEnergy",
        "maxStorage"
      )
      SELECT
        c."id",
        0,
        c."population",
        c."populationMax",
        0,
        true,
        c."energyMax",
        c."storageMax"
      FROM "colonies" c
      ON CONFLICT ("colonyId") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "colony_stats"`);
  }
}
