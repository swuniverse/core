import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rotation und Ring von SWU-Planeten als eigene Spalten statt nur im
 * Namens-Suffix " [P1GB]". Bestehende SWU-Objekte werden aus dem Suffix
 * uebernommen; SWU-Objekte ohne Suffix sind rotierend ohne Ring (frueherer
 * Fallback). STU-Objekte (classId < 90000) bleiben NULL.
 */
export class AddCelestialObjectSwuInstance20261004120000
  implements MigrationInterface
{
  name = 'AddCelestialObjectSwuInstance20261004120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "celestial_objects" ADD COLUMN IF NOT EXISTS "swuRotation" varchar(16)`,
    );
    await queryRunner.query(
      `ALTER TABLE "celestial_objects" ADD COLUMN IF NOT EXISTS "swuRing" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`UPDATE "celestial_objects" SET
      "swuRotation" = CASE WHEN "name" ~ '\\[P\\d+G[RMB]\\]$' THEN 'tidal-locked' ELSE 'rotating' END,
      "swuRing" = ("objectType" = 1 AND "name" ~ '\\[P\\d+[GR]R\\]$')
      WHERE "classId" >= 90000 AND "classId" < 90200`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "celestial_objects" DROP COLUMN IF EXISTS "swuRing"`,
    );
    await queryRunner.query(
      `ALTER TABLE "celestial_objects" DROP COLUMN IF EXISTS "swuRotation"`,
    );
  }
}
