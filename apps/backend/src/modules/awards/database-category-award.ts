import type { EntityManager } from 'typeorm';
import { AWARD_IMAGE } from './award.catalog';

export const LAYER_SYSTEMS_AWARD_PRESTIGE = 25;

export function layerSystemsAwardKey(layerId: number): string {
  return `DATABASE_SYSTEMS_L${layerId}`;
}

/**
 * Every layer gets its own "all star systems charted" award (STU award 15,
 * one per layer like `DatabaseCategoryAward.layer`). Idempotent; called for
 * existing layers by migration and for new layers on creation.
 */
export async function ensureLayerSystemsAward(
  manager: EntityManager,
  layer: { id: number; name: string },
): Promise<string> {
  const key = layerSystemsAwardKey(layer.id);
  await manager.query(
    `INSERT INTO "awards" ("key", "description", "image", "prestige", "isNpc")
     VALUES ($1, $2, $3, $4, false)
     ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description"`,
    [
      key,
      `Der Spieler hat sämtliche Sternensysteme der Ebene ${layer.name} kartographiert`,
      AWARD_IMAGE,
      LAYER_SYSTEMS_AWARD_PRESTIGE,
    ],
  );
  await manager.query(
    `INSERT INTO "database_category_awards" ("category", "layerId", "awardKey")
     VALUES ('SYSTEMS', $1, $2)
     ON CONFLICT ("category", "layerId") WHERE "layerId" IS NOT NULL DO NOTHING`,
    [layer.id, key],
  );
  return key;
}
