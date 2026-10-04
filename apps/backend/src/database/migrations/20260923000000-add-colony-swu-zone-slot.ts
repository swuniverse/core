import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fuegt "colonies"."swuZoneSlot" hinzu - die bei der Gruendung gewaehlte Zone
 * (1=Cold/2=Mid/3=Hot) fuer SWU-Archetyp-Kolonien (siehe
 * ColonySeedService.createFollowUpSwuColony). Nullable, weil bestehende
 * STU-Kolonien das Feld nicht haben. Archetyp/Rotation/bodyFeature bleiben
 * weiterhin aus celestialObject (classId/name) ableitbar - nur die Zonenwahl
 * selbst war sonst nirgends gespeichert und ging nach der Gruendung verloren.
 */
export class AddColonySwuZoneSlot20260923000000 implements MigrationInterface {
  name = 'AddColonySwuZoneSlot20260923000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colonies" ADD COLUMN IF NOT EXISTS "swuZoneSlot" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colonies" DROP COLUMN IF EXISTS "swuZoneSlot"`,
    );
  }
}
