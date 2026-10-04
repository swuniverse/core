/**
 * Arktisch - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * Cold UND Mid sind laut Archetyp-Daten identisch (beide Eispanzer/Packeis) -
 * hier also derselbe A-Buchstabe fuer beide. Hot (Tundrastreifen) nutzt B,
 * kuehlere Gewichtung (kaum Sumpf, mehr Wald/Fels) - ein schmaler Streifen
 * Tundra am Aequator, kein eigenes Tile mit diesem Namen vorhanden.
 */

import { SwuBiomGenerator, generateWithSeedGuarantee, scaleConfigForMoon, type SwuBiomSurfaceConfig } from './swu-biom-generator';
import { buildUndergroundConfig } from './swu-underground';
import type { SwuZoneSlot, SwuRotationType, SwuBodyFeature } from './swu-planet-archetypes.generator';
import { buildPolarPhases, buildTundraPhases, SWU_POLAR_SEED_TILES, SWU_SUBPOLAR_SEED_TILES } from './swu-biome-letters';

const COLONY_WIDTH = 10;
const COLONY_HEIGHT = 6;

export const SWU_ARKTISCH_COLD_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'A410',
  phases: buildPolarPhases('A410', { gefriert: [45, 55], packeis: [35, 45], eispanzer: [25, 35] }),
};

/** Identisch zu Cold - Archetyp-Daten weisen fuer Mid dieselben Biome (Eispanzer/Packeis) aus. */
export const SWU_ARKTISCH_MID_CONFIG: SwuBiomSurfaceConfig = SWU_ARKTISCH_COLD_CONFIG;

export const SWU_ARKTISCH_HOT_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'B110',
  phases: buildTundraPhases('B110', false), // kuehlere Variante - "nur ein Streifen", nicht die waermste Tundra-Auspraegung
};

export function getArktischZoneConfig(zoneSlot: SwuZoneSlot): SwuBiomSurfaceConfig {
  if (zoneSlot === 3) return SWU_ARKTISCH_HOT_CONFIG;
  return SWU_ARKTISCH_COLD_CONFIG;
}

function getRequiredSeedTiles(zoneSlot: SwuZoneSlot): string[] {
  return zoneSlot === 3 ? SWU_SUBPOLAR_SEED_TILES : SWU_POLAR_SEED_TILES;
}

const generator = new SwuBiomGenerator();

export function generateArktischColonySurface(
  zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const baseConfig = getArktischZoneConfig(zoneSlot);
  const config = bodyFeature === 'moon' ? scaleConfigForMoon(baseConfig) : baseConfig;
  return generateWithSeedGuarantee(generator, config, seed, getRequiredSeedTiles(zoneSlot));
}


/**
 * UNTERGRUND (Platzhalter): alte STU-Nummernkreise, temporaer bis SWU eigene
 * Untergrund-Tiles bekommt - wird spaeter ausgetauscht.
 */
export function generateArktischUntergrund(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const surface = generateArktischColonySurface(zoneSlot, rotation, seed, bodyFeature);
  const config = buildUndergroundConfig(
    'U501',
    { rockVariants: ['U6B1'], magmaMode: 'conditional' },
    surface,
    bodyFeature === 'moon',
  );
  return new SwuBiomGenerator().generate(config, seed);
}

import { buildOrbitRows } from './swu-orbit';

/** Orbit-Reihen (oben/unten) fuer diesen Archetyp - hasRing kommt vom bodyFeature der Instanz. */
export function generateArktischOrbit(hasRing: boolean): { lower: string[]; upper: string[] } {
  return buildOrbitRows(10, null, hasRing);
}
