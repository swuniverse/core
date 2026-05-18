import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInfluenceWormholes20260507180000 implements MigrationInterface {
  name = 'AddInfluenceWormholes20260507180000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "influence_areas" (
        "id" SERIAL PRIMARY KEY,
        "layerId" integer NOT NULL,
        "cx" integer NOT NULL,
        "cy" integer NOT NULL,
        "sourceType" character varying(16) NOT NULL,
        "sourceId" integer NOT NULL,
        "radius" integer NOT NULL DEFAULT 3,
        "strength" double precision NOT NULL DEFAULT 1.0,
        "calculatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_influence_areas_layer_pos"
        ON "influence_areas" ("layerId", "cx", "cy")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_influence_areas_source"
        ON "influence_areas" ("sourceType", "sourceId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wormholes" (
        "id" SERIAL PRIMARY KEY,
        "entryLayerId" integer NOT NULL,
        "entryCx" integer NOT NULL,
        "entryCy" integer NOT NULL,
        "exitLayerId" integer NOT NULL,
        "exitCx" integer NOT NULL,
        "exitCy" integer NOT NULL,
        "isBidirectional" boolean NOT NULL DEFAULT false,
        "isRandomExit" boolean NOT NULL DEFAULT false,
        "name" character varying(128),
        "isActive" boolean NOT NULL DEFAULT true
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wormholes_entry"
        ON "wormholes" ("entryLayerId", "entryCx", "entryCy")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wormholes_exit"
        ON "wormholes" ("exitLayerId", "exitCx", "exitCy")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "wormholes"');
    await queryRunner.query('DROP TABLE IF EXISTS "influence_areas"');
  }
}
