import { MigrationInterface, QueryRunner } from 'typeorm';

/** soc-AUD-08: database entries from first colony and research have no scanning ship. */
export class DiscoveriesWithoutSpacecraft20261124200000 implements MigrationInterface {
  name = 'DiscoveriesWithoutSpacecraft20261124200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "celestial_class_discoveries" ALTER COLUMN "spacecraftId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ship_class_discoveries" ALTER COLUMN "sourceSpacecraftId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ship_class_discoveries" ALTER COLUMN "targetSpacecraftId" DROP NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "ship_class_discoveries" WHERE "sourceSpacecraftId" IS NULL OR "targetSpacecraftId" IS NULL`,
    );
    await queryRunner.query(
      `DELETE FROM "celestial_class_discoveries" WHERE "spacecraftId" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ship_class_discoveries" ALTER COLUMN "targetSpacecraftId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ship_class_discoveries" ALTER COLUMN "sourceSpacecraftId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "celestial_class_discoveries" ALTER COLUMN "spacecraftId" SET NOT NULL`,
    );
  }
}
