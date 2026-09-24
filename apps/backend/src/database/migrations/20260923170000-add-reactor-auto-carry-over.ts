import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReactorAutoCarryOver20260923170000
  implements MigrationInterface
{
  name = 'AddReactorAutoCarryOver20260923170000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        ADD COLUMN IF NOT EXISTS "reactorAutoCarryOver" boolean NOT NULL DEFAULT false
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        DROP COLUMN IF EXISTS "reactorAutoCarryOver"
    `);
  }
}
