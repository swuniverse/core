import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNebulaGeneration20261125160000 implements MigrationInterface {
  name = 'AddNebulaGeneration20261125160000';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      'ALTER TABLE "layers" ADD COLUMN "nebulaSeedSalt" uuid NOT NULL DEFAULT gen_random_uuid()',
    );
    await runner.query(
      'ALTER TABLE "galaxy_fields" ADD COLUMN "nebulaGeneration" jsonb NULL',
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    // Do not restore terrain that was edited, occupied or turned into a system.
    // Validate JSON in JS so malformed/manual metadata cannot break a rollback.
    const rows = await runner.query(`SELECT f.*, t.passable AS "typePassable",
      t."energyCost" AS "typeEnergyCost", t.damage AS "typeDamage", t.effects AS "typeEffects"
      FROM galaxy_fields f JOIN galaxy_field_types t ON t.id = f."fieldTypeId"
      WHERE f."nebulaGeneration" IS NOT NULL AND f."passableOverride" IS NULL
      AND f."borderTypeId" IS NULL AND f."starSystemId" IS NULL AND f."systemTypeId" IS NULL
      AND NOT EXISTS (SELECT 1 FROM spacecraft s JOIN space_locations l ON l.id=s."locationId" WHERE l."galaxyFieldId"=f.id)`);
    const effects = (value: unknown): string[] | null | undefined => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return parsed === null ||
          (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string'))
          ? parsed
          : undefined;
      } catch {
        return undefined;
      }
    };
    const same = (a: unknown, b: unknown) =>
      effects(a) !== undefined &&
      effects(b) !== undefined &&
      JSON.stringify(effects(a) ?? []) === JSON.stringify(effects(b) ?? []);
    for (const field of rows) {
      const generation = field.nebulaGeneration,
        b = generation?.baseline;
      if (
        generation?.visual?.version !== 2 ||
        generation.fieldTypeId !== field.fieldTypeId ||
        !b ||
        !Number.isSafeInteger(b.fieldTypeId) ||
        b.fieldTypeId <= 0 ||
        typeof b.isPassable !== 'boolean' ||
        !Number.isSafeInteger(b.energyCost) ||
        b.energyCost < 0 ||
        !Number.isSafeInteger(b.damage) ||
        b.damage < 0 ||
        effects(b.effects) === undefined ||
        effects(b.effectFlags) === undefined ||
        field.isPassable !== field.typePassable ||
        field.energyCost !== field.typeEnergyCost ||
        field.damage !== field.typeDamage ||
        !same(field.effects, field.typeEffects) ||
        !same(field.effectFlags, field.typeEffects)
      )
        continue;
      const [original] = await runner.query(
        'SELECT id FROM galaxy_field_types WHERE id=$1 AND (key IN ($2,$3) OR category=$4)',
        [b.fieldTypeId, 'EMPTY_SPACE', 'DEEP_SPACE', 'space'],
      );
      if (!original) continue;
      await runner.query(
        `UPDATE galaxy_fields SET "fieldTypeId"=$2, "isPassable"=$3, "energyCost"=$4, damage=$5, effects=$6, "effectFlags"=$7 WHERE id=$1`,
        [
          field.id,
          b.fieldTypeId,
          b.isPassable,
          b.energyCost,
          b.damage,
          b.effects === null ? null : JSON.stringify(b.effects),
          b.effectFlags === null ? null : JSON.stringify(b.effectFlags),
        ],
      );
    }
    await runner.query(
      'ALTER TABLE "galaxy_fields" DROP COLUMN "nebulaGeneration"',
    );
    await runner.query('ALTER TABLE "layers" DROP COLUMN "nebulaSeedSalt"');
  }
}
