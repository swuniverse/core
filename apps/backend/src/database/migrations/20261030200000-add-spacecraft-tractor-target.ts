import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftTractorTarget20261030200000
  implements MigrationInterface
{
  name = 'AddSpacecraftTractorTarget20261030200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        ADD COLUMN IF NOT EXISTS "tractoredShipId" integer
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_spacecraft_tractored_ship"
        ON "spacecraft" ("tractoredShipId")
        WHERE "tractoredShipId" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        ADD CONSTRAINT "FK_spacecraft_tractored_ship"
        FOREIGN KEY ("tractoredShipId") REFERENCES "spacecraft"("id")
        ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        DROP CONSTRAINT IF EXISTS "FK_spacecraft_tractored_ship"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_spacecraft_tractored_ship"
    `);
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        DROP COLUMN IF EXISTS "tractoredShipId"
    `);
  }
}
