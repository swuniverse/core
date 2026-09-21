import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairSpacecraftCrewCapacity20260921140000 implements MigrationInterface {
  name = 'RepairSpacecraftCrewCapacity20260921140000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE spacecraft ship
      SET
        "crewMax" = class."crewMax",
        "crewRequired" = CASE class.key
          WHEN 'REBEL_FIGHTER_X_WING' THEN 5
          WHEN 'REBEL_FIGHTER_A_WING' THEN 5
          WHEN 'REBEL_SHUTTLE_LAAT' THEN 5
          WHEN 'REBEL_SHUTTLE_U_WING' THEN 5
          WHEN 'REBEL_COLONIZER_ICARUS' THEN 0
          WHEN 'REBEL_FREIGHTER_YT' THEN 2
          WHEN 'EMPIRE_FIGHTER_TIE_LN' THEN 5
          WHEN 'EMPIRE_FIGHTER_TIE_INTERCEPTOR' THEN 5
          WHEN 'EMPIRE_SHUTTLE_LAMBDA' THEN 5
          WHEN 'EMPIRE_COLONIZER_SENTINEL' THEN 0
          WHEN 'EMPIRE_FREIGHTER_GOZANTI' THEN 2
          WHEN 'REBEL_WORKBEE_DROID' THEN 1
          WHEN 'EMPIRE_WORKBEE_DROID' THEN 1
          ELSE ship."crewRequired"
        END,
        crew = (
          SELECT COUNT(*)
          FROM crew_assignments assignment
          WHERE assignment."spacecraftId" = ship.id
        )
      FROM ship_class_defs class
      WHERE class.id = ship."shipClassId"
    `);
  }

  async down(): Promise<void> {
    // The corrected values are derived from current class and crew assignments.
  }
}
