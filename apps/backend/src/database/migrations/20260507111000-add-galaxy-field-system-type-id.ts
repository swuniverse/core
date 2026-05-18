import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGalaxyFieldSystemTypeId20260507111000 implements MigrationInterface {
  name = 'AddGalaxyFieldSystemTypeId20260507111000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" ADD COLUMN IF NOT EXISTS "systemTypeId" integer',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" DROP COLUMN IF EXISTS "systemTypeId"',
    );
  }
}
