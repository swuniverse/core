import { MigrationInterface, QueryRunner } from 'typeorm';

/** soc-AUD-07b: STU private messages have no subject; keep it as a bold first line. */
export class DropMessageSubject20261124180000 implements MigrationInterface {
  name = 'DropMessageSubject20261124180000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const hasSubject = await queryRunner.hasColumn('messages', 'subject');
    if (!hasSubject) return;
    await queryRunner.query(`
      UPDATE "messages"
      SET "body" = '[b]' || btrim("subject") || E'[/b]\\n' || "body"
      WHERE btrim("subject") <> ''
        AND strpos("body", btrim("subject")) = 0
    `);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "subject"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Subjects were merged into the body; restoring the column cannot split them back out.
    await queryRunner.query(
      `ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "subject" varchar(255) NOT NULL DEFAULT ''`,
    );
  }
}
