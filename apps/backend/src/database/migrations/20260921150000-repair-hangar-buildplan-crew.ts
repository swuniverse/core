import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairHangarBuildplanCrew20260921150000 implements MigrationInterface {
  name = 'RepairHangarBuildplanCrew20260921150000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE spacecraft ship
      SET
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
        "crewMax" = GREATEST(
          class."crewMax",
          CASE class.key
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
          END
        )
      FROM ship_class_defs class
      WHERE class.id = ship."shipClassId"
        AND class.key IN (
          'REBEL_FIGHTER_X_WING', 'REBEL_FIGHTER_A_WING',
          'REBEL_SHUTTLE_LAAT', 'REBEL_SHUTTLE_U_WING',
          'REBEL_COLONIZER_ICARUS', 'REBEL_FREIGHTER_YT',
          'EMPIRE_FIGHTER_TIE_LN', 'EMPIRE_FIGHTER_TIE_INTERCEPTOR',
          'EMPIRE_SHUTTLE_LAMBDA', 'EMPIRE_COLONIZER_SENTINEL',
          'EMPIRE_FREIGHTER_GOZANTI', 'REBEL_WORKBEE_DROID',
          'EMPIRE_WORKBEE_DROID'
        )
    `);
  }

  async down(): Promise<void> {
    // Buildplan crew cannot be reconstructed safely after later retrofits.
  }
}
