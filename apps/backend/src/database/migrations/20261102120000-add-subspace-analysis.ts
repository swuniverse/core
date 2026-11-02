import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubspaceAnalysis20261102120000 implements MigrationInterface {
  name = 'AddSubspaceAnalysis20261102120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "spacecraft" ADD COLUMN IF NOT EXISTS "analyzedFlightSignatureId" integer`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "spacecraft" DROP COLUMN IF EXISTS "analyzedFlightSignatureId"`,
    );
  }
}
