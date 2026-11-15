import { MigrationInterface, QueryRunner } from 'typeorm';
import { AWARD_CATALOG, AWARD_IMAGE } from '../../modules/awards/award.catalog';
import { ensureLayerSystemsAward } from '../../modules/awards/database-category-award';

const CATEGORY_AWARDS = [
  ['SHIP_HULLS', 'DATABASE_SHIP_HULLS'],
  ['PLANET_TYPES', 'DATABASE_PLANET_TYPES'],
  ['SYSTEM_TYPES', 'DATABASE_SYSTEM_TYPES'],
] as const;

/** tmw-D5a: STU database category awards and their category (×layer) mapping. */
export class AddDatabaseCategoryAwards20261115120000 implements MigrationInterface {
  name = 'AddDatabaseCategoryAwards20261115120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "database_category_awards" (
        "id" SERIAL PRIMARY KEY,
        "category" varchar(32) NOT NULL,
        "layerId" integer,
        "awardKey" varchar(64) NOT NULL,
        CONSTRAINT "CHK_database_category_awards_category" CHECK ("category" IN ('SHIP_HULLS', 'PLANET_TYPES', 'SYSTEM_TYPES', 'SYSTEMS')),
        CONSTRAINT "CHK_database_category_awards_layer" CHECK (("category" = 'SYSTEMS') = ("layerId" IS NOT NULL)),
        CONSTRAINT "FK_database_category_awards_layer" FOREIGN KEY ("layerId") REFERENCES "layers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_database_category_awards_award" FOREIGN KEY ("awardKey") REFERENCES "awards"("key") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_database_category_awards_category" ON "database_category_awards" ("category") WHERE "layerId" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_database_category_awards_layer" ON "database_category_awards" ("category", "layerId") WHERE "layerId" IS NOT NULL`,
    );
    for (const [category, key] of CATEGORY_AWARDS) {
      const award = AWARD_CATALOG.find((entry) => entry.key === key);
      if (!award) throw new Error(`Award ${key} missing from catalog`);
      await queryRunner.query(
        `INSERT INTO "awards" ("key", "description", "image", "prestige", "isNpc")
         VALUES ($1, $2, $3, $4, false)
         ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description", "prestige" = EXCLUDED."prestige"`,
        [award.key, award.description, AWARD_IMAGE, award.prestige],
      );
      await queryRunner.query(
        `INSERT INTO "database_category_awards" ("category", "layerId", "awardKey")
         VALUES ($1, NULL, $2)
         ON CONFLICT ("category") WHERE "layerId" IS NULL DO NOTHING`,
        [category, key],
      );
    }
    const layers: Array<{ id: number; name: string }> = await queryRunner.query(
      'SELECT "id", "name" FROM "layers" ORDER BY "id"',
    );
    for (const layer of layers) {
      await ensureLayerSystemsAward(queryRunner.manager, layer);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "database_category_awards"');
    await queryRunner.query(`DELETE FROM "awards" WHERE "key" LIKE 'DATABASE\\_SYSTEMS\\_L%'`);
    await queryRunner.query(
      `DELETE FROM "awards" WHERE "key" IN ('DATABASE_SHIP_HULLS', 'DATABASE_PLANET_TYPES', 'DATABASE_SYSTEM_TYPES')`,
    );
  }
}
