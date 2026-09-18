import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipCommunications20260908152000 implements MigrationInterface {
  name = 'AddShipCommunications20260908152000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ship_log_entries" (
        "id" SERIAL PRIMARY KEY,
        "spacecraftId" integer NOT NULL REFERENCES "spacecraft"("id") ON DELETE CASCADE,
        "authorId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "body" text NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ship_log_spacecraft_created" ON "ship_log_entries" ("spacecraftId", "createdAt")`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ship_distress_signals" (
        "id" SERIAL PRIMARY KEY,
        "spacecraftId" integer NOT NULL REFERENCES "spacecraft"("id") ON DELETE CASCADE,
        "ownerId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "message" varchar(250) NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "startedAt" timestamp NOT NULL DEFAULT now(),
        "stoppedAt" timestamp NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ship_distress_spacecraft_active" ON "ship_distress_signals" ("spacecraftId", "active")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ship_distress_active_started" ON "ship_distress_signals" ("active", "startedAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ship_distress_signals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ship_log_entries"`);
  }
}
