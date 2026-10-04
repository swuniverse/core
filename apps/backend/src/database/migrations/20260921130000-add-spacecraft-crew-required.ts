import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftCrewRequired20260921130000 implements MigrationInterface {
  name = 'AddSpacecraftCrewRequired20260921130000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE spacecraft ADD COLUMN IF NOT EXISTS "crewRequired" integer NOT NULL DEFAULT 0',
    );
    await queryRunner.query(`
      UPDATE spacecraft ship
      SET "crewRequired" = class."crewMin"
      FROM ship_class_defs class
      WHERE class.id = ship."shipClassId"
    `);
    await queryRunner.query(`
      UPDATE spacecraft ship
      SET crew = (
        SELECT COUNT(*)
        FROM crew_assignments assignment
        WHERE assignment."spacecraftId" = ship.id
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE spacecraft DROP COLUMN IF EXISTS "crewRequired"',
    );
  }
}
