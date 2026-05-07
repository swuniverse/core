import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminAndStarmapWorldModel20260506130000 implements MigrationInterface {
  name = 'AddAdminAndStarmapWorldModel20260506130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isAdmin" boolean NOT NULL DEFAULT false',
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "galaxy_field_types" (
        "id" SERIAL NOT NULL,
        "key" character varying(64) NOT NULL,
        "name" character varying(128) NOT NULL,
        "passable" boolean NOT NULL DEFAULT true,
        "energyCost" integer NOT NULL DEFAULT 1,
        "damage" integer NOT NULL DEFAULT 0,
        "isSystem" boolean NOT NULL DEFAULT false,
        "isVisible" boolean NOT NULL DEFAULT true,
        "effects" text,
        "colorKey" character varying(32),
        CONSTRAINT "PK_galaxy_field_types_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_galaxy_field_types_key" UNIQUE ("key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "galaxy_fields" (
        "id" SERIAL NOT NULL,
        "layerId" integer NOT NULL,
        "cx" integer NOT NULL,
        "cy" integer NOT NULL,
        "fieldTypeId" integer NOT NULL,
        "factionZone" character varying(16) NOT NULL DEFAULT 'UNKNOWN',
        "starSystemId" integer,
        "isPassable" boolean NOT NULL DEFAULT true,
        "energyCost" integer NOT NULL DEFAULT 1,
        "damage" integer NOT NULL DEFAULT 0,
        "effectFlags" text,
        "adminRegionKey" character varying(64),
        CONSTRAINT "PK_galaxy_fields_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_galaxy_fields_layer_coords" UNIQUE ("layerId", "cx", "cy")
      )
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_galaxy_fields_layer_zone" ON "galaxy_fields" ("layerId", "factionZone")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_galaxy_fields_system" ON "galaxy_fields" ("starSystemId")',
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_fields" (
        "id" SERIAL NOT NULL,
        "starSystemId" integer NOT NULL,
        "sx" integer NOT NULL,
        "sy" integer NOT NULL,
        "fieldTypeId" integer NOT NULL,
        "celestialObjectId" integer,
        "isPassable" boolean NOT NULL DEFAULT true,
        "energyCost" integer NOT NULL DEFAULT 1,
        "damage" integer NOT NULL DEFAULT 0,
        "effects" text,
        CONSTRAINT "PK_system_fields_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_system_fields_system_coords" UNIQUE ("starSystemId", "sx", "sy")
      )
    `);

    await queryRunner
      .query(
        `
      ALTER TABLE "galaxy_fields"
      ADD CONSTRAINT "FK_galaxy_fields_layer"
      FOREIGN KEY ("layerId") REFERENCES "layers"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `,
      )
      .catch(() => undefined);

    await queryRunner
      .query(
        `
      ALTER TABLE "galaxy_fields"
      ADD CONSTRAINT "FK_galaxy_fields_field_type"
      FOREIGN KEY ("fieldTypeId") REFERENCES "galaxy_field_types"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `,
      )
      .catch(() => undefined);

    await queryRunner
      .query(
        `
      ALTER TABLE "galaxy_fields"
      ADD CONSTRAINT "FK_galaxy_fields_star_system"
      FOREIGN KEY ("starSystemId") REFERENCES "star_systems"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `,
      )
      .catch(() => undefined);

    await queryRunner
      .query(
        `
      ALTER TABLE "system_fields"
      ADD CONSTRAINT "FK_system_fields_star_system"
      FOREIGN KEY ("starSystemId") REFERENCES "star_systems"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `,
      )
      .catch(() => undefined);

    await queryRunner
      .query(
        `
      ALTER TABLE "system_fields"
      ADD CONSTRAINT "FK_system_fields_field_type"
      FOREIGN KEY ("fieldTypeId") REFERENCES "galaxy_field_types"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `,
      )
      .catch(() => undefined);

    await queryRunner
      .query(
        `
      ALTER TABLE "system_fields"
      ADD CONSTRAINT "FK_system_fields_celestial_object"
      FOREIGN KEY ("celestialObjectId") REFERENCES "celestial_objects"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `,
      )
      .catch(() => undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "system_fields" DROP CONSTRAINT IF EXISTS "FK_system_fields_celestial_object"',
    );
    await queryRunner.query(
      'ALTER TABLE "system_fields" DROP CONSTRAINT IF EXISTS "FK_system_fields_field_type"',
    );
    await queryRunner.query(
      'ALTER TABLE "system_fields" DROP CONSTRAINT IF EXISTS "FK_system_fields_star_system"',
    );
    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" DROP CONSTRAINT IF EXISTS "FK_galaxy_fields_star_system"',
    );
    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" DROP CONSTRAINT IF EXISTS "FK_galaxy_fields_field_type"',
    );
    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" DROP CONSTRAINT IF EXISTS "FK_galaxy_fields_layer"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "system_fields"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_galaxy_fields_system"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_galaxy_fields_layer_zone"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "galaxy_fields"');
    await queryRunner.query('DROP TABLE IF EXISTS "galaxy_field_types"');
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN IF EXISTS "isAdmin"',
    );
  }
}
