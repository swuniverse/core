import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftBuildplanProvenance20261022214500
  implements MigrationInterface
{
  name = 'AddSpacecraftBuildplanProvenance20261022214500';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        ADD COLUMN IF NOT EXISTS "buildPlanId" integer
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_spacecraft_buildplan" ON "spacecraft" ("buildPlanId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_spacecraft_buildplan"`);
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        DROP COLUMN IF EXISTS "buildPlanId"
    `);
  }
}
