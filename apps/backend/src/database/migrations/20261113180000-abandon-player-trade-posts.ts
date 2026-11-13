import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * tmw-T12c: like STU's `USER_NOONE`, an abandoned trade post has no owner.
 * The owner's account deletion clears `ownerId` explicitly; `SET NULL` only
 * keeps a direct user delete from failing.
 */
export class AbandonPlayerTradePosts20261113180000 implements MigrationInterface {
  name = 'AbandonPlayerTradePosts20261113180000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trade_posts" DROP CONSTRAINT "FK_trade_posts_owner"`);
    await queryRunner.query(`ALTER TABLE "trade_posts" ALTER COLUMN "ownerId" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "trade_posts" ADD CONSTRAINT "FK_trade_posts_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trade_posts" DROP CONSTRAINT "FK_trade_posts_owner"`);
    await queryRunner.query(`DELETE FROM "trade_posts" WHERE "ownerId" IS NULL`);
    await queryRunner.query(`ALTER TABLE "trade_posts" ALTER COLUMN "ownerId" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "trade_posts" ADD CONSTRAINT "FK_trade_posts_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT`,
    );
  }
}
