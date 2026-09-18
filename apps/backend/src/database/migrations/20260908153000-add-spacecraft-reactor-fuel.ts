import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftReactorFuel20260908153000 implements MigrationInterface {
  name = 'AddSpacecraftReactorFuel20260908153000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        ADD COLUMN IF NOT EXISTS "reactorFuel" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "reactorFuelMax" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      UPDATE "spacecraft"
      SET "reactorFuelMax" = GREATEST("reactorFuelMax", "reactorOutput" * 10),
          "reactorFuel" = GREATEST("reactorFuel", "reactorOutput" * 10)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        DROP COLUMN IF EXISTS "reactorFuelMax",
        DROP COLUMN IF EXISTS "reactorFuel"
    `);
  }
}
