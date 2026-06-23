import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyFieldTerraforming20260617123000 implements MigrationInterface {
  name = 'AddColonyFieldTerraforming20260617123000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_fields"
        ADD COLUMN IF NOT EXISTS "terraformingId" integer,
        ADD COLUMN IF NOT EXISTS "terraformingFinishesAt" timestamp
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_fields"
        DROP COLUMN IF EXISTS "terraformingFinishesAt",
        DROP COLUMN IF EXISTS "terraformingId"
    `);
  }
}
