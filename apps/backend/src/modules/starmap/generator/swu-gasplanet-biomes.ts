/**
 * Gasplanet (Varianten A-D) - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * Alle 3 Zonen identisch (H, Gas) fuer alle 4 Varianten - reine Gasriesen
 * haben keine feste Oberflaeche, die Varianten A-D unterscheiden sich nur
 * kosmetisch (Atmosphaere/Namensgebung in den Archetyp-Daten), nicht in der
 * tatsaechlichen Generierung. Enthaelt die Tribanna-Quelle (2x2, exakt 2x
 * beim Planeten) und genau EINE Gas-Plattform als Seed.
 *
 * UNTERGRUND (neu): die generierte "Oberflaeche" sind bei Gasplaneten Wolken,
 * kein fester Boden. Der Untergrund-Layer ist hier aber eine ECHTE feste
 * Oberflaeche (Kern unter den Gasschichten) - bedient sich am Vulkanisch-
 * Buchstaben (F), ABER OHNE die Lavastrom-Kette (die waere fuer eine
 * verborgene Kernschicht nicht stimmig, nur reine Dekorationsphasen).
 */

import { SwuBiomGenerator, generateWithSeedGuarantee, scaleConfigForMoon, getColonyDimensions, type SwuBiomSurfaceConfig } from './swu-biom-generator';
import type { SwuZoneSlot, SwuRotationType, SwuBodyFeature } from './swu-planet-archetypes.generator';
import {
  buildTribannaQuelleChainPhases,
  buildGasDecorationPhases,
  buildVulkanischDecorationPhases,
  countIntactTribannaQuelle,
  countGasPlatforms,
  SWU_GAS_SEED_TILES,
  SWU_GAS_STORM_COUNT_PLANET,
  SWU_GAS_STORM_COUNT_MOON,
  SWU_GAS_TRIBANNA_QUELLE_COUNT_PLANET,
  SWU_GAS_TRIBANNA_QUELLE_COUNT_MOON,
  SWU_VULKANISCH_SEED_TILES,
} from './swu-biome-letters';

const COLONY_WIDTH = 10;
const COLONY_HEIGHT = 6;

export const SWU_GASPLANET_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'H910',
  phases: [
    ...buildTribannaQuelleChainPhases(),
    ...buildTribannaQuelleChainPhases(), // Planet: 2 Ketten (siehe STU Klasse Q, classId 221)
    ...buildGasDecorationPhases('H910', SWU_GAS_STORM_COUNT_PLANET),
  ],
};

/** Mond: nur 1 Tribanna-Quelle-Kette, 7 statt 9 Stuerme (siehe STU Klasse Q, classId 421). */
export const SWU_GASPLANET_MOON_CONFIG: SwuBiomSurfaceConfig = {
  width: getColonyDimensions('moon').width,
  height: getColonyDimensions('moon').height,
  baseField: 'H910',
  phases: [
    ...buildTribannaQuelleChainPhases(),
    ...buildGasDecorationPhases('H910', SWU_GAS_STORM_COUNT_MOON),
  ],
};

/** Untergrund/Kern - Vulkanisch, aber OHNE Lavastrom-Kette (keine F73/F74-Tiles). */
export const SWU_GASPLANET_UNTERGRUND_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'F710',
  phases: buildVulkanischDecorationPhases('F710'),
};

/** Alle 3 Zonen identisch, alle 4 Varianten (A-D) identisch - siehe Kopfkommentar. */
export function getGasplanetZoneConfig(_zoneSlot: SwuZoneSlot, bodyFeature: SwuBodyFeature = 'base'): SwuBiomSurfaceConfig {
  return bodyFeature === 'moon' ? SWU_GASPLANET_MOON_CONFIG : SWU_GASPLANET_CONFIG;
}

const generator = new SwuBiomGenerator();
const wantedSeed = new Set(SWU_GAS_SEED_TILES);

export function generateGasplanetColonySurface(
  zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
  maxAttempts = 40,
): string[][] {
  const config = getGasplanetZoneConfig(zoneSlot, bodyFeature);
  const chainTarget = bodyFeature === 'moon' ? SWU_GAS_TRIBANNA_QUELLE_COUNT_MOON : SWU_GAS_TRIBANNA_QUELLE_COUNT_PLANET;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = attempt === 0 ? seed : `${seed}-retry${attempt}`;
    const grid = generator.generate(config, attemptSeed);
    const seedOk = grid.some((row) => row.some((cell) => wantedSeed.has(cell)));
    const chainsOk = countIntactTribannaQuelle(grid) === chainTarget;
    const platformOk = countGasPlatforms(grid) === 1;
    if (seedOk && chainsOk && platformOk) return grid;
  }
  console.warn(`[swu-gasplanet-biomes] Konnte nach ${maxAttempts} Versuchen keine gueltige Oberflaeche erzeugen (${bodyFeature}, Seed: ${seed}).`);
  return generator.generate(config, seed);
}

/** Generiert den Untergrund-Layer (fester Kern unter den Gasschichten, kein Lavastrom). */
/** Mond: kleinere Karte, Mengen proportional skaliert. */
export const SWU_GASPLANET_UNTERGRUND_MOON_CONFIG: SwuBiomSurfaceConfig = scaleConfigForMoon(SWU_GASPLANET_UNTERGRUND_CONFIG);

export function generateGasplanetUntergrund(
  _zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const config = bodyFeature === 'moon' ? SWU_GASPLANET_UNTERGRUND_MOON_CONFIG : SWU_GASPLANET_UNTERGRUND_CONFIG;
  return generateWithSeedGuarantee(generator, config, seed, SWU_VULKANISCH_SEED_TILES);
}

import { buildOrbitRows } from './swu-orbit';

/** Orbit-Reihen fuer Gasplanet - hasRing kommt vom bodyFeature, variant ist informativ (alle 4 Varianten identisch in der Atmosphaeren-Zuordnung). */
export function generateGasplanetOrbit(hasRing: boolean, variant: 'A' | 'B' | 'C' | 'D' = 'A'): { lower: string[]; upper: string[] } {
  return buildOrbitRows(15, variant, hasRing);
}
