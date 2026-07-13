import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Maps old individual module techs to new consolidated module techs.
 * If a user completed ANY variant of a module tier, the new consolidated
 * tech is marked COMPLETED. Partial progress is transferred proportionally.
 */
export class ConsolidateModuleResearch20260708160000
  implements MigrationInterface
{
  name = 'ConsolidateModuleResearch20260708160000';

  // Old tech IDs → new consolidated tech ID
  private readonly mapping: [number[], number][] = [
    [[281101, 281103], 290001], // Waffenmodule Stufe I
    [[282101, 282103], 290002], // Schildmodule Stufe I
    [[283101, 283103], 290003], // Antriebsmodule Stufe I
    [[281201, 281203], 290004], // Waffenmodule Stufe II
    [[282201, 282203], 290005], // Schildmodule Stufe II
    [[283201, 283203], 290006], // Antriebsmodule Stufe II
    [[281301, 281303], 290007], // Waffenmodule Stufe III
    [[282301, 282303], 290008], // Schildmodule Stufe III
    [[283301, 283303], 290009], // Antriebsmodule Stufe III
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [oldIds, newId] of this.mapping) {
      const oldIdsStr = oldIds.join(',');

      const completed = await queryRunner.query(
        `SELECT DISTINCT "userId" FROM "research" WHERE "techId" IN (${oldIdsStr}) AND "status" = 'COMPLETED'`,
      );

      for (const row of completed) {
        const existing = await queryRunner.query(
          `SELECT "id" FROM "research" WHERE "userId" = $1 AND "techId" = $2`,
          [row.userId, newId],
        );
        if (existing.length === 0) {
          await queryRunner.query(
            `INSERT INTO "research" ("userId", "techId", "status", "progress", "spentPoints", "remainingPoints", "sourceCommodityId")
             VALUES ($1, $2, 'COMPLETED', 0, 0, 0, 1701)`,
            [row.userId, newId],
          );
        } else {
          await queryRunner.query(
            `UPDATE "research" SET "status" = 'COMPLETED', "remainingPoints" = 0 WHERE "id" = $1`,
            [existing[0].id],
          );
        }
      }

      const inProgress = await queryRunner.query(
        `SELECT "userId", MAX("spentPoints") as "spentPoints", MAX("remainingPoints") as "remainingPoints"
         FROM "research" WHERE "techId" IN (${oldIdsStr}) AND "status" = 'IN_PROGRESS'
         GROUP BY "userId"`,
      );

      for (const row of inProgress) {
        const existing = await queryRunner.query(
          `SELECT "id", "status" FROM "research" WHERE "userId" = $1 AND "techId" = $2`,
          [row.userId, newId],
        );
        if (existing.length === 0) {
          await queryRunner.query(
            `INSERT INTO "research" ("userId", "techId", "status", "progress", "spentPoints", "remainingPoints", "sourceCommodityId")
             VALUES ($1, $2, 'AVAILABLE', $3, $4, $5, 1701)`,
            [row.userId, newId, row.spentPoints, row.spentPoints, row.remainingPoints],
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [, newId] of this.mapping) {
      await queryRunner.query(`DELETE FROM "research" WHERE "techId" = $1`, [
        newId,
      ]);
    }
  }
}
