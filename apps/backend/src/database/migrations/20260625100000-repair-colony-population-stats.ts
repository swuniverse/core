import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as yaml from 'js-yaml';
import { MigrationInterface, QueryRunner } from 'typeorm';

interface BuildingSeed {
  id: number;
  bevPro?: number;
}

interface BuildingSeedFile {
  buildings?: BuildingSeed[];
}

export class RepairColonyPopulationStats20260625100000 implements MigrationInterface {
  name = 'RepairColonyPopulationStats20260625100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const seedPath = join(
      process.cwd(),
      'game-data/data/buildings/stu-buildings.yaml',
    );
    const seed = yaml.load(readFileSync(seedPath, 'utf-8')) as BuildingSeedFile;
    const housingEntries = (seed.buildings ?? [])
      .map((building) => ({
        id: Number(building.id),
        bevPro: building.bevPro ?? 0,
      }))
      .filter((building) => Number.isFinite(building.id));

    await queryRunner.query(`
      CREATE TEMP TABLE "tmp_building_housing_20260625100000" (
        "buildingId" integer PRIMARY KEY,
        "bevPro" integer NOT NULL
      ) ON COMMIT DROP
    `);

    const batchSize = 500;
    for (let i = 0; i < housingEntries.length; i += batchSize) {
      const batch = housingEntries.slice(i, i + batchSize);
      const values = batch
        .map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`)
        .join(', ');
      const params = batch.flatMap((entry) => [entry.id, entry.bevPro]);
      await queryRunner.query(
        `INSERT INTO "tmp_building_housing_20260625100000" ("buildingId", "bevPro") VALUES ${values}`,
        params,
      );
    }

    await queryRunner.query(`
      WITH effective AS (
        SELECT
          stats."colonyId",
          GREATEST(0, stats."workers" + stats."workless") AS population,
          COALESCE(SUM(housing."bevPro"), 0) AS active_housing
        FROM "colony_stats" stats
        LEFT JOIN "colony_fields" field
          ON field."colonyId" = stats."colonyId"
          AND field."buildingId" IS NOT NULL
          AND field."isBuilding" = false
          AND COALESCE(field."isActive", true) = true
        LEFT JOIN "tmp_building_housing_20260625100000" housing
          ON housing."buildingId" = field."buildingId"
        GROUP BY stats."colonyId", stats."workers", stats."workless"
      )
      UPDATE "colony_stats" stats
      SET "maxPopulation" = GREATEST(effective.active_housing, effective.population)
      FROM effective
      WHERE stats."colonyId" = effective."colonyId"
    `);

    await queryRunner.query(`
      UPDATE "colonies" colony
      SET "population" = GREATEST(0, stats."workers" + stats."workless")
      FROM "colony_stats" stats
      WHERE stats."colonyId" = colony."id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "tmp_building_housing_20260625100000"`,
    );
  }
}
