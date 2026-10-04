/**
 * Sumpf - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * Gleiches Prinzip wie Waldplanet, aber Richtung Sumpf statt Wald gewichtet
 * ("gleich hinsichtlich Suempfe"). Nutzt dieselben Buchstaben wie Erdaehnlich
 * (B=Cold/Tundrasuempfe, C=Mid/Gem. Moor, E=Hot/Tropischer Sumpfwald), mit
 * deutlich erhoehter Sumpf-Gewichtung in allen 3 Zonen.
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
// Cold (B, Tundrasuempfe) - warmerVariant=true nutzt bereits die
// sumpflastige Gewichtung von buildTundraPhases (mehr Sumpf, weniger Wald).
// ---------------------------------------------------------------------------
export const SWU_SUMPF_COLD_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'B110',
  phases: buildTundraPhases('B110', true),
};

// ---------------------------------------------------------------------------
// Mid (C, Gemaessigtes Moor) - Feuchtgebiete deutlich erhoeht, Wald reduziert.
// ---------------------------------------------------------------------------
export const SWU_SUMPF_MID_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'C110',
  phases: buildGemaessigtPhases('C110', {
    wald: [2, 6],
    feucht: [28, 40],
    wasser: [3, 7],
    fels: [1, 4],
    bauland: [2, 8],
  }),
};

// ---------------------------------------------------------------------------
// Hot (E, Tropischer Sumpfwald) - Sumpf/Mangroven deutlich erhoeht, Regenwald
// reduziert (aber nicht null - "Sumpfwald" ist ja Sumpf UND Wald gemischt).
// ---------------------------------------------------------------------------
export const SWU_SUMPF_HOT_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'E110',
  phases: buildTropischPhases('E110', {
    regenwald: [4, 10],
    palmen: [1, 4],
    sumpf: [28, 40],
    meer: [2, 6],
    fels: [0, 2],
    strand: [1, 5],
  }),
};

export function getSumpfZoneConfig(zoneSlot: SwuZoneSlot): SwuBiomSurfaceConfig {
  if (zoneSlot === 1) return SWU_SUMPF_COLD_CONFIG;
  if (zoneSlot === 2) return SWU_SUMPF_MID_CONFIG;
  return SWU_SUMPF_HOT_CONFIG;
}

function getRequiredSeedTiles(zoneSlot: SwuZoneSlot): string[] {
  if (zoneSlot === 1) return SWU_SUBPOLAR_SEED_TILES;
  if (zoneSlot === 2) return SWU_GEMAESSIGT_SEED_TILES;
  return SWU_TROPISCH_SEED_TILES;
}

const generator = new SwuBiomGenerator();

/** Generiert die 10x6-Kolonie-Oberflaeche fuer einen Sumpf-Biom-Slot. */
export function generateSumpfColonySurface(
  zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const baseConfig = getSumpfZoneConfig(zoneSlot);
  const config = bodyFeature === 'moon' ? scaleConfigForMoon(baseConfig) : baseConfig;
  return generateWithSeedGuarantee(generator, config, seed, getRequiredSeedTiles(zoneSlot));
}


/**
 * UNTERGRUND (Platzhalter): alte STU-Nummernkreise, temporaer bis SWU eigene
 * Untergrund-Tiles bekommt - wird spaeter ausgetauscht.
 */
export function generateSumpfUntergrund(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const surface = generateSumpfColonySurface(zoneSlot, rotation, seed, bodyFeature);
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
export function generateSumpfOrbit(hasRing: boolean): { lower: string[]; upper: string[] } {
  return buildOrbitRows(4, null, hasRing);
}
