import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per "SET EMPTY TO SWU" konvertierte Objekte (originalClassId gesetzt)
 * behielten die Kolonisierbarkeit der alten STU-Klasse (z.B. S = unbewohnbar).
 * Alle SWU-Archetypen sind landable, daher auf true setzen.
 */
export class FixConvertedSwuColonizable20261004140000
  implements MigrationInterface
{
  name = 'FixConvertedSwuColonizable20261004140000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "celestial_objects" SET "isColonizable" = true WHERE "originalClassId" IS NOT NULL AND "isColonizable" = false`,
    );
  }

  async down(): Promise<void> {
    // Nicht rueckgaengig machbar (ursprünglicher Wert unbekannt).
  }
}
