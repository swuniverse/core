import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyShields20260619110000 implements MigrationInterface {
  name = 'AddColonyShields20260619110000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_stats"
        ADD COLUMN IF NOT EXISTS "maxShields" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_stats"
        DROP COLUMN IF EXISTS "maxShields"
    `);
  }
}
