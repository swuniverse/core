import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipyardQueueModes20260623100000 implements MigrationInterface {
  name = 'AddShipyardQueueModes20260623100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_ship_build_queue"
        ADD COLUMN IF NOT EXISTS "mode" varchar NOT NULL DEFAULT 'BUILD',
        ADD COLUMN IF NOT EXISTS "spacecraftId" integer,
        ADD COLUMN IF NOT EXISTS "repairSnapshot" jsonb,
        ADD COLUMN IF NOT EXISTS "retrofitSnapshot" jsonb
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_colony_ship_build_queue_spacecraft'
        ) THEN
          ALTER TABLE "colony_ship_build_queue"
            ADD CONSTRAINT "FK_colony_ship_build_queue_spacecraft"
            FOREIGN KEY ("spacecraftId") REFERENCES "spacecraft"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_ship_queue_mode_status" ON "colony_ship_build_queue" ("mode", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_ship_queue_spacecraft_status" ON "colony_ship_build_queue" ("spacecraftId", "status")`,
    );
    await queryRunner.query(
      `UPDATE "colony_ship_build_queue" SET "mode" = 'BUILD' WHERE "mode" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_colony_ship_queue_spacecraft_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_colony_ship_queue_mode_status"`,
    );
    await queryRunner.query(`
      ALTER TABLE "colony_ship_build_queue"
        DROP CONSTRAINT IF EXISTS "FK_colony_ship_build_queue_spacecraft",
        DROP COLUMN IF EXISTS "retrofitSnapshot",
        DROP COLUMN IF EXISTS "repairSnapshot",
        DROP COLUMN IF EXISTS "spacecraftId",
        DROP COLUMN IF EXISTS "mode"
    `);
  }
}
