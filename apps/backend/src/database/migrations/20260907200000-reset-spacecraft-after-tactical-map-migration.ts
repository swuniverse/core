import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResetSpacecraftAfterTacticalMapMigration20260907200000 implements MigrationInterface {
  name = 'ResetSpacecraftAfterTacticalMapMigration20260907200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "colony_orbit_assignments"`);
    await queryRunner.query(`
      UPDATE "crew_assignments"
      SET
        "spacecraftId" = NULL,
        "slot" = NULL
      WHERE "spacecraftId" IS NOT NULL
    `);
    await queryRunner.query(`
      DELETE FROM "colony_ship_build_queue"
      WHERE "spacecraftId" IS NOT NULL
    `);
    await queryRunner.query(`DELETE FROM "fleets"`);
    await queryRunner.query(`DELETE FROM "spacecraft"`);
  }

  public async down(): Promise<void> {
    // Deleted spacecraft and their dependent state cannot be restored.
  }
}
