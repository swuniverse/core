import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipClassUnlockTech20260526150000 implements MigrationInterface {
  name = 'AddShipClassUnlockTech20260526150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "ship_class_defs" ADD COLUMN IF NOT EXISTS "unlockTechId" integer',
    );
    await queryRunner.query(
      'UPDATE "ship_class_defs" SET "unlockTechId" = 4 WHERE "unlockTechId" IS NULL AND "isNpc" = false',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "ship_class_defs" DROP COLUMN IF EXISTS "unlockTechId"',
    );
  }
}
