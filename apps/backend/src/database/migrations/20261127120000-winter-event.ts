import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Winter event: faction-targeted order broadcasts, the "Kopfgeldjäger gefasst" awards and
 * a second daily opening of the bounty hunter on 6 December (the per-day unique index goes;
 * the opening limit is enforced in code under the anomaly advisory lock).
 */
export class WinterEvent1795780800000 implements MigrationInterface {
  name = 'WinterEvent1795780800000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "order_broadcasts" ADD COLUMN IF NOT EXISTS "targetFaction" varchar(32)`,
    );
    await q.query(`DROP INDEX IF EXISTS "UQ_seasonal_gift_user_day"`);
    for (const [key, image] of [
      ['BOUNTY_HUNTER_CAUGHT_REBEL', '/assets/awards/AAC26.png'],
      ['BOUNTY_HUNTER_CAUGHT_EMPIRE', '/assets/awards/AIC26.png'],
    ]) {
      await q.query(
        `INSERT INTO "awards" ("key", "description", "image", "prestige", "isNpc")
         VALUES ($1, 'Kopfgeldjäger gefasst', $2, 100, false)
         ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description",
           "image" = EXCLUDED."image", "prestige" = EXCLUDED."prestige"`,
        [key, image],
      );
    }
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DELETE FROM "awards" WHERE "key" IN ('BOUNTY_HUNTER_CAUGHT_REBEL', 'BOUNTY_HUNTER_CAUGHT_EMPIRE')`,
    );
    await q.query(`ALTER TABLE "order_broadcasts" DROP COLUMN IF EXISTS "targetFaction"`);
  }
}
