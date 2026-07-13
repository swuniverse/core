import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Consolidates individual module class researches (5xxxxx/6xxxxx) into
 * tier-based umbrella researches (290001-290015).
 *
 * Logic: highest completed class determines which tiers are marked COMPLETED.
 * e.g. if user completed 510400 (weapon class 4) → 290001 (Stufe I), 290004 (Stufe II), 290007 (Stufe III) all COMPLETED.
 */
export class ConsolidateModuleTiers20260713120000
  implements MigrationInterface
{
  name = 'ConsolidateModuleTiers20260713120000';

  // Class number → consolidated tech ID per category
  private readonly weaponTiers: Record<number, number> = {
    2: 290001, // Stufe I
    3: 290004, // Stufe II
    4: 290007, // Stufe III
    5: 290010, // Stufe IV
    6: 290011, // Stufe V
  };

  private readonly shieldTiers: Record<number, number> = {
    2: 290002,
    3: 290005,
    4: 290008,
    5: 290012,
    6: 290013,
  };

  private readonly driveTiers: Record<number, number> = {
    2: 290003,
    3: 290006,
    4: 290009,
    5: 290014,
    6: 290015,
  };

  // Map old module IDs to their class number and category
  private getClassFromId(techId: number): { category: 'weapon' | 'shield' | 'drive'; classNum: number } | null {
    const str = String(techId);
    if (str.length !== 6) return null;

    const prefix = Math.floor(techId / 1000);
    // Last 3 digits: x00 pattern → class = first digit after prefix
    // e.g. 510200 → class 2, 510300 → class 3, etc.
    const classDigit = Math.floor((techId % 1000) / 100);
    if (classDigit < 2 || classDigit > 6) return null;

    // Weapons: 510xxx, 511xxx, 520xxx, 521xxx
    if ([510, 511, 520, 521].includes(prefix)) {
      return { category: 'weapon', classNum: classDigit };
    }
    // Shields: 530xxx, 531xxx, 540xxx, 541xxx
    if ([530, 531, 540, 541].includes(prefix)) {
      return { category: 'shield', classNum: classDigit };
    }
    // Drives: 560xxx, 570xxx, 580xxx, 590xxx, 600xxx, 610xxx
    if ([560, 570, 580, 590, 600, 610].includes(prefix)) {
      return { category: 'drive', classNum: classDigit };
    }
    return null;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Find all users who have any module research
    const users = await queryRunner.query(
      `SELECT DISTINCT "userId" FROM "research" WHERE "techId" >= 500000 AND "techId" <= 699999`,
    );

    for (const { userId } of users) {
      // Get all completed module researches for this user
      const completed = await queryRunner.query(
        `SELECT "techId" FROM "research" WHERE "userId" = $1 AND "techId" >= 500000 AND "techId" <= 699999 AND "status" = 'COMPLETED'`,
        [userId],
      );

      // Determine highest completed class per category
      const maxClass: Record<string, number> = { weapon: 1, shield: 1, drive: 1 };
      for (const { techId } of completed) {
        const info = this.getClassFromId(techId);
        if (info && info.classNum > maxClass[info.category]) {
          maxClass[info.category] = info.classNum;
        }
      }

      // Mark consolidated tiers as COMPLETED up to the max class
      const tierMaps = { weapon: this.weaponTiers, shield: this.shieldTiers, drive: this.driveTiers };
      for (const [category, tiers] of Object.entries(tierMaps)) {
        for (let cls = 2; cls <= maxClass[category]; cls++) {
          const newTechId = tiers[cls];
          const existing = await queryRunner.query(
            `SELECT "id" FROM "research" WHERE "userId" = $1 AND "techId" = $2`,
            [userId, newTechId],
          );
          if (existing.length === 0) {
            await queryRunner.query(
              `INSERT INTO "research" ("userId", "techId", "status", "progress", "spentPoints", "remainingPoints", "sourceCommodityId")
               VALUES ($1, $2, 'COMPLETED', 0, 0, 0, 1701)`,
              [userId, newTechId],
            );
          } else {
            await queryRunner.query(
              `UPDATE "research" SET "status" = 'COMPLETED', "remainingPoints" = 0 WHERE "id" = $1`,
              [existing[0].id],
            );
          }
        }
      }
    }

    // Delete all individual module researches
    await queryRunner.query(
      `DELETE FROM "research" WHERE "techId" >= 500000 AND "techId" <= 699999`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove new tier techs (290010-290015)
    await queryRunner.query(
      `DELETE FROM "research" WHERE "techId" IN (290010, 290011, 290012, 290013, 290014, 290015)`,
    );
  }
}
