import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInviteKeys20260520120000 implements MigrationInterface {
  name = 'AddInviteKeys20260520120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
      'CREATE INDEX IF NOT EXISTS "IDX_invite_keys_status" ON "invite_keys" ("status")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_invite_keys_owner" ON "invite_keys" ("ownerUserId")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_invite_keys_used_by" ON "invite_keys" ("usedByUserId")',
    );

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_invite_keys_created_by') THEN
          ALTER TABLE "invite_keys" ADD CONSTRAINT "FK_invite_keys_created_by"
            FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_invite_keys_owner') THEN
          ALTER TABLE "invite_keys" ADD CONSTRAINT "FK_invite_keys_owner"
            FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_invite_keys_used_by') THEN
          ALTER TABLE "invite_keys" ADD CONSTRAINT "FK_invite_keys_used_by"
            FOREIGN KEY ("usedByUserId") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_invite_quotas_user') THEN
          ALTER TABLE "invite_quotas" ADD CONSTRAINT "FK_invite_quotas_user"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "invite_quotas"');
    await queryRunner.query('DROP TABLE IF EXISTS "invite_keys"');
  }
}
