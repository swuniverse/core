/**
 * Giftwelt - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * Alle 3 Zonen identisch (F, Vulkanisch) - Archetyp-Daten definieren nur Mid
 * ("Erstarrte Lava/Schwefelseen"), Cold/Hot sind None/None. Giftwelt ist
 * thematisch "toxisch/schwefelhaltig", nicht "aktiv-vulkanisch" - deshalb
 * KEINE Lavastrom-Kette, dafuer starke Schwefel-Gewichtung.
 */

import { SwuBiomGenerator, scaleConfigForMoon, type SwuBiomSurfaceConfig } from './swu-biom-generator';
import { buildUndergroundConfig } from './swu-underground';
import type { SwuZoneSlot, SwuRotationType, SwuBodyFeature } from './swu-planet-archetypes.generator';
import { buildVulkanischDecorationPhases, SWU_VULKANISCH_SEED_TILES } from './swu-biome-letters';

const COLONY_WIDTH = 10;
const COLONY_HEIGHT = 6;

export const SWU_GIFTWELT_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'F710',
  phases: buildVulkanischDecorationPhases('F710', {
    vulkane: [0, 3],
    erstarrt: [14, 22],
    schnee: [0, 2],
    schwefel: [10, 18], // Kernmerkmal: Schwefelseen/-ablagerungen
    asche: [6, 12],
    erloschen: [1, 4],
  }),
};

/** Alle 3 Zonen identisch - siehe Kopfkommentar. */
export function getGiftweltZoneConfig(_zoneSlot: SwuZoneSlot, bodyFeature: SwuBodyFeature = 'base'): SwuBiomSurfaceConfig {
  return bodyFeature === 'moon' ? scaleConfigForMoon(SWU_GIFTWELT_CONFIG) : SWU_GIFTWELT_CONFIG;
}

const generator = new SwuBiomGenerator();
const wantedSeed = new Set(SWU_VULKANISCH_SEED_TILES);

export function generateGiftweltColonySurface(
  zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
  maxAttempts = 30,
): string[][] {
  const config = getGiftweltZoneConfig(zoneSlot, bodyFeature);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = attempt === 0 ? seed : `${seed}-retry${attempt}`;
    const grid = generator.generate(config, attemptSeed);
    if (grid.some((row) => row.some((cell) => wantedSeed.has(cell)))) return grid;
  }
  console.warn(`[swu-giftwelt-biomes] Konnte nach ${maxAttempts} Versuchen keine gueltige Oberflaeche erzeugen (${bodyFeature}, Seed: ${seed}).`);
  return generator.generate(config, seed);
}


/**
 * UNTERGRUND (Platzhalter): alte STU-Nummernkreise, temporaer bis SWU eigene
 * Untergrund-Tiles bekommt - wird spaeter ausgetauscht.
 */
export function generateGiftweltUntergrund(
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
export function generateGiftweltOrbit(hasRing: boolean): { lower: string[]; upper: string[] } {
  return buildOrbitRows(14, null, hasRing);
}
