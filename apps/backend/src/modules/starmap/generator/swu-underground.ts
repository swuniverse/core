/**
 * SWU Untergrund-Generator (ersetzt die alten STU-Zahlen-Platzhalter)
 * ------------------------------------------------------------------
 * Aus Untergrund.xlsx. Drei Ebenen:
 *
 *   1. BASIS-TYP (nur 3 + 2 Sonderfaelle):
 *      U101 Mager       - trockene/karge Welten
 *      U102 Naehrstoffreich - Wald/Sumpf/feuchte Welten
 *      U103 Eisenhaltig - Marsartige/Biom-I-Welten
 *      U501 Eis         - arktische Kontexte (Sonderfall statt U101/102)
 *      U401 Tiefsee     - Ozean-Kontexte (Sonderfall statt U101/102)
 *
 *   2. FELS-VARIANTE (referenziert IMMER die Oberflaechen-Biomklasse):
 *      U6B* = wie Tundra (B), U6C* = wie Gemaessigt (C),
 *      U6D* = wie Tropisch/Savanne/Wueste (D+E gemeinsam, mehrere Varianten),
 *      U6F* = wie Vulkanisch (F), U6G* = wie Planetoid (G), U6I* = wie Mars (I)
 *
 *   3. MAGMA-SONDERFALL (U7F1 Inaktiv = STU-831, U7F2 Aktiv = STU-832):
 *      Vulkanische Welten: FEST num=5 (1:1 aus der alten STU-X-Klasse
 *      uebernommen, siehe undergroundPhases dort). Alle anderen Welten:
 *      NUR wenn die Oberflaeche geothermale Aktivitaet zeigt (Geysir/
 *      Thermalquelle, B320/B330 vorhanden) - dann optional bis zu HALB so
 *      viel (0-2), sonst 0. Nicht uebertreiben, wie besprochen.
 */

import {
  biomPhase,
  type SwuBiomPhaseConfig,
  type SwuBiomSurfaceConfig,
  SWU_MOON_COLONY_WIDTH,
  SWU_PLANET_COLONY_WIDTH,
} from './swu-biom-generator';

/**
 * Untergrund ist immer 2 Reihen tief, unabhaengig von Planet/Mond - analog zum
 * Orbit (ebenfalls fest 2 Reihen) und 1:1 aus der alten STU-Generierung
 * uebernommen. SWU_VULKANISCH_MAGMA_COUNT (fest 5) ist bereits auf ein
 * 2-reihiges Raster kalibriert - siehe Kommentar dort.
 */
export const SWU_UNDERGROUND_HEIGHT = 2;
/** Breiten-Verhaeltnis Mond zu Planet, fuer die Untergrund-Mengen-Skalierung (Hoehe ist bei beiden gleich). */
export const SWU_MOON_UNDERGROUND_SCALE_FACTOR =
  SWU_MOON_COLONY_WIDTH / SWU_PLANET_COLONY_WIDTH;

export type SwuUndergroundBaseType = 'U101' | 'U102' | 'U103' | 'U501' | 'U401';

export const SWU_MAGMA_TILES = ['U7F1', 'U7F2'];
/** 1:1 aus der alten STU-X-Klasse (undergroundPhases: 828->831 num:5). */
export const SWU_VULKANISCH_MAGMA_COUNT = 5;
/** "Maximal X-Klasse halbe" fuer nicht-vulkanische, aber geologisch aktive Welten. */
export const SWU_MAGMA_HALF_COUNT = Math.floor(SWU_VULKANISCH_MAGMA_COUNT / 2);

/** Erkennt geothermale Oberflaechen-Aktivitaet (Geysir/Thermalquelle) - Kopplung zur Oberflaeche. */
export function hasGeologicalActivitySurfaceHint(surfaceGrid: string[][]): boolean {
  return surfaceGrid.some((row) => row.some((cell) => cell === 'B320' || cell === 'B330'));
}

export interface SwuUndergroundOptions {
  /** Fels-Varianten-Codes, die zur Oberflaechen-Biomklasse passen (z.B. ['U6C1','U6C2']). */
  rockVariants: string[];
  rockNumRange?: [number, number];
  /**
   * 'fixed' = vulkanische Welt, immer exakt SWU_VULKANISCH_MAGMA_COUNT.
   * 'conditional' = alle anderen Welten, nur falls surfaceGrid geothermale
   *   Aktivitaet zeigt (siehe hasGeologicalActivitySurfaceHint), dann 0-2.
   * 'none' = kein Magma-Vorkommen moeglich (z.B. Ozean, Gasplanet-Untergrund
   *   hat eigene Logik).
   */
  magmaMode: 'fixed' | 'conditional' | 'none';
}

/**
 * Baut die Untergrund-Phasen. surfaceGrid wird nur fuer magmaMode='conditional'
 * gebraucht (Geysir/Thermalquelle-Check) - bei 'fixed'/'none' kann es weggelassen werden.
 */
export function buildUndergroundPhases(
  baseType: SwuUndergroundBaseType,
  options: SwuUndergroundOptions,
  surfaceGrid?: string[][],
): SwuBiomPhaseConfig[] {
  const phases: SwuBiomPhaseConfig[] = [];
  const rockRange = options.rockNumRange ?? [8, 16];

  phases.push(
    biomPhase({
      mode: 'normal',
      description: `Untergrund-Fels (${options.rockVariants.join('/')})`,
      numMin: rockRange[0],
      numMax: rockRange[1],
      from: baseType,
      to: options.rockVariants,
      fragmentation: 8,
    }),
  );

  if (options.magmaMode === 'fixed') {
    phases.push(
      biomPhase({
        mode: 'normal',
        description: 'Magma-Stollen (vulkanische Welt, fest aus STU uebernommen)',
        num: SWU_VULKANISCH_MAGMA_COUNT,
        from: baseType,
        to: SWU_MAGMA_TILES,
        fragmentation: 8,
      }),
    );
  } else if (options.magmaMode === 'conditional') {
    const isGeologicallyActive = surfaceGrid ? hasGeologicalActivitySurfaceHint(surfaceGrid) : false;
    if (isGeologicallyActive) {
      phases.push(
        biomPhase({
          mode: 'nocluster',
          description: 'Magma-Stollen (geologisch aktiv wegen Geysir/Thermalquelle an der Oberflaeche)',
          numMin: 0,
          numMax: SWU_MAGMA_HALF_COUNT,
          from: baseType,
          to: SWU_MAGMA_TILES,
          fragmentation: 0,
        }),
      );
    }
  }

  return phases;
}

export function buildUndergroundConfig(
  baseType: SwuUndergroundBaseType,
  options: SwuUndergroundOptions,
  surfaceGrid?: string[][],
  isMoon = false,
): SwuBiomSurfaceConfig {
  const width = isMoon ? SWU_MOON_COLONY_WIDTH : SWU_PLANET_COLONY_WIDTH;
  const height = SWU_UNDERGROUND_HEIGHT;
  const phases = buildUndergroundPhases(baseType, options, surfaceGrid);
  return {
    width,
    height,
    baseField: baseType,
    // Fels-Menge proportional skalieren; Magma (fest=exakt 5, konditional=0-2)
    // bleibt unangetastet - das sind bewusst kleine, feste Zahlen, kein
    // Skalierungsbedarf noetig (0-2 auf 35 Feldern ist bereits "sparsam genug").
    phases: isMoon
      ? phases.map((p, i) =>
          i === 0
            ? {
                ...p,
                numMin: Math.round((p.numMin ?? 0) * SWU_MOON_UNDERGROUND_SCALE_FACTOR),
                numMax: Math.round((p.numMax ?? 0) * SWU_MOON_UNDERGROUND_SCALE_FACTOR),
              }
            : p,
        )
      : phases,
  };
}
