import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairGalaxySpacecraftSystemState20260910205000 implements MigrationInterface {
  name = 'RepairGalaxySpacecraftSystemState20260910205000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "spacecraft"
      SET
        "starSystemId" = NULL,
        "currentSystemFieldX" = NULL,
        "currentSystemFieldY" = NULL,
        "celestialObjectId" = NULL
      WHERE "inSystem" = false
    `);
  }

  async down(): Promise<void> {
    // This repair intentionally does not restore stale system references.
  }
}
