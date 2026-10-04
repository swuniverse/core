/**
 * Marsartig - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * Cold (Eiskappe): A (Polar), kein eigenes "Eiskappe"-Tile vorhanden, A passt
 *       thematisch am naechsten.
 * Mid  (Kalte Wueste): K (Rote Kaeltewueste/Kaelteoedland, aus JK.xlsx
 *       nachgeliefert - behebt die vorher unloesbare Luecke).
 * Hot  (Rotes Oedland/Steinmassiv): I, stark auf Oedland/Fels gewichtet -
 *       I910 (Salzwueste) als hartes Seed-Tile.
 */

import { SwuBiomGenerator, generateWithSeedGuarantee, scaleConfigForMoon, type SwuBiomSurfaceConfig } from './swu-biom-generator';
import { buildUndergroundConfig } from './swu-underground';
import type { SwuZoneSlot, SwuRotationType, SwuBodyFeature } from './swu-planet-archetypes.generator';
import {
  buildPolarPhases,
  buildMarsartigPhases,
  buildRoteKaeltewuestePhases,
  buildSalzwuestenKreuzPhases,
  isSalzwuestenKreuzIntact,
  SWU_POLAR_SEED_TILES,
  SWU_MARSARTIG_SEED_TILES,
  SWU_ROTE_KAELTEWUESTE_SEED_TILES,
} from './swu-biome-letters';

const COLONY_WIDTH = 10;
const COLONY_HEIGHT = 6;

export const SWU_MARSARTIG_COLD_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'A410',
  phases: buildPolarPhases('A410'),
};

export const SWU_MARSARTIG_MID_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'K610',
  phases: buildRoteKaeltewuestePhases('K610'),
};

/**
 * Hot-Zone: enthaelt das Salzwuesten-Kreuz (I910 Zentrum + I91A/B/C/D in den
 * 4 Himmelsrichtungen) als feste Signatur-Formation, zusaetzlich zur normalen
 * Marsartig-Kaskade. Genau EIN Kreuz pro Generierung (siehe Retry-Absicherung
 * in generateMarsartigColonySurface).
 */
export const SWU_MARSARTIG_HOT_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'I110',
  phases: [
    ...buildSalzwuestenKreuzPhases(),
    ...buildMarsartigPhases('I110', {
      salzwueste: [10, 20],
      felsformation: [6, 12],
      felsBedeckt: [4, 9],
      felsplatte: [6, 8],
    }),
  ],
};

export function getMarsartigZoneConfig(zoneSlot: SwuZoneSlot): SwuBiomSurfaceConfig {
  if (zoneSlot === 1) return SWU_MARSARTIG_COLD_CONFIG;
  if (zoneSlot === 2) return SWU_MARSARTIG_MID_CONFIG;
  return SWU_MARSARTIG_HOT_CONFIG;
}

function getRequiredSeedTiles(zoneSlot: SwuZoneSlot): string[] {
  if (zoneSlot === 1) return SWU_POLAR_SEED_TILES;
  if (zoneSlot === 2) return SWU_ROTE_KAELTEWUESTE_SEED_TILES;
  return SWU_MARSARTIG_SEED_TILES;
}

const generator = new SwuBiomGenerator();

export function generateMarsartigColonySurface(
  zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const extraCheck = zoneSlot === 3 ? isSalzwuestenKreuzIntact : undefined;
  const baseConfig = getMarsartigZoneConfig(zoneSlot);
  const config = bodyFeature === 'moon' ? scaleConfigForMoon(baseConfig) : baseConfig;
  return generateWithSeedGuarantee(generator, config, seed, getRequiredSeedTiles(zoneSlot), extraCheck);
}


/**
 * UNTERGRUND (Platzhalter): alte STU-Nummernkreise, temporaer bis SWU eigene
 * Untergrund-Tiles bekommt - wird spaeter ausgetauscht.
 */
export function generateMarsartigUntergrund(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const surface = generateMarsartigColonySurface(zoneSlot, rotation, seed, bodyFeature);
  const config = buildUndergroundConfig(
    'U103',
    { rockVariants: ['U6I1', 'U6I2'], magmaMode: 'conditional' },
    surface,
    bodyFeature === 'moon',
  );
  return new SwuBiomGenerator().generate(config, seed);
}

import { buildOrbitRows } from './swu-orbit';

/** Orbit-Reihen (oben/unten) fuer diesen Archetyp - hasRing kommt vom bodyFeature der Instanz. */
export function generateMarsartigOrbit(hasRing: boolean): { lower: string[]; upper: string[] } {
  return buildOrbitRows(9, null, hasRing);
}
