import type { MigrationInterface, QueryRunner } from 'typeorm';

/** One-time reconciliation; subsequent player activations remain persistent. */
export class DisableSpacecraftScanners1795006800000 implements MigrationInterface {
  name = 'DisableSpacecraftScanners1795006800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const key of ['SUBSPACE_SCANNER', 'TACHYON_SCANNER']) {
      await queryRunner.query(`
        UPDATE spacecraft
        SET "runtimeSystems" = jsonb_set(
          "runtimeSystems", ARRAY[$1::text],
          ("runtimeSystems" -> $1::text) || '{"active":false}'::jsonb
        )
        WHERE jsonb_typeof("runtimeSystems") = 'object'
          AND jsonb_typeof("runtimeSystems" -> $1::text) = 'object'
      `, [key]);
    }
    // Missing states now initialize OFF. Do not create capabilities on ships
    // without scanners, or change module health (isActive drives stats/repair).
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // Previous activation choices cannot be reconstructed. A rollback must
    // never silently reactivate scanners and restart their EPS consumption.
  }
}
