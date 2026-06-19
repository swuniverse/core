import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixStarSystemFieldType20260619130000 implements MigrationInterface {
  name = 'FixStarSystemFieldType20260619130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fields that had the old STAR_SYSTEM type (id=2) should be plain space (id=1).
    // The star is represented by systemTypeId, not by fieldType.
    await queryRunner.query(
      `UPDATE "galaxy_fields" SET "fieldTypeId" = 1 WHERE "fieldTypeId" = 2`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Can't reliably revert — star-system fields are identifiable by systemTypeId
    await queryRunner.query(
      `UPDATE "galaxy_fields" SET "fieldTypeId" = 2 WHERE "systemTypeId" IS NOT NULL AND "fieldTypeId" = 1`,
    );
  }
}
