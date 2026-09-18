import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreAlertDisabledFlightSystems20260910202000 implements MigrationInterface {
  name = 'RestoreAlertDisabledFlightSystems20260910202000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "spacecraft"
      SET "runtimeSystems" =
        COALESCE("runtimeSystems", '{}'::jsonb) ||
        jsonb_build_object(
          'SUBLIGHT_DRIVE',
          COALESCE("runtimeSystems"->'SUBLIGHT_DRIVE', '{}'::jsonb) || '{"active":true}'::jsonb,
          'COMPUTER',
          COALESCE("runtimeSystems"->'COMPUTER', '{}'::jsonb) || '{"active":true}'::jsonb
        )
      WHERE COALESCE("runtimeSystems"->'SUBLIGHT_DRIVE'->>'active', 'true') = 'false'
         OR COALESCE("runtimeSystems"->'COMPUTER'->>'active', 'true') = 'false'
    `);
  }

  async down(): Promise<void> {
    // Data repair is intentionally irreversible.
  }
}
