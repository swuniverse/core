import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVacationRequestedAt20261023170000
  implements MigrationInterface
{
  name = 'AddVacationRequestedAt20261023170000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vacationRequestedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `UPDATE "users"
       SET "vacationRequestedAt" = COALESCE("vacationStartedAt", "vacationEndedAt")
       WHERE "vacationRequestedAt" IS NULL
         AND ("vacationStartedAt" IS NOT NULL OR "vacationEndedAt" IS NOT NULL)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "vacationRequestedAt"`,
    );
  }
}
