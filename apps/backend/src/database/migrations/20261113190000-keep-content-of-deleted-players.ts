import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * sh-AP-05b/05c: content other players see survives a deleted account, like
 * STU hangs it on its fallback user. Here the author column becomes `NULL`
 * and the read models show "Gelöschter Siedler". Ship buildplans still used
 * by other players keep existing without owner (STU `USER_FOREIGN_BUILDPLANS`).
 */
const AUTHOR_COLUMNS = [
  ['messages', 'senderId', 'FK_messages_sender'],
  ['holonet_posts', 'authorId', 'FK_holonet_posts_author'],
  ['holonet_comments', 'authorId', 'FK_holonet_comments_author'],
  ['news', 'authorId', 'FK_news_author'],
] as const;

export class KeepContentOfDeletedPlayers20261113190000 implements MigrationInterface {
  name = 'KeepContentOfDeletedPlayers20261113190000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column, constraint] of AUTHOR_COLUMNS) {
      await this.dropUserForeignKey(queryRunner, table, column);
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP NOT NULL`);
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}" FOREIGN KEY ("${column}") REFERENCES "users"("id") ON DELETE SET NULL`,
      );
    }
    await queryRunner.query(`ALTER TABLE "colony_ship_buildplans" ALTER COLUMN "userId" DROP NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "colony_ship_buildplans" WHERE "userId" IS NULL`);
    await queryRunner.query(`ALTER TABLE "colony_ship_buildplans" ALTER COLUMN "userId" SET NOT NULL`);
    for (const [table, column, constraint] of AUTHOR_COLUMNS) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${constraint}"`);
      await queryRunner.query(`DELETE FROM "${table}" WHERE "${column}" IS NULL`);
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" SET NOT NULL`);
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}" FOREIGN KEY ("${column}") REFERENCES "users"("id") ON DELETE ${table === 'news' ? 'RESTRICT' : 'CASCADE'}`,
      );
    }
  }

  /** Generated constraint names differ between environments, so look them up. */
  private async dropUserForeignKey(queryRunner: QueryRunner, table: string, column: string): Promise<void> {
    const rows: Array<{ name: string }> = await queryRunner.query(
      `SELECT con.conname AS name
         FROM pg_constraint con
         JOIN pg_class rel ON rel.oid = con.conrelid
         JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
        WHERE con.contype = 'f' AND rel.relname = $1 AND att.attname = $2
          AND con.confrelid = '"users"'::regclass`,
      [table, column],
    );
    for (const { name } of rows) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${name}"`);
    }
  }
}
