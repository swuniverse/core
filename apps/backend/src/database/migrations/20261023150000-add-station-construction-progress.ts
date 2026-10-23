import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStationConstructionProgress20261023150000
  implements MigrationInterface
{
  name = 'AddStationConstructionProgress20261023150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        ADD COLUMN IF NOT EXISTS "constructionTicksRemaining" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        DROP COLUMN IF EXISTS "constructionTicksRemaining"
    `);
  }
}
