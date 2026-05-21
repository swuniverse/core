import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLandmarksHyperspaceRoutes20260519170000 implements MigrationInterface {
  name = 'AddLandmarksHyperspaceRoutes20260519170000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "star_systems" ADD COLUMN IF NOT EXISTS "isLandmark" boolean NOT NULL DEFAULT false',
    );
    await queryRunner.query(
      'ALTER TABLE "star_systems" ADD COLUMN IF NOT EXISTS "landmarkKey" character varying(64)',
    );
    await queryRunner.query(
      'ALTER TABLE "star_systems" ADD COLUMN IF NOT EXISTS "landmarkCategory" character varying(32)',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_star_systems_layer_landmark_key" ON "star_systems" ("layerId", "landmarkKey") WHERE "landmarkKey" IS NOT NULL',
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hyperspace_routes" (
        "id" SERIAL PRIMARY KEY,
        "layerId" integer NOT NULL,
        "key" character varying(64) NOT NULL,
        "name" character varying(255) NOT NULL,
        "color" character varying(32) NOT NULL DEFAULT '#facc15',
        "sortOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "FK_hyperspace_routes_layer" FOREIGN KEY ("layerId") REFERENCES "layers"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_hyperspace_routes_layer_key" UNIQUE ("layerId", "key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hyperspace_route_segments" (
        "id" SERIAL PRIMARY KEY,
        "routeId" integer NOT NULL,
        "fromSystemId" integer NOT NULL,
        "toSystemId" integer NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "controlPointJson" jsonb,
        CONSTRAINT "FK_route_segments_route" FOREIGN KEY ("routeId") REFERENCES "hyperspace_routes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_route_segments_from_system" FOREIGN KEY ("fromSystemId") REFERENCES "star_systems"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_route_segments_to_system" FOREIGN KEY ("toSystemId") REFERENCES "star_systems"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_route_segments_route" ON "hyperspace_route_segments" ("routeId", "sortOrder")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_route_segments_route"');
    await queryRunner.query('DROP TABLE IF EXISTS "hyperspace_route_segments"');
    await queryRunner.query('DROP TABLE IF EXISTS "hyperspace_routes"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_star_systems_layer_landmark_key"',
    );
    await queryRunner.query(
      'ALTER TABLE "star_systems" DROP COLUMN IF EXISTS "landmarkCategory"',
    );
    await queryRunner.query(
      'ALTER TABLE "star_systems" DROP COLUMN IF EXISTS "landmarkKey"',
    );
    await queryRunner.query(
      'ALTER TABLE "star_systems" DROP COLUMN IF EXISTS "isLandmark"',
    );
  }
}
