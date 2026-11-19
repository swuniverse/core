import type { MigrationInterface, QueryRunner } from 'typeorm';

/** col-AUD-08b: colony growth follows STU getGrowth without a faction factor. */
export class DropFactionColonyGrowthMultiplier1795078800000 implements MigrationInterface {
  name = 'DropFactionColonyGrowthMultiplier1795078800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "faction_modifiers" DROP COLUMN "colonyGrowthMultiplier"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "faction_modifiers" ADD COLUMN "colonyGrowthMultiplier" float NOT NULL DEFAULT 1`,
    );
  }
}
