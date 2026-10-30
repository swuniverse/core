import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLayerKnowledge20261030210000 implements MigrationInterface {
  name = 'AddLayerKnowledge20261030210000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "layer_knowledge" (
        "userId" integer NOT NULL,
        "layerId" integer NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'KNOWN',
        "knownAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "exploredAt" timestamp NULL,
        CONSTRAINT "PK_layer_knowledge" PRIMARY KEY ("userId", "layerId"),
        CONSTRAINT "CK_layer_knowledge_status" CHECK ("status" IN ('KNOWN', 'EXPLORED')),
        CONSTRAINT "FK_layer_knowledge_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_layer_knowledge_layer" FOREIGN KEY ("layerId")
          REFERENCES "layers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_layer_knowledge_user_status"
        ON "layer_knowledge" ("userId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_layer_knowledge_layer_status"
        ON "layer_knowledge" ("layerId", "status")
    `);

    await queryRunner.query(`
      INSERT INTO "layer_knowledge" ("userId", "layerId", "status", "knownAt")
      SELECT sources."userId", sources."layerId", 'KNOWN', MIN(sources."knownAt")
      FROM (
        SELECT colony."userId", system."layerId", CURRENT_TIMESTAMP AS "knownAt"
        FROM "colonies" AS colony
        INNER JOIN "star_systems" AS system ON system."id" = colony."starSystemId"
        WHERE colony."userId" IS NOT NULL

        UNION ALL

        SELECT ship."userId", COALESCE(galaxy."layerId", system."layerId"), CURRENT_TIMESTAMP
        FROM "spacecraft" AS ship
        INNER JOIN "space_locations" AS location ON location."id" = ship."locationId"
        LEFT JOIN "galaxy_fields" AS galaxy ON galaxy."id" = location."galaxyFieldId"
        LEFT JOIN "system_fields" AS field ON field."id" = location."systemFieldId"
        LEFT JOIN "star_systems" AS system ON system."id" = field."starSystemId"
        WHERE COALESCE(galaxy."layerId", system."layerId") IS NOT NULL

        UNION ALL

        SELECT exploration."userId", exploration."layerId", MIN(exploration."discoveredAt")
        FROM "exploration_states" AS exploration
        GROUP BY exploration."userId", exploration."layerId"
      ) AS sources
      GROUP BY sources."userId", sources."layerId"
      ON CONFLICT ("userId", "layerId") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "layer_knowledge"');
  }
}
