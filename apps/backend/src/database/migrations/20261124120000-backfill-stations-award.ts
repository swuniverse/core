import { MigrationInterface, QueryRunner } from 'typeorm';
import { AWARD_CATALOG, AWARD_IMAGE } from '../../modules/awards/award.catalog';

/** Raumkonstrukt per faction; STU grants RESEARCHED_STATIONS with it (stu_research.award_id = 1). */
export const STATION_RESEARCH_TECH_IDS = [12001201, 12001203];

/**
 * sc-AUD-28: players who already finished Raumkonstrukt get the stations award
 * and its prestige like a regular grant (AwardService.grant). Idempotent.
 */
export class BackfillStationsAward20261124120000 implements MigrationInterface {
  name = 'BackfillStationsAward20261124120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const award = AWARD_CATALOG.find((entry) => entry.key === 'RESEARCH_STATIONS');
    if (!award) throw new Error('Award RESEARCH_STATIONS missing from catalog');
    await queryRunner.query(
      `INSERT INTO "awards" ("key", "description", "image", "prestige", "isNpc")
       VALUES ($1, $2, $3, $4, false)
       ON CONFLICT ("key") DO NOTHING`,
      [award.key, award.description, AWARD_IMAGE, award.prestige],
    );
    const granted: Array<{ userId: number }> = await queryRunner.query(
      `INSERT INTO "user_awards" ("userId", "awardKey", "count")
       SELECT DISTINCT research."userId", $1, 1
       FROM "research" research
       WHERE research."techId" = ANY($2) AND research."status" = 'COMPLETED'
       ON CONFLICT ("userId", "awardKey") DO NOTHING
       RETURNING "userId"`,
      [award.key, STATION_RESEARCH_TECH_IDS],
    );
    const [{ prestige, description }] = await queryRunner.query(
      `SELECT "prestige", "description" FROM "awards" WHERE "key" = $1`,
      [award.key],
    );
    // PrestigeService.change: NPCs earn no prestige.
    for (const { userId } of granted) {
      const [user] = await queryRunner.query(
        `UPDATE "users" SET "prestige" = "prestige" + $2 WHERE "id" = $1 AND "isNpc" = false RETURNING "id"`,
        [userId, prestige],
      );
      if (!user || prestige === 0) continue;
      await queryRunner.query(
        `INSERT INTO "prestige_history_entries" ("userId", "amount", "description") VALUES ($1, $2, $3)`,
        [userId, prestige, `${prestige} Prestige erhalten für den Erhalt des Awards "${description}"`],
      );
    }
  }

  async down(): Promise<void> {
    // Granted awards and prestige stay; nothing to undo.
  }
}
