import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyChangeable20260720120000 implements MigrationInterface {
  name = 'AddColonyChangeable20260720120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "colony_changeable" (
        "colonyId" integer PRIMARY KEY,
        "workers" integer NOT NULL DEFAULT 0,
        "workless" integer NOT NULL DEFAULT 0,
        "maxPopulation" integer NOT NULL DEFAULT 0,
        "populationLimit" integer NOT NULL DEFAULT 0,
        "immigrationEnabled" boolean NOT NULL DEFAULT true,
        "energy" integer NOT NULL DEFAULT 0,
        "maxEnergy" integer NOT NULL DEFAULT 0,
        "maxStorage" integer NOT NULL DEFAULT 0,
        "shields" integer NOT NULL DEFAULT 0,
        "maxShields" integer NOT NULL DEFAULT 0,
        "shieldFrequency" integer,
        "torpedoTypeId" integer,
        "colonyMessage" text,
        "isBlockaded" boolean NOT NULL DEFAULT false,
        "trainedCrew" integer NOT NULL DEFAULT 0,
        CONSTRAINT "FK_colony_changeable_colony" FOREIGN KEY ("colonyId") REFERENCES "colonies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      INSERT INTO "colony_changeable" (
        "colonyId",
        "workers",
        "workless",
        "maxPopulation",
        "populationLimit",
        "immigrationEnabled",
        "energy",
        "maxEnergy",
        "maxStorage",
        "shields",
        "maxShields",
        "shieldFrequency",
        "torpedoTypeId",
        "colonyMessage",
        "isBlockaded",
        "trainedCrew"
      )
      SELECT
        c."id",
        COALESCE(s."workers", 0),
        COALESCE(s."workless", c."population", 0),
        COALESCE(s."maxPopulation", c."populationMax", 0),
        COALESCE(s."populationLimit", 0),
        COALESCE(s."immigrationEnabled", true),
        COALESCE(c."energy", 0),
        COALESCE(s."maxEnergy", c."energyMax", 0),
        COALESCE(s."maxStorage", c."storageMax", 0),
        COALESCE(s."shields", 0),
        COALESCE(s."maxShields", 0),
        s."shieldFrequency",
        s."torpedoTypeId",
        s."colonyMessage",
        COALESCE(s."isBlockaded", false),
        COALESCE(s."trainedCrew", 0)
      FROM "colonies" c
      LEFT JOIN "colony_stats" s ON s."colonyId" = c."id"
      ON CONFLICT ("colonyId") DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE "colonies" c
      SET
        "energy" = ch."energy",
        "energyMax" = ch."maxEnergy",
        "population" = ch."workers" + ch."workless",
        "populationMax" = ch."maxPopulation",
        "storageMax" = ch."maxStorage"
      FROM "colony_changeable" ch
      WHERE ch."colonyId" = c."id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "colony_changeable"');
  }
}
