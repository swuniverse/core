import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailVerificationRemoveInvites20261111100000
  implements MigrationInterface
{
  name = 'EmailVerificationRemoveInvites20261111100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "emailVerifiedAt" timestamp,
        ADD COLUMN IF NOT EXISTS "emailVerificationTokenHash" character varying(128),
        ADD COLUMN IF NOT EXISTS "emailVerificationExpiresAt" timestamp,
        ADD COLUMN IF NOT EXISTS "emailVerificationSentAt" timestamp
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_users_email_verification_token" ON "users" ("emailVerificationTokenHash")',
    );

    await queryRunner.query(
      'UPDATE "users" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL',
    );

    await queryRunner.query('DROP TABLE IF EXISTS "invite_quotas"');
    await queryRunner.query('DROP TABLE IF EXISTS "invite_keys"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invite_keys" (
        "id" SERIAL NOT NULL,
        "keyHash" character varying(128) NOT NULL,
        "keyPreview" character varying(32) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'available',
        "createdByUserId" integer,
        "ownerUserId" integer,
        "usedByUserId" integer,
        "usedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invite_keys_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invite_keys_keyHash" UNIQUE ("keyHash")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invite_quotas" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "available" integer NOT NULL DEFAULT 0,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invite_quotas_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invite_quotas_userId" UNIQUE ("userId")
      )
    `);

    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_users_email_verification_token"',
    );
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "emailVerificationSentAt",
        DROP COLUMN IF EXISTS "emailVerificationExpiresAt",
        DROP COLUMN IF EXISTS "emailVerificationTokenHash",
        DROP COLUMN IF EXISTS "emailVerifiedAt"
    `);
  }
}
