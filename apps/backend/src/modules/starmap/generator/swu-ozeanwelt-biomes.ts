/**
 * Ozeanwelt - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * Nutzt dieselben Buchstaben wie Erdaehnlich (A fuer Cold, E fuer Mid/Hot),
 * aber mit stark wassergewichteten Parametern statt der Erdaehnlich-Standard-
 * gewichtung - kalibriert gegen die alte STU-O-Klasse (classId 205):
 *
 *   STU O (60 Felder): Landmassen 27, Berge 6, Baeume 9, Korallen 6, Seichtes Wasser 13
 *
 * Auftrag: "nur 1/3 der Berge von STU heranziehen, und zu Wasserflaechen geben"
 *   -> Berge 6 -> 2 (SWU-Felsplatte-Aequivalent), die Differenz (4) zusaetzlich
 *      zu Wasser. Umgesetzt als Gewichtsverschiebung in den A/E-Kaskaden:
 *      Fels-Anteil auf ca. 1/3 reduziert, Wasser-Anteil entsprechend erhoeht.
 *
 * Zonen: Cold=Packeis/Eisschollen (A+B, wie Erdaehnlich-Cold aber wasserlastiger),
 *        Mid=Korallen/Mangroven (E, sehr wasserlastig),
 *        Hot=Offenes Meer (E, noch wasserlastiger, kaum Land/Fels).
 */

import { SwuBiomGenerator, generateWithSeedGuarantee, scaleConfigForMoon, type SwuBiomSurfaceConfig } from './swu-biom-generator';
import { buildUndergroundConfig } from './swu-underground';
import type { SwuZoneSlot, SwuRotationType, SwuBodyFeature } from './swu-planet-archetypes.generator';
import {
  buildPolarPhases,
  buildSubpolarPhases,
  buildSnowHiddenTundraPhases,
  buildSnowRevealPhases,
  buildTropischPhases,
  SWU_POLAR_SEED_TILES,
  SWU_TROPISCH_SEED_TILES,
} from './swu-biome-letters';

const COLONY_WIDTH = 10;
const COLONY_HEIGHT = 6;

// ---------------------------------------------------------------------------
// Cold (A+B) - Schneedecke wie bei Erdaehnlich, aber Fels-Branch auf ca. 1/3
// reduziert (STU-Berge 6 -> 2), Differenz zu Wasser addiert (15-25 -> 26-34).
// ---------------------------------------------------------------------------
export const SWU_OZEANWELT_COLD_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'A550',
  phases: buildSnowRevealPhases('A550', [
    { hiddenField: 'A410', numMin: 26, numMax: 34, phases: buildPolarPhases('A410') },
    { hiddenField: 'B610', numMin: 9, numMax: 13, phases: buildSubpolarPhases('B610') },
    { hiddenField: 'B140', numMin: 3, numMax: 6, phases: buildSnowHiddenTundraPhases('B140') },
  ]),
};

// ---------------------------------------------------------------------------
// Mid (E, Korallen/Mangroven) - stark wassergewichtet, kaum Wald/Fels
// ---------------------------------------------------------------------------
export const SWU_OZEANWELT_MID_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'E110',
  phases: buildTropischPhases('E110', {
    regenwald: [2, 5],
    palmen: [1, 3],
    sumpf: [8, 14], // Mangroven-Anteil
    meer: [20, 30], // Korallen/Riff-Anteil, deutlich erhoeht
    fels: [0, 2], // ca. 1/3 des Erdaehnlich-Werts
    felsplatte: [5, 8], // freiliegende Felsplatten (E659): Bergbau ohne Untergrund-Forschung, da Wasserfelder erst spaet bergbaubar sind
    strand: [2, 8],
  }),
};

// ---------------------------------------------------------------------------
// Hot (E, Offenes Meer) - noch wasserlastiger als Mid
// ---------------------------------------------------------------------------
export const SWU_OZEANWELT_HOT_CONFIG: SwuBiomSurfaceConfig = {
  width: COLONY_WIDTH,
  height: COLONY_HEIGHT,
  baseField: 'E110',
  phases: buildTropischPhases('E110', {
    regenwald: [0, 2],
    palmen: [0, 2],
    sumpf: [2, 6],
    meer: [28, 38],
    fels: [0, 1],
    felsplatte: [4, 7], // siehe Mid
    strand: [2, 8],
  }),
};

/** Ozeanwelt hat in allen 3 Rotationsvarianten dieselben Zonen (kein Gebunden-Override in den Archetyp-Daten). */
export function getOzeanweltZoneConfig(zoneSlot: SwuZoneSlot): SwuBiomSurfaceConfig {
  if (zoneSlot === 1) return SWU_OZEANWELT_COLD_CONFIG;
  if (zoneSlot === 2) return SWU_OZEANWELT_MID_CONFIG;
  return SWU_OZEANWELT_HOT_CONFIG;
}

function getRequiredSeedTiles(zoneSlot: SwuZoneSlot): string[] {
  if (zoneSlot === 1) return SWU_POLAR_SEED_TILES;
  return SWU_TROPISCH_SEED_TILES;
}

const generator = new SwuBiomGenerator();

/** Generiert die 10x6-Kolonie-Oberflaeche fuer einen Ozeanwelt-Biom-Slot. */
export function generateOzeanweltColonySurface(
  zoneSlot: SwuZoneSlot,
  _rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const baseConfig = getOzeanweltZoneConfig(zoneSlot);
  const config = bodyFeature === 'moon' ? scaleConfigForMoon(baseConfig) : baseConfig;
  return generateWithSeedGuarantee(generator, config, seed, getRequiredSeedTiles(zoneSlot));
}


/**
 * UNTERGRUND (Platzhalter): alte STU-Nummernkreise, temporaer bis SWU eigene
 * Untergrund-Tiles bekommt - wird spaeter ausgetauscht.
 */
export function generateOzeanweltUntergrund(
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  seed: string,
  bodyFeature: SwuBodyFeature = 'base',
): string[][] {
  const surface = generateOzeanweltColonySurface(zoneSlot, rotation, seed, bodyFeature);
  const config = buildUndergroundConfig(
    'U401',
    { rockVariants: ['U6B1'], magmaMode: 'conditional' },
    surface,
    bodyFeature === 'moon',
  );
  return new SwuBiomGenerator().generate(config, seed);
}

import { buildOrbitRows } from './swu-orbit';

/** Orbit-Reihen (oben/unten) fuer diesen Archetyp - hasRing kommt vom bodyFeature der Instanz. */
export function generateOzeanweltOrbit(hasRing: boolean): { lower: string[]; upper: string[] } {
  return buildOrbitRows(2, null, hasRing);
}
