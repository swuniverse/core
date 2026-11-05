import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLayerAwardKey20261105130000 implements MigrationInterface {
  name = 'AddLayerAwardKey20261105130000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "layers" ADD COLUMN "awardKey" varchar(64) NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "layers" DROP COLUMN "awardKey"');
  }
}
