import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupportMultipleTorpedoTypes20260910209000 implements MigrationInterface {
  name = 'SupportMultipleTorpedoTypes20260910209000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "spacecraft_torpedo_storage" ADD COLUMN "isActive" boolean NOT NULL DEFAULT false',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft_torpedo_storage" DROP CONSTRAINT IF EXISTS "UQ_spacecraft_torpedo_storage_ship"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_spacecraft_torpedo_storage_ship"',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_spacecraft_torpedo_type" ON "spacecraft_torpedo_storage" ("spacecraftId", "torpedoTypeId")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "UQ_spacecraft_torpedo_type"',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft_torpedo_storage" DROP COLUMN "isActive"',
    );
  }
}
