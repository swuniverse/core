/**
 * Lavaplanet - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * Alle 3 Zonen nutzen F (Vulkanisch), aber unterschiedlich "aktiv/gefaehrlich"
 * gewichtet - nur die Hot-Zone bekommt die volle Lavastrom-Kette (aktiver
 * Vulkanismus), Cold/Mid sind ueberwiegend erkaltet/sicher:
 *   Cold (Schnee auf Lava): schneelastig, kaum aktive Vulkane
 *   Mid  (Erstarrte Lava/Aschewueste): erkaltete Lava dominiert, moderat aktiv
 *   Hot  (Aktive Vulkane): volle Lavastrom-Kette (exakt 8 Felder), sehr aktiv
 */

import {
  SwuBiomGenerator,
  scaleConfigForMoon,
  scalePhaseQuantities,
  getColonyDimensions,
  SWU_MOON_SCALE_FACTOR,
  type SwuBiomSurfaceConfig,
} from './swu-biom-generator';
import { buildUndergroundConfig } from './swu-underground';
import type { SwuZoneSlot, SwuRotationType, SwuBodyFeature } from './swu-planet-archetypes.generator';
import {
  buildVulkanischDecorationPhases,
  buildLavaFlowChainPhases,
  buildLavaFlowChainPhasesMoon,
  buildSchneeAufLavaPhases,
  pickLavaChainDirectionD,
  SWU_VULKANISCH_SEED_TILES,
  SWU_F73_TILE_CODES,
  SWU_LAVA_STREAM_TILES_PLANET,
  SWU_LAVA_STREAM_TILES_MOON,
} from './swu-biome-letters';

const COLONY_WIDTH = 10;
const COLONY_HEIGHT = 6;

export const SWU_LAVAPLANET_COLD_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'F550', // Lavafeld komplett unter Schneedecke versteckt
  phases: buildSchneeAufLavaPhases('F550'),
};

export const SWU_LAVAPLANET_MID_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'F710',
  phases: buildVulkanischDecorationPhases('F710', {
    vulkane: [1, 4],
    erstarrt: [18, 28], // Kernmerkmal: "Erstarrte Lava"
    schnee: [0, 3],
    schwefel: [1, 5],
    asche: [8, 14], // Kernmerkmal: "Aschewueste"
    erloschen: [1, 4],
  }),
};

/** Volle aktive Version inkl. Lavastrom-Kette - identisch zu Erdaehnlichs Hot-Gebunden-Zone. */
export function buildLavaplanetHotConfig(useDirectionD = false, bodyFeature: SwuBodyFeature = 'base'): SwuBiomSurfaceConfig {
  const { width, height } = getColonyDimensions(bodyFeature === 'moon' ? 'moon' : 'planet');
  const chainPhases =
    bodyFeature === 'moon' ? buildLavaFlowChainPhasesMoon() : buildLavaFlowChainPhases(useDirectionD);
  const decorationPhases =
    bodyFeature === 'moon'
      ? scalePhaseQuantities(buildVulkanischDecorationPhases('F710'), SWU_MOON_SCALE_FACTOR)
      : buildVulkanischDecorationPhases('F710');
  return {
    width,
    height,
    baseField: 'F710',
    phases: [...chainPhases, ...decorationPhases],
  };
}

export function getLavaplanetZoneConfig(
  zoneSlot: SwuZoneSlot,
  seed = 'default',
  bodyFeature: SwuBodyFeature = 'base',
): SwuBiomSurfaceConfig {
  if (zoneSlot === 3) return buildLavaplanetHotConfig(pickLavaChainDirectionD(seed), bodyFeature);
  const baseConfig = zoneSlot === 1 ? SWU_LAVAPLANET_COLD_CONFIG : SWU_LAVAPLANET_MID_CONFIG;
  return bodyFeature === 'moon' ? scaleConfigForMoon(baseConfig) : baseConfig;
}

const generator = new SwuBiomGenerator();
const F73_SET = new Set(SWU_F73_TILE_CODES);

export function generateLavaplanetColonySurface(
  zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
  maxAttempts = 30,
): string[][] {
  const config = getLavaplanetZoneConfig(zoneSlot, seed, bodyFeature);
  const wanted = new Set(SWU_VULKANISCH_SEED_TILES);
  const isHot = zoneSlot === 3;
  const lavaTarget = bodyFeature === 'moon' ? SWU_LAVA_STREAM_TILES_MOON : SWU_LAVA_STREAM_TILES_PLANET;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = attempt === 0 ? seed : `${seed}-retry${attempt}`;
    const grid = generator.generate(config, attemptSeed);
    const seedOk = grid.some((row) => row.some((cell) => wanted.has(cell)));
    let lavaOk = true;
    if (isHot) {
      let count = 0;
      for (const row of grid) for (const cell of row) if (F73_SET.has(cell)) count++;
      lavaOk = count === lavaTarget;
    }
    if (seedOk && lavaOk) return grid;
  }
  console.warn(`[swu-lavaplanet-biomes] Konnte nach ${maxAttempts} Versuchen keine gueltige Oberflaeche erzeugen (Zone ${zoneSlot}, ${bodyFeature}, Seed: ${seed}).`);
  return generator.generate(config, seed);
}


/**
 * UNTERGRUND (Platzhalter): alte STU-Nummernkreise, temporaer bis SWU eigene
 * Untergrund-Tiles bekommt - wird spaeter ausgetauscht.
 */
export function generateLavaplanetUntergrund(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const config = buildUndergroundConfig('U101', { rockVariants: ['U6F1'], magmaMode: 'fixed' }, undefined, bodyFeature === 'moon');
  return new SwuBiomGenerator().generate(config, seed);
}

import { buildOrbitRows } from './swu-orbit';

/** Orbit-Reihen (oben/unten) fuer diesen Archetyp - hasRing kommt vom bodyFeature der Instanz. */
export function generateLavaplanetOrbit(hasRing: boolean): { lower: string[]; upper: string[] } {
  return buildOrbitRows(13, null, hasRing);
}
