import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAsteroidResourceDeposits20260907150000
  implements MigrationInterface
{
  name = 'AddAsteroidResourceDeposits20260907150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "asteroid_resource_deposits" (
        "userId" integer NOT NULL,
        "celestialObjectId" integer NOT NULL,
        "commodityId" integer NOT NULL,
        "amountLeft" integer NOT NULL,
        CONSTRAINT "PK_asteroid_resource_deposits"
          PRIMARY KEY ("userId", "celestialObjectId", "commodityId"),
        CONSTRAINT "FK_asteroid_resource_deposits_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_asteroid_resource_deposits_object"
          FOREIGN KEY ("celestialObjectId") REFERENCES "celestial_objects"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_asteroid_resource_deposits_object_user"
      ON "asteroid_resource_deposits" ("celestialObjectId", "userId")
    `);
    await queryRunner.query(`
      UPDATE "galaxy_fields" AS field
      SET
        "fieldTypeId" = space.id,
        "isPassable" = space."passable",
        "energyCost" = space."energyCost",
        "damage" = space."damage",
        "effectFlags" = space."effects",
        "effects" = NULL
      FROM "galaxy_field_types" AS space
      WHERE field."fieldTypeId" IN (
        SELECT id FROM "galaxy_field_types" WHERE "key" = 'ASTEROID_FIELD'
      )
        AND space."key" = 'EMPTY_SPACE'
    `);
    await queryRunner.query(`
      UPDATE "celestial_objects"
      SET "isColonizable" = true
      WHERE "objectType" = 3
        AND "classId" IN (701, 702, 703, 704, 705, 706, 707, 708, 709, 716, 717, 718)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "IDX_asteroid_resource_deposits_object_user"',
    );
    await queryRunner.query('DROP TABLE "asteroid_resource_deposits"');
  }
}
