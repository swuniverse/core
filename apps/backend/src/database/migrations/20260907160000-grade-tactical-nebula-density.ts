import { MigrationInterface, QueryRunner } from 'typeorm';

export class GradeTacticalNebulaDensity20260907160000
  implements MigrationInterface
{
  name = 'GradeTacticalNebulaDensity20260907160000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH densities AS (
        SELECT
          field.id,
          LEAST(
            4,
            GREATEST(
              0,
              (
                SELECT COUNT(*) - 1
                FROM "galaxy_fields" AS neighbor
                JOIN "galaxy_field_types" AS neighbor_type
                  ON neighbor_type.id = neighbor."fieldTypeId"
                WHERE neighbor."layerId" = field."layerId"
                  AND ABS(neighbor.cx - field.cx) <= 1
                  AND ABS(neighbor.cy - field.cy) <= 1
                  AND neighbor_type."key" IN (
                    'NEBULA',
                    'sehr_duenner_deuterium_nebel_100',
                    'duenner_deuterium_nebel_101',
                    'deuterium_nebel_102',
                    'dichter_deuterium_nebel_103',
                    'undurchdringlicher_deuterium_nebel_104'
                  )
              )
            )
          ) AS density
        FROM "galaxy_fields" AS field
        JOIN "layers" AS layer ON layer.id = field."layerId"
        JOIN "galaxy_field_types" AS field_type
          ON field_type.id = field."fieldTypeId"
        WHERE layer."name" = 'Tactical Season 1'
          AND field_type."key" IN (
            'NEBULA',
            'sehr_duenner_deuterium_nebel_100',
            'duenner_deuterium_nebel_101',
            'deuterium_nebel_102',
            'dichter_deuterium_nebel_103',
            'undurchdringlicher_deuterium_nebel_104'
          )
      )
      UPDATE "galaxy_fields" AS field
      SET
        "fieldTypeId" = type.id,
        "isPassable" = type."passable",
        "energyCost" = type."energyCost",
        "damage" = type."damage",
        "effectFlags" = type.effects,
        effects = type.effects
      FROM densities
      JOIN "galaxy_field_types" AS type ON type.id = 100 + densities.density
      WHERE field.id = densities.id
    `);
  }

  public async down(): Promise<void> {
    // Gradient conversion is visual and cannot recover a previous uniform density.
  }
}
