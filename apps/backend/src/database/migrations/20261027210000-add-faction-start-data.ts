import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFactionStartData20261027210000 implements MigrationInterface {
  name = 'AddFactionStartData20261027210000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "factions"
        ADD COLUMN IF NOT EXISTS "startResearchTechId" integer,
        ADD COLUMN IF NOT EXISTS "startBuildingId" integer
    `);
    await queryRunner.query(`
      UPDATE "factions"
      SET
        "startResearchTechId" = CASE "key"
          WHEN 'REBEL_ALLIANCE' THEN 1001
          WHEN 'GALACTIC_EMPIRE' THEN 1003
          ELSE "startResearchTechId"
        END,
        "startBuildingId" = CASE "key"
          WHEN 'REBEL_ALLIANCE' THEN 82010100
          WHEN 'GALACTIC_EMPIRE' THEN 82010300
          ELSE "startBuildingId"
        END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "factions"
        DROP COLUMN IF EXISTS "startBuildingId",
        DROP COLUMN IF EXISTS "startResearchTechId"
    `);
  }
}
