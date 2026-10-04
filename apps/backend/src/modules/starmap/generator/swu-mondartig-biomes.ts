/**
 * Mondartig - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * Alle 3 Zonen identisch (G, Planetoid) - luftloser Planetoid hat keine echte
 * Klimazonierung, ueberall dasselbe Terrain. Enthaelt den uebergrossen 2x2-
 * Krater (siehe swu-biome-letters.ts, isPlanetoidCraterIntact).
 */

import { SwuBiomGenerator, scalePhaseQuantities, getColonyDimensions, SWU_MOON_SCALE_FACTOR, type SwuBiomSurfaceConfig } from './swu-biom-generator';
import { buildUndergroundConfig } from './swu-underground';
import type { SwuZoneSlot, SwuRotationType, SwuBodyFeature } from './swu-planet-archetypes.generator';
import {
  buildPlanetoidCraterChainPhases,
  buildPlanetoidDecorationPhases,
  isPlanetoidCraterIntact,
  SWU_PLANETOID_SEED_TILES,
} from './swu-biome-letters';

const COLONY_WIDTH = 10;
const COLONY_HEIGHT = 6;

export const SWU_MONDARTIG_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'G649',
  phases: [...buildPlanetoidCraterChainPhases(), ...buildPlanetoidDecorationPhases('G649')],
};

/** Mond: kleinere Karte, Deko-Mengen skaliert, Krater bleibt bei 1 (unskaliert - Ketten-Einzelschritte). */
export function getMondartigMoonConfig(): SwuBiomSurfaceConfig {
  const { width, height } = getColonyDimensions('moon');
  return {
    width,
    height,
    baseField: 'G649',
    phases: [
      ...buildPlanetoidCraterChainPhases(),
      ...scalePhaseQuantities(buildPlanetoidDecorationPhases('G649'), SWU_MOON_SCALE_FACTOR),
    ],
  };
}

/** Alle 3 Zonen identisch - siehe Kopfkommentar. */
export function getMondartigZoneConfig(_zoneSlot: SwuZoneSlot, bodyFeature: SwuBodyFeature = 'base'): SwuBiomSurfaceConfig {
  return bodyFeature === 'moon' ? getMondartigMoonConfig() : SWU_MONDARTIG_CONFIG;
}

const generator = new SwuBiomGenerator();
const wantedSeed = new Set(SWU_PLANETOID_SEED_TILES);

/** Generiert und stellt sicher: Seed-Feld vorhanden UND 2x2-Krater intakt. */
export function generateMondartigColonySurface(
  zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
  maxAttempts = 30,
): string[][] {
  const config = getMondartigZoneConfig(zoneSlot, bodyFeature);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = attempt === 0 ? seed : `${seed}-retry${attempt}`;
    const grid = generator.generate(config, attemptSeed);
    const seedOk = grid.some((row) => row.some((cell) => wantedSeed.has(cell)));
    if (seedOk && isPlanetoidCraterIntact(grid)) return grid;
  }
  console.warn(`[swu-mondartig-biomes] Konnte nach ${maxAttempts} Versuchen keine gueltige Oberflaeche erzeugen (${bodyFeature}, Seed: ${seed}).`);
  return generator.generate(config, seed);
}


/**
 * UNTERGRUND (Platzhalter): alte STU-Nummernkreise, temporaer bis SWU eigene
 * Untergrund-Tiles bekommt - wird spaeter ausgetauscht.
 */
export function generateMondartigUntergrund(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const surface = generateMondartigColonySurface(zoneSlot, rotation, seed, bodyFeature);
  const config = buildUndergroundConfig(
    'U101',
    { rockVariants: ['U6G1'], magmaMode: 'conditional' },
    surface,
    bodyFeature === 'moon',
  );
  return new SwuBiomGenerator().generate(config, seed);
}

import { buildOrbitRows } from './swu-orbit';

/** Orbit-Reihen (oben/unten) fuer diesen Archetyp - hasRing kommt vom bodyFeature der Instanz. */
export function generateMondartigOrbit(hasRing: boolean): { lower: string[]; upper: string[] } {
  return buildOrbitRows(12, null, hasRing);
}
