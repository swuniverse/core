/**
 * Erdaehnlich - Kolonie-Oberflaechen-Generator (6 Biome, volle Varianz)
 * ------------------------------------------------------------------
 * Nutzt jetzt die gemeinsame Buchstaben-Bibliothek (swu-biome-letters.ts)
 * statt duplizierter Phasen-Ketten - siehe dort fuer die Buchstaben-Details.
 *
 * WICHTIG - Strukturkorrektur ggue. swu-biom-builder.ts v1: Die 60 Felder sind
 * hier NICHT ein Split des 6x10-Orbit-Platzierungsgrids (das bleibt fuer "wo
 * liegt der Planet auf der Sternenkarte"), sondern die eigenstaendige 10x6-
 * KOLONIE-OBERFLAECHE, die entsteht, wenn man IN dieser Zone tatsaechlich
 * landet - 1:1 analog dazu, wie eine einzelne STU-classId eine eigene 60-Zellen-
 * Oberflaeche hat.
 *
 * Erdaehnlich hat 6 Biom-Slots (3 Rotierend + 3 Gebunden), von denen sich aber
 * nur 4 tatsaechlich unterscheiden (Cold und Mid sind bei Rotierend/Gebunden
 * identisch, nur Hot unterscheidet sich: Regenwald vs. Aktive Vulkane):
 *
 *   Cold  (Rotierend UND Gebunden): Eis/Tundra       -> Buchstabe A+B (Arktisch)
 *   Mid   (Rotierend UND Gebunden): Gemaess. Wald     -> Buchstabe C (Gemaessigt)
 *   Hot   Rotierend:                Regenwald         -> Buchstabe E (Tropisch)
 *   Hot   Gebunden:                 Aktive Vulkane    -> Buchstabe F (Vulkanisch)
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
  buildPolarPhases,
  buildSubpolarPhases,
  buildSnowHiddenTundraPhases,
  buildSnowRevealPhases,
  buildGemaessigtPhases,
  buildTropischPhases,
  buildLavaFlowChainPhases,
  buildLavaFlowChainPhasesMoon,
  pickLavaChainDirectionD,
  buildVulkanischDecorationPhases,
  SWU_F73_TILE_CODES,
  SWU_LAVA_STREAM_TILES_PLANET,
  SWU_LAVA_STREAM_TILES_MOON,
  SWU_POLAR_SEED_TILES,
  SWU_GEMAESSIGT_SEED_TILES,
  SWU_TROPISCH_SEED_TILES,
  SWU_VULKANISCH_SEED_TILES,
} from './swu-biome-letters';

const COLONY_WIDTH = 10;
const COLONY_HEIGHT = 6;

// ---------------------------------------------------------------------------
// Cold (A+B, Arktisch) - Rotierend UND Gebunden identisch
// ---------------------------------------------------------------------------
export const SWU_ERDAEHNLICH_COLD_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'A550', // Schneefeld auf Wasser - selbst Bebaubar=Ja, Seed=Ja
  phases: buildSnowRevealPhases('A550', [
    { hiddenField: 'A410', numMin: 15, numMax: 25, phases: buildPolarPhases('A410') },
    { hiddenField: 'B610', numMin: 11, numMax: 19, phases: buildSubpolarPhases('B610') },
    { hiddenField: 'B140', numMin: 10, numMax: 18, phases: buildSnowHiddenTundraPhases('B140') },
  ]),
};

// ---------------------------------------------------------------------------
// Mid (C, Gemaessigt) - Rotierend UND Gebunden identisch
// ---------------------------------------------------------------------------
export const SWU_ERDAEHNLICH_MID_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'C110', // Gemaessigte Wiese
  phases: buildGemaessigtPhases('C110'),
};

// ---------------------------------------------------------------------------
// Hot Rotierend (E, Tropisch)
// ---------------------------------------------------------------------------
export const SWU_ERDAEHNLICH_HOT_ROTATING_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'E110', // Tropische Wiese
  phases: buildTropischPhases('E110'),
};

// ---------------------------------------------------------------------------
// Hot Gebunden (F, Vulkanisch)
// ---------------------------------------------------------------------------
/** Baut die Hot-Gebunden-Config; useDirectionD waehlt zwischen Kette-C-Varianten (F74C vs F74D). */
export function buildErdaehnlichHotTidalLockedConfig(useDirectionD = false, bodyFeature: SwuBodyFeature = 'base'): SwuBiomSurfaceConfig {
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
    baseField: 'F710', // Aktives Lavafeld
    phases: [...chainPhases, ...decorationPhases],
  };
}

/** Liefert die passende Kolonie-Oberflaechen-Config fuer einen Erdaehnlich-Biom-Slot. */
export function getErdaehnlichZoneConfig(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed = 'default',
  bodyFeature: SwuBodyFeature = 'base',
): SwuBiomSurfaceConfig {
  if (zoneSlot === 3 && rotation === 'tidal-locked') {
    return buildErdaehnlichHotTidalLockedConfig(pickLavaChainDirectionD(seed), bodyFeature);
  }
  const baseConfig =
    zoneSlot === 1 ? SWU_ERDAEHNLICH_COLD_CONFIG : zoneSlot === 2 ? SWU_ERDAEHNLICH_MID_CONFIG : SWU_ERDAEHNLICH_HOT_ROTATING_CONFIG;
  return bodyFeature === 'moon' ? scaleConfigForMoon(baseConfig) : baseConfig;
}

const generator = new SwuBiomGenerator();
const F73_TILE_SET = new Set(SWU_F73_TILE_CODES);

function countLavaStreamTiles(grid: string[][]): number {
  let count = 0;
  for (const row of grid) for (const cell of row) if (F73_TILE_SET.has(cell)) count++;
  return count;
}

function gridContainsAny(grid: string[][], tileCodes: string[]): boolean {
  const wanted = new Set(tileCodes);
  return grid.some((row) => row.some((cell) => wanted.has(cell)));
}

/**
 * Bestaetigte Seed-Tile(s) je Biom-Slot - mindestens EINES davon muss nach der
 * Generierung tatsaechlich auf der Oberflaeche vorhanden sein, sonst waere die
 * Kolonie nicht gruendbar.
 */
function getRequiredSeedTiles(zoneSlot: SwuZoneSlot, rotation: SwuRotationType): string[] {
  if (zoneSlot === 1) return SWU_POLAR_SEED_TILES;
  if (zoneSlot === 2) return SWU_GEMAESSIGT_SEED_TILES;
  return rotation === 'rotating' ? SWU_TROPISCH_SEED_TILES : SWU_VULKANISCH_SEED_TILES;
}

/**
 * Generiert eine Erdaehnlich-Kolonieoberflaeche und wiederholt bei Bedarf mit
 * einem abgewandelten Seed, bis (a) mindestens ein bestaetigtes Seed-Tile
 * vorhanden ist und (b) bei der Vulkanisch-Zone zusaetzlich exakt
 * SWU_LAVA_STREAM_TILES_PLANET F73-Felder vorliegen.
 *
 * Noetig wegen der Mengen-Streuung (numMin/numMax): eine zufaellig niedrige
 * Wuerfelung FRUEHER in einer Kaskade kann dem LETZTEN Schritt das
 * Ausgangsmaterial entziehen. "Erzeugen + pruefen + ggf. neu wuerfeln" ist
 * robuster als der Versuch, die Kaskade analytisch narrensicher zu machen.
 */
function generateWithGuaranteedSeed(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
  maxAttempts = 30,
): string[][] {
  const config = getErdaehnlichZoneConfig(zoneSlot, rotation, seed, bodyFeature);
  const requiredSeedTiles = getRequiredSeedTiles(zoneSlot, rotation);
  const isVulkanisch = zoneSlot === 3 && rotation === 'tidal-locked';
  const lavaTarget = bodyFeature === 'moon' ? SWU_LAVA_STREAM_TILES_MOON : SWU_LAVA_STREAM_TILES_PLANET;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = attempt === 0 ? seed : `${seed}-retry${attempt}`;
    const grid = generator.generate(config, attemptSeed);
    const seedOk = gridContainsAny(grid, requiredSeedTiles);
    const lavaOk = !isVulkanisch || countLavaStreamTiles(grid) === lavaTarget;
    if (seedOk && lavaOk) return grid;
  }
  console.warn(
    `[swu-erdaehnlich-biomes] Konnte nach ${maxAttempts} Versuchen keine gueltige Oberflaeche ` +
      `erzeugen (Zone ${zoneSlot}, ${rotation}, ${bodyFeature}, Seed: ${seed}). Liefere letzten Versuch trotzdem aus.`,
  );
  return generator.generate(config, seed);
}

/** Generiert die Kolonie-Oberflaeche fuer einen Erdaehnlich-Biom-Slot (10x6 Planet, 7x5 Mond). */
export function generateErdaehnlichColonySurface(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  return generateWithGuaranteedSeed(zoneSlot, rotation, seed, bodyFeature);
}


/**
 * UNTERGRUND (Platzhalter): alte STU-Nummernkreise, temporaer bis SWU eigene
 * Untergrund-Tiles bekommt - wird spaeter ausgetauscht.
 */
/**
 * UNTERGRUND: Naehrstoffreich (U102, Erdaehnlich ist gemaessigt/gruen-dominant),
 * Fels-Variante Gemaessigt (U6C1/U6C2), Magma nur konditional (falls die
 * Oberflaeche Geysir/Thermalquelle zeigt - Erdaehnlich nutzt B in der Cold-
 * Zone, dort koennen B320/B330 vorkommen).
 */
export function generateErdaehnlichUntergrund(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const surface = generateErdaehnlichColonySurface(zoneSlot, rotation, seed, bodyFeature);
  const config = buildUndergroundConfig(
    'U102',
    { rockVariants: ['U6C1', 'U6C2'], magmaMode: 'conditional' },
    surface,
    bodyFeature === 'moon',
  );
  return new SwuBiomGenerator().generate(config, seed);
}

import { buildOrbitRows } from './swu-orbit';

/** Orbit-Reihen (oben/unten) fuer diesen Archetyp - hasRing kommt vom bodyFeature der Instanz. */
export function generateErdaehnlichOrbit(hasRing: boolean): { lower: string[]; upper: string[] } {
  return buildOrbitRows(1, null, hasRing);
}
