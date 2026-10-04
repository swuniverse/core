/**
 * SWU Planetare Bonus-Marker
 * ------------------------------------------------------------------
 * Pendant zu den STU-Bonusfeldern (stu-planet-surface.generator.ts,
 * createBonusPhases), aber als eigenes Overlay: das Feld behaelt seinen
 * Biom-Code, der Marker haengt zusaetzlich daran. Nur Oberflaeche - bei
 * Gasplaneten auch Untergrund. Solar-Bonus (STU AENERGY/SENERGY) entfaellt,
 * den Solarertrag liefert swu-solar.ts.
 *
 * Wirkung (Bedeutung "zaehlt wie zwei Felder" etc.) ist hier nur beschrieben,
 * noch nicht in der Produktion verdrahtet.
 */

import { SeededRNG } from './seeded-rng';

export type SwuBonusMarkerType =
  | 'KYBER'
  | 'PHRIK'
  | 'FERTILE'
  | 'FERTILE_WATER'
  | 'ENERGY'
  | 'ATTRACTIVE';

export type SwuBonusLayer = 'SURFACE' | 'UNDERGROUND';

export interface SwuBonusMarker {
  type: SwuBonusMarkerType;
  layer: SwuBonusLayer;
  /** Spalte/Zeile im jeweiligen Layer-Grid (0-basiert). */
  x: number;
  y: number;
  /** Emoji-Fallback fuer die Tile-Ecke (spaeter durch ein Icon ersetzbar). */
  emoji: string;
  label: string;
  effect: string;
}

const MARKER_META: Record<
  SwuBonusMarkerType,
  { emoji: string; label: string; effect: string; chance: number }
> = {
  KYBER: {
    emoji: '💎',
    label: 'Kyber-Vorkommen',
    effect: 'zusätzliches Kybervorkommen',
    chance: 15,
  },
  PHRIK: {
    emoji: '⛏️',
    label: 'Ergiebiges Phrik-Vorkommen',
    effect: 'zählt wie zwei Felder',
    chance: 25,
  },
  FERTILE: {
    emoji: '🌾',
    label: 'Fruchtbar',
    effect: 'zählt wie zwei Felder',
    chance: 30,
  },
  FERTILE_WATER: {
    emoji: '🪼',
    label: 'Fruchtbar',
    effect: 'zählt wie zwei Felder',
    chance: 0,
  },
  ENERGY: {
    emoji: '⚡',
    label: 'Energiereich',
    effect: 'zählt wie zwei Felder',
    chance: 25,
  },
  ATTRACTIVE: {
    emoji: '✨',
    label: 'Anziehend',
    effect: 'Wohngebäude zählen wie zwei Felder',
    chance: 25,
  },
};

const MAX_MARKERS = 2;

/**
 * Archetypen ohne Farm-/Wohn-Moeglichkeit (keine Atmosphaere bzw. lebensfeindlich):
 * Fruchtbar und Anziehend ergeben dort keinen Sinn. Planetoid (Mondartig) nur
 * Bergbau; Lava/Giftwelt/Gas zusaetzlich Energie (Geothermie bzw. Sturm-Tiles).
 */
const ALLOWED_TYPES_BY_ARCHETYPE: Record<number, SwuBonusMarkerType[]> = {
  12: ['KYBER', 'PHRIK'], // Mondartig / Planetoid
  13: ['KYBER', 'PHRIK', 'ENERGY'], // Lavaplanet
  14: ['KYBER', 'PHRIK', 'ENERGY'], // Giftwelt
  15: ['KYBER', 'PHRIK', 'ENERGY'], // Gasplanet
};
const GAS_ARCHETYPE_TYPE_ID = 15;

type TileClass = 'mining' | 'water' | 'geothermal' | 'standard' | 'storm';

/** Gasplanet-Sturmfeld (siehe swu-biome-letters.ts, H990). */
const GAS_STORM_TILE = 'H990';

function classifyTile(
  tile: string,
  categories: string[],
  isGasPlanet: boolean,
): Set<TileClass> {
  const classes = new Set<TileClass>();
  if (categories.some((c) => c.startsWith('bergbau'))) classes.add('mining');
  if (categories.some((c) => c.startsWith('wasser_'))) classes.add('water');
  if (categories.includes('geothermal')) classes.add('geothermal');
  if (categories.includes('standard')) classes.add('standard');
  if (isGasPlanet && tile === GAS_STORM_TILE) classes.add('storm');
  return classes;
}

function isEligible(type: SwuBonusMarkerType, classes: Set<TileClass>): boolean {
  switch (type) {
    case 'KYBER':
    case 'PHRIK':
      return classes.has('mining');
    case 'FERTILE':
      return classes.has('standard');
    case 'FERTILE_WATER':
      return classes.has('water');
    case 'ENERGY':
      // Wasser (Stroemung), Geothermie, auf Gasplaneten nur Sturm-Tiles.
      return (
        classes.has('water') || classes.has('geothermal') || classes.has('storm')
      );
    case 'ATTRACTIVE':
      return classes.has('standard');
  }
}

/**
 * Ist der Marker auf dem AKTUELLEN Tile nutzbar? Der Marker bleibt nach
 * Geoengineering am Feld (z.B. Qualle auf aufgeschuettetem Land) - dann
 * passt das Tile nicht mehr zum Markertyp und die UI zeigt ihn ausgegraut.
 */
export function isSwuBonusMarkerUsable(
  type: string,
  tile: string | null,
  categories: string[],
): boolean {
  if (!(type in MARKER_META) || !tile) return false;
  const isGasTile = tile.startsWith('H');
  return isEligible(
    type as SwuBonusMarkerType,
    classifyTile(tile, categories, isGasTile),
  );
}

export interface GenerateSwuBonusMarkersOptions {
  surface: string[][];
  untergrund?: string[][];
  typeId: number;
  seed: string;
  /** Kategorien eines Tiles (GameDataService.getCategoriesForTerrainTile). */
  classify: (tile: string) => string[];
}

export function generateSwuBonusMarkers(
  options: GenerateSwuBonusMarkersOptions,
): SwuBonusMarker[] {
  const isGas = options.typeId === GAS_ARCHETYPE_TYPE_ID;
  const layers: Array<[SwuBonusLayer, string[][]]> = [
    ['SURFACE', options.surface],
  ];
  if (isGas && options.untergrund) {
    layers.push(['UNDERGROUND', options.untergrund]);
  }

  // Gesamtlimit ueber alle Layer: auch Gasplaneten haben maximal 2 Marker.
  const rng = new SeededRNG(`${options.seed}:bonus`);
  const taken = new Set<string>();
  const markers: SwuBonusMarker[] = [];
  let remaining = MAX_MARKERS;

  const types = rng.shuffle(
    (Object.keys(MARKER_META) as SwuBonusMarkerType[]).filter(
      (type) =>
        type !== 'FERTILE_WATER' &&
        (ALLOWED_TYPES_BY_ARCHETYPE[options.typeId]?.includes(type) ?? true),
    ),
  );
  for (const type of types) {
    if (remaining <= 0) break;
    if (rng.nextInt(1, 100) > MARKER_META[type].chance) continue;

    const candidates: Array<{
      layer: SwuBonusLayer;
      x: number;
      y: number;
      type: SwuBonusMarkerType;
    }> = [];
    for (const [layer, grid] of layers) {
      grid.forEach((row, y) =>
        row.forEach((tile, x) => {
          if (taken.has(`${layer},${x},${y}`)) return;
          const classes = classifyTile(tile, options.classify(tile), isGas);
          // Fruchtbar: auf Land Feld, auf Wasser die Wasser-Variante.
          const cellType =
            type === 'FERTILE' && isEligible('FERTILE_WATER', classes)
              ? 'FERTILE_WATER'
              : type;
          if (isEligible(cellType, classes)) {
            candidates.push({ layer, x, y, type: cellType });
          }
        }),
      );
    }
    if (candidates.length === 0) continue;

    const cell = rng.choice(candidates);
    taken.add(`${cell.layer},${cell.x},${cell.y}`);
    const meta = MARKER_META[cell.type];
    markers.push({
      type: cell.type,
      layer: cell.layer,
      x: cell.x,
      y: cell.y,
      emoji: meta.emoji,
      label: meta.label,
      effect: meta.effect,
    });
    remaining -= 1;
  }
  return markers;
}
