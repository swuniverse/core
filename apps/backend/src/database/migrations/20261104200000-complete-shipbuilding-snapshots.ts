import { createHash } from 'node:crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

type ModuleSelection = { slotId: string; commodityId: number };
type LegacyStationJob = {
  id: number;
  userId: number;
  shipClassId: number;
  moduleSelections: ModuleSelection[];
  moduleTypes: string[];
  moduleCommodityIds: number[];
};
type Buildplan = { id: number; name: string; signature: string };

export class CompleteShipbuildingSnapshots20261104200000 implements MigrationInterface {
  name = 'CompleteShipbuildingSnapshots20261104200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Historical module type/category/level cannot be recovered from today's
    // game data. Leave legacy snapshots NULL for the structural core fallback.
    await queryRunner.query(`
      ALTER TABLE "colony_ship_build_queue"
      ADD COLUMN IF NOT EXISTS "buildSnapshot" jsonb
    `);
    const jobs: LegacyStationJob[] = await queryRunner.query(`
      SELECT "id", "userId", "shipClassId", "moduleSelections", "moduleTypes", "moduleCommodityIds"
      FROM "colony_ship_build_queue"
      WHERE "source" = 'STATION' AND "buildPlanId" IS NULL
      ORDER BY "id"
    `);
    for (const job of jobs) {
      // Restore ShipModuleSelection's property order: jsonb does not preserve
      // it, but JSON.stringify in the existing SHA256 signature algorithm does.
      const moduleSelections = job.moduleSelections.map(
        ({ slotId, commodityId }) => ({ slotId, commodityId }),
      );
      const signature = createHash('sha256')
        .update(
          JSON.stringify({
            shipClassId: job.shipClassId,
            moduleSelections: [...moduleSelections].sort((a, b) =>
              a.slotId.localeCompare(b.slotId),
            ),
          }),
        )
        .digest('hex');
      let [plan]: Buildplan[] = await queryRunner.query(
        `
        SELECT "id", "name", "signature" FROM "colony_ship_buildplans"
        WHERE "userId" = $1 AND "signature" = $2
      `,
        [job.userId, signature],
      );
      if (!plan) {
        const baseName = `Raumwerft Bauplan ${job.id}`;
        let name = baseName;
        let suffix = 2;
        while (
          (
            await queryRunner.query(
              `
          SELECT 1 FROM "colony_ship_buildplans" WHERE "userId" = $1 AND "name" = $2
        `,
              [job.userId, name],
            )
          ).length
        ) {
          name = `${baseName} (${suffix++})`;
        }
        [plan] = await queryRunner.query(
          `
          INSERT INTO "colony_ship_buildplans"
            ("userId", "shipClassId", "name", "signature", "moduleSelections", "moduleTypes", "moduleCommodityIds")
          VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
          RETURNING "id", "name", "signature"
        `,
          [
            job.userId,
            job.shipClassId,
            name,
            signature,
            JSON.stringify(moduleSelections),
            JSON.stringify(job.moduleTypes),
            JSON.stringify(job.moduleCommodityIds),
          ],
        );
      }
      await queryRunner.query(
        `
        UPDATE "colony_ship_build_queue"
        SET "buildPlanId" = $1, "buildPlanName" = $2, "buildPlanSignature" = $3
        WHERE "id" = $4
      `,
        [plan.id, plan.name, plan.signature, job.id],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Generated plans and copied provenance are durable player data.
    await queryRunner.query(
      `ALTER TABLE "colony_ship_build_queue" DROP COLUMN IF EXISTS "buildSnapshot"`,
    );
  }
}
