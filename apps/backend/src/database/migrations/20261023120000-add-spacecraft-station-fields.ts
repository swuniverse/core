import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftStationFields20261023120000 implements MigrationInterface {
  name = 'AddSpacecraftStationFields20261023120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        ADD COLUMN IF NOT EXISTS "kind" varchar NOT NULL DEFAULT 'SHIP',
        ADD COLUMN IF NOT EXISTS "stationRole" varchar,
        ADD COLUMN IF NOT EXISTS "dockedAtId" integer,
        ADD COLUMN IF NOT EXISTS "dockCapacity" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_spacecraft_kind_role" ON "spacecraft" ("kind", "stationRole")
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "spacecraft"
          ADD CONSTRAINT "FK_spacecraft_docked_at"
          FOREIGN KEY ("dockedAtId") REFERENCES "spacecraft"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "spacecraft" DROP CONSTRAINT IF EXISTS "FK_spacecraft_docked_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_spacecraft_kind_role"`);
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        DROP COLUMN IF EXISTS "dockCapacity",
        DROP COLUMN IF EXISTS "dockedAtId",
        DROP COLUMN IF EXISTS "stationRole",
        DROP COLUMN IF EXISTS "kind"
    `);
  }
}
