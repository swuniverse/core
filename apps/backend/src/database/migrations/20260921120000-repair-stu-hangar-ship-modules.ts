import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairStuHangarShipModules20260921120000 implements MigrationInterface {
  name = 'RepairStuHangarShipModules20260921120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE ship_class_defs class
      SET
        "crewMin" = crew."baseCrew",
        "crewMax" = crew."maxCrew"
      FROM (
        VALUES
          ('REBEL_FIGHTER_X_WING', 0, 5), ('REBEL_FIGHTER_A_WING', 0, 5),
          ('REBEL_SHUTTLE_LAAT', 0, 5), ('REBEL_SHUTTLE_U_WING', 0, 5),
          ('REBEL_COLONIZER_ICARUS', 0, 0), ('REBEL_FREIGHTER_YT', 0, 2),
          ('REBEL_FRIGATE_CONSULAR', 4, 18), ('REBEL_FRIGATE_PELTA', 4, 18),
          ('REBEL_ESCORT_HAMMERHEAD', 1, 27), ('REBEL_CORVETTE_CR90', 1, 27),
          ('REBEL_SCOUT_HWK_290', 1, 27), ('REBEL_SCOUT_VCX_100', 1, 27),
          ('REBEL_DESTROYER_DREADNOUGHT', 0, 35), ('REBEL_DESTROYER_MC75', 0, 35),
          ('REBEL_CRUISER_NEBULON_B', 10, 56), ('REBEL_CRUISER_MC80', 10, 56),
          ('REBEL_CRUISER_VENATOR', 10, 56), ('REBEL_COLONIZER_CR90', 1, 18),
          ('REBEL_FREIGHTER_BFF1', 1, 18), ('REBEL_FREIGHTER_GR75', 1, 18),
          ('EMPIRE_FIGHTER_TIE_LN', 0, 5), ('EMPIRE_FIGHTER_TIE_INTERCEPTOR', 0, 5),
          ('EMPIRE_SHUTTLE_LAMBDA', 0, 5), ('EMPIRE_COLONIZER_SENTINEL', 0, 0),
          ('EMPIRE_FREIGHTER_GOZANTI', 0, 2), ('EMPIRE_FRIGATE_LANCER', 4, 18),
          ('EMPIRE_FRIGATE_MUNIFICENT', 4, 18), ('EMPIRE_ESCORT_ARQUITENS', 1, 27),
          ('EMPIRE_CORVETTE_RAIDER', 1, 27), ('EMPIRE_DESTROYER_INTERDICTOR', 0, 35),
          ('EMPIRE_DESTROYER_PRAETOR', 0, 35), ('EMPIRE_CRUISER_VINDICATOR', 10, 56),
          ('EMPIRE_CRUISER_IMPERIAL', 10, 56), ('EMPIRE_COLONIZER_LAMBDA_SETTLEMENT', 1, 18),
          ('EMPIRE_FREIGHTER_HEAVY', 1, 18), ('EMPIRE_FREIGHTER_IMPERIAL', 1, 18),
          ('REBEL_WORKBEE_DROID', 0, 1), ('EMPIRE_WORKBEE_DROID', 0, 1),
          ('EMPIRE_SCOUT_RAIDER', 1, 27), ('REBEL_CRUISER_HAMMERHEAD_RESEARCH', 10, 56),
          ('REBEL_CRUISER_CORVUS_RESEARCH', 10, 56), ('EMPIRE_CRUISER_GOZANTI_RESEARCH', 10, 56)
      ) AS crew(key, "baseCrew", "maxCrew")
      WHERE class.key = crew.key
    `);

    await queryRunner.query(`
      UPDATE spacecraft ship
      SET "crewMax" = class."crewMax"
      FROM ship_class_defs class
      WHERE class.id = ship."shipClassId"
    `);

    await queryRunner.query(`
      UPDATE spacecraft ship
      SET
        "starSystemId" = colony."starSystemId",
        "currentLayerId" = system."layerId",
        "celestialObjectId" = colony."celestialObjectId",
        "inSystem" = true,
        "currentSystemFieldX" = colony."posX",
        "currentSystemFieldY" = colony."posY",
        "posX" = colony."posX",
        "posY" = colony."posY"
      FROM colonies colony, star_systems system, ship_class_defs class
      WHERE system.id = colony."starSystemId"
        AND class.id = ship."shipClassId"
        AND class.key IN (
          'REBEL_COLONIZER_ICARUS',
          'EMPIRE_COLONIZER_SENTINEL'
        )
        AND ship."userId" = colony."userId"
        AND NOT EXISTS (
          SELECT 1
          FROM "spacecraft_modules" installed
          WHERE installed."spacecraftId" = ship.id
        )
        AND (
          ship."starSystemId" IS NULL
          OR (
            ship."currentSystemFieldX" = 1
            AND ship."currentSystemFieldY" = 1
          )
        )
        AND (
          SELECT COUNT(*)
          FROM colonies owned
          WHERE owned."userId" = ship."userId"
            AND owned."isAbandoned" = false
        ) = 1
    `);

    await queryRunner.query(`
      WITH required_modules("classKey", "moduleType", category) AS (
        VALUES
          ('REBEL_FIGHTER_X_WING', 'Matrix-Panzerung', 'HULL'),
          ('REBEL_FIGHTER_X_WING', 'Standard-Deflektorschild', 'SHIELDS'),
          ('REBEL_FIGHTER_X_WING', 'Energieverteiler', 'EPS'),
          ('REBEL_FIGHTER_X_WING', 'Ion-Triebwerk', 'SUBLIGHT_DRIVE'),
          ('REBEL_FIGHTER_X_WING', 'Hypermaterie-Reaktor', 'REACTOR'),
          ('REBEL_FIGHTER_X_WING', 'Sensorphalanx', 'SENSORS'),
          ('REBEL_FIGHTER_X_WING', 'Zielcomputer', 'COMPUTER'),
          ('REBEL_FIGHTER_X_WING', 'Standard-Hyperantrieb', 'HYPERDRIVE'),
          ('REBEL_FIGHTER_X_WING', 'Schwerer Turbolaser', 'ENERGY_WEAPON'),
          ('REBEL_FIGHTER_X_WING', 'Protonentorpedo-Werfer', 'TORPEDO_BANK'),
          ('REBEL_FIGHTER_A_WING', 'Ablative Durastahl-Panzerung', 'HULL'),
          ('REBEL_FIGHTER_A_WING', 'Standard-Deflektorschild', 'SHIELDS'),
          ('REBEL_FIGHTER_A_WING', 'Energieverteiler', 'EPS'),
          ('REBEL_FIGHTER_A_WING', 'Ion-Triebwerk', 'SUBLIGHT_DRIVE'),
          ('REBEL_FIGHTER_A_WING', 'Hypermaterie-Reaktor', 'REACTOR'),
          ('REBEL_FIGHTER_A_WING', 'Sensorphalanx', 'SENSORS'),
          ('REBEL_FIGHTER_A_WING', 'Zielcomputer', 'COMPUTER'),
          ('REBEL_FIGHTER_A_WING', 'Standard-Hyperantrieb', 'HYPERDRIVE'),
          ('REBEL_FIGHTER_A_WING', 'Leichter Turbolaser', 'ENERGY_WEAPON'),
          ('REBEL_FIGHTER_A_WING', 'Protonentorpedo-Werfer', 'TORPEDO_BANK'),
          ('REBEL_SHUTTLE_LAAT', 'Matrix-Panzerung', 'HULL'),
          ('REBEL_SHUTTLE_LAAT', 'Standard-Deflektorschild', 'SHIELDS'),
          ('REBEL_SHUTTLE_LAAT', 'Energieverteiler', 'EPS'),
          ('REBEL_SHUTTLE_LAAT', 'Ion-Triebwerk', 'SUBLIGHT_DRIVE'),
          ('REBEL_SHUTTLE_LAAT', 'Hypermaterie-Reaktor', 'REACTOR'),
          ('REBEL_SHUTTLE_LAAT', 'Sensorphalanx', 'SENSORS'),
          ('REBEL_SHUTTLE_LAAT', 'Zielcomputer', 'COMPUTER'),
          ('REBEL_SHUTTLE_LAAT', 'Standard-Hyperantrieb', 'HYPERDRIVE'),
          ('REBEL_SHUTTLE_LAAT', 'Leichter Turbolaser', 'ENERGY_WEAPON'),
          ('REBEL_SHUTTLE_LAAT', 'Protonentorpedo-Werfer', 'TORPEDO_BANK'),
          ('REBEL_SHUTTLE_U_WING', 'Matrix-Panzerung', 'HULL'),
          ('REBEL_SHUTTLE_U_WING', 'Standard-Deflektorschild', 'SHIELDS'),
          ('REBEL_SHUTTLE_U_WING', 'Energieverteiler', 'EPS'),
          ('REBEL_SHUTTLE_U_WING', 'Ion-Triebwerk', 'SUBLIGHT_DRIVE'),
          ('REBEL_SHUTTLE_U_WING', 'Hypermaterie-Reaktor', 'REACTOR'),
          ('REBEL_SHUTTLE_U_WING', 'Sensorphalanx', 'SENSORS'),
          ('REBEL_SHUTTLE_U_WING', 'Zielcomputer', 'COMPUTER'),
          ('REBEL_SHUTTLE_U_WING', 'Standard-Hyperantrieb', 'HYPERDRIVE'),
          ('REBEL_SHUTTLE_U_WING', 'Leichter Turbolaser', 'ENERGY_WEAPON'),
          ('REBEL_SHUTTLE_U_WING', 'Protonentorpedo-Werfer', 'TORPEDO_BANK'),
          ('REBEL_COLONIZER_ICARUS', 'Matrix-Panzerung', 'HULL'),
          ('REBEL_COLONIZER_ICARUS', 'Standard-Deflektorschild', 'SHIELDS'),
          ('REBEL_COLONIZER_ICARUS', 'Energieverteiler', 'EPS'),
          ('REBEL_COLONIZER_ICARUS', 'Ion-Triebwerk', 'SUBLIGHT_DRIVE'),
          ('REBEL_COLONIZER_ICARUS', 'Hypermaterie-Reaktor', 'REACTOR'),
          ('REBEL_COLONIZER_ICARUS', 'Sensorphalanx', 'SENSORS'),
          ('REBEL_COLONIZER_ICARUS', 'Standard-Hyperantrieb', 'HYPERDRIVE'),
          ('REBEL_FREIGHTER_YT', 'Matrix-Panzerung', 'HULL'),
          ('REBEL_FREIGHTER_YT', 'Standard-Deflektorschild', 'SHIELDS'),
          ('REBEL_FREIGHTER_YT', 'Energieverteiler', 'EPS'),
          ('REBEL_FREIGHTER_YT', 'Ion-Triebwerk', 'SUBLIGHT_DRIVE'),
          ('REBEL_FREIGHTER_YT', 'Hypermaterie-Reaktor', 'REACTOR'),
          ('REBEL_FREIGHTER_YT', 'Sensorphalanx', 'SENSORS'),
          ('REBEL_FREIGHTER_YT', 'Standard-Hyperantrieb', 'HYPERDRIVE'),
          ('EMPIRE_FIGHTER_TIE_LN', 'Matrix-Panzerung', 'HULL'),
          ('EMPIRE_FIGHTER_TIE_LN', 'Standard-Deflektorschild', 'SHIELDS'),
          ('EMPIRE_FIGHTER_TIE_LN', 'Energieverteiler', 'EPS'),
          ('EMPIRE_FIGHTER_TIE_LN', 'Ion-Triebwerk', 'SUBLIGHT_DRIVE'),
          ('EMPIRE_FIGHTER_TIE_LN', 'Hypermaterie-Reaktor', 'REACTOR'),
          ('EMPIRE_FIGHTER_TIE_LN', 'Sensorphalanx', 'SENSORS'),
          ('EMPIRE_FIGHTER_TIE_LN', 'Zielcomputer', 'COMPUTER'),
          ('EMPIRE_FIGHTER_TIE_LN', 'Standard-Hyperantrieb', 'HYPERDRIVE'),
          ('EMPIRE_FIGHTER_TIE_LN', 'Schwerer Turbolaser', 'ENERGY_WEAPON'),
          ('EMPIRE_FIGHTER_TIE_LN', 'Protonentorpedo-Werfer', 'TORPEDO_BANK'),
          ('EMPIRE_FIGHTER_TIE_INTERCEPTOR', 'Ablative Durastahl-Panzerung', 'HULL'),
          ('EMPIRE_FIGHTER_TIE_INTERCEPTOR', 'Standard-Deflektorschild', 'SHIELDS'),
          ('EMPIRE_FIGHTER_TIE_INTERCEPTOR', 'Energieverteiler', 'EPS'),
          ('EMPIRE_FIGHTER_TIE_INTERCEPTOR', 'Ion-Triebwerk', 'SUBLIGHT_DRIVE'),
          ('EMPIRE_FIGHTER_TIE_INTERCEPTOR', 'Hypermaterie-Reaktor', 'REACTOR'),
          ('EMPIRE_FIGHTER_TIE_INTERCEPTOR', 'Sensorphalanx', 'SENSORS'),
          ('EMPIRE_FIGHTER_TIE_INTERCEPTOR', 'Zielcomputer', 'COMPUTER'),
          ('EMPIRE_FIGHTER_TIE_INTERCEPTOR', 'Standard-Hyperantrieb', 'HYPERDRIVE'),
          ('EMPIRE_FIGHTER_TIE_INTERCEPTOR', 'Leichter Turbolaser', 'ENERGY_WEAPON'),
          ('EMPIRE_FIGHTER_TIE_INTERCEPTOR', 'Protonentorpedo-Werfer', 'TORPEDO_BANK'),
          ('EMPIRE_SHUTTLE_LAMBDA', 'Matrix-Panzerung', 'HULL'),
          ('EMPIRE_SHUTTLE_LAMBDA', 'Standard-Deflektorschild', 'SHIELDS'),
          ('EMPIRE_SHUTTLE_LAMBDA', 'Energieverteiler', 'EPS'),
          ('EMPIRE_SHUTTLE_LAMBDA', 'Ion-Triebwerk', 'SUBLIGHT_DRIVE'),
          ('EMPIRE_SHUTTLE_LAMBDA', 'Hypermaterie-Reaktor', 'REACTOR'),
          ('EMPIRE_SHUTTLE_LAMBDA', 'Sensorphalanx', 'SENSORS'),
          ('EMPIRE_SHUTTLE_LAMBDA', 'Zielcomputer', 'COMPUTER'),
          ('EMPIRE_SHUTTLE_LAMBDA', 'Standard-Hyperantrieb', 'HYPERDRIVE'),
          ('EMPIRE_SHUTTLE_LAMBDA', 'Leichter Turbolaser', 'ENERGY_WEAPON'),
          ('EMPIRE_SHUTTLE_LAMBDA', 'Protonentorpedo-Werfer', 'TORPEDO_BANK'),
          ('EMPIRE_COLONIZER_SENTINEL', 'Matrix-Panzerung', 'HULL'),
          ('EMPIRE_COLONIZER_SENTINEL', 'Standard-Deflektorschild', 'SHIELDS'),
          ('EMPIRE_COLONIZER_SENTINEL', 'Energieverteiler', 'EPS'),
          ('EMPIRE_COLONIZER_SENTINEL', 'Ion-Triebwerk', 'SUBLIGHT_DRIVE'),
          ('EMPIRE_COLONIZER_SENTINEL', 'Hypermaterie-Reaktor', 'REACTOR'),
          ('EMPIRE_COLONIZER_SENTINEL', 'Sensorphalanx', 'SENSORS'),
          ('EMPIRE_COLONIZER_SENTINEL', 'Standard-Hyperantrieb', 'HYPERDRIVE'),
          ('EMPIRE_FREIGHTER_GOZANTI', 'Matrix-Panzerung', 'HULL'),
          ('EMPIRE_FREIGHTER_GOZANTI', 'Standard-Deflektorschild', 'SHIELDS'),
          ('EMPIRE_FREIGHTER_GOZANTI', 'Energieverteiler', 'EPS'),
          ('EMPIRE_FREIGHTER_GOZANTI', 'Ion-Triebwerk', 'SUBLIGHT_DRIVE'),
          ('EMPIRE_FREIGHTER_GOZANTI', 'Hypermaterie-Reaktor', 'REACTOR'),
          ('EMPIRE_FREIGHTER_GOZANTI', 'Sensorphalanx', 'SENSORS'),
          ('EMPIRE_FREIGHTER_GOZANTI', 'Standard-Hyperantrieb', 'HYPERDRIVE'),
          ('REBEL_WORKBEE_DROID', 'Matrix-Panzerung', 'HULL'),
          ('REBEL_WORKBEE_DROID', 'Energieverteiler', 'EPS'),
          ('REBEL_WORKBEE_DROID', 'Zielcomputer', 'COMPUTER'),
          ('REBEL_WORKBEE_DROID', 'Sensorphalanx', 'SENSORS'),
          ('EMPIRE_WORKBEE_DROID', 'Matrix-Panzerung', 'HULL'),
          ('EMPIRE_WORKBEE_DROID', 'Energieverteiler', 'EPS'),
          ('EMPIRE_WORKBEE_DROID', 'Zielcomputer', 'COMPUTER'),
          ('EMPIRE_WORKBEE_DROID', 'Sensorphalanx', 'SENSORS')
      )
      , inserted AS (
      INSERT INTO "spacecraft_modules"
        ("spacecraftId", "moduleType", category, level, integrity, cooldown, "isActive")
      SELECT ship.id, required."moduleType", required.category, 1, 100, 0, true
      FROM spacecraft ship
      JOIN ship_class_defs class ON class.id = ship."shipClassId"
      JOIN required_modules required ON required."classKey" = class.key
      WHERE NOT EXISTS (
        SELECT 1
        FROM "spacecraft_modules" installed
        WHERE installed."spacecraftId" = ship.id
      )
      RETURNING "spacecraftId"
      )
      UPDATE spacecraft
      SET "runtimeSystems" = '{}'::jsonb
      WHERE id IN (SELECT DISTINCT "spacecraftId" FROM inserted)
    `);
  }

  async down(): Promise<void> {
    // Existing ships may have been modified after migration; removing modules is unsafe.
  }
}
