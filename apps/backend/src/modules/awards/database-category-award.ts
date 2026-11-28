import type { EntityManager } from 'typeorm';
import { factionAwardRows, layerNavigatorAwardKey } from './faction-awards';

/**
 * Every layer gets its own "Navigator" award per faction (STU award 15, one per
 * layer like `DatabaseCategoryAward.layer`); the mapping stores the Rebel key,
 * the Empire variant is resolved by faction at grant time. Idempotent; called
 * for existing layers by migration and for new layers on creation.
 */
export async function ensureLayerSystemsAward(
  manager: EntityManager,
  layer: { id: number; name: string },
): Promise<string> {
  const rebelKey = layerNavigatorAwardKey(layer.id, 'REBEL');
  const rows = factionAwardRows('NAVIGATOR', {
    rebel: rebelKey,
    empire: layerNavigatorAwardKey(layer.id, 'EMPIRE'),
  });
  for (const row of rows) {
    await manager.query(
      `INSERT INTO "awards" ("key", "description", "image", "prestige", "isNpc")
       VALUES ($1, $2, $3, $4, false)
       ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description",
         "image" = EXCLUDED."image", "prestige" = EXCLUDED."prestige"`,
      [row.key, `${row.description} ${layer.name}`, row.image, row.prestige],
    );
  }
  await manager.query(
    `INSERT INTO "database_category_awards" ("category", "layerId", "awardKey")
     VALUES ('SYSTEMS', $1, $2)
     ON CONFLICT ("category", "layerId") WHERE "layerId" IS NOT NULL
     DO UPDATE SET "awardKey" = EXCLUDED."awardKey"`,
    [layer.id, rebelKey],
  );
  return rebelKey;
}
