/**
 * Wueste - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * Cold  (Kaelte Wueste): J (Kaeltewueste, aus JK.xlsx nachgeliefert -
 *         behebt die vorher unloesbare Luecke, kein Annaeherungs-Fallback
 *         mehr noetig). J610/J840 sind beide Seed=Ja - hartes Seed.
 * Mid   (Steppe/Oedland): I (Marsartig-Buchstabe, "Oedland" passt hier gut),
 *         Baugrund (I119) als OPT-Seed.
 * Hot   (Wueste): D, stark wuestenlastig.
 */

import { SwuBiomGenerator, generateWithSeedGuarantee, scaleConfigForMoon, type SwuBiomSurfaceConfig } from './swu-biom-generator';
import { buildUndergroundConfig } from './swu-underground';
import type { SwuZoneSlot, SwuRotationType, SwuBodyFeature } from './swu-planet-archetypes.generator';
import {
  buildSubtropischPhases,
  buildMarsartigPhases,
  buildKaeltewuestePhases,
  SWU_SUBTROPISCH_SEED_TILES,
  SWU_KAELTEWUESTE_SEED_TILES,
} from './swu-biome-letters';

const COLONY_WIDTH = 10;
const COLONY_HEIGHT = 6;

export const SWU_WUESTE_COLD_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'J610',
  phases: buildKaeltewuestePhases('J610'),
};

export const SWU_WUESTE_MID_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'I110',
  phases: buildMarsartigPhases('I110'),
};

export const SWU_WUESTE_HOT_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'D110',
  phases: buildSubtropischPhases('D110', {
    waeldchen: [0, 2],
    wasserloch: [0, 2],
    wueste: [26, 36],
    duenen: [5, 11],
  }),
};

export function getWuesteZoneConfig(zoneSlot: SwuZoneSlot): SwuBiomSurfaceConfig {
  if (zoneSlot === 1) return SWU_WUESTE_COLD_CONFIG;
  if (zoneSlot === 2) return SWU_WUESTE_MID_CONFIG;
  return SWU_WUESTE_HOT_CONFIG;
}

const generator = new SwuBiomGenerator();

export function generateWuesteColonySurface(
  zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const seedTiles = zoneSlot === 2 ? ['I910', 'I119'] : zoneSlot === 1 ? SWU_KAELTEWUESTE_SEED_TILES : SWU_SUBTROPISCH_SEED_TILES;
  const baseConfig = getWuesteZoneConfig(zoneSlot);
  const config = bodyFeature === 'moon' ? scaleConfigForMoon(baseConfig) : baseConfig;
  return generateWithSeedGuarantee(generator, config, seed, seedTiles);
}


/**
 * UNTERGRUND (Platzhalter): alte STU-Nummernkreise, temporaer bis SWU eigene
 * Untergrund-Tiles bekommt - wird spaeter ausgetauscht.
 */
export function generateWuesteUntergrund(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const surface = generateWuesteColonySurface(zoneSlot, rotation, seed, bodyFeature);
  const config = buildUndergroundConfig(
    'U101',
    { rockVariants: ['U6D3', 'U6D4', 'U6I1', 'U6I2'], magmaMode: 'conditional' },
    surface,
    bodyFeature === 'moon',
  );
  return new SwuBiomGenerator().generate(config, seed);
}

import { buildOrbitRows } from './swu-orbit';

/** Orbit-Reihen (oben/unten) fuer diesen Archetyp - hasRing kommt vom bodyFeature der Instanz. */
export function generateWuesteOrbit(hasRing: boolean): { lower: string[]; upper: string[] } {
  return buildOrbitRows(6, null, hasRing);
}
