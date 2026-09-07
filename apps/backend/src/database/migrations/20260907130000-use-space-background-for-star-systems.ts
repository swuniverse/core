import { MigrationInterface, QueryRunner } from 'typeorm';

export class UseSpaceBackgroundForStarSystems20260907130000
  implements MigrationInterface
{
  name = 'UseSpaceBackgroundForStarSystems20260907130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "galaxy_fields" AS field
      SET
        "fieldTypeId" = space.id,
        "isPassable" = space."passable",
        "energyCost" = space."energyCost",
        "damage" = space."damage",
        "effectFlags" = space."effects"
      FROM "galaxy_field_types" AS space
      WHERE field."starSystemId" IS NOT NULL
        AND space."key" = 'EMPTY_SPACE'
    `);
  }

  public async down(): Promise<void> {
    // A system field's previous terrain cannot be recovered after correction.
  }
}
