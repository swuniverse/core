import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingEntityColumns20260513120000 implements MigrationInterface {
  name = 'AddMissingEntityColumns20260513120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users: profile and vacation columns
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "description" text',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vacationMode" boolean NOT NULL DEFAULT false',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vacationStartedAt" timestamp',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vacationEndedAt" timestamp',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletionMark" integer NOT NULL DEFAULT 0',
    );

    // HoloNet posts: pinning, comments, rating
    await queryRunner.query(
      'ALTER TABLE "holonet_posts" ADD COLUMN IF NOT EXISTS "isPinned" boolean NOT NULL DEFAULT false',
    );
    await queryRunner.query(
      'ALTER TABLE "holonet_posts" ADD COLUMN IF NOT EXISTS "commentCount" integer NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE "holonet_posts" ADD COLUMN IF NOT EXISTS "rating" integer NOT NULL DEFAULT 0',
    );

    // Messages: soft-delete flags
    await queryRunner.query(
      'ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "deletedBySender" boolean NOT NULL DEFAULT false',
    );
    await queryRunner.query(
      'ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "deletedByRecipient" boolean NOT NULL DEFAULT false',
    );

    // Cargo items table (migration 20260512 recorded but table missing)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cargo_items" (
        "id" SERIAL PRIMARY KEY,
        "spacecraftId" integer NOT NULL,
        "commodityId" integer NOT NULL,
        "amount" integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_cargo_ship_commodity" UNIQUE ("spacecraftId", "commodityId"),
        CONSTRAINT "FK_cargo_spacecraft" FOREIGN KEY ("spacecraftId")
          REFERENCES "spacecraft"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "cargo_items"');
    await queryRunner.query(
      'ALTER TABLE "messages" DROP COLUMN IF EXISTS "deletedByRecipient"',
    );
    await queryRunner.query(
      'ALTER TABLE "messages" DROP COLUMN IF EXISTS "deletedBySender"',
    );
    await queryRunner.query(
      'ALTER TABLE "holonet_posts" DROP COLUMN IF EXISTS "rating"',
    );
    await queryRunner.query(
      'ALTER TABLE "holonet_posts" DROP COLUMN IF EXISTS "commentCount"',
    );
    await queryRunner.query(
      'ALTER TABLE "holonet_posts" DROP COLUMN IF EXISTS "isPinned"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN IF EXISTS "deletionMark"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN IF EXISTS "vacationEndedAt"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN IF EXISTS "vacationStartedAt"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN IF EXISTS "vacationMode"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN IF EXISTS "description"',
    );
  }
}
