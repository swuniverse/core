import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFabricationLegacyAmount20261030120000 implements MigrationInterface {
  name = 'AddFabricationLegacyAmount20261030120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colony_fabrication_queue" ADD COLUMN IF NOT EXISTS "legacyAmount" integer NOT NULL DEFAULT 0`,
    );
    // Running timed jobs keep their amount; EPS was never charged for them,
    // so they are carried over without retroactive EPS charge or refund.
    await queryRunner.query(
      `UPDATE "colony_fabrication_queue" SET "legacyAmount" = "amount" WHERE "status" = 'QUEUED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colony_fabrication_queue" DROP COLUMN IF EXISTS "legacyAmount"`,
    );
  }
}
