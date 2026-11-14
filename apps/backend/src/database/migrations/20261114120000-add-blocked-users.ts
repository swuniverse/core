import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlockedUsers20261114120000 implements MigrationInterface {
  name = 'AddBlockedUsers20261114120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "blocked_users" (
        "userId" integer NOT NULL,
        "emailHash" character varying(64) NOT NULL,
        "blockedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blocked_users" PRIMARY KEY ("userId")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_blocked_users_email_hash" ON "blocked_users" ("emailHash")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "blocked_users"');
  }
}
