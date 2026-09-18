import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminShipBuildplans20260910201000 implements MigrationInterface {
  name = 'AddAdminShipBuildplans20260910201000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_ship_buildplans" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(255) NOT NULL,
        "shipClassId" integer NOT NULL,
        "moduleSelections" jsonb NOT NULL DEFAULT '[]',
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_admin_ship_buildplans_name" ON "admin_ship_buildplans" ("name")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "admin_ship_buildplans"');
  }
}
