/**
 * SWU Biom-Generator - eigenstaendiges Skript (Test-Stand: 1 Biom)
 * ------------------------------------------------------------------
 * Die eigentliche Zellwachstums-/Gewichtungs-Engine ist 1:1 aus dem alten
 * STU-Generator uebernommen (siehe apps/backend/.../stu-planet-surface.generator.ts,
 * Klasse M / classId 201, Phase "Landmassen"). Zwei Unterschiede zum Original:
 *
 *   1. Feld-Typen sind hier STRINGS ("BIOM001") statt feste STU-Nummern (101, 201, ...),
 *      damit spaeter echte Biom-Codes (BIOM001, BIOM002, ...) direkt reinpassen.
 *   2. Es gibt fuer diesen Test nur EIN Ziel-Biom ("BIOM001"), erzeugt mit exakt den
 *      Parametern der M-Klasse-"Landmassen"-Phase (mode: 'normal', num: 37,
 *      fragmentation: 8) - das war dort die Phase, die aus dem Ozean-Basisfeld (201)
 *      die ersten Landmassen (101) herausschneidet. Die M-Klasse-Karte ist zufaellig
 *      genauso gross wie unsere SWU-Karte (10x6 = 60 Zellen = 6x10), die Parameter
 *      sind also 1:1 vergleichbar, ohne sie umzurechnen.
 *
 * Sobald das Muster passt, kommen hier weitere Phasen/Biome dazu (analog zu M's
 * Waegen/Baeume/Wueste/Nadelwald-Kette) - dieses Skript ist bewusst der Ort dafuer,
 * GETRENNT von swu-planet-archetypes.generator.ts (das nur noch Stammdaten haelt).
 */

import { SeededRNG } from './seeded-rng';

// ---------------------------------------------------------------------------
// Phasen-Engine (generalisiert aus stu-planet-surface.generator.ts)
// ---------------------------------------------------------------------------

export interface SwuBiomPhaseConfig {
  mode: string;
  description: string;
  num: number;
  /** Optional: zusammen mit numMax gesetzt, wird die tatsaechliche Menge einmal
   *  pro Generierung aus [numMin, numMax] gewuerfelt (deterministisch aus dem
   *  Seed) statt der festen 'num' zu folgen. Kein STU-Vorbild dafuer - STU
   *  nutzt ausschliesslich feste num-Werte, unterschiedliche Mengen kommen dort
   *  nur ueber unterschiedliche classId-Varianten (Planet/Mond/Ring) zustande. */
  numMin?: number;
  numMax?: number;
  from: string[];
  to: string[];
  adjacent: string[];
  noadjacent: string[];
  noadjacentlimit: number;
  fragmentation: number;
}

export interface SwuBiomSurfaceConfig {
  width: number;
  height: number;
  baseField: string;
  phases: SwuBiomPhaseConfig[];
}

interface WeightedCell {
  x: number;
  y: number;
  baseWeight: number;
  weight: number;
}

export function biomPhase(input: {
  mode: string;
  description?: string;
  num?: number;
  numMin?: number;
  numMax?: number;
  from?: string[] | string;
  to?: string[] | string;
  adjacent?: string[] | string;
  noadjacent?: string[] | string;
  noadjacentlimit?: number;
  fragmentation?: number;
}): SwuBiomPhaseConfig {
  const toArray = (value: string[] | string | undefined): string[] =>
    Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return {
    mode: input.mode,
    description: input.description ?? '',
    num: input.num ?? 0,
    numMin: input.numMin,
    numMax: input.numMax,
    from: toArray(input.from),
    to: toArray(input.to),
    adjacent: toArray(input.adjacent),
    noadjacent: toArray(input.noadjacent),
    noadjacentlimit: input.noadjacentlimit ?? 0,
    fragmentation: input.fragmentation ?? 0,
  };
}

export class SwuBiomGenerator {
  /**
   * Ermittelt moegliche Zielzustaende fuer eine Zelle mit aktuellem Wert.
   * - from.length === 1: EINE Quelle kann zu JEDEM Wert in 'to' wechseln
   *   (gleichverteilt zufaellig) - der Normalfall fuer "ein Basiszustand,
   *   mehrere moegliche Auspraegungen" (z.B. Mischwald aus 3 Waldtypen).
   * - from.length > 1: index-gepaart (from[i] -> to[i]) - fuer den selteneren
   *   Fall mehrerer UNABHAENGIGER Quell/Ziel-Paare in einer Phase.
   */
  private getPossibleTargets(current: string, phase: SwuBiomPhaseConfig): string[] {
    if (phase.from.length === 1) {
      return current === phase.from[0] ? phase.to : [];
    }
    return phase.from.flatMap((fromType, index) => (current === fromType ? [phase.to[index]] : []));
  }

  /**
   * Loest die tatsaechlich zu verwendende Menge fuer eine Phase auf: bei
   * gesetztem numMin/numMax wird EINMAL pro Phasenaufruf aus der Spanne
   * gewuerfelt (deterministisch ueber die uebergebene RNG-Instanz), sonst
   * gilt die feste 'num'.
   */
  private resolvePhaseNum(phase: SwuBiomPhaseConfig, rng: SeededRNG): number {
    if (phase.numMin != null && phase.numMax != null) {
      return rng.nextInt(phase.numMin, phase.numMax);
    }
    return phase.num;
  }

  /** Erzeugt das Grid als string[][] (fieldArray[y][x]). */
  generate(config: SwuBiomSurfaceConfig, seed: string): string[][] {
    const rng = new SeededRNG(seed);
    return this.doPhases(config.width, config.height, config.baseField, config.phases, rng);
  }

  /**
   * Wendet EINE Phase direkt auf ein bestehendes Grid an (in place), statt ein
   * neues Grid aus einem baseField aufzubauen. Nuetzlich, wenn das Grid schon
   * aus mehreren Zonen mit unterschiedlichen Basis-Tiles zusammengesetzt ist
   * (siehe swu-biom-builder.ts) - Zellen mit anderem Wert als phase.from werden
   * schlicht nicht getroffen, beeinflussen aber ueber Adjazenz-Gewichtung mit.
   */
  applyPhaseToGrid(fieldArray: string[][], phase: SwuBiomPhaseConfig, seed: string): void {
    const rng = new SeededRNG(seed);
    const resolvedNum = this.resolvePhaseNum(phase, rng);
    for (let i = 0; i < resolvedNum; i++) {
      const weighting = this.getWeightingList(fieldArray, phase);
      if (weighting.length === 0) break;
      const cell = this.weightedDraw(weighting, phase.fragmentation, rng);
      const current = fieldArray[cell.y][cell.x];
      const possibleTargets = this.getPossibleTargets(current, phase);
      if (possibleTargets.length > 0) {
        fieldArray[cell.y][cell.x] = rng.choice(possibleTargets);
      }
    }
  }

  private doPhases(
    width: number,
    height: number,
    baseField: string,
    phases: SwuBiomPhaseConfig[],
    rng: SeededRNG,
  ): string[][] {
    const fieldArray = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => baseField),
    );

    for (const phase of phases) {
      const resolvedNum = this.resolvePhaseNum(phase, rng);
      for (let i = 0; i < resolvedNum; i++) {
        const weighting = this.getWeightingList(fieldArray, phase);
        if (weighting.length === 0) break;
        const cell = this.weightedDraw(weighting, phase.fragmentation, rng);
        const current = fieldArray[cell.y][cell.x];
        const possibleTargets = this.getPossibleTargets(current, phase);
        if (possibleTargets.length > 0) {
          fieldArray[cell.y][cell.x] = rng.choice(possibleTargets);
        }
      }
    }

    return fieldArray;
  }

  private weightedDraw(cells: WeightedCell[], fragmentation: number, rng: SeededRNG): WeightedCell {
    return cells
      .map((cell) => ({
        ...cell,
        weight: rng.nextInt(1, Math.ceil(cell.baseWeight + fragmentation)),
      }))
      .sort((a, b) => b.weight - a.weight || rng.nextInt(-1, 1))[0];
  }

  private getWeightingList(fieldArray: string[][], phase: SwuBiomPhaseConfig): WeightedCell[] {
    const height = fieldArray.length;
    const width = fieldArray[0]?.length ?? 0;
    const result: WeightedCell[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!phase.from.includes(fieldArray[y][x])) continue;

        let baseWeight = 1;
        if (
          (phase.mode === 'polar' || phase.mode === 'strict polar') &&
          (y === 0 || y === height - 1)
        ) {
          baseWeight += 1;
        }
        if (phase.mode === 'polar seeding north' && y === 0) baseWeight += 2;
        if (phase.mode === 'polar seeding south' && y === height - 1) baseWeight += 2;
        if (
          phase.mode === 'equatorial' &&
          ((y === 2 && height === 5) || ((y === 2 || y === 3) && height === 6))
        ) {
          baseWeight += 1;
        }

        if (
          !['nocluster', 'forced adjacency', 'forced rim', 'polar seeding north', 'polar seeding south'].includes(
            phase.mode,
          )
        ) {
          baseWeight += this.countAdjacentWeight(fieldArray, x, y, phase.to);
        }

        if (phase.adjacent.length > 0) {
          baseWeight += this.countAdjacentWeight(fieldArray, x, y, phase.adjacent);
        }

        if (phase.noadjacent.length > 0) {
          for (const terrain of phase.noadjacent) {
            if (this.countAdjacentWeight(fieldArray, x, y, [terrain]) > phase.noadjacentlimit) {
              baseWeight = 0;
            }
          }
        }

        if (phase.mode === 'forced adjacency' && baseWeight < 2) baseWeight = 0;
        if (phase.mode === 'forced rim' && baseWeight < 1.5) baseWeight = 0;
        if (phase.mode === 'polar' && y > 1 && y < height - 2) baseWeight = 0;
        if (phase.mode === 'strict polar' && y > 0 && y < height - 1) baseWeight = 0;
        if (phase.mode === 'polar seeding north' && y > 1) baseWeight = 0;
        if (phase.mode === 'polar seeding south' && y < height - 2) baseWeight = 0;
        if (phase.mode === 'equatorial' && height === 6 && (y < 2 || y > 3)) baseWeight = 0;
        if (phase.mode === 'equatorial' && height === 5 && (y < 2 || y > 3)) baseWeight = 0;

        // Gerichtete Platzierung fuer Ketten (z.B. Lavastroeme): die Zelle darf NUR
        // gesetzt werden, wenn phase.adjacent[0] EXAKT auf der genannten Seite liegt -
        // 'right'/'below' 1:1 aus dem alten STU-Generator uebernommen, 'left'/'above'
        // als symmetrische Ergaenzung (im STU-Original nicht gebraucht, aber fuer
        // 4-Richtungs-Tiles wie unsere F73-Lavastrom-Serie notwendig).
        if (
          phase.mode === 'right' &&
          (phase.adjacent.length === 0 || !this.isFieldEqual(fieldArray, x - 1, y, phase.adjacent[0]))
        ) {
          baseWeight = 0;
        }
        if (
          phase.mode === 'left' &&
          (phase.adjacent.length === 0 || !this.isFieldEqual(fieldArray, x + 1, y, phase.adjacent[0]))
        ) {
          baseWeight = 0;
        }
        if (
          phase.mode === 'below' &&
          (phase.adjacent.length === 0 || !this.isFieldEqual(fieldArray, x, y - 1, phase.adjacent[0]))
        ) {
          baseWeight = 0;
        }
        if (
          phase.mode === 'above' &&
          (phase.adjacent.length === 0 || !this.isFieldEqual(fieldArray, x, y + 1, phase.adjacent[0]))
        ) {
          baseWeight = 0;
        }

        if (baseWeight > 0) result.push({ x, y, baseWeight, weight: 0 });
      }
    }

    return result;
  }

  private countAdjacentWeight(fieldArray: string[][], x: number, y: number, terrainTypes: string[]): number {
    let weight = 0;
    for (const terrain of terrainTypes) {
      if (this.isFieldEqual(fieldArray, x - 1, y, terrain)) weight += 1;
      if (this.isFieldEqual(fieldArray, x + 1, y, terrain)) weight += 1;
      if (this.isFieldEqual(fieldArray, x, y - 1, terrain)) weight += 1;
      if (this.isFieldEqual(fieldArray, x, y + 1, terrain)) weight += 1;
      if (this.isFieldEqual(fieldArray, x - 1, y - 1, terrain)) weight += 0.5;
      if (this.isFieldEqual(fieldArray, x + 1, y + 1, terrain)) weight += 0.5;
      if (this.isFieldEqual(fieldArray, x + 1, y - 1, terrain)) weight += 0.5;
      if (this.isFieldEqual(fieldArray, x - 1, y + 1, terrain)) weight += 0.5;
    }
    return weight;
  }

  private isFieldEqual(fieldArray: string[][], x: number, y: number, terrain: string): boolean {
    return (
      y >= 0 && y < fieldArray.length && x >= 0 && x < fieldArray[y].length && fieldArray[y][x] === terrain
    );
  }
}

export const swuBiomGenerator = new SwuBiomGenerator();

// ---------------------------------------------------------------------------
// Testbiom BIOM001
// ---------------------------------------------------------------------------
// Basisfeld 'EMPTY' entspricht dem M-Klasse-Ozean (201) - hier ist es einfach
// "noch kein Biom zugewiesen". Die Phase selbst ist 1:1 die M-Klasse-"Landmassen"-
// Phase (mode 'normal', num 37, fragmentation 8) - nur das Ziel heisst jetzt
// 'BIOM001' statt 101. Grid ist 6x10 = 60 Zellen, exakt wie M's 10x6 = 60.
export const SWU_TEST_BIOM_SURFACE_CONFIG: SwuBiomSurfaceConfig = {
  width: 6,
  height: 10,
  baseField: 'EMPTY',
  phases: [
    biomPhase({
      mode: 'normal',
      description: 'Testbiom BIOM001 (Referenz: M-Klasse Phase "Landmassen")',
      num: 37,
      from: ['EMPTY'],
      to: ['BIOM001'],
      fragmentation: 8,
    }),
  ],
};

// ---------------------------------------------------------------------------
// Debug-Hilfsmittel: Grid als ASCII ausgeben + Verteilung zaehlen
// ---------------------------------------------------------------------------
export function printSwuBiomGrid(grid: string[][]): void {
  for (const row of grid) {
    console.log(row.map((cell) => (cell === 'EMPTY' ? '.' : cell.replace('BIOM', 'B'))).join(' '));
  }
}

export function countSwuBiomFields(grid: string[][]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of grid) {
    for (const cell of row) {
      counts[cell] = (counts[cell] ?? 0) + 1;
    }
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Gemeinsame Seed-Garantie: generieren + pruefen + bei Bedarf neu wuerfeln
// ---------------------------------------------------------------------------
/**
 * Generiert eine Oberflaeche und wiederholt mit abgewandeltem Seed, bis
 * mindestens eines der requiredSeedTiles tatsaechlich vorkommt (und optional
 * eine zusaetzliche Struktur-Pruefung erfuellt ist, z.B. Lavastrom-Anzahl oder
 * 2x2-Feature-Intaktheit). Zentralisiert aus swu-erdaehnlich-biomes.ts, damit
 * jede neue Archetyp-Datei dieselbe Absicherung ohne Duplizierung bekommt.
 */
export function generateWithSeedGuarantee(
  generator: SwuBiomGenerator,
  config: SwuBiomSurfaceConfig,
  seed: string,
  requiredSeedTiles: string[],
  extraCheck?: (grid: string[][]) => boolean,
  maxAttempts = 30,
): string[][] {
  const wanted = new Set(requiredSeedTiles);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = attempt === 0 ? seed : `${seed}-retry${attempt}`;
    const grid = generator.generate(config, attemptSeed);
    const seedOk = grid.some((row) => row.some((cell) => wanted.has(cell)));
    const extraOk = !extraCheck || extraCheck(grid);
    if (seedOk && extraOk) return grid;
  }
  console.warn(
    `[swu-biom-generator] Konnte nach ${maxAttempts} Versuchen keine gueltige Oberflaeche erzeugen (Seed: ${seed}). Liefere letzten Versuch trotzdem aus.`,
  );
  return generator.generate(config, seed);
}

// ---------------------------------------------------------------------------
// Untergrund-Platzhalter (alte STU-Nummernkreise, temporaer bis SWU eigene
// Untergrund-Tiles bekommt - siehe Team-Absprache "wir tauschen die spaeter")
// ---------------------------------------------------------------------------
export interface SwuLegacyUndergroundTarget {
  to: string;
  num: number;
}

/** Baut eine einfache Untergrund-Config aus alten STU-Feldnummern (als Strings). */
export function buildLegacyUndergroundConfig(
  baseField: string,
  targets: SwuLegacyUndergroundTarget[],
  width = 10,
  height = 6,
): SwuBiomSurfaceConfig {
  return {
    width,
    height,
    baseField,
    phases: targets.map((t) =>
      biomPhase({ mode: 'normal', description: `Untergrund (Legacy-Platzhalter) -> ${t.to}`, num: t.num, from: baseField, to: t.to, fragmentation: 8 }),
    ),
  };
}

/** Generiert eine Untergrund-Oberflaeche aus alten STU-Feldnummern. */
export function generateLegacyUnderground(
  baseField: string,
  targets: SwuLegacyUndergroundTarget[],
  seed: string,
  width = 10,
  height = 6,
): string[][] {
  const generator = new SwuBiomGenerator();
  return generator.generate(buildLegacyUndergroundConfig(baseField, targets, width, height), seed);
}

// ---------------------------------------------------------------------------
// Mond-Skalierung: dekorative Phasen proportional verkleinern
// ---------------------------------------------------------------------------
/**
 * Skaliert numMin/numMax (und num) einer Phasenliste um einen Faktor, fuer
 * kleinere Kolonieflaechen (Mond statt Planet). num:1-Phasen (Ketten-
 * Einzelschritte wie Lavastrom/Krater/Kreuz) werden NICHT skaliert - die
 * haben ihre eigene, exakte Mond-Variante (siehe jeweilige Konstanten in
 * swu-biome-letters.ts) und muessen unangetastet bleiben.
 */
export function scalePhaseQuantities(
  phases: SwuBiomPhaseConfig[],
  factor: number,
): SwuBiomPhaseConfig[] {
  const scale = (n: number) => Math.max(0, Math.round(n * factor));
  return phases.map((phase) => {
    if (phase.num === 1 && phase.numMin == null && phase.numMax == null) {
      // Ketten-Einzelschritt (Lavastrom/Krater/Kreuz/Tribanna-Quelle) - unangetastet
      return phase;
    }
    return {
      ...phase,
      num: phase.numMin == null ? scale(phase.num) : phase.num,
      numMin: phase.numMin != null ? scale(phase.numMin) : phase.numMin,
      numMax: phase.numMax != null ? scale(phase.numMax) : phase.numMax,
    };
  });
}

export type SwuBodySize = 'planet' | 'moon';

export const SWU_MOON_COLONY_WIDTH = 7;
export const SWU_MOON_COLONY_HEIGHT = 5;
export const SWU_PLANET_COLONY_WIDTH = 10;
export const SWU_PLANET_COLONY_HEIGHT = 6;
/** 35/60 - Verhaeltnis Mond- zu Planet-Kolonieflaeche, fuer die Mengen-Skalierung. */
export const SWU_MOON_SCALE_FACTOR =
  (SWU_MOON_COLONY_WIDTH * SWU_MOON_COLONY_HEIGHT) /
  (SWU_PLANET_COLONY_WIDTH * SWU_PLANET_COLONY_HEIGHT);

/**
 * Passt eine fertige Planet-Config (10x6) auf Mond-Groesse (7x5) an: kleinere
 * Karte, dekorative Mengen proportional skaliert. Fixe Ketten-Phasen (num:1)
 * bleiben unangetastet - deren Mond-Variante muss der Aufrufer selbst per
 * eigener Kette bereitstellen (siehe z.B. buildLavaFlowChainPhases in
 * swu-biome-letters.ts, dort gibt es eine explizite Moon-Variante mit 5 statt
 * 8 Feldern statt einer blossen Skalierung).
 */
export function scaleConfigForMoon(config: SwuBiomSurfaceConfig): SwuBiomSurfaceConfig {
  return {
    width: SWU_MOON_COLONY_WIDTH,
    height: SWU_MOON_COLONY_HEIGHT,
    baseField: config.baseField,
    phases: scalePhaseQuantities(config.phases, SWU_MOON_SCALE_FACTOR),
  };
}

export function getColonyDimensions(size: SwuBodySize): { width: number; height: number } {
  return size === 'moon'
    ? { width: SWU_MOON_COLONY_WIDTH, height: SWU_MOON_COLONY_HEIGHT }
    : { width: SWU_PLANET_COLONY_WIDTH, height: SWU_PLANET_COLONY_HEIGHT };
}
