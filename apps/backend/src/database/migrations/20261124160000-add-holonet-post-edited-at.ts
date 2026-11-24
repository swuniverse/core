import { MigrationInterface, QueryRunner } from 'typeorm';

/** soc-AUD-02: STU `kn_post.edit_date`. */
export class AddHolonetPostEditedAt20261124160000 implements MigrationInterface {
  name = 'AddHolonetPostEditedAt20261124160000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "holonet_posts" ADD COLUMN IF NOT EXISTS "editedAt" timestamp NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "holonet_posts" DROP COLUMN IF EXISTS "editedAt"`);
  }
}
