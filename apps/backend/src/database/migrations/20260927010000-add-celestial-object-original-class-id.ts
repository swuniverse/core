import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fuegt "celestial_objects"."originalClassId" hinzu - sichert die
 * urspruengliche STU-classId, wenn ein unbewohntes Objekt per Admin-Schalter
 * ("SET EMPTY TO SWU") auf eine synthetische SWU-Archetyp-classId (90000er-
 * Bereich, siehe swu-system-generator.ts) umgestellt wird. "SET EMPTY TO STU"
 * stellt daraus wieder die exakte urspruengliche classId her (z.B. bleibt P
 * von P-T unterscheidbar, obwohl beide auf denselben SWU-Archetyp Arktisch
 * abbilden). Nullable/nie gesetzt = Objekt war nie SWU-konvertiert.
 */
export class AddCelestialObjectOriginalClassId20260927010000
  implements MigrationInterface
{
  name = 'AddCelestialObjectOriginalClassId20260927010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "celestial_objects" ADD COLUMN IF NOT EXISTS "originalClassId" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "celestial_objects" DROP COLUMN IF EXISTS "originalClassId"`,
    );
  }
}
