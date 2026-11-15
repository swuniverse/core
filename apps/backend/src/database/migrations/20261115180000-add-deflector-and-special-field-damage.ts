import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * tmw-K1b2: field types take STU `x_damage` as `specialDamage`, and every
 * existing ship gets the default `DEFLECTOR` runtime system.
 */
export class AddDeflectorAndSpecialFieldDamage20261115180000 implements MigrationInterface {
  name = 'AddDeflectorAndSpecialFieldDamage20261115180000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "galaxy_field_types" ADD COLUMN IF NOT EXISTS "specialDamage" integer NOT NULL DEFAULT 0`,
    );
    // Verified against the STU table `stu_map_ftypes` (id → x_damage).
    const rows: Array<[number, number]> = JSON.parse(
      readFileSync(join(__dirname, 'stu-field-special-damage.json'), 'utf-8'),
    );
    for (let index = 0; index < rows.length; index += 200) {
      const batch = rows.slice(index, index + 200);
      await queryRunner.query(
        `UPDATE "galaxy_field_types" AS type SET "specialDamage" = data.damage
         FROM (SELECT unnest($1::int[]) AS id, unnest($2::int[]) AS damage) AS data
         WHERE type.id = data.id`,
        [batch.map(([id]) => id), batch.map(([, damage]) => damage)],
      );
    }
    await queryRunner.query(`
      UPDATE "spacecraft"
      SET "runtimeSystems" = "runtimeSystems" || '{"DEFLECTOR":{"active":true,"cooldown":0,"integrity":100}}'::jsonb
      WHERE jsonb_typeof("runtimeSystems") = 'object' AND NOT ("runtimeSystems" ? 'DEFLECTOR')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "spacecraft" SET "runtimeSystems" = "runtimeSystems" - 'DEFLECTOR' WHERE jsonb_typeof("runtimeSystems") = 'object'`);
    await queryRunner.query(`ALTER TABLE "galaxy_field_types" DROP COLUMN IF EXISTS "specialDamage"`);
  }
}
