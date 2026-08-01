import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLayerNoobzone20260720124000 implements MigrationInterface {
  name = 'AddLayerNoobzone20260720124000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "layers"
        ADD COLUMN IF NOT EXISTS "isNoobzone" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "layers"
        DROP COLUMN IF EXISTS "isNoobzone"
    `);
  }
}
