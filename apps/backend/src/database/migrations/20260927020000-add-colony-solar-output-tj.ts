import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fuegt "colonies"."solarOutputTJ" hinzu - der Solarertrag (siehe
 * swu-solar.ts), einmalig bei Gruendung berechnet (haengt nur von Zone,
 * Rotation, Archetyp und Orbit-Distanz ab, die sich nach der Gruendung nie
 * mehr aendern) und hier gespeichert, damit die Solar-Gebaeude (Ionensegel-
 * Kollektor, Orbital-Solarkollektor, Solarfokus) ihren Energie-Output darauf
 * stuetzen koennen, ohne bei jeder Tick-Berechnung erneut eine DB-Abfrage
 * fuer die Sternposition zu brauchen (siehe colony-stats.service.ts).
 * Nullable, weil nur SWU-Archetyp-Kolonien das haben (STU-Kolonien und
 * bereits vor dieser Aenderung gegruendete SWU-Kolonien bleiben null und
 * nutzen weiterhin die alte statische epsProc).
 */
export class AddColonySolarOutputTj20260927020000
  implements MigrationInterface
{
  name = 'AddColonySolarOutputTj20260927020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colonies" ADD COLUMN IF NOT EXISTS "solarOutputTJ" real`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colonies" DROP COLUMN IF EXISTS "solarOutputTJ"`,
    );
  }
}
