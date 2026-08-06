import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReactorWarpSplit20260807100000 implements MigrationInterface {
  name = 'AddReactorWarpSplit20260807100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        ADD COLUMN IF NOT EXISTS "reactorWarpSplit" integer NOT NULL DEFAULT 100
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        DROP COLUMN IF EXISTS "reactorWarpSplit"
    `);
  }
}
