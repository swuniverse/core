/**
 * Waldplanet - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * "Hat eine andere, waermere Oberflaeche als M und logischerweise wesentlich
 * mehr Waelder, wie der Name schon sagt." Nutzt dieselben Buchstaben wie
 * Erdaehnlich (B=Cold/Tundrawaelder, C=Mid/Gemaessigter Wald, E=Hot/Regenwald),
 * aber mit deutlich erhoehter Wald-Gewichtung in allen 3 Zonen, und OHNE die
 * Schneedecken-Mechanik in der Cold-Zone (waermer als Erdaehnlich - offene
 * Tundrawaelder statt versteckter Fels/Wasser unter Schnee).
 */

import { SwuBiomGenerator, generateWithSeedGuarantee, scaleConfigForMoon, type SwuBiomSurfaceConfig } from './swu-biom-generator';
import { buildUndergroundConfig } from './swu-underground';
import type { SwuZoneSlot, SwuRotationType, SwuBodyFeature } from './swu-planet-archetypes.generator';
import {
  buildTundraPhases,
  buildGemaessigtPhases,
  buildTropischPhases,
  SWU_SUBPOLAR_SEED_TILES,
  SWU_GEMAESSIGT_SEED_TILES,
  SWU_TROPISCH_SEED_TILES,
} from './swu-biome-letters';

const COLONY_WIDTH = 10;
const COLONY_HEIGHT = 6;

// ---------------------------------------------------------------------------
// Cold (B, Tundrawaelder) - waermer als Erdaehnlich: offene Tundra mit viel
// Wald statt Schneedecken-Mystery. Nutzt die "kuehlere" Waldgewichtung von
// buildTundraPhases (warmerVariant=false), das ist bereits waldlastig genug.
// ---------------------------------------------------------------------------
export const SWU_WALDPLANET_COLD_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'B110',
  phases: buildTundraPhases('B110', false),
};

// ---------------------------------------------------------------------------
// Mid (C, Gemaessigter Wald) - Wald-Anteil deutlich erhoeht ggue. Erdaehnlich
// (15-25 -> 30-45), Feuchtgebiete/Gewaesser/Fels entsprechend reduziert.
// ---------------------------------------------------------------------------
export const SWU_WALDPLANET_MID_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'C110',
  phases: buildGemaessigtPhases('C110', {
    wald: [30, 45],
    feucht: [2, 6],
    wasser: [2, 5],
    fels: [1, 4],
    bauland: [2, 8],
  }),
};

// ---------------------------------------------------------------------------
// Hot (E, Regenwald) - Regenwald-Anteil deutlich erhoeht, Meer/Sumpf reduziert.
// ---------------------------------------------------------------------------
export const SWU_WALDPLANET_HOT_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'E110',
  phases: buildTropischPhases('E110', {
    regenwald: [28, 40],
    palmen: [3, 7],
    sumpf: [3, 7],
    meer: [1, 4],
    fels: [0, 3],
    strand: [1, 5],
  }),
};

export function getWaldplanetZoneConfig(zoneSlot: SwuZoneSlot): SwuBiomSurfaceConfig {
  if (zoneSlot === 1) return SWU_WALDPLANET_COLD_CONFIG;
  if (zoneSlot === 2) return SWU_WALDPLANET_MID_CONFIG;
  return SWU_WALDPLANET_HOT_CONFIG;
}

function getRequiredSeedTiles(zoneSlot: SwuZoneSlot): string[] {
  if (zoneSlot === 1) return SWU_SUBPOLAR_SEED_TILES;
  if (zoneSlot === 2) return SWU_GEMAESSIGT_SEED_TILES;
  return SWU_TROPISCH_SEED_TILES;
}

const generator = new SwuBiomGenerator();

/** Generiert die 10x6-Kolonie-Oberflaeche fuer einen Waldplanet-Biom-Slot. */
export function generateWaldplanetColonySurface(
  zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const baseConfig = getWaldplanetZoneConfig(zoneSlot);
  const config = bodyFeature === 'moon' ? scaleConfigForMoon(baseConfig) : baseConfig;
  return generateWithSeedGuarantee(generator, config, seed, getRequiredSeedTiles(zoneSlot));
}


/**
 * UNTERGRUND (Platzhalter): alte STU-Nummernkreise, temporaer bis SWU eigene
 * Untergrund-Tiles bekommt - wird spaeter ausgetauscht.
 */
export function generateWaldplanetUntergrund(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const surface = generateWaldplanetColonySurface(zoneSlot, rotation, seed, bodyFeature);
  const config = buildUndergroundConfig(
    'U102',
    { rockVariants: ['U6C1', 'U6C2'], magmaMode: 'conditional' },
    surface,
    bodyFeature === 'moon',
  );
  return new SwuBiomGenerator().generate(config, seed);
}

import { buildOrbitRows } from './swu-orbit';

/** Orbit-Reihen (oben/unten) fuer diesen Archetyp - hasRing kommt vom bodyFeature der Instanz. */
export function generateWaldplanetOrbit(hasRing: boolean): { lower: string[]; upper: string[] } {
  return buildOrbitRows(3, null, hasRing);
}
