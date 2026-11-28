import { MigrationInterface, QueryRunner } from 'typeorm';
import { ensureLayerSystemsAward } from '../../modules/awards/database-category-award';
import { factionAwardRows, type FactionAwardName } from '../../modules/awards/faction-awards';

const FLAT_MAPPINGS: Array<[category: string, award: FactionAwardName]> = [
  ['SHIP_HULLS', 'HULL_INSPECTOR'],
  ['SHIP_HULLS_OLDTIMER', 'SCRAP_NOMAD'],
  ['PLANET_TYPES', 'SCOUT'],
  ['SYSTEM_TYPES', 'ASTRO_DROID'],
];
const MANUAL_AWARDS: FactionAwardName[] = ['RPG_SILVER', 'RPG_GOLD'];

/**
 * Faction-specific database awards (Werft Inspektor, Schrottplatz Nomade, Kundschafter,
 * Astro-Droide, Navigator per layer) and the RPG protocol awards. The legacy
 * DATABASE_* awards stay with the players who already own them but are no longer mapped.
 */
export class AddFactionAwards20261128120000 implements MigrationInterface {
  name = 'AddFactionAwards20261128120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "database_category_awards" DROP CONSTRAINT IF EXISTS "CHK_database_category_awards_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "database_category_awards" ADD CONSTRAINT "CHK_database_category_awards_category" CHECK ("category" IN ('SHIP_HULLS', 'SHIP_HULLS_OLDTIMER', 'PLANET_TYPES', 'SYSTEM_TYPES', 'SYSTEMS'))`,
    );
    for (const [category, name] of FLAT_MAPPINGS) {
      const rows = await this.upsertAwards(queryRunner, name);
      await queryRunner.query(
        `INSERT INTO "database_category_awards" ("category", "layerId", "awardKey")
         VALUES ($1, NULL, $2)
         ON CONFLICT ("category") WHERE "layerId" IS NULL DO UPDATE SET "awardKey" = EXCLUDED."awardKey"`,
        [category, rows[0].key],
      );
    }
    for (const name of MANUAL_AWARDS) await this.upsertAwards(queryRunner, name);
    const layers: Array<{ id: number; name: string }> = await queryRunner.query(
      'SELECT "id", "name" FROM "layers" ORDER BY "id"',
    );
    for (const layer of layers) await ensureLayerSystemsAward(queryRunner.manager, layer);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const names = [...FLAT_MAPPINGS.map(([, name]) => name), ...MANUAL_AWARDS];
    const keys = names.flatMap((name) => factionAwardRows(name).map((row) => row.key));
    await queryRunner.query(`DELETE FROM "database_category_awards" WHERE "category" = 'SHIP_HULLS_OLDTIMER'`);
    await queryRunner.query(`DELETE FROM "awards" WHERE "key" = ANY($1) OR "key" LIKE 'NAVIGATOR\\_%'`, [keys]);
    await queryRunner.query(
      `ALTER TABLE "database_category_awards" DROP CONSTRAINT IF EXISTS "CHK_database_category_awards_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "database_category_awards" ADD CONSTRAINT "CHK_database_category_awards_category" CHECK ("category" IN ('SHIP_HULLS', 'PLANET_TYPES', 'SYSTEM_TYPES', 'SYSTEMS'))`,
    );
    await queryRunner.query(
      `INSERT INTO "database_category_awards" ("category", "layerId", "awardKey")
       SELECT 'SYSTEMS', l."id", 'DATABASE_SYSTEMS_L' || l."id" FROM "layers" l
       WHERE EXISTS (SELECT 1 FROM "awards" a WHERE a."key" = 'DATABASE_SYSTEMS_L' || l."id")
       ON CONFLICT ("category", "layerId") WHERE "layerId" IS NOT NULL DO NOTHING`,
    );
    for (const [category, key] of [
      ['SHIP_HULLS', 'DATABASE_SHIP_HULLS'],
      ['PLANET_TYPES', 'DATABASE_PLANET_TYPES'],
      ['SYSTEM_TYPES', 'DATABASE_SYSTEM_TYPES'],
    ]) {
      await queryRunner.query(
        `INSERT INTO "database_category_awards" ("category", "layerId", "awardKey") VALUES ($1, NULL, $2)
         ON CONFLICT ("category") WHERE "layerId" IS NULL DO UPDATE SET "awardKey" = EXCLUDED."awardKey"`,
        [category, key],
      );
    }
  }

  private async upsertAwards(queryRunner: QueryRunner, name: FactionAwardName) {
    const rows = factionAwardRows(name);
    for (const row of rows) {
      await queryRunner.query(
        `INSERT INTO "awards" ("key", "description", "image", "prestige", "isNpc")
         VALUES ($1, $2, $3, $4, false)
         ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description",
           "image" = EXCLUDED."image", "prestige" = EXCLUDED."prestige"`,
        [row.key, row.description, row.image, row.prestige],
      );
    }
    return rows;
  }
}
