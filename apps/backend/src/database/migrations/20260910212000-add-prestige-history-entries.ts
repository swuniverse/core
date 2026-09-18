import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrestigeHistoryEntries20260910212000
  implements MigrationInterface
{
  name = 'AddPrestigeHistoryEntries20260910212000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "prestige_history_entries" (
      "id" SERIAL NOT NULL,
      "userId" integer NOT NULL,
      "amount" integer NOT NULL,
      "description" text NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_prestige_history_entries" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      'CREATE INDEX "IDX_prestige_history_user_created" ON "prestige_history_entries" ("userId", "createdAt")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "prestige_history_entries"');
  }
}
