/**
 * Savanne - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * Alle 3 Zonen nutzen D (Subtropisch), aber unterschiedlich gewichtet:
 *   Cold  (Sandwueste/Steppe): trockenheitslastig, kaum Waeldchen/Wasserloch
 *   Mid   (Wiese/Felsen): ausgeglichen, mehr Fels-Akzent
 *   Hot   (Tropische Wiesen/Savanne): ueppiger, mehr Waeldchen/Wasserloch
 */

import { SwuBiomGenerator, generateWithSeedGuarantee, scaleConfigForMoon, type SwuBiomSurfaceConfig } from './swu-biom-generator';
import { buildUndergroundConfig } from './swu-underground';
import type { SwuZoneSlot, SwuRotationType, SwuBodyFeature } from './swu-planet-archetypes.generator';
import { buildSubtropischPhases, SWU_SUBTROPISCH_SEED_TILES } from './swu-biome-letters';

const COLONY_WIDTH = 10;
const COLONY_HEIGHT = 6;

export const SWU_SAVANNE_COLD_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'D110',
  phases: buildSubtropischPhases('D110', {
    waeldchen: [1, 4],
    wasserloch: [0, 2],
    wueste: [22, 32],
    duenen: [4, 10],
    felsformation: [2, 6],
  }),
};

export const SWU_SAVANNE_MID_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'D110',
  phases: buildSubtropischPhases('D110'), // Standardgewichtung passt hier gut
};

export const SWU_SAVANNE_HOT_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'D110',
  phases: buildSubtropischPhases('D110', {
    waeldchen: [12, 20],
    wasserloch: [3, 7],
    wueste: [4, 10],
    duenen: [0, 3],
    felsplatte: [9, 10], // wenig Wueste -> kaum D680, daher mehr D640
  }),
};

export function getSavanneZoneConfig(zoneSlot: SwuZoneSlot): SwuBiomSurfaceConfig {
  if (zoneSlot === 1) return SWU_SAVANNE_COLD_CONFIG;
  if (zoneSlot === 2) return SWU_SAVANNE_MID_CONFIG;
  return SWU_SAVANNE_HOT_CONFIG;
}

const generator = new SwuBiomGenerator();

export function generateSavanneColonySurface(
  zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const baseConfig = getSavanneZoneConfig(zoneSlot);
  const config = bodyFeature === 'moon' ? scaleConfigForMoon(baseConfig) : baseConfig;
  return generateWithSeedGuarantee(generator, config, seed, SWU_SUBTROPISCH_SEED_TILES);
}


/**
 * UNTERGRUND (Platzhalter): alte STU-Nummernkreise, temporaer bis SWU eigene
 * Untergrund-Tiles bekommt - wird spaeter ausgetauscht.
 */
export function generateSavanneUntergrund(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const surface = generateSavanneColonySurface(zoneSlot, rotation, seed, bodyFeature);
  const config = buildUndergroundConfig(
    'U101',
    { rockVariants: ['U6D2'], magmaMode: 'conditional' },
    surface,
    bodyFeature === 'moon',
  );
  return new SwuBiomGenerator().generate(config, seed);
}

import { buildOrbitRows } from './swu-orbit';

/** Orbit-Reihen (oben/unten) fuer diesen Archetyp - hasRing kommt vom bodyFeature der Instanz. */
export function generateSavanneOrbit(hasRing: boolean): { lower: string[]; upper: string[] } {
  return buildOrbitRows(5, null, hasRing);
}
