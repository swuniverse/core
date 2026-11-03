import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipBuildCrewSnapshot20261103100000
  implements MigrationInterface
{
  name = 'AddShipBuildCrewSnapshot20261103100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_ship_build_queue"
      ADD COLUMN IF NOT EXISTS "crewRequired" integer
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_ship_build_queue"
      DROP COLUMN IF EXISTS "crewRequired"
    `);
  }
}
