/**
 * Tundraartig - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * Cold (Eispanzer/Tundrasuempfe): A+B Schneedecken-Mix wie Erdaehnlich-Cold.
 * Mid  (Tundra): offene Tundra, kuehlere Gewichtung (mehr Wald, weniger Sumpf).
 * Hot  (Aequator): "zweites Tundra-Feld", waermere Gewichtung (mehr Sumpf,
 *       weniger Wald) - der Planet wird nirgends waermer als Tundra, wie der
 *       Name schon sagt, deshalb bleibt's bei Buchstabe B, nur die Mischung
 *       verschiebt sich Richtung Aequator.
 */

import { SwuBiomGenerator, generateWithSeedGuarantee, scaleConfigForMoon, type SwuBiomSurfaceConfig } from './swu-biom-generator';
import { buildUndergroundConfig } from './swu-underground';
import type { SwuZoneSlot, SwuRotationType, SwuBodyFeature } from './swu-planet-archetypes.generator';
import {
  buildPolarPhases,
  buildSubpolarPhases,
  buildSnowHiddenTundraPhases,
  buildSnowRevealPhases,
  buildTundraPhases,
  SWU_POLAR_SEED_TILES,
  SWU_SUBPOLAR_SEED_TILES,
} from './swu-biome-letters';

const COLONY_WIDTH = 10;
const COLONY_HEIGHT = 6;

export const SWU_TUNDRAARTIG_COLD_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'A550',
  phases: buildSnowRevealPhases('A550', [
    { hiddenField: 'A410', numMin: 15, numMax: 25, phases: buildPolarPhases('A410') },
    { hiddenField: 'B610', numMin: 11, numMax: 19, phases: buildSubpolarPhases('B610') },
    { hiddenField: 'B140', numMin: 10, numMax: 18, phases: buildSnowHiddenTundraPhases('B140') },
  ]),
};

export const SWU_TUNDRAARTIG_MID_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'B110',
  phases: buildTundraPhases('B110', false),
};

export const SWU_TUNDRAARTIG_HOT_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'B110',
  phases: buildTundraPhases('B110', true),
};

export function getTundraartigZoneConfig(zoneSlot: SwuZoneSlot): SwuBiomSurfaceConfig {
  if (zoneSlot === 1) return SWU_TUNDRAARTIG_COLD_CONFIG;
  if (zoneSlot === 2) return SWU_TUNDRAARTIG_MID_CONFIG;
  return SWU_TUNDRAARTIG_HOT_CONFIG;
}

function getRequiredSeedTiles(zoneSlot: SwuZoneSlot): string[] {
  return zoneSlot === 1 ? SWU_POLAR_SEED_TILES : SWU_SUBPOLAR_SEED_TILES;
}

const generator = new SwuBiomGenerator();

export function generateTundraartigColonySurface(
  zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const baseConfig = getTundraartigZoneConfig(zoneSlot);
  const config = bodyFeature === 'moon' ? scaleConfigForMoon(baseConfig) : baseConfig;
  return generateWithSeedGuarantee(generator, config, seed, getRequiredSeedTiles(zoneSlot));
}


/**
 * UNTERGRUND (Platzhalter): alte STU-Nummernkreise, temporaer bis SWU eigene
 * Untergrund-Tiles bekommt - wird spaeter ausgetauscht.
 */
export function generateTundraartigUntergrund(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const surface = generateTundraartigColonySurface(zoneSlot, rotation, seed, bodyFeature);
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
export function generateTundraartigOrbit(hasRing: boolean): { lower: string[]; upper: string[] } {
  return buildOrbitRows(8, null, hasRing);
}
