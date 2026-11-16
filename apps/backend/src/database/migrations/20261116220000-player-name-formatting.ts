import { MigrationInterface, QueryRunner } from 'typeorm';
export class PlayerNameFormatting1794866400000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE users ADD COLUMN "displayNameMarkup" text`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_users_visible_player_name" ON users (lower(coalesce(nullif("displayName", ''), username)))`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX "UQ_users_visible_player_name"`);
    await q.query(`ALTER TABLE users DROP COLUMN "displayNameMarkup"`);
  }
}
