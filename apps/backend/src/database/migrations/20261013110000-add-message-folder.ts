import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageFolder20261013110000 implements MigrationInterface {
  name = 'AddMessageFolder20261013110000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD COLUMN "folder" varchar(16) NOT NULL DEFAULT 'PERSONAL'
    `);
    await queryRunner.query(`
      UPDATE "messages"
      SET "folder" = 'SYSTEM'
      WHERE "isSystem" = true
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_messages_recipient_folder_created_at"
      ON "messages" ("recipientId", "folder", "createdAt" DESC)
      WHERE "deletedByRecipient" = false
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "IDX_messages_recipient_folder_created_at"',
    );
    await queryRunner.query('ALTER TABLE "messages" DROP COLUMN "folder"');
  }
}
