import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddUserMessageFolders20261116200000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE user_message_folders (
      id SERIAL PRIMARY KEY, "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name varchar(40) NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
      "sortOrder" integer NOT NULL DEFAULT 0)`);
    await q.query(
      `CREATE INDEX "IDX_user_message_folders_sort" ON user_message_folders ("userId", "sortOrder")`,
    );
    await q.query(
      `ALTER TABLE messages ADD COLUMN "userFolderId" integer REFERENCES user_message_folders(id) ON DELETE SET NULL`,
    );
    await q.query(
      `ALTER TABLE messages ADD CONSTRAINT "CHK_messages_custom_personal" CHECK ("userFolderId" IS NULL OR (folder = 'PERSONAL' AND "isSystem" = false))`,
    );
    await q.query(
      `CREATE INDEX "IDX_messages_user_folder" ON messages ("recipientId", "userFolderId")`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE messages DROP COLUMN "userFolderId"`);
    await q.query(`DROP TABLE user_message_folders`);
  }
}
