import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Resets research tree to new consolidated structure.
 * - Maps individual module research (5xxxxx/6xxxxx) to consolidated tiers (290001-290012)
 * - Removes research rows for techs that no longer exist in the new tree
 * - Preserves all other research progress
 */
export class ResearchTreeReset20260713150000 implements MigrationInterface {
  name = 'ResearchTreeReset20260713150000';

  private readonly weaponModuleIds = [
    510200, 510300, 510400, 510500, 510600,
    511200, 511300, 511400, 511500, 511600,
    520200, 520300, 520400, 520500, 520600,
    521200, 521300, 521400, 521500, 521600,
    570200, 570300, 570400, 570500, 570600,
    580200, 580300, 580400, 580500, 580600,
    610200, 610300, 610400, 610500, 610600,
    // Imperial variants
    510203, 510303, 510403, 510503, 510603,
    511203, 511303, 511403, 511503, 511603,
    520203, 520303, 520403, 520503, 520603,
  ];

  private readonly shieldModuleIds = [
    530200, 530210, 530220, 530300, 530310, 530320,
    530400, 530410, 530420, 530500, 530510, 530520,
    530600, 530610, 530620,
    531200, 531210, 531220, 531300, 531310, 531320,
    531400, 531410, 531420, 531500, 531510, 531520,
    531600, 531610, 531620,
    540200, 540210, 540220, 540300, 540310, 540320,
    540400, 540410, 540420, 540500, 540510, 540520,
    540600, 540610, 540620,
    541200, 541300, 541400, 541500, 541600,
  ];

  private readonly driveModuleIds = [
    560200, 560201, 560300, 560301, 560400, 560401,
    560500, 560501, 560600, 560601,
    590200, 590203, 590300, 590303, 590400, 590403,
    590500, 590503, 590600, 590603,
    600200, 600201, 600300, 600301, 600400, 600401,
    600500, 600501, 600600, 600601,
  ];

  // Consolidated tech IDs per category and tier
  // Tier mapping: class 2 → tier 1, class 3-4 → tier 2, class 5 → tier 3, class 6 → tier 4
  private readonly consolidatedIds = {
    weapon: [290001, 290002, 290003, 290004], // Stufe I-IV
    shield: [290005, 290006, 290007, 290008],
    drive: [290009, 290010, 290011, 290012],
  };

  private getClassFromId(techId: number): number {
    const lastThree = techId % 1000;
    return Math.floor(lastThree / 100);
  }

  private classToTier(classNum: number): number {
    if (classNum <= 2) return 1;
    if (classNum <= 4) return 2;
    if (classNum === 5) return 3;
    return 4; // class 6
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const users = await queryRunner.query(
      `SELECT DISTINCT "userId" FROM "research"`,
    );

    for (const { userId } of users) {
      // Find highest completed class per category
      const categories = [
        { ids: this.weaponModuleIds, key: 'weapon' },
        { ids: this.shieldModuleIds, key: 'shield' },
        { ids: this.driveModuleIds, key: 'drive' },
      ] as const;

      for (const { ids, key } of categories) {
        const completed = await queryRunner.query(
          `SELECT "techId" FROM "research" WHERE "userId" = $1 AND "techId" = ANY($2) AND "status" = 'COMPLETED'`,
          [userId, ids],
        );

        let maxTier = 0;
        for (const { techId } of completed) {
          const classNum = this.getClassFromId(techId);
          const tier = this.classToTier(classNum);
          if (tier > maxTier) maxTier = tier;
        }

        // Insert consolidated tiers up to maxTier
        const tierIds = this.consolidatedIds[key];
        for (let t = 0; t < maxTier; t++) {
          const newTechId = tierIds[t];
          const existing = await queryRunner.query(
            `SELECT "id" FROM "research" WHERE "userId" = $1 AND "techId" = $2`,
            [userId, newTechId],
          );
          if (existing.length === 0) {
            await queryRunner.query(
              `INSERT INTO "research" ("userId", "techId", "status", "progress", "spentPoints", "remainingPoints", "sourceCommodityId")
               VALUES ($1, $2, 'COMPLETED', 0, 0, 0, 1712)`,
              [userId, newTechId],
            );
          }
        }
      }
    }

    // Delete all module research rows (old individual modules)
    const allModuleIds = [
      ...this.weaponModuleIds,
      ...this.shieldModuleIds,
      ...this.driveModuleIds,
    ];
    await queryRunner.query(
      `DELETE FROM "research" WHERE "techId" = ANY($1)`,
      [allModuleIds],
    );

    // Delete Forschungslabor
    await queryRunner.query(
      `DELETE FROM "research" WHERE "techId" IN (201001, 201003)`,
    );

    // Delete any research rows for techs removed in old consolidation migration
    await queryRunner.query(
      `DELETE FROM "research" WHERE "techId" IN (281101, 281103, 282101, 282103, 283101, 283103, 281201, 281203, 282201, 282203, 283201, 283203, 281301, 281303, 282301, 282303, 283301, 283303)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove consolidated module techs
    await queryRunner.query(
      `DELETE FROM "research" WHERE "techId" BETWEEN 290001 AND 290012`,
    );
  }
}
