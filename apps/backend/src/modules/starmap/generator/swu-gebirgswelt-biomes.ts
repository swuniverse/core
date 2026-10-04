/**
 * Gebirgswelt - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * "Gebirge" ist in allen 3 Zonen das Primaer-Biom - "Felsplatte" (in allen
 * Auspraegungen) steht als Bergersatz. Cold/Mid nutzen B (Tundra-Buchstabe,
 * passt zu den Sekundaer-Biomen Schnee/Tundra), Hot nutzt C (passt zu
 * Sekundaer-Biom Waelder) - alle drei mit stark erhoehter Fels-Gewichtung,
 * Wald/Sumpf zurueckgedraengt.
 */

import { SwuBiomGenerator, generateWithSeedGuarantee, scaleConfigForMoon, type SwuBiomSurfaceConfig } from './swu-biom-generator';
import { buildUndergroundConfig } from './swu-underground';
import type { SwuZoneSlot, SwuRotationType, SwuBodyFeature } from './swu-planet-archetypes.generator';
import {
  buildTundraPhases,
  buildGemaessigtPhases,
  SWU_SUBPOLAR_SEED_TILES,
  SWU_GEMAESSIGT_SEED_TILES,
} from './swu-biome-letters';

const COLONY_WIDTH = 10;
const COLONY_HEIGHT = 6;

export const SWU_GEBIRGSWELT_COLD_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'B110',
  phases: buildTundraPhases('B110', false, [20, 32], [7, 9]), // stark erhoehter Fels-Anteil
};

export const SWU_GEBIRGSWELT_MID_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'B110',
  phases: buildTundraPhases('B110', false, [22, 34], [7, 9]),
};

export const SWU_GEBIRGSWELT_HOT_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'C110',
  phases: buildGemaessigtPhases('C110', {
    wald: [10, 18], // "Waelder" als Sekundaer-Biom, aber Fels dominiert
    feucht: [1, 4],
    wasser: [1, 4],
    fels: [18, 28],
  }),
};

export function getGebirgsweltZoneConfig(zoneSlot: SwuZoneSlot): SwuBiomSurfaceConfig {
  if (zoneSlot === 1) return SWU_GEBIRGSWELT_COLD_CONFIG;
  if (zoneSlot === 2) return SWU_GEBIRGSWELT_MID_CONFIG;
  return SWU_GEBIRGSWELT_HOT_CONFIG;
}

function getRequiredSeedTiles(zoneSlot: SwuZoneSlot): string[] {
  return zoneSlot === 3 ? SWU_GEMAESSIGT_SEED_TILES : SWU_SUBPOLAR_SEED_TILES;
}

const generator = new SwuBiomGenerator();

export function generateGebirgsweltColonySurface(
  zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const baseConfig = getGebirgsweltZoneConfig(zoneSlot);
  const config = bodyFeature === 'moon' ? scaleConfigForMoon(baseConfig) : baseConfig;
  return generateWithSeedGuarantee(generator, config, seed, getRequiredSeedTiles(zoneSlot));
}


/**
 * UNTERGRUND (Platzhalter): alte STU-Nummernkreise, temporaer bis SWU eigene
 * Untergrund-Tiles bekommt - wird spaeter ausgetauscht.
 */
export function generateGebirgsweltUntergrund(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const surface = generateGebirgsweltColonySurface(zoneSlot, rotation, seed, bodyFeature);
  const config = buildUndergroundConfig(
    'U101',
    { rockVariants: ['U6B1'], magmaMode: 'conditional' },
    surface,
    bodyFeature === 'moon',
  );
  return new SwuBiomGenerator().generate(config, seed);
}

import { buildOrbitRows } from './swu-orbit';

/** Orbit-Reihen (oben/unten) fuer diesen Archetyp - hasRing kommt vom bodyFeature der Instanz. */
export function generateGebirgsweltOrbit(hasRing: boolean): { lower: string[]; upper: string[] } {
  return buildOrbitRows(7, null, hasRing);
}
