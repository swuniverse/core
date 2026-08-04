import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCelestialObjectDescription20260804183000
  implements MigrationInterface
{
  name = 'AddCelestialObjectDescription20260804183000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "celestial_objects"
        ADD COLUMN IF NOT EXISTS "description" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "celestial_objects"
        DROP COLUMN IF EXISTS "description"
    `);
  }
}
