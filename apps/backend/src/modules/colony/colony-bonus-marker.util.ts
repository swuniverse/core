import type { ColonyField } from './entities/colony-field.entity';
import { isSwuBonusMarkerUsable } from '../starmap/generator/swu-bonus-markers';

/** Nur das, was die Faktoren aus dem GameDataService brauchen. */
export interface MarkerCategoryLookup {
  getCategoriesForTerrainTile(terrainTileId: string): string[];
}

/** Nahrung (Commodity-ID 1) - Ziel des Fruchtbar-Markers. */
const FOOD_COMMODITY_ID = 1;

/**
 * Planetare Bonus-Marker (siehe starmap/generator/swu-bonus-markers.ts):
 * ein Gebaeude auf einem Marker-Feld liefert den doppelten Ertrag
 * ("zaehlt wie zwei Felder"). Verbrauch/Kosten bleiben unveraendert.
 *   PHRIK            -> positive Produktion (Bergbau)
 *   FERTILE(_WATER)  -> positive Nahrungsproduktion
 *   ENERGY           -> positive Energieproduktion
 *   ATTRACTIVE       -> Wohnraum (bevPro)
 * KYBER wirkt nicht pro Gebaeude, sondern als zusaetzliche Quelle (+1) in der
 * Basisproduktion der Kolonie, siehe ColonyStatsService.getSwuBaseProduction.
 */
export const BONUS_MARKER_YIELD_FACTOR = 2;

type MarkerField =
  | Pick<ColonyField, 'bonusMarker' | 'terrainTileId'>
  | null
  | undefined;

/**
 * Der Bonus gilt nur, solange der Marker zum AKTUELLEN Tile passt (nach
 * Geoengineering kann er ausgegraut sein). Auf Feldern mit Gebaeude ist
 * Geoengineering nicht moeglich, das Tile aendert sich dort also nie
 * waehrend das Gebaeude steht. Ohne Lookup (z.B. Tests) zaehlt der Marker.
 */
function activeMarker(
  field: MarkerField,
  lookup?: MarkerCategoryLookup,
): string | null {
  const marker = field?.bonusMarker ?? null;
  if (!marker || !lookup) return marker;
  const tile = field?.terrainTileId ?? null;
  return tile &&
    isSwuBonusMarkerUsable(marker, tile, lookup.getCategoriesForTerrainTile(tile))
    ? marker
    : null;
}

export function energyYieldFactor(
  field: MarkerField,
  lookup?: MarkerCategoryLookup,
): number {
  return activeMarker(field, lookup) === 'ENERGY' ? BONUS_MARKER_YIELD_FACTOR : 1;
}

export function housingYieldFactor(
  field: MarkerField,
  lookup?: MarkerCategoryLookup,
): number {
  return activeMarker(field, lookup) === 'ATTRACTIVE' ? BONUS_MARKER_YIELD_FACTOR : 1;
}

export function productionYieldFactor(
  field: MarkerField,
  commodityId: number,
  lookup?: MarkerCategoryLookup,
): number {
  switch (activeMarker(field, lookup)) {
    case 'PHRIK':
      return BONUS_MARKER_YIELD_FACTOR;
    case 'FERTILE':
    case 'FERTILE_WATER':
      return commodityId === FOOD_COMMODITY_ID ? BONUS_MARKER_YIELD_FACTOR : 1;
    default:
      return 1;
  }
}
