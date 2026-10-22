import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountTokens20261022140000 implements MigrationInterface {
  name = 'AddAccountTokens20261022140000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "account_token_purpose_enum" AS ENUM
          ('PASSWORD_RESET', 'EMAIL_VERIFICATION', 'ACCOUNT_DELETION');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "account_tokens" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "purpose" "account_token_purpose_enum" NOT NULL,
        "tokenHash" character varying(64) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "consumedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_account_tokens_token_hash" UNIQUE ("tokenHash"),
        CONSTRAINT "PK_account_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_account_tokens_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_account_tokens_user_purpose_created" ON "account_tokens" ("userId", "purpose", "createdAt")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "account_tokens"');
    await queryRunner.query('DROP TYPE IF EXISTS "account_token_purpose_enum"');
  }
}
