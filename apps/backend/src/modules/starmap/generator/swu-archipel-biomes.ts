/**
 * Archipel - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * Archipel hat eine sehr enge, durchgehend warme Temperaturspanne (15-35 Grad,
 * "quasi permanent tropisch" laut Ursprungsdaten) - "Cold" ist hier NICHT
 * arktisch, sondern einfach das kuehlere Ende eines warmen Bereichs. Alle 3
 * Zonen nutzen daher E (Tropisch), nur unterschiedlich gewichtet:
 *   Cold (Offenes Meer/Sandbaenke): am wasserlastigsten, kaum Land
 *   Mid/Hot (Tropisches Meer/Korallen): etwas mehr Riff/Strand-Akzent
 */

import { SwuBiomGenerator, generateWithSeedGuarantee, scaleConfigForMoon, type SwuBiomSurfaceConfig } from './swu-biom-generator';
import { buildUndergroundConfig } from './swu-underground';
import type { SwuZoneSlot, SwuRotationType, SwuBodyFeature } from './swu-planet-archetypes.generator';
import { buildTropischPhases, SWU_TROPISCH_SEED_TILES } from './swu-biome-letters';

const COLONY_WIDTH = 10;
const COLONY_HEIGHT = 6;

export const SWU_ARCHIPEL_COLD_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'E110',
  phases: buildTropischPhases('E110', {
    regenwald: [0, 2],
    palmen: [1, 3],
    sumpf: [1, 4],
    meer: [26, 36],
    fels: [0, 1],
    felsplatte: [4, 7], // Bergbau ohne Untergrund-Forschung (Wasserfelder erst spaet bergbaubar)
    strand: [3, 9],
  }),
};

export const SWU_ARCHIPEL_MID_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'E110',
  phases: buildTropischPhases('E110', {
    regenwald: [1, 4],
    palmen: [3, 7],
    sumpf: [2, 5],
    meer: [18, 26], // Korallen/Riff-Anteil
    fels: [0, 2],
    felsplatte: [5, 8], // siehe Cold
    strand: [4, 10],
  }),
};

/** Hot ist thematisch fast identisch zu Mid (beide "Tropisches Meer/Korallen"). */
export const SWU_ARCHIPEL_HOT_CONFIG: SwuBiomSurfaceConfig = SWU_ARCHIPEL_MID_CONFIG;

export function getArchipelZoneConfig(zoneSlot: SwuZoneSlot): SwuBiomSurfaceConfig {
  if (zoneSlot === 1) return SWU_ARCHIPEL_COLD_CONFIG;
  return SWU_ARCHIPEL_MID_CONFIG;
}

const generator = new SwuBiomGenerator();

export function generateArchipelColonySurface(
  zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const baseConfig = getArchipelZoneConfig(zoneSlot);
  const config = bodyFeature === 'moon' ? scaleConfigForMoon(baseConfig) : baseConfig;
  return generateWithSeedGuarantee(generator, config, seed, SWU_TROPISCH_SEED_TILES);
}


/**
 * UNTERGRUND (Platzhalter): alte STU-Nummernkreise, temporaer bis SWU eigene
 * Untergrund-Tiles bekommt - wird spaeter ausgetauscht.
 */
export function generateArchipelUntergrund(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const surface = generateArchipelColonySurface(zoneSlot, rotation, seed, bodyFeature);
  const config = buildUndergroundConfig(
    'U401',
    { rockVariants: ['U6D1'], magmaMode: 'conditional' },
    surface,
    bodyFeature === 'moon',
  );
  return new SwuBiomGenerator().generate(config, seed);
}

import { buildOrbitRows } from './swu-orbit';

/** Orbit-Reihen (oben/unten) fuer diesen Archetyp - hasRing kommt vom bodyFeature der Instanz. */
export function generateArchipelOrbit(hasRing: boolean): { lower: string[]; upper: string[] } {
  return buildOrbitRows(11, null, hasRing);
}
