import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairSpacecraftCelestialObject20260922120000 implements MigrationInterface {
  name = 'RepairSpacecraftCelestialObject20260922120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE spacecraft ship
      SET "celestialObjectId" = (
        SELECT field."celestialObjectId"
        FROM system_fields field
        WHERE field."starSystemId" = ship."starSystemId"
          AND field.sx = ship."currentSystemFieldX"
          AND field.sy = ship."currentSystemFieldY"
      )
      WHERE ship."inSystem" = true
    `);
    await queryRunner.query(`
      UPDATE spacecraft
      SET "celestialObjectId" = NULL
      WHERE "inSystem" = false
    `);
  }

  async down(): Promise<void> {
    // Previous celestial-object references cannot be reconstructed safely.
  }
}
