import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftWrecks20260910190000 implements MigrationInterface {
  name = 'AddSpacecraftWrecks20260910190000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "spacecraft_wrecks" (
        "id" SERIAL PRIMARY KEY,
        "formerShipClassId" integer NOT NULL,
        "currentLayerId" integer NULL,
        "starSystemId" integer NULL,
        "inSystem" boolean NOT NULL DEFAULT false,
        "posX" integer NOT NULL,
        "posY" integer NOT NULL,
        "currentSystemFieldX" integer NULL,
        "currentSystemFieldY" integer NULL,
        "hull" integer NOT NULL,
        "crewCount" integer NOT NULL DEFAULT 0,
        "cargo" jsonb NOT NULL DEFAULT '[]',
        "torpedoes" jsonb NOT NULL DEFAULT '[]',
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_spacecraft_wreck_layer_position" ON "spacecraft_wrecks" ("currentLayerId", "posX", "posY")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_spacecraft_wreck_system_position" ON "spacecraft_wrecks" ("starSystemId", "currentSystemFieldX", "currentSystemFieldY")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "spacecraft_wrecks"');
  }
}
