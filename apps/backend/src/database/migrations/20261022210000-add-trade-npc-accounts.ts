import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTradeNpcAccounts20261022210000 implements MigrationInterface {
  name = 'AddTradeNpcAccounts20261022210000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isNpc" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "npcKey" varchar(32)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_npc_key" ON "users" ("npcKey") WHERE "npcKey" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_npc_key"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "npcKey"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "isNpc"`);
  }
}
