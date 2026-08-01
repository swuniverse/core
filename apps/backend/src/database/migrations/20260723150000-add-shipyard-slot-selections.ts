import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipyardSlotSelections20260723150000
  implements MigrationInterface
{
  name = 'AddShipyardSlotSelections20260723150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "spacecraft_modules" ADD COLUMN IF NOT EXISTS "slotId" character varying(64)',
    );
    await queryRunner.query(
      `ALTER TABLE "colony_ship_buildplans" ADD COLUMN IF NOT EXISTS "moduleSelections" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "colony_ship_build_queue" ADD COLUMN IF NOT EXISTS "moduleSelections" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "colony_ship_build_queue" DROP COLUMN IF EXISTS "moduleSelections"',
    );
    await queryRunner.query(
      'ALTER TABLE "colony_ship_buildplans" DROP COLUMN IF EXISTS "moduleSelections"',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft_modules" DROP COLUMN IF EXISTS "slotId"',
    );
  }
}
