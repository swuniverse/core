import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairIncompleteStarterColonies20260907190000
  implements MigrationInterface
{
  name = 'RepairIncompleteStarterColonies20260907190000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "colony_stats" (
        "colonyId", "workers", "workless", "maxPopulation", "populationLimit",
        "immigrationEnabled", "maxEnergy", "maxStorage", "shields", "maxShields",
        "shieldFrequency", "torpedoTypeId", "trainedCrew", "isBlockaded"
      )
      SELECT
        colony.id, 0, colony.population, colony."populationMax", 0,
        true, colony."energyMax", colony."storageMax", NULL, 0,
        NULL, NULL, 0, false
      FROM "colonies" AS colony
      JOIN "users" AS "user" ON "user"."starterColonyId" = colony.id
      LEFT JOIN "colony_stats" AS stats ON stats."colonyId" = colony.id
      WHERE stats."colonyId" IS NULL
    `);

    await queryRunner.query(`
      WITH headquarters AS (
        SELECT DISTINCT ON (field."colonyId")
          field.id,
          field."colonyId",
          CASE WHEN "user"."factionId" = 2 THEN 81010300 ELSE 81010100 END AS "buildingId"
        FROM "colony_fields" AS field
        JOIN "colonies" AS colony ON colony.id = field."colonyId"
        JOIN "users" AS "user" ON "user"."starterColonyId" = colony.id
        WHERE field.layer = 'SURFACE'
          AND field."fieldType" <> 201
          AND NOT EXISTS (
            SELECT 1
            FROM "colony_fields" AS existing
            WHERE existing."colonyId" = field."colonyId"
              AND existing."buildingId" IS NOT NULL
          )
        ORDER BY field."colonyId", field."fieldIndex"
      )
      UPDATE "colony_fields" AS field
      SET
        "buildingId" = headquarters."buildingId",
        "buildProgress" = 100,
        "isActive" = true
      FROM headquarters
      WHERE field.id = headquarters.id
    `);
  }

  public async down(): Promise<void> {
    // Repairs only incomplete starter colonies created by the reset defect.
  }
}
