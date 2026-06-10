import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCelestialObjectPlanetClass20260609113000 implements MigrationInterface {
  name = 'DropCelestialObjectPlanetClass20260609113000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "celestial_objects" DROP COLUMN IF EXISTS "planetClass"',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "celestial_objects" ADD COLUMN IF NOT EXISTS "planetClass" character varying(32)',
    );
  }
}
