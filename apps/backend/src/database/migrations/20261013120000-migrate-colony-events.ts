import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateColonyEvents20261013120000 implements MigrationInterface {
  name = 'MigrateColonyEvents20261013120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD COLUMN IF NOT EXISTS "originKind" varchar(32),
      ADD COLUMN IF NOT EXISTS "originEventId" integer,
      ADD COLUMN IF NOT EXISTS "originEventType" varchar(64),
      ADD COLUMN IF NOT EXISTS "originSeverity" varchar(16),
      ADD COLUMN IF NOT EXISTS "originColonyId" integer,
      ADD COLUMN IF NOT EXISTS "originPayload" jsonb,
      ADD COLUMN IF NOT EXISTS "originTickId" bigint
    `);
    await queryRunner.query(`
      INSERT INTO "messages" (
        "senderId", "recipientId", "subject", "body", "isRead", "isSystem",
        "folder", "deliveryKey", "createdAt", "originKind", "originEventId",
        "originEventType", "originSeverity", "originColonyId", "originPayload",
        "originTickId"
      )
      SELECT
        event."userId", event."userId", event."title", event."message",
        event."readAt" IS NOT NULL, true, 'COLONY',
        'colony-event:' || event."id", event."createdAt", 'COLONY_EVENT',
        event."id", event."type", event."severity", event."colonyId",
        event."payload", event."tickId"
      FROM "colony_events" event
      ON CONFLICT ("deliveryKey") WHERE "deliveryKey" IS NOT NULL DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "messages"
      WHERE "originKind" = 'COLONY_EVENT'
    `);
    await queryRunner.query(`
      ALTER TABLE "messages"
      DROP COLUMN IF EXISTS "originTickId",
      DROP COLUMN IF EXISTS "originPayload",
      DROP COLUMN IF EXISTS "originColonyId",
      DROP COLUMN IF EXISTS "originSeverity",
      DROP COLUMN IF EXISTS "originEventType",
      DROP COLUMN IF EXISTS "originEventId",
      DROP COLUMN IF EXISTS "originKind"
    `);
  }
}
