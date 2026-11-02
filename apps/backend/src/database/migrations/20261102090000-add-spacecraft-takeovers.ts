import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftTakeovers20261102090000 implements MigrationInterface {
  name = 'AddSpacecraftTakeovers20261102090000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "spacecraft_takeovers" (
        "id" SERIAL PRIMARY KEY,
        "attackerId" integer NOT NULL REFERENCES "spacecraft"("id") ON DELETE CASCADE,
        "targetId" integer NOT NULL REFERENCES "spacecraft"("id") ON DELETE CASCADE,
        "attackerUserId" integer NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "targetUserId" integer NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "ticksRemaining" integer NOT NULL DEFAULT 10,
        "prestigeCost" integer NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_spacecraft_takeovers_attacker" UNIQUE ("attackerId"),
        CONSTRAINT "UQ_spacecraft_takeovers_target" UNIQUE ("targetId")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "spacecraft_takeovers"');
  }
}
