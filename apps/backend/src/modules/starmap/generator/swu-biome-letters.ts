/**
 * SWU Biom-Buchstaben-Bibliothek
 * ------------------------------------------------------------------
 * Wiederverwendbare Phasen-Ketten pro Klima-Buchstabe (A=Polar, B=Subpolar,
 * C=Gemaessigt, E=Tropisch, F=Vulkanisch, ...). Aus swu-erdaehnlich-biomes.ts
 * herausgeloest, damit andere Archetypen dieselben Bausteine referenzieren
 * koennen, statt Phasen-Ketten zu duplizieren - viele Archetypen brauchen
 * exakt dieselben Buchstaben (z.B. Lavaplanet nutzt F fuer ALLE 3 Zonen,
 * Tundraartig nutzt A+B genau wie Erdaehnlichs Cold-Zone).
 *
 * WICHTIG (Auftraggeber-Hinweis): die "Schneedecke versteckt X"-Mechanik
 * (buildSnowRevealPhases) ist bewusst GENERISCH gehalten - sie funktioniert
 * mit JEDER Ziel-Verzweigung, nicht nur "Wasser oder Fels". Beim Zusammen-
 * setzen eines Archetyps muss man bewusst entscheiden, was geologisch unter
 * der Schneedecke liegt: bei einem Tundra/Arktisch-Kontext ist das Fels (B)
 * neben Wasser (A), bei einem schneebedeckten Vulkan waere es stattdessen
 * Lavafeld (F) - NIE blind die A+B-Kombination fuer alles mit "Schnee"
 * uebernehmen, ohne das zu pruefen.
 */

import { biomPhase, type SwuBiomPhaseConfig } from './swu-biom-generator';

// ---------------------------------------------------------------------------
// A: Polar (Arktisches Meer/Eis-Kaskade)
// ---------------------------------------------------------------------------
/**
 * Kaskade: entryField (z.B. offenes Wasser oder direkt Schneefeld) -> Eisschollen
 * -> Packeis -> Eispanzer (Seed) + Verwehungen/Eisformation als optionale Deko.
 * entryField default = 'A410' (offenes Wasser) fuer eigenstaendige Nutzung ohne
 * Schneedecken-Mechanik.
 */
export interface SwuPolarWeights {
  gefriert?: [number, number];
  packeis?: [number, number];
  eispanzer?: [number, number];
}

export function buildPolarPhases(entryField = 'A410', weights: SwuPolarWeights = {}): SwuBiomPhaseConfig[] {
  const gefriert = weights.gefriert ?? [7, 13];
  const packeis = weights.packeis ?? [4, 8];
  const eispanzer = weights.eispanzer ?? [2, 6];
  return [
    biomPhase({
      mode: 'nocluster',
      description: 'Sandbank oder Untiefe (Wasser-Varianz)',
      numMin: 0,
      numMax: 6,
      from: entryField,
      to: ['A420', 'A430'],
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Wasser gefriert zu Eisschollen',
      numMin: gefriert[0],
      numMax: gefriert[1],
      from: entryField,
      to: 'A520',
      fragmentation: 8,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Eisschollen verdichten sich zu Packeis',
      numMin: packeis[0],
      numMax: packeis[1],
      from: 'A520',
      to: 'A530',
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Packeis verdichtet sich zu bebaubarem Eispanzer',
      numMin: eispanzer[0],
      numMax: eispanzer[1],
      from: 'A530',
      to: 'A540', // Seed=Ja, Bebaubar=Ja (numMin bewusst >=2, Seed darf nie ganz fehlen)
      fragmentation: 4,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Verwehungen auf Eispanzer',
      numMin: 0,
      numMax: 5,
      from: 'A540',
      to: 'A541',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Eisformation im Restwasser/-schnee',
      numMin: 0,
      numMax: 5,
      from: entryField,
      to: 'A570',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Verwehung im Restschnee (Varianz zu A541)',
      numMin: 0,
      numMax: 4,
      from: entryField,
      to: 'A551',
      fragmentation: 0,
    }),
  ];
}

export const SWU_POLAR_SEED_TILES = ['A540'];

// ---------------------------------------------------------------------------
// B: Subpolar (Tundra-Fels-Kaskade)
// ---------------------------------------------------------------------------
/**
 * Kaskade: entryField (verborgener/sichtbarer Tundrafels) -> bewachsen ->
 * vollstaendig freigelegte Felsplatte (= Bergersatz) + Gestein/Felsformation/
 * Geysir-Thermalquelle als optionale Deko. entryField default = 'B610'.
 */
export function buildSubpolarPhases(entryField = 'B610'): SwuBiomPhaseConfig[] {
  return [
    biomPhase({
      mode: 'nocluster',
      description: 'Verwehung auf der versteckten Felsdecke',
      numMin: 0,
      numMax: 5,
      from: entryField,
      to: 'B611',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Fels wird teilweise sichtbar (bewachsen)',
      numMin: 9,
      numMax: 12,
      from: entryField,
      to: 'B630',
      fragmentation: 8,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Fels vollstaendig freigelegt (Felsplatte = Bergersatz)',
      numMin: 6,
      numMax: 9,
      from: 'B630',
      to: 'B640',
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Nacktes Tundra-Gestein',
      numMin: 2,
      numMax: 6,
      from: entryField,
      to: 'B120',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Felsformation (Bergersatz, spitzer)',
      numMin: 0,
      numMax: 5,
      from: 'B630',
      to: 'B130',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Geysir oder Thermalquelle (eine Auspraegung reicht, kein Muss)',
      numMin: 0,
      numMax: 3,
      from: entryField,
      to: ['B320', 'B330'],
      fragmentation: 0,
    }),
  ];
}

/** Nur ueber Baugrund (Terraforming) bebaubar - kein hartes Seed-Tile in B. */
export const SWU_SUBPOLAR_SEED_TILES = ['B119'];

/**
 * Zweiter verstecker Ast fuer B: B140 ("Schneefeld, das eine Tundra
 * versteckt") statt B610 ("Schneefeld, das Fels versteckt"). Urspruenglich
 * beim ersten Excel-Import uebersehen (B140/B141 fehlten komplett) - manche
 * Schneeflecken verbergen einfach nur offene Tundra, nicht zwingend Fels.
 * Reveal-Kaskade: B140 -> B110 (offene Tundra), Deko B141 (Verwehung).
 */
export function buildSnowHiddenTundraPhases(entryField = 'B140'): SwuBiomPhaseConfig[] {
  return [
    biomPhase({
      mode: 'nocluster',
      description: 'Verwehung auf dem Schneefeld (Tundra-Ast)',
      numMin: 0,
      numMax: 5,
      from: entryField,
      to: 'B141',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Tundra wird unter dem Schnee sichtbar',
      numMin: 8,
      numMax: 16,
      from: entryField,
      to: 'B110',
      fragmentation: 8,
    }),
  ];
}

/** Annahme: B140 ist wie alle anderen "Schneefeld ueber versteckt X"-Tiles Bebaubar=Ja+Seed=Ja (Muster durchgaengig bei A550/B610/J610/J840/K610). Bitte gegenchecken. */
export const SWU_SNOW_HIDDEN_TUNDRA_SEED_TILES = ['B140'];

/**
 * Zweite B-Variante: OFFENE, sichtbare Tundra (kein "unter Schnee versteckt"
 * wie buildSubpolarPhases) - fuer Archetypen, die direkt auf Tundra landen,
 * nicht durch eine Schneedecke hindurch (z.B. Tundraartigs Mid/Hot-Zone).
 * warmerVariant verschiebt die Gewichtung Richtung Aequator: weniger Wald,
 * mehr Sumpf (wie besprochen - "Richtung Aequator etwas waermer, mehr
 * Suempfe statt Waelder", aber immer noch Buchstabe B, kein hoeherer Buchstabe).
 */
export function buildTundraPhases(
  entryField = 'B110',
  warmerVariant = false,
  felsOverride?: [number, number],
  felsplatteOverride?: [number, number],
): SwuBiomPhaseConfig[] {
  const felsplatte = felsplatteOverride ?? [7, 9];
  const wald = warmerVariant ? { min: 2, max: 6 } : { min: 8, max: 16 };
  const sumpf = warmerVariant ? { min: 10, max: 18 } : { min: 3, max: 8 };
  const fels = felsOverride ?? [3, 8];
  return [
    biomPhase({
      mode: 'nocluster',
      description: 'Tundra-Variante (rein optisch)',
      numMin: 0,
      numMax: 6,
      from: entryField,
      to: 'B190',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Wald waechst',
      numMin: wald.min,
      numMax: wald.max,
      from: entryField,
      to: 'B210',
      fragmentation: 8,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Sumpf breitet sich aus (mehr Richtung Aequator)',
      numMin: sumpf.min,
      numMax: sumpf.max,
      from: entryField,
      to: ['B310', 'B340'],
      fragmentation: 8,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Gestein/Felsformation (Bergersatz)',
      numMin: fels[0],
      numMax: fels[1],
      from: entryField,
      to: ['B120', 'B130'],
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Bewachsene Felsplatte (per Geoengineering zur Felsplatte freilegbar)',
      numMin: 4,
      numMax: 7,
      from: entryField,
      to: 'B630',
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Freiliegende Felsplatte (bebaubar, Bergbau ohne Untergrund-Forschung)',
      numMin: felsplatte[0],
      numMax: felsplatte[1],
      from: entryField,
      to: 'B640',
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Geysir oder Thermalquelle (eine Auspraegung reicht, kein Muss)',
      numMin: 0,
      numMax: 3,
      from: entryField,
      to: ['B320', 'B330'],
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Baugrund, bebaubar (Seed via Terraforming)',
      numMin: 2,
      numMax: 8,
      from: entryField,
      to: 'B119', // Seed=OPT, Bebaubar=Ja
      fragmentation: 3,
    }),
  ];
}

// ---------------------------------------------------------------------------
// Schneedecke: generischer Compositer fuer "alles sieht erst wie Schnee aus,
// erst beim Freilegen zeigt sich, was darunter liegt"
// ---------------------------------------------------------------------------
export interface SwuSnowRevealBranch {
  /** Feld, zu dem ein Teil der Schneedecke zuerst "aufgedeckt" wird (z.B. B610 fuer Fels, F640 fuer erstarrte Lava). */
  hiddenField: string;
  /** Wie viele Zellen (Spanne) initial in dieses verborgene Feld wechseln. */
  numMin: number;
  numMax: number;
  /** Kaskaden-Phasen, die AB diesem hiddenField weiterlaufen (z.B. buildSubpolarPhases('B610')). */
  phases: SwuBiomPhaseConfig[];
}

/**
 * Baut die "Schneedecke versteckt etwas"-Phasenkette. snowField ist das
 * gemeinsame Basisfeld (z.B. 'A550' Schneefeld auf Wasser). JEDE Verzweigung
 * bekommt eine eigene "wird zu X" Phase direkt aus snowField (nicht
 * hintereinander verkettet) - branches definiert, WAS jeweils darunter zu
 * finden ist, bewusst nicht auf "Wasser oder Fels" beschraenkt, siehe
 * Kopfkommentar.
 */
export function buildSnowRevealPhases(
  snowField: string,
  branches: SwuSnowRevealBranch[],
): SwuBiomPhaseConfig[] {
  const revealPhases = branches.map((branch) =>
    biomPhase({
      mode: 'normal',
      description: `Verborgen unter der Schneedecke: ${branch.hiddenField}`,
      numMin: branch.numMin,
      numMax: branch.numMax,
      from: snowField,
      to: branch.hiddenField,
      fragmentation: 12,
    }),
  );
  return [...revealPhases, ...branches.flatMap((b) => b.phases)];
}

// ---------------------------------------------------------------------------
// C: Gemaessigt (Wald/Wiesen/Feuchtgebiete/Gewaesser-Kaskade)
// ---------------------------------------------------------------------------
export interface SwuGemaessigtWeights {
  wald?: [number, number];
  feucht?: [number, number];
  wasser?: [number, number];
  fels?: [number, number];
  bauland?: [number, number];
}

export function buildGemaessigtPhases(
  entryField = 'C110',
  weights: SwuGemaessigtWeights = {},
): SwuBiomPhaseConfig[] {
  const wald = weights.wald ?? [15, 25];
  const feucht = weights.feucht ?? [5, 11];
  const wasser = weights.wasser ?? [4, 8];
  const fels = weights.fels ?? [2, 6];
  const bauland = weights.bauland ?? [2, 8];
  return [
    biomPhase({
      mode: 'normal',
      description: 'Wald waechst (Nadel-/Misch-/Laubwald gemischt)',
      numMin: wald[0],
      numMax: wald[1],
      from: entryField,
      to: ['C210', 'C220', 'C230'],
      fragmentation: 8,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Feuchtgebiete (Sumpf/Moor)',
      numMin: feucht[0],
      numMax: feucht[1],
      from: entryField,
      to: ['C310', 'C350'],
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Gewaesser',
      numMin: wasser[0],
      numMax: wasser[1],
      from: entryField,
      to: ['C410', 'C430', 'C420'],
      fragmentation: 5,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Felsformation (Bergersatz)',
      numMin: fels[0],
      numMax: fels[1],
      from: entryField,
      to: 'C130',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Bewachsene Felsplatte (per Geoengineering zur Felsplatte freilegbar)',
      numMin: 2,
      numMax: 3,
      from: entryField,
      to: 'C630',
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Freiliegende Felsplatte (bebaubar, Bergbau ohne Untergrund-Forschung)',
      numMin: 5,
      numMax: 6,
      from: entryField,
      to: 'C640',
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Gemaehte Wiese, bebaubar (Seed via Terraforming)',
      numMin: bauland[0],
      numMax: bauland[1],
      from: entryField,
      to: 'C119', // Seed=OPT, Bebaubar=Ja
      fragmentation: 3,
    }),
  ];
}

export const SWU_GEMAESSIGT_SEED_TILES = ['C119'];

// ---------------------------------------------------------------------------
// E: Tropisch (Regenwald/Palmen/Sumpf/Meer/Strand-Kaskade)
// ---------------------------------------------------------------------------
export interface SwuTropischWeights {
  regenwald?: [number, number];
  palmen?: [number, number];
  sumpf?: [number, number];
  meer?: [number, number];
  fels?: [number, number];
  /** Freiliegende Felsplatte E659 (Bergbau-Feld ohne Untergrund-Forschung). */
  felsplatte?: [number, number];
  strand?: [number, number];
}

export function buildTropischPhases(
  entryField = 'E110',
  weights: SwuTropischWeights = {},
): SwuBiomPhaseConfig[] {
  const regenwald = weights.regenwald ?? [13, 23];
  const palmen = weights.palmen ?? [4, 8];
  const sumpf = weights.sumpf ?? [5, 11];
  const meer = weights.meer ?? [5, 11];
  const fels = weights.fels ?? [2, 5];
  const felsplatte = weights.felsplatte ?? [5, 7];
  const strand = weights.strand ?? [2, 8];
  return [
    biomPhase({
      mode: 'nocluster',
      description: 'Wiese-Varianz (gerodet/nachwachsend, rein optisch)',
      numMin: 0,
      numMax: 6,
      from: entryField,
      to: ['E112', 'E133'],
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Blanker tropischer Boden',
      numMin: 0,
      numMax: 4,
      from: entryField,
      to: 'E222',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Regenwald waechst',
      numMin: regenwald[0],
      numMax: regenwald[1],
      from: entryField,
      to: 'E210',
      fragmentation: 8,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Palmenhaine',
      numMin: palmen[0],
      numMax: palmen[1],
      from: entryField,
      to: ['E220', 'E820'],
      fragmentation: 5,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Sumpf/Mangroven/Schwemmland',
      numMin: sumpf[0],
      numMax: sumpf[1],
      from: entryField,
      to: ['E310', 'E450', 'E456'],
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Tropisches Meer/Riff',
      numMin: meer[0],
      numMax: meer[1],
      from: entryField,
      to: ['E430', 'E433', 'E432', 'E434'],
      fragmentation: 5,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Fels wird sichtbar (bewachsen)',
      numMin: fels[0],
      numMax: fels[1],
      from: entryField,
      to: 'E630',
      fragmentation: 5,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Felsformation (Bergersatz)',
      numMin: fels[0],
      numMax: fels[1],
      from: entryField,
      to: 'E130',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Freiliegende Felsplatte (bebaubar, Bergbau ohne Untergrund-Forschung)',
      numMin: felsplatte[0],
      numMax: felsplatte[1],
      from: entryField,
      to: 'E659',
      fragmentation: 5,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Tropischer Strand, bebaubar (Seed)',
      numMin: strand[0],
      numMax: strand[1],
      from: entryField,
      to: 'E822', // Seed=Ja, Bebaubar=Ja
      fragmentation: 4,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Gemaehte Wiese, bebaubar (Seed via Terraforming, Alternative)',
      numMin: 0,
      numMax: 5,
      from: entryField,
      to: 'E119', // Seed=OPT
      fragmentation: 0,
    }),
  ];
}

export const SWU_TROPISCH_SEED_TILES = ['E822', 'E119'];

// ---------------------------------------------------------------------------
// F: Vulkanisch (aktives Lavafeld, Lavastrom-Ketten, erstarrte/bebaubare Zonen)
// ---------------------------------------------------------------------------
// WICHTIG: Lavastroeme sind KEIN Zufallsmuster. Jeder gerichtete Vulkan
// (F74A=runter, F74B=rechts, F74C=rauf, F74D=links) startet einen Lavastrom,
// der ueber F73-Tiles weiterfliesst und irgendwann versiegt (F73G/H/I/J =
// "versiegt kommend von unten/links/rechts/oben"). Jedes F73-Tile hat GENAU 2
// Seiten mit Lavakontakt - die Kette muss geometrisch zusammenpassen. Ein
// Planet hat IMMER GENAU 8 Lavastrom-Felder (reine F73*, ohne Plattform-
// Varianten), ein Mond 5 - erzwungen ueber 'right'/'left'/'below'/'above'
// (exakte Richtungs-Platzierung, aus der alten STU-X-Klasse uebernommen) mit
// num:1-Ketten, nicht dem Zufall ueberlassen. Aufrufer MUSS das Ergebnis auf
// die korrekte Feldanzahl pruefen und bei Abweichung mit anderem Seed neu
// generieren (siehe generateWithGuaranteedSeed in swu-erdaehnlich-biomes.ts) -
// die lose positionierten Vulkan-Phasen koennen sich gegenseitig blockieren.
//
// Aufteilung der 8 Felder (Planet) auf 3 unabhaengige Vulkane+Stroeme:
//   Kette A (F74A, fliesst runter):  F73D -> F73E (Kurve rechts) -> F73H (versiegt)      = 3
//   Kette B (F74B, fliesst rechts):  F73A -> F73C (Kurve runter) -> F73D -> F73J (versiegt) = 4
//   Kette C (F74C ODER F74D):        F73G bzw. F73I (versiegt sofort)                      = 1
//   Summe: 8
// Kette C alterniert zwischen F74C (rauf) und F74D (links) - je nach Aufruf -
// damit ueber viele Generierungen hinweg BEIDE Richtungen vorkommen (vorher
// wurde F74D nie verwendet, siehe Seed=Ja-Vollstaendigkeitspruefung).
export function buildLavaFlowChainPhases(useDirectionDForShortChain = false): SwuBiomPhaseConfig[] {
  const shortChainPhases = useDirectionDForShortChain
    ? [
        biomPhase({ mode: 'equatorial', description: 'Vulkan C (Lavastrom links)', num: 1, from: 'F710', to: 'F74D', fragmentation: 1 }),
        biomPhase({ mode: 'right', description: 'Kette C: versiegt sofort (von rechts kommend)', num: 1, from: 'F710', to: 'F73I', adjacent: 'F74D', fragmentation: 1 }),
      ]
    : [
        biomPhase({ mode: 'polar seeding south', description: 'Vulkan C (Lavastrom rauf)', num: 1, from: 'F710', to: 'F74C', fragmentation: 1 }),
        biomPhase({ mode: 'above', description: 'Kette C: versiegt sofort (von unten kommend)', num: 1, from: 'F710', to: 'F73G', adjacent: 'F74C', fragmentation: 1 }),
      ];

  return [
    biomPhase({ mode: 'polar seeding north', description: 'Vulkan A (Lavastrom runter)', num: 1, from: 'F710', to: 'F74A', fragmentation: 1 }),
    biomPhase({ mode: 'equatorial', description: 'Vulkan B (Lavastrom rechts)', num: 1, from: 'F710', to: 'F74B', fragmentation: 1 }),

    biomPhase({ mode: 'below', description: 'Kette A: gerade runter', num: 1, from: 'F710', to: 'F73D', adjacent: 'F74A', fragmentation: 1 }),
    biomPhase({ mode: 'below', description: 'Kette A: Kurve nach rechts', num: 1, from: 'F710', to: 'F73E', adjacent: 'F73D', fragmentation: 1 }),
    biomPhase({ mode: 'right', description: 'Kette A: versiegt (von links kommend)', num: 1, from: 'F710', to: 'F73H', adjacent: 'F73E', fragmentation: 1 }),

    biomPhase({ mode: 'right', description: 'Kette B: gerade rechts', num: 1, from: 'F710', to: 'F73A', adjacent: 'F74B', fragmentation: 1 }),
    biomPhase({ mode: 'right', description: 'Kette B: Kurve nach runter', num: 1, from: 'F710', to: 'F73C', adjacent: 'F73A', fragmentation: 1 }),
    biomPhase({ mode: 'below', description: 'Kette B: gerade runter', num: 1, from: 'F710', to: 'F73D', adjacent: 'F73C', fragmentation: 1 }),
    biomPhase({ mode: 'below', description: 'Kette B: versiegt (von oben kommend)', num: 1, from: 'F710', to: 'F73J', adjacent: 'F73D', fragmentation: 1 }),

    ...shortChainPhases,
  ];
}

/**
 * Mond-Variante: 2 Ketten statt 3, Summe 5 statt 8 (Auftraggeber-Regel "ein
 * Planet hat immer 8, ein Mond 5"). Passt auch auf die kleinere 7x5-Karte.
 *   Kette A (F74A, runter):  F73D -> F73E (Kurve rechts) -> F73H (versiegt) = 3
 *   Kette B (F74B, rechts):  F73A -> F73H (versiegt, von links kommend)     = 2
 *   Summe: 5
 */
export function buildLavaFlowChainPhasesMoon(): SwuBiomPhaseConfig[] {
  return [
    biomPhase({ mode: 'polar seeding north', description: 'Vulkan A (Lavastrom runter)', num: 1, from: 'F710', to: 'F74A', fragmentation: 1 }),
    biomPhase({ mode: 'equatorial', description: 'Vulkan B (Lavastrom rechts)', num: 1, from: 'F710', to: 'F74B', fragmentation: 1 }),

    biomPhase({ mode: 'below', description: 'Kette A: gerade runter', num: 1, from: 'F710', to: 'F73D', adjacent: 'F74A', fragmentation: 1 }),
    biomPhase({ mode: 'below', description: 'Kette A: Kurve nach rechts', num: 1, from: 'F710', to: 'F73E', adjacent: 'F73D', fragmentation: 1 }),
    biomPhase({ mode: 'right', description: 'Kette A: versiegt (von links kommend)', num: 1, from: 'F710', to: 'F73H', adjacent: 'F73E', fragmentation: 1 }),

    biomPhase({ mode: 'right', description: 'Kette B: gerade rechts', num: 1, from: 'F710', to: 'F73A', adjacent: 'F74B', fragmentation: 1 }),
    biomPhase({ mode: 'right', description: 'Kette B: versiegt (von links kommend)', num: 1, from: 'F710', to: 'F73H', adjacent: 'F73A', fragmentation: 1 }),
  ];
}

/** Deterministisch aus dem Seed ableiten, welche Kette-C-Richtung verwendet wird. */
export function pickLavaChainDirectionD(seed: string): boolean {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 1000;
  return hash % 2 === 0;
}

export const SWU_F73_TILE_CODES = [
  'F73A', 'F73B', 'F73C', 'F73D', 'F73E', 'F73F', 'F73G', 'F73H', 'F73I', 'F73J',
];
export const SWU_LAVA_STREAM_TILES_PLANET = 8;
export const SWU_LAVA_STREAM_TILES_MOON = 5;

/**
 * Dekorative Vulkanisch-Phasen NACH der Lavastrom-Kette: weitere Vulkane ohne
 * eigenen Strom, erstarrte/bebaubare Lava (Seed), Schwefel, Aschewueste,
 * erloschener Vulkan (alternativer Seed). entryField default = 'F710'
 * (aktives Lavafeld). Gewichtbar, damit z.B. Lavaplanet pro Zone unterschiedlich
 * "aktiv/gefaehrlich" vs. "erkaltet/sicher" ausfallen kann.
 */
export interface SwuVulkanischWeights {
  vulkane?: [number, number];
  erstarrt?: [number, number];
  schnee?: [number, number];
  schwefel?: [number, number];
  asche?: [number, number];
  erloschen?: [number, number];
}

export function buildVulkanischDecorationPhases(
  entryField = 'F710',
  weights: SwuVulkanischWeights = {},
): SwuBiomPhaseConfig[] {
  const vulkane = weights.vulkane ?? [2, 6];
  const erstarrt = weights.erstarrt ?? [8, 16];
  const schnee = weights.schnee ?? [3, 7];
  const schwefel = weights.schwefel ?? [0, 7];
  const asche = weights.asche ?? [4, 8];
  const erloschen = weights.erloschen ?? [0, 5];
  return [
    biomPhase({
      mode: 'normal',
      description: 'Weitere aktive Vulkane (ohne eigenen Strom)',
      numMin: vulkane[0],
      numMax: vulkane[1],
      from: entryField,
      to: 'F740',
      fragmentation: 10,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Lava erstarrt, bebaubar (Seed)',
      numMin: erstarrt[0],
      numMax: erstarrt[1],
      from: entryField,
      to: 'F640', // Seed=Ja, Bebaubar=Ja
      fragmentation: 8,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Schneereste auf erstarrter Lava, bebaubar (Seed)',
      numMin: schnee[0],
      numMax: schnee[1],
      from: 'F640',
      to: 'F552', // Seed=Ja, Bebaubar=Ja
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Schwefelseen oder -ablagerungen (eine Auspraegung reicht, kein Muss)',
      numMin: schwefel[0],
      numMax: schwefel[1],
      from: entryField,
      to: ['F330', 'F335'],
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Aschewueste',
      numMin: asche[0],
      numMax: asche[1],
      from: entryField,
      to: ['F810', 'F830'],
      fragmentation: 5,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Erloschener Vulkan, bebaubar (Seed, Alternative)',
      numMin: erloschen[0],
      numMax: erloschen[1],
      from: 'F740',
      to: 'F745', // Seed=Ja, Bebaubar=Ja
      fragmentation: 0,
    }),
  ];
}

export const SWU_VULKANISCH_SEED_TILES = ['F640', 'F552', 'F745'];

/**
 * "Schnee auf Lava" NEU umgesetzt (nach Seed=Ja-Vollstaendigkeitspruefung
 * fehlten F550/F560/F570 komplett): Basis ist ein Lavafeld, das VOLLSTAENDIG
 * unter einer Schneedecke versteckt ist (F550) - nicht bereits erkaltete Lava
 * MIT Schneeresten (F552, das ist etwas anderes). Analog zur Arktis-Mechanik
 * weiss man vorher nicht, ob darunter sicher erkaltete Lava (Seed-faehig) oder
 * noch aktive, gefaehrliche Lava liegt - hier aber mit echtem Risiko statt nur
 * Wasser/Fels-Unterscheidung.
 */
export interface SwuSchneeAufLavaWeights {
  verwehung?: [number, number];
  eisformation?: [number, number];
  sicherErstarrt?: [number, number];
  gefaehrlichAktiv?: [number, number];
}

export function buildSchneeAufLavaPhases(
  entryField = 'F550',
  weights: SwuSchneeAufLavaWeights = {},
): SwuBiomPhaseConfig[] {
  const verwehung = weights.verwehung ?? [0, 5];
  const eisformation = weights.eisformation ?? [0, 5];
  const sicherErstarrt = weights.sicherErstarrt ?? [15, 25];
  const gefaehrlichAktiv = weights.gefaehrlichAktiv ?? [3, 8];
  return [
    biomPhase({
      mode: 'nocluster',
      description: 'Verwehung auf der Schneedecke',
      numMin: verwehung[0],
      numMax: verwehung[1],
      from: entryField,
      to: 'F560',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Eisformation in der Schneedecke',
      numMin: eisformation[0],
      numMax: eisformation[1],
      from: entryField,
      to: 'F570',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Darunter sicher erstarrte Lava, bebaubar (Seed)',
      numMin: sicherErstarrt[0],
      numMax: sicherErstarrt[1],
      from: entryField,
      to: ['F552', 'F640'], // beide Seed=Ja
      fragmentation: 8,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Darunter noch aktive, gefaehrliche Lava',
      numMin: gefaehrlichAktiv[0],
      numMax: gefaehrlichAktiv[1],
      from: entryField,
      to: ['F710', 'F740'],
      fragmentation: 6,
    }),
  ];
}

// ---------------------------------------------------------------------------
// G: Planetoid (Krater/Regolith/Felsbrocken + uebergrosser 2x2-Krater)
// ---------------------------------------------------------------------------
// WICHTIG: Der "uebergrosse Krater" ist EIN Feature aus 4 Tiles (Links Oben/
// Rechts Oben/Links Unten/Rechts Unten = die 4. Stelle "A/B/C/D" aus dem
// Namensschema), die IMMER exakt im 2x2-Quadrat zueinander stehen muessen -
// strukturell identisch zur Lavastrom-Kette: num:1-Einzelschritte, ueber
// 'right'/'below' + 'adjacent' an die vorherige Ecke gekoppelt. Reihenfolge:
// G6A0 (Links Oben, frei plaziert) -> G6B0 (Rechts Oben, rechts von A) ->
// G6C0 (Links Unten, unter A) -> G6D0 (Rechts Unten, rechts von C - liegt
// dadurch automatisch auch unter B, ein zweiter Constraint ist nicht noetig).
export function buildPlanetoidCraterChainPhases(): SwuBiomPhaseConfig[] {
  return [
    biomPhase({ mode: 'normal', description: 'Uebergrosser Krater: Ecke Links Oben', num: 1, from: 'G649', to: 'G6A0', fragmentation: 20 }),
    biomPhase({ mode: 'right', description: 'Uebergrosser Krater: Ecke Rechts Oben', num: 1, from: 'G649', to: 'G6B0', adjacent: 'G6A0', fragmentation: 1 }),
    biomPhase({ mode: 'below', description: 'Uebergrosser Krater: Ecke Links Unten', num: 1, from: 'G649', to: 'G6C0', adjacent: 'G6A0', fragmentation: 1 }),
    biomPhase({ mode: 'right', description: 'Uebergrosser Krater: Ecke Rechts Unten', num: 1, from: 'G649', to: 'G6D0', adjacent: 'G6C0', fragmentation: 1 }),
  ];
}

export const SWU_PLANETOID_OVERSIZED_CRATER_CODES = ['G6A0', 'G6B0', 'G6C0', 'G6D0'];

/**
 * Prueft, ob der uebergrosse Krater tatsaechlich vollstaendig UND korrekt
 * angeordnet ist (nicht nur, ob alle 4 Codes irgendwo vorkommen - sie muessen
 * geometrisch als 2x2-Block zusammenstehen). Analog zur Lavastrom-Pruefung:
 * bei Kollision mit anderen Phasen kann die Kette unvollstaendig abbrechen.
 */
export function isPlanetoidCraterIntact(grid: string[][]): boolean {
  for (let y = 0; y < grid.length - 1; y++) {
    for (let x = 0; x < grid[y].length - 1; x++) {
      if (
        grid[y][x] === 'G6A0' &&
        grid[y][x + 1] === 'G6B0' &&
        grid[y + 1][x] === 'G6C0' &&
        grid[y + 1][x + 1] === 'G6D0'
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Allgemeine Planetoid-Deko-Phasen: Felsbrocken, normale Krater/Regolith,
 * (Schaechte werden bewusst NICHT geseedet - nur durch Terraforming erzeugbar),
 * Baugrund (Seed=OPT). entryField default = 'G649' (planierter Baugrund als
 * neutrale Ausgangsflaeche - alle natuerlichen Formationen "wachsen" hier
 * konzeptionell aus dem planierten Grund, symmetrisch zu den anderen Buchstaben).
 */
export function buildPlanetoidDecorationPhases(entryField = 'G649'): SwuBiomPhaseConfig[] {
  return [
    biomPhase({
      mode: 'normal',
      description: 'Felsbrocken',
      numMin: 4,
      numMax: 10,
      from: entryField,
      to: 'G610',
      fragmentation: 8,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Krater (normal)',
      numMin: 6,
      numMax: 14,
      from: entryField,
      to: ['G614', 'G642'],
      fragmentation: 10,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Regolith-Flaechen',
      numMin: 4,
      numMax: 10,
      from: entryField,
      to: 'G640',
      fragmentation: 6,
    }),
  ];
}

export const SWU_PLANETOID_SEED_TILES = ['G649'];

// ---------------------------------------------------------------------------
// D: Subtropisch (Savanne <-> Wueste-Kaskade)
// ---------------------------------------------------------------------------
// Nur D119 (Baugrund) ist Bebaubar=Ja + Seed=OPT - alle anderen Tiles (auch
// die "freigelegte Felsplatte" D640/D680, Bebaubar=Ja aber Seed=Nein) sind
// natuerlich nicht direkt gruendbar, nur dekorativ/Terrain.
export interface SwuSubtropischWeights {
  waeldchen?: [number, number];
  wasserloch?: [number, number];
  wueste?: [number, number];
  duenen?: [number, number];
  felsformation?: [number, number];
  felsBewachsen?: [number, number];
  felsBedeckt?: [number, number];
  /** Freiliegende Felsplatte D640 (Savanne) bzw. D680 (Wueste) - Bergbau ohne Untergrund-Forschung. */
  felsplatte?: [number, number];
  bauland?: [number, number];
}

export function buildSubtropischPhases(
  entryField = 'D110',
  weights: SwuSubtropischWeights = {},
): SwuBiomPhaseConfig[] {
  const waeldchen = weights.waeldchen ?? [6, 12];
  const wasserloch = weights.wasserloch ?? [0, 4];
  const wueste = weights.wueste ?? [12, 22];
  const duenen = weights.duenen ?? [0, 6];
  const felsformation = weights.felsformation ?? [2, 6];
  const felsBewachsen = weights.felsBewachsen ?? [8, 10];
  const felsBedeckt = weights.felsBedeckt ?? [0, 4];
  const felsplatte = weights.felsplatte ?? [7, 8];
  const bauland = weights.bauland ?? [2, 8];
  return [
    biomPhase({
      mode: 'normal',
      description: 'Savannen-Waeldchen waechst',
      numMin: waeldchen[0],
      numMax: waeldchen[1],
      from: entryField,
      to: 'D210',
      fragmentation: 8,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Wasserloch (ggf. ausgetrocknet - eine Auspraegung reicht)',
      numMin: wasserloch[0],
      numMax: wasserloch[1],
      from: entryField,
      to: ['D310', 'D315'],
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Verwuestung: Savanne wird zu Sandwueste',
      numMin: wueste[0],
      numMax: wueste[1],
      from: entryField,
      to: 'D880',
      fragmentation: 10,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Duenen bilden sich in der Wueste',
      numMin: duenen[0],
      numMax: duenen[1],
      from: 'D880',
      to: 'D881',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Felsformation (Bergersatz, Savanne oder Wueste gemischt)',
      numMin: felsformation[0],
      numMax: felsformation[1],
      from: entryField,
      to: ['D130', 'D830', 'D831'],
      fragmentation: 5,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Savannenfels wird sichtbar (bewachsen -> bedeckt)',
      numMin: felsBewachsen[0],
      numMax: felsBewachsen[1],
      from: entryField,
      to: 'D620',
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Fels weiter bedeckt (Uebergang, kein hartes Seed)',
      numMin: felsBedeckt[0],
      numMax: felsBedeckt[1],
      from: 'D620',
      to: 'D630',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Wueste ueber Felsplatte / von Sandwueste bedeckte Felsplatte (Uebergangsvarianz)',
      numMin: 0,
      numMax: 5,
      from: 'D880',
      to: ['D650', 'D670'],
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Freiliegende Felsplatte in der Savanne (bebaubar, Bergbau)',
      numMin: felsplatte[0],
      numMax: felsplatte[1],
      from: entryField,
      to: 'D640',
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Freiliegende Felsplatte in der Wueste (bebaubar, Bergbau)',
      numMin: Math.ceil(felsplatte[0] / 2),
      numMax: Math.ceil(felsplatte[1] / 2),
      from: 'D880',
      to: 'D680',
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Bauland, bebaubar (Seed via Terraforming)',
      numMin: bauland[0],
      numMax: bauland[1],
      from: entryField,
      to: 'D119', // Seed=OPT, Bebaubar=Ja
      fragmentation: 3,
    }),
  ];
}

export const SWU_SUBTROPISCH_SEED_TILES = ['D119'];

// ---------------------------------------------------------------------------
// H: Gas (Gasschichten + Tribanna-Quelle 2x2 + genau EINE Plattform)
// ---------------------------------------------------------------------------
// WICHTIG (zwei Besonderheiten, analog/verwandt zu G):
//  1. "Tribanna Quelle" ist wie der uebergrosse Krater bei G ein 4-Tile-Feature
//     (Links Oben/Rechts Oben/Links Unten/Rechts Unten = H9A0/H9B0/H9C0/H9D0),
//     das exakt im 2x2-Quadrat zueinander stehen muss - dieselbe 'right'/
//     'below'-Verkettung wie beim Planetoid-Krater.
//  2. Die "Plattform"-Tiles (H919/929/939/949) sind das Start-/HQ-Feld - aber
//     NUR EXAKT EINES darf auf der Flaeche vorkommen (num:1 fix, keine Spanne).
//     H949 ist die einzige mit Seed=OPT markierte Variante, H919/929/939 sind
//     Seed=Ja - die Wahl WELCHE der 4 Varianten es wird, ist zufaellig, aber
//     die ANZAHL ist immer exakt 1, nie mehrere Plattformen gleichzeitig.
export function buildTribannaQuelleChainPhases(): SwuBiomPhaseConfig[] {
  return [
    biomPhase({ mode: 'normal', description: 'Tribanna-Quelle: Ecke Links Oben', num: 1, from: 'H910', to: 'H9A0', fragmentation: 20 }),
    biomPhase({ mode: 'right', description: 'Tribanna-Quelle: Ecke Rechts Oben', num: 1, from: 'H910', to: 'H9B0', adjacent: 'H9A0', fragmentation: 1 }),
    biomPhase({ mode: 'below', description: 'Tribanna-Quelle: Ecke Links Unten', num: 1, from: 'H910', to: 'H9C0', adjacent: 'H9A0', fragmentation: 1 }),
    biomPhase({ mode: 'right', description: 'Tribanna-Quelle: Ecke Rechts Unten', num: 1, from: 'H910', to: 'H9D0', adjacent: 'H9C0', fragmentation: 1 }),
  ];
}

export const SWU_GAS_TRIBANNA_QUELLE_CODES = ['H9A0', 'H9B0', 'H9C0', 'H9D0'];

/**
 * Zaehlt, wie viele VOLLSTAENDIGE, korrekt angeordnete 2x2-Tribanna-Quelle-
 * Bloecke im Grid vorkommen (nicht nur ob mindestens einer da ist - der Planet
 * braucht genau 2, der Mond genau 1, analog zur alten STU-Q-Klasse: dort gibt
 * es "Plasmasee 1" UND "Krater 2" als zwei unabhaengige 2x2-Ketten beim
 * Planeten (classId 221), aber nur eine beim Mond (classId 421)).
 */
export function countIntactTribannaQuelle(grid: string[][]): number {
  let count = 0;
  for (let y = 0; y < grid.length - 1; y++) {
    for (let x = 0; x < grid[y].length - 1; x++) {
      if (
        grid[y][x] === 'H9A0' &&
        grid[y][x + 1] === 'H9B0' &&
        grid[y + 1][x] === 'H9C0' &&
        grid[y + 1][x + 1] === 'H9D0'
      ) {
        count++;
      }
    }
  }
  return count;
}

/** @deprecated Nutze countIntactTribannaQuelle(grid) === 1 (oder 2 beim Planeten). */
export function isTribannaQuelleIntact(grid: string[][]): boolean {
  return countIntactTribannaQuelle(grid) > 0;
}

export const SWU_GAS_PLATFORM_CODES = ['H919', 'H929', 'H939', 'H949'];

export function countGasPlatforms(grid: string[][]): number {
  const set = new Set(SWU_GAS_PLATFORM_CODES);
  let count = 0;
  for (const row of grid) for (const cell of row) if (set.has(cell)) count++;
  return count;
}

/** Planet: 2 Tribanna-Quelle-Ketten. Mond: 1 - aus STU Klasse Q (221 vs. 421) uebernommen. */
export const SWU_GAS_TRIBANNA_QUELLE_COUNT_PLANET = 2;
export const SWU_GAS_TRIBANNA_QUELLE_COUNT_MOON = 1;

/** Stuerme (H990): fix aus STU Klasse Q uebernommen - Planet 9, Mond 7 (nicht dekorativ-variabel). */
export const SWU_GAS_STORM_COUNT_PLANET = 9;
export const SWU_GAS_STORM_COUNT_MOON = 7;

/**
 * Allgemeine Gas-Deko-Phasen: verschiedene Atmosphaeren-Schichten (rein
 * optisch), atmosphaerischer Sturm (FESTE Anzahl aus dem STU-Q-Muster, siehe
 * SWU_GAS_STORM_COUNT_*), und die eine Plattform (num:1 FEST, keine Spanne).
 * entryField default = 'H910'.
 */
export function buildGasDecorationPhases(
  entryField = 'H910',
  stormCount: number = SWU_GAS_STORM_COUNT_PLANET,
): SwuBiomPhaseConfig[] {
  return [
    biomPhase({
      mode: 'normal',
      description: 'Weitere Gasschichten (rein optische Variante)',
      numMin: 15,
      numMax: 30,
      from: entryField,
      to: ['H920', 'H930', 'H940'],
      fragmentation: 15,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Stuerme (feste Anzahl, aus STU Klasse Q uebernommen)',
      num: stormCount,
      from: entryField,
      to: 'H990',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Die eine Gas-Plattform (Seed, exakt 1x - keine Spanne!)',
      num: 1,
      from: entryField,
      to: SWU_GAS_PLATFORM_CODES,
      fragmentation: 5,
    }),
  ];
}

export const SWU_GAS_SEED_TILES = SWU_GAS_PLATFORM_CODES;

// ---------------------------------------------------------------------------
// I: Hoher Eisengehalt / Marsartig (Oedland/Wueste/Salzwueste-Kaskade)
// ---------------------------------------------------------------------------
// I910 (Salzwueste) ist Bebaubar=Ja UND Seed=Ja (hartes Seed, kein OPT!) -
// I119 (Baugrund) ist die OPT-Alternative.
export interface SwuMarsartigWeights {
  wueste?: [number, number];
  duenen?: [number, number];
  salzwueste?: [number, number];
  salzstreifen?: [number, number];
  felsformation?: [number, number];
  felsBedeckt?: [number, number];
  /** Freiliegende Felsplatte I640 - Bergbau ohne Untergrund-Forschung. */
  felsplatte?: [number, number];
  bauland?: [number, number];
}

export function buildMarsartigPhases(
  entryField = 'I110',
  weights: SwuMarsartigWeights = {},
): SwuBiomPhaseConfig[] {
  const wueste = weights.wueste ?? [12, 22];
  const duenen = weights.duenen ?? [0, 6];
  const salzwueste = weights.salzwueste ?? [6, 14];
  const salzstreifen = weights.salzstreifen ?? [0, 4];
  const felsformation = weights.felsformation ?? [3, 8];
  const felsBedeckt = weights.felsBedeckt ?? [5, 8];
  const felsplatte = weights.felsplatte ?? [6, 8];
  const bauland = weights.bauland ?? [2, 8];
  return [
    biomPhase({
      mode: 'normal',
      description: 'Oedlandfels bedeckt (per Geoengineering freilegbar)',
      numMin: felsBedeckt[0],
      numMax: felsBedeckt[1],
      from: entryField,
      to: 'I630',
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Freiliegende Felsplatte (bebaubar, Bergbau ohne Untergrund-Forschung)',
      numMin: felsplatte[0],
      numMax: felsplatte[1],
      from: entryField,
      to: 'I640',
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Rote Wueste breitet sich aus',
      numMin: wueste[0],
      numMax: wueste[1],
      from: entryField,
      to: 'I810',
      fragmentation: 10,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Duenen in der roten Wueste',
      numMin: duenen[0],
      numMax: duenen[1],
      from: 'I810',
      to: 'I811',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Salzwueste, bebaubar (Seed - hart, kein OPT)',
      numMin: salzwueste[0],
      numMax: salzwueste[1],
      from: entryField,
      to: 'I910', // Seed=Ja, Bebaubar=Ja
      fragmentation: 8,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Ausbreitende Salzwuesten-Streifen (Deko)',
      numMin: salzstreifen[0],
      numMax: salzstreifen[1],
      from: 'I910',
      to: ['I91A', 'I91B', 'I91C'],
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Felsformation (Mesa, Bergersatz)',
      numMin: felsformation[0],
      numMax: felsformation[1],
      from: entryField,
      to: ['I130', 'I830', 'I831'],
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Baugrund, bebaubar (Seed via Terraforming, Alternative)',
      numMin: bauland[0],
      numMax: bauland[1],
      from: entryField,
      to: 'I119', // Seed=OPT, Bebaubar=Ja
      fragmentation: 3,
    }),
  ];
}

export const SWU_MARSARTIG_SEED_TILES = ['I910', 'I119'];

// ---------------------------------------------------------------------------
// J: Kaeltewueste (kalte Variante von D/Sandwueste - fuer Wueste-Cold)
// ---------------------------------------------------------------------------
// J610 ("Schneefeld ueber versteckter Felsplatte") ist der Basiszustand -
// bereits selbst Seed=Ja. Ein Teil der Flaeche ist in Wahrheit Kaeltewueste
// statt Fels darunter (J840, ebenfalls Seed=Ja) - gleiche "Schnee versteckt X"-
// Idee wie bei der Arktis (A/B), nur mit ANDEREM Basiszustand statt eines
// generischen Composers, da beide Aeste selbst schon eigenstaendige Seed-Tiles sind.
export function buildKaeltewuestePhases(entryField = 'J610'): SwuBiomPhaseConfig[] {
  return [
    // Manche Bereiche sind eigentlich Kaeltewueste, nicht Fels, unter dem Schnee
    biomPhase({
      mode: 'normal',
      description: 'Verborgen: Kaeltewueste statt Fels',
      numMin: 15,
      numMax: 25,
      from: entryField,
      to: 'J840',
      fragmentation: 12,
    }),
    // --- Fels-Ast (aus J610) ---
    biomPhase({
      mode: 'nocluster',
      description: 'Verwehung auf dem Schneefeld (Fels-Ast)',
      numMin: 0,
      numMax: 5,
      from: entryField,
      to: 'J611',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Fels teilweise sichtbar (bedeckt)',
      numMin: 12,
      numMax: 16,
      from: entryField,
      to: 'J630',
      fragmentation: 8,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Fels vollstaendig freigelegt (Felsplatte)',
      numMin: 9,
      numMax: 12,
      from: 'J630',
      to: 'J640',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Steinformation in der Sandwueste',
      numMin: 0,
      numMax: 4,
      from: entryField,
      to: 'J614',
      fragmentation: 0,
    }),
    // --- Wuesten-Ast (aus J840) ---
    biomPhase({
      mode: 'nocluster',
      description: 'Verwehung auf dem Schneefeld (Wuesten-Ast)',
      numMin: 0,
      numMax: 5,
      from: 'J840',
      to: 'J841',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Kaeltewueste wird sichtbar',
      numMin: 8,
      numMax: 16,
      from: 'J840',
      to: 'J810',
      fragmentation: 8,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Felsformation in der Kaeltewueste',
      numMin: 0,
      numMax: 4,
      from: 'J810',
      to: 'J830',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Geraeumte Kaeltewueste, bebaubar (Seed via Terraforming, Alternative)',
      numMin: 0,
      numMax: 6,
      from: 'J810',
      to: 'J819', // Seed=OPT, Bebaubar=Ja
      fragmentation: 3,
    }),
  ];
}

/** J610/J840 sind beide Seed=Ja - hartes Seed, kein OPT noetig. */
export const SWU_KAELTEWUESTE_SEED_TILES = ['J610', 'J840', 'J819'];

// ---------------------------------------------------------------------------
// K: Rote Kaeltewueste / Kaelteoedland (kalte Variante von I/Marsartig - fuer
// Marsartig-Mid). Drei Aeste aus einer gemeinsamen Schneedecke: Fels, Rote
// Wueste, Oedland.
// ---------------------------------------------------------------------------
export function buildRoteKaeltewuestePhases(entryField = 'K610'): SwuBiomPhaseConfig[] {
  return [
    // Manche Bereiche sind eigentlich Rote Wueste bzw. Oedland statt Fels
    biomPhase({
      mode: 'normal',
      description: 'Verborgen: Rote Kaeltewueste statt Fels',
      numMin: 10,
      numMax: 18,
      from: entryField,
      to: 'K840',
      fragmentation: 10,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Verborgen: Kaelteoedland statt Fels',
      numMin: 8,
      numMax: 14,
      from: entryField,
      to: 'K140',
      fragmentation: 10,
    }),
    // --- Fels-Ast (aus K610) ---
    biomPhase({
      mode: 'nocluster',
      description: 'Verwehung auf dem Schneefeld (Fels-Ast)',
      numMin: 0,
      numMax: 4,
      from: entryField,
      to: 'K611',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Fels teilweise sichtbar (bedeckt)',
      numMin: 10,
      numMax: 14,
      from: entryField,
      to: 'K630',
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Fels vollstaendig freigelegt (Felsplatte)',
      numMin: 6,
      numMax: 8,
      from: 'K630',
      to: 'K640',
      fragmentation: 0,
    }),
    // --- Rote-Wueste-Ast (aus K840) ---
    biomPhase({
      mode: 'nocluster',
      description: 'Verwehung (Rote-Wueste-Ast)',
      numMin: 0,
      numMax: 4,
      from: 'K840',
      to: 'K841',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Rote Kaeltewueste wird sichtbar',
      numMin: 6,
      numMax: 12,
      from: 'K840',
      to: 'K810',
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'nocluster',
      description: 'Felsformation in der Roten Kaeltewueste',
      numMin: 0,
      numMax: 3,
      from: 'K810',
      to: 'K830',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Geraeumte Rote Kaeltewueste, bebaubar (Seed, Alternative)',
      numMin: 0,
      numMax: 5,
      from: 'K810',
      to: 'K819', // Seed=OPT
      fragmentation: 3,
    }),
    // --- Oedland-Ast (aus K140) ---
    biomPhase({
      mode: 'nocluster',
      description: 'Verwehung (Oedland-Ast)',
      numMin: 0,
      numMax: 4,
      from: 'K140',
      to: 'K141',
      fragmentation: 0,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Kaelteoedland wird sichtbar',
      numMin: 5,
      numMax: 10,
      from: 'K140',
      to: 'K110',
      fragmentation: 6,
    }),
    biomPhase({
      mode: 'normal',
      description: 'Geraeumtes Kaelteoedland, bebaubar (Seed, Alternative)',
      numMin: 0,
      numMax: 5,
      from: 'K110',
      to: 'K119', // Seed=OPT
      fragmentation: 3,
    }),
  ];
}

/** K610/K840/K140 sind alle Seed=Ja - hartes Seed. */
export const SWU_ROTE_KAELTEWUESTE_SEED_TILES = ['K610', 'K840', 'K140', 'K819', 'K119'];

// ---------------------------------------------------------------------------
// Salzwueste-Kreuz: I910 im Zentrum + I91A (oben) + I91B (rechts) + I91C
// (unten) + I91D (links) - dieselbe Ketten-Logik wie beim 2x2-Krater (G) und
// der Tribanna-Quelle (H), hier als Kreuz statt Quadrat. I910-Zellen koennen
// aber auch direkt ohne Kreuz aneinander anschliessen (grosse zusammenhaengende
// Salzwuesten-Felder) - das Kreuz ist eine OPTIONALE Zusatzformation, kein Muss
// bei jedem I910-Vorkommen.
export function buildSalzwuestenKreuzPhases(): SwuBiomPhaseConfig[] {
  return [
    biomPhase({ mode: 'normal', description: 'Salzwuesten-Kreuz: Zentrum', num: 1, from: 'I110', to: 'I910', fragmentation: 15 }),
    biomPhase({ mode: 'above', description: 'Salzwuesten-Kreuz: oben', num: 1, from: 'I110', to: 'I91A', adjacent: 'I910', fragmentation: 1 }),
    biomPhase({ mode: 'right', description: 'Salzwuesten-Kreuz: rechts', num: 1, from: 'I110', to: 'I91B', adjacent: 'I910', fragmentation: 1 }),
    biomPhase({ mode: 'below', description: 'Salzwuesten-Kreuz: unten', num: 1, from: 'I110', to: 'I91C', adjacent: 'I910', fragmentation: 1 }),
    biomPhase({ mode: 'left', description: 'Salzwuesten-Kreuz: links', num: 1, from: 'I110', to: 'I91D', adjacent: 'I910', fragmentation: 1 }),
  ];
}

export const SWU_SALZWUESTEN_KREUZ_CODES = ['I910', 'I91A', 'I91B', 'I91C', 'I91D'];

/** Prueft, ob das Salzwuesten-Kreuz vollstaendig UND korrekt angeordnet ist. */
export function isSalzwuestenKreuzIntact(grid: string[][]): boolean {
  for (let y = 1; y < grid.length - 1; y++) {
    for (let x = 1; x < grid[y].length - 1; x++) {
      if (
        grid[y][x] === 'I910' &&
        grid[y - 1][x] === 'I91A' &&
        grid[y][x + 1] === 'I91B' &&
        grid[y + 1][x] === 'I91C' &&
        grid[y][x - 1] === 'I91D'
      ) {
        return true;
      }
    }
  }
  return false;
}
