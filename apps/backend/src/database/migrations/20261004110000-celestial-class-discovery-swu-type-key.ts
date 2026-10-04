import { MigrationInterface, QueryRunner } from 'typeorm';
import { resolveSwuPlanetTypeFromStuClass } from '../../modules/starmap/generator/swu-planet-type';

/**
 * Entdeckungen werden nicht mehr ueber die STU-classId, sondern ueber den
 * SWU-Planetentyp (Archetyp + Rotation + Ring/Mond) gefuehrt. Alt-Eintraege
 * werden ueber die SWU-Zuordnung migriert; STU-Klassen ohne SWU-Zuordnung
 * fallen weg.
 */
export class CelestialClassDiscoverySwuTypeKey20261004110000
  implements MigrationInterface
{
  name = 'CelestialClassDiscoverySwuTypeKey20261004110000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "celestial_class_discoveries" ADD COLUMN IF NOT EXISTS "swuTypeKey" varchar(32)',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_celestial_class_discovery_user_class"',
    );
    const rows: Array<{ id: number; classId: number }> = await queryRunner.query(
      'SELECT "id", "classId" FROM "celestial_class_discoveries" WHERE "swuTypeKey" IS NULL ORDER BY "discoveredAt" ASC',
    );
    for (const row of rows) {
      const type = resolveSwuPlanetTypeFromStuClass(row.classId);
      if (type) {
        await queryRunner.query(
          'UPDATE "celestial_class_discoveries" SET "swuTypeKey" = $1, "classId" = $2 WHERE "id" = $3',
          [type.key, type.classId, row.id],
        );
      } else {
        await queryRunner.query(
          'DELETE FROM "celestial_class_discoveries" WHERE "id" = $1',
          [row.id],
        );
      }
    }
    // Mehrere STU-Klassen koennen auf denselben SWU-Typ fallen: aeltesten behalten.
    await queryRunner.query(`DELETE FROM "celestial_class_discoveries" a
      USING "celestial_class_discoveries" b
      WHERE a."userId" = b."userId" AND a."swuTypeKey" = b."swuTypeKey" AND a."id" > b."id"`);
    await queryRunner.query(
      'ALTER TABLE "celestial_class_discoveries" ALTER COLUMN "swuTypeKey" SET NOT NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_celestial_class_discovery_user_swu_type" ON "celestial_class_discoveries" ("userId", "swuTypeKey")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_celestial_class_discovery_user_swu_type"',
    );
    await queryRunner.query(
      'ALTER TABLE "celestial_class_discoveries" DROP COLUMN "swuTypeKey"',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_celestial_class_discovery_user_class" ON "celestial_class_discoveries" ("userId", "classId")',
    );
  }
}
