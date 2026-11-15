import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * sc-WP-UI-3a3: orbit orders belong to their fleet (STU). Existing orders
 * follow the current fleet leader; orders whose leader is destroyed or no
 * longer in the colony's orbit are removed, and every colony's blockade
 * flag is recomputed. Idempotent.
 */
export class RepairOrphanedOrbitOrders20261115100000 implements MigrationInterface {
  name = 'RepairOrphanedOrbitOrders20261115100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "colony_orbit_assignments" AS assignment
      SET "spacecraftId" = fleet."leaderId"
      FROM "fleets" AS fleet
      WHERE assignment."fleetId" = fleet."id"
        AND assignment."spacecraftId" <> fleet."leaderId"
        AND EXISTS (SELECT 1 FROM "spacecraft" AS leader WHERE leader."id" = fleet."leaderId")
    `);
    await queryRunner.query(`
      DELETE FROM "colony_orbit_assignments" AS assignment
      WHERE NOT EXISTS (
        SELECT 1
        FROM "fleets" AS fleet
        JOIN "spacecraft" AS leader ON leader."id" = fleet."leaderId"
        JOIN "space_locations" AS location ON location."id" = leader."locationId"
        JOIN "system_fields" AS field ON field."id" = location."systemFieldId"
        JOIN "colonies" AS colony ON colony."id" = assignment."colonyId"
        LEFT JOIN "system_fields" AS colonyField ON colonyField."id" = colony."systemFieldId"
        WHERE fleet."id" = assignment."fleetId"
          AND leader."fleetId" = fleet."id"
          AND leader."status" <> 'DESTROYED'
          AND field."starSystemId" = COALESCE(colonyField."starSystemId", colony."starSystemId")
          AND field."sx" = COALESCE(colonyField."sx", colony."posX")
          AND field."sy" = COALESCE(colonyField."sy", colony."posY")
      )
    `);
    await queryRunner.query(`
      UPDATE "colony_changeable" AS changeable
      SET "isBlockaded" = EXISTS (
        SELECT 1 FROM "colony_orbit_assignments" AS assignment
        WHERE assignment."colonyId" = changeable."colonyId" AND assignment."mode" = 'BLOCKADE'
      )
    `);
  }

  async down(): Promise<void> {
    // Data repair; removed orphaned orders are not restored.
  }
}
