import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Destruction used to remove a fleet leader without a successor
 * (sc-WP-FLEET-4). Fleets whose leader is missing, destroyed or no longer a
 * member get the remaining member with the lowest id; fleets without members
 * are deleted (their orbit orders cascade).
 */
export class RepairOrphanedFleetLeaders20261114180000 implements MigrationInterface {
  name = 'RepairOrphanedFleetLeaders20261114180000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "fleets" AS fleet
      SET "leaderId" = successor."id"
      FROM (
        SELECT "fleetId", MIN("id") AS "id"
        FROM "spacecraft"
        WHERE "fleetId" IS NOT NULL AND "status" <> 'DESTROYED'
        GROUP BY "fleetId"
      ) AS successor
      WHERE successor."fleetId" = fleet."id"
        AND NOT EXISTS (
          SELECT 1 FROM "spacecraft" AS leader
          WHERE leader."id" = fleet."leaderId"
            AND leader."fleetId" = fleet."id"
            AND leader."status" <> 'DESTROYED'
        )
    `);
    await queryRunner.query(`
      DELETE FROM "fleets" AS fleet
      WHERE NOT EXISTS (
        SELECT 1 FROM "spacecraft" AS member
        WHERE member."fleetId" = fleet."id" AND member."status" <> 'DESTROYED'
      )
    `);
  }

  async down(): Promise<void> {
    // Data repair; the previous dangling leader references are not restored.
  }
}
