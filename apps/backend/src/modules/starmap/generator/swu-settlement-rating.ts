/**
 * SWU Besiedlungs-Bedingungen: Perfekt / Gut / Schwierig / Herausfordernd
 * ------------------------------------------------------------------
 * Reines Formel-Modul. Vier Faktoren, je 0-2 Punkte (Summe 0-8):
 *
 *   1. Zugaenglichkeit der Ressourcen: wie gut deckt das Bergbau-Angebot der
 *      Zone die Erzquellen Q (Phrik + Kyber + Sondererz) ab? Gewichtet:
 *      direkt bergbaubare Oberflaechenfelder (X) voll, geoengineerbare
 *      Felsplatten (Y) halb, Wasser-/Untergrundfelder (Z) zu einem Viertel
 *      (brauchen Forschung bzw. sind teurer). Quote = (X + Y/2 + Z/4) / Q.
 *   2. Atmosphaere vorhanden (Ja/Nein): normale oder duenne Atmosphaere = Ja;
 *      keine, toxische oder Gasriesen-Atmosphaere = Nein.
 *   3. Solareintrag (TJ, siehe swu-solar.ts).
 *   4. Deuterium (Rohstoff 1505, im Spiel "Hypermaterie-Vorkommen"): Menge der
 *      Quellen der Zone. Deuterium wird ueber Synthesizer gewonnen, ist also
 *      nicht an bestimmte Felder gebunden - bewertet wird die Menge.
 *
 * Schwellen sind Balancing-Werte (Konstanten unten), nicht aus Daten abgeleitet.
 */

import type { SwuOrbitAtmosphereType } from './swu-orbit';

export type SwuSettlementRating = 'PERFECT' | 'GOOD' | 'DIFFICULT' | 'CHALLENGING';

export const SWU_SETTLEMENT_RATING_LABELS: Record<SwuSettlementRating, string> = {
  PERFECT: 'Perfekt',
  GOOD: 'Gut',
  DIFFICULT: 'Schwierig',
  CHALLENGING: 'Herausfordernd',
};

/** Quote (X + Y/2 + Z/4) / Q: ab diesem Wert 2 bzw. 1 Punkt. */
export const ACCESS_RATIO_FULL = 0.75;
export const ACCESS_RATIO_PARTIAL = 0.4;
/** Solarertrag in TJ: ab diesem Wert 2 bzw. 1 Punkt (Referenz-Basis ist 1600 TJ). */
export const SOLAR_TJ_FULL = 1600;
export const SOLAR_TJ_PARTIAL = 800;
/** Deuterium-Quellen (Planet): ab diesem Wert 2 bzw. 1 Punkt; Monde haben die halbe Schwelle. */
export const DEUTERIUM_SOURCES_FULL = 12;
export const DEUTERIUM_SOURCES_PARTIAL = 6;
/** Gesamtpunkte (0-8) ab denen Perfekt / Gut / Schwierig gilt, darunter Herausfordernd. */
export const RATING_MIN_POINTS: Record<Exclude<SwuSettlementRating, 'CHALLENGING'>, number> = {
  PERFECT: 7,
  GOOD: 5,
  DIFFICULT: 3,
};

/** Bewachsene/bedeckte Felsplatten und Schneefelder ueber Fels: per Geoengineering zur bergbaubaren Felsplatte freilegbar. */
export const SWU_GEOENGINEERABLE_ROCK_TILES = new Set([
  'B610', 'B630', 'C630', 'D620', 'D630', 'D670', 'E630', 'I630', 'J610', 'J617', 'J630', 'K610', 'K630',
]);

export interface SwuMiningFields {
  /** Oberflaeche, direkt bergbaubar. */
  x: number;
  /** Oberflaeche, geoengineerbar (bewachsene/bedeckte Felsplatte). */
  y: number;
  /** Wasser-/Untergrundfelder (Tiefsee/Untergrund-Bergbau). */
  z: number;
}

export function countSwuMiningFields(
  surface: string[][],
  untergrund: string[][],
  classify: (tile: string) => string[],
): SwuMiningFields {
  const fields: SwuMiningFields = { x: 0, y: 0, z: 0 };
  const isDirect = (cats: string[]) => cats.includes('bergbau') || cats.includes('bergbau_spezial');
  const isDeep = (cats: string[]) => cats.includes('bergbau_tiefsee') || cats.includes('bergbau_untergrund');
  for (const tile of surface.flat()) {
    const cats = classify(tile);
    if (isDirect(cats)) fields.x += 1;
    else if (SWU_GEOENGINEERABLE_ROCK_TILES.has(tile)) fields.y += 1;
    else if (isDeep(cats)) fields.z += 1;
  }
  for (const tile of untergrund.flat()) {
    if (isDeep(classify(tile))) fields.z += 1;
  }
  return fields;
}

export interface SwuSettlementAssessment {
  rating: SwuSettlementRating;
  label: string;
  /** 0-8 */
  score: number;
  factors: {
    resources: { points: number; oreSources: number; mining: SwuMiningFields; ratio: number };
    atmosphere: { points: number; present: boolean };
    solar: { points: number; outputTJ: number | null };
    deuterium: { points: number; sources: number };
  };
}

export function hasBreathableAtmosphere(atmosphere: SwuOrbitAtmosphereType): boolean {
  return atmosphere === 'A' || atmosphere === 'C';
}

function pointsFor(value: number, full: number, partial: number): number {
  return value >= full ? 2 : value >= partial ? 1 : 0;
}

export function rateSwuSettlement(input: {
  mining: SwuMiningFields;
  /** Q: Phrik + Kyber + Sondererz (Quellen). */
  oreSources: number;
  atmosphere: SwuOrbitAtmosphereType;
  solarOutputTJ: number | null;
  /** Deuterium-Quellen der Zone (0 = keine). */
  deuteriumSources: number;
  isMoon?: boolean;
}): SwuSettlementAssessment {
  const { mining, oreSources } = input;
  const weighted = mining.x + mining.y / 2 + mining.z / 4;
  const ratio = oreSources > 0 ? weighted / oreSources : 1;
  const resources = pointsFor(ratio, ACCESS_RATIO_FULL, ACCESS_RATIO_PARTIAL);
  const present = hasBreathableAtmosphere(input.atmosphere);
  const atmosphere = present ? 2 : 0;
  const solar = pointsFor(input.solarOutputTJ ?? 0, SOLAR_TJ_FULL, SOLAR_TJ_PARTIAL);
  const deuteriumScale = input.isMoon ? 0.5 : 1;
  const deuterium = pointsFor(
    input.deuteriumSources,
    DEUTERIUM_SOURCES_FULL * deuteriumScale,
    DEUTERIUM_SOURCES_PARTIAL * deuteriumScale,
  );
  const score = resources + atmosphere + solar + deuterium;
  const rating: SwuSettlementRating =
    score >= RATING_MIN_POINTS.PERFECT
      ? 'PERFECT'
      : score >= RATING_MIN_POINTS.GOOD
        ? 'GOOD'
        : score >= RATING_MIN_POINTS.DIFFICULT
          ? 'DIFFICULT'
          : 'CHALLENGING';
  return {
    rating,
    label: SWU_SETTLEMENT_RATING_LABELS[rating],
    score,
    factors: {
      resources: { points: resources, oreSources, mining, ratio: Math.round(ratio * 100) / 100 },
      atmosphere: { points: atmosphere, present },
      solar: { points: solar, outputTJ: input.solarOutputTJ },
      deuterium: { points: deuterium, sources: input.deuteriumSources },
    },
  };
}
