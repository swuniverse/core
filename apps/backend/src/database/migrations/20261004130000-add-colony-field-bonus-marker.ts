import { MigrationInterface, QueryRunner } from 'typeorm';

/** SWU planetarer Bonus-Marker pro Feld (siehe swu-bonus-markers.ts); NULL = keiner. */
export class AddColonyFieldBonusMarker20261004130000
  implements MigrationInterface
{
  name = 'AddColonyFieldBonusMarker20261004130000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colony_fields" ADD COLUMN IF NOT EXISTS "bonusMarker" varchar(16)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colony_fields" DROP COLUMN IF EXISTS "bonusMarker"`,
    );
  }
}
