import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveTacticalNebulae20260907170000
  implements MigrationInterface
{
  name = 'RemoveTacticalNebulae20260907170000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "galaxy_fields" AS field
      SET
        "fieldTypeId" = space.id,
        "isPassable" = space."passable",
        "energyCost" = space."energyCost",
        "damage" = space."damage",
        "effectFlags" = space."effects",
        effects = NULL
      FROM "galaxy_field_types" AS space
      WHERE field."layerId" IN (
          SELECT id
          FROM "layers"
          WHERE "name" = 'Tactical Season 1'
        )
        AND field."fieldTypeId" BETWEEN 100 AND 104
        AND space."key" = 'EMPTY_SPACE'
    `);
  }

  public async down(): Promise<void> {
    // Manual nebula authoring is intentionally not reversed.
  }
}
