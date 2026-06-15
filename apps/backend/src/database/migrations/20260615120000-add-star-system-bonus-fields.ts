import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStarSystemBonusFields1718445600000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "star_systems" ADD COLUMN IF NOT EXISTS "bonusFields" smallint NOT NULL DEFAULT 2',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "star_systems" DROP COLUMN IF EXISTS "bonusFields"',
    );
  }
}
