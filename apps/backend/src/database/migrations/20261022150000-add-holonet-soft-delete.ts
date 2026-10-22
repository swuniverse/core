import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHolonetSoftDelete20261022150000 implements MigrationInterface {
  name = 'AddHolonetSoftDelete20261022150000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "holonet_posts" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP',
    );
    await queryRunner.query(
      'ALTER TABLE "holonet_comments" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_holonet_posts_deleted" ON "holonet_posts" ("deletedAt")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_holonet_comments_post_deleted" ON "holonet_comments" ("postId", "deletedAt")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_holonet_comments_post_deleted"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_holonet_posts_deleted"');
    await queryRunner.query(
      'ALTER TABLE "holonet_comments" DROP COLUMN IF EXISTS "deletedAt"',
    );
    await queryRunner.query(
      'ALTER TABLE "holonet_posts" DROP COLUMN IF EXISTS "deletedAt"',
    );
  }
}
