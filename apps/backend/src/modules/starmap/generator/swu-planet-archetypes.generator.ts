/**
 * SWU Planet Archetypes - Generator (v2: Rotation als Instanz-Parameter)
 * ------------------------------------------------------------------
 * Aenderung gegenueber v1: 'Rotierend'/'Gebunden' ist keine Eigenschaft der
 * Planetenklasse mehr, sondern - genau wie 'ring'/'moon'/'base' - ein Parameter
 * der GENERIERTEN INSTANZ. Ein Planetentyp definiert nur noch 3 Zonen (Cold/
 * Mid/Hot); ob daraus horizontale Baender (Rotierend) oder vertikale Baender
 * (Gebunden) werden, entscheidet sich beim Generieren, nicht in den Stammdaten.
 *
 * Das reduziert die Archetypen von 25 (v1) auf 18: pro Planetentyp genau EIN
 * Eintrag, ausser bei 'Gasplanet' (4 echte inhaltliche Varianten A-D, keine
 * Rotations-Dopplung). tidalLockedPossible markiert, ob fuer den Typ bereits
 * Gebunden-spezifische Biom-Referenzen aus der Quelltabelle vorliegen
 * (tidalLockedOverride je Zone) - technisch kann JEDER Typ gebunden generiert
 * werden, auch ohne Override (dann wird einfach 'default' verwendet).
 *
 * WICHTIG: Es sind noch KEINE echten Feld-IDs vergeben (siehe PLACEHOLDER_*).
 * Die Biom-Namen (primaryBiome/secondaryBiome, biomeId: null) sind reine
 * Lore-/Zuordnungs-Referenz fuer einen kuenftigen Biom-Generator - sie steuern
 * aktuell NICHTS im Platzhalter-Grid.
 *
 * Offene Punkte / Annahmen (bitte im Team abgleichen):
 *   - Die zweite 'Mondartig'-Gebunden-Zeile aus der Quelltabelle war unvollstaendig
 *     und ist durch den Merge jetzt ueberfluessig (nur noch 1 Override pro Typ).
 *   - rotationPeriodRealHoursRange: einheitlich [18, 30]h Platzhalter fuer alle
 *     Typen (gilt nur, wenn eine Instanz als 'rotating' generiert wird). Echte
 *     Klassen-Streuung fehlt noch.
 *   - Start-Feld (111) sitzt IMMER an einer festen, zentralen Position der Karte
 *     (siehe SWU_START_FIELD_POSITION) - dadurch liegt es automatisch auch immer
 *     innerhalb des Mond-Ausschnitts (SWU_MOON_CROP), ohne das extra pruefen zu
 *     muessen.
 */

import { SeededRNG } from './seeded-rng';
import { CelestialObjectType } from '../entities/celestial-object.entity';

// ---------------------------------------------------------------------------
// Naming-Schema: P<TypId><G|R><R|M|B><Zone>  (unveraendert)
//   G/R kommt jetzt vom rotation-PARAMETER der Instanz, nicht mehr vom Archetyp.
// ---------------------------------------------------------------------------

export type SwuRotationType = 'rotating' | 'tidal-locked';
export type SwuBodyFeature = 'ring' | 'moon' | 'base';
export type SwuZoneSlot = 1 | 2 | 3; // 1=Cold, 2=Mid, 3=Hot - immer, unabhaengig von rotation

export const SWU_BODY_FEATURE_CODE: Record<SwuBodyFeature, 'R' | 'M' | 'B'> = {
  ring: 'R',
  moon: 'M',
  base: 'B',
};

export const SWU_ROTATION_CODE: Record<SwuRotationType, 'G' | 'R'> = {
  'tidal-locked': 'G',
  rotating: 'R',
};

const SWU_ROTATION_CODE_TO_TYPE: Record<'G' | 'R', SwuRotationType> = {
  G: 'tidal-locked',
  R: 'rotating',
};
const SWU_BODY_FEATURE_CODE_TO_TYPE: Record<'R' | 'M' | 'B', SwuBodyFeature> = {
  R: 'ring',
  M: 'moon',
  B: 'base',
};

/**
 * Kehrfunktion zu buildSwuPlanetCode: liest Rotation und Body-Feature aus dem
 * Code zurueck, der im Namen eines generierten SWU-Testsystem-Objekts steckt
 * (z.B. "Sumpf (Rotierend, Ring) [P4RR]" -> { rotation: 'rotating', bodyFeature: 'ring' }).
 * Rotation/Body-Feature sind noch keine eigenen Spalten auf CelestialObject -
 * bis dahin ist der Name die einzige Quelle. null, wenn kein Code gefunden wurde.
 */
export function inferSwuInstanceFromName(
  name: string | null | undefined,
): { rotation: SwuRotationType; bodyFeature: SwuBodyFeature } | null {
  if (!name) return null;
  const match = /\[P\d+([GR])([RMB])\]/.exec(name);
  if (!match) return null;
  return {
    rotation: SWU_ROTATION_CODE_TO_TYPE[match[1] as 'G' | 'R'],
    bodyFeature: SWU_BODY_FEATURE_CODE_TO_TYPE[match[2] as 'R' | 'M' | 'B'],
  };
}

/**
 * Wie inferSwuInstanceFromName, aber mit verlaesslichem Fallback: objectType
 * ist IMMER bekannt (aus celestial_objects), der Name dagegen nur bei den
 * synthetischen SWU-Testsystem-Objekten kodiert (siehe swu-system-generator.
 * ts) - echte Monde (z.B. per "SET EMPTY TO SWU" konvertierte STU-Monde mit
 * Namen wie "Tactical-1 IIa") tragen KEINEN Bracket-Code und fielen bisher
 * faelschlich auf bodyFeature 'base' zurueck, wurden also mit voller
 * Planeten-Groesse statt der kleineren Mond-Dimensionen gegruendet. objectType
 * ist fuer die Mond-Erkennung deshalb immer die verlaesslichere Quelle als der
 * Name - ueberschreibt bodyFeature entsprechend, auch wenn der Name (noch)
 * einen anderen Bracket-Code traegt.
 */
export function resolveSwuInstance(object: {
  name: string | null | undefined;
  objectType: CelestialObjectType;
  swuRotation?: SwuRotationType | null;
  swuRing?: boolean | null;
}): { rotation: SwuRotationType; bodyFeature: SwuBodyFeature } {
  // Eigene Spalten sind die Quelle der Wahrheit; der Namens-Suffix nur Fallback.
  const fromName: { rotation: SwuRotationType; bodyFeature: SwuBodyFeature } | null =
    object.swuRotation != null
      ? {
          rotation: object.swuRotation,
          bodyFeature: object.swuRing ? 'ring' : 'base',
        }
      : inferSwuInstanceFromName(object.name);
  if (object.objectType === CelestialObjectType.MOON) {
    return { rotation: fromName?.rotation ?? 'rotating', bodyFeature: 'moon' };
  }
  return fromName ?? { rotation: 'rotating', bodyFeature: 'base' };
}

export const SWU_PLANET_TYPE_IDS: Record<string, number> = {
  "Erdähnlich": 1,
  "Ozeanwelt": 2,
  "Waldplanet": 3,
  "Sumpf": 4,
  "Savanne": 5,
  "Wüste": 6,
  "Gebirgswelt": 7,
  "Tundraartig": 8,
  "Marsartig": 9,
  "Arktisch": 10,
  "Archipel": 11,
  "Mondartig": 12,
  "Lavaplanet": 13,
  "Giftwelt": 14,
  "Gasplanet": 15,
};

// ---------------------------------------------------------------------------
// Platzhalter-Feld-IDs
// ---------------------------------------------------------------------------
export const PLACEHOLDER_SURFACE_FIELD = 101;
export const PLACEHOLDER_UNDERGROUND_FIELD = 202;
export const PLACEHOLDER_ORBIT_FIELD = 303;
export const PLACEHOLDER_RING_FIELD = 304;
export const SWU_START_FIELD_ID = 111;

// ---------------------------------------------------------------------------
// Basis-Kartengroesse & Mond-Ausschnitt
// ---------------------------------------------------------------------------
export const SWU_BASE_WIDTH = 6;
export const SWU_BASE_HEIGHT = 10;

/**
 * Ein Mond ist technisch nichts anderes als ein normal generierter Planet (voll
 * 6x10, MIT Untergrund-Durchlauf), von dem am Ende nur der mittige 5x7-Ausschnitt
 * behalten und der Untergrund verworfen wird. offsetY ist bewusst nicht exakt
 * mittig (10-7=3 Zeilen Rest, nicht durch 2 teilbar): 1 Zeile oben, 2 unten frei.
 */
export const SWU_MOON_CROP = {
  width: 5,
  height: 7,
  offsetX: Math.floor((SWU_BASE_WIDTH - 5) / 2), // 0
  offsetY: Math.floor((SWU_BASE_HEIGHT - 7) / 2), // 1
};

/**
 * Feste, zentrale Position fuer das Start-/HQ-Feld (111) auf der VOLLEN 6x10-Karte.
 * Liegt per Konstruktion immer innerhalb von SWU_MOON_CROP - Monde muessen dafuer
 * nichts Zusaetzliches pruefen.
 */
export const SWU_START_FIELD_POSITION = {
  x: SWU_MOON_CROP.offsetX + Math.floor(SWU_MOON_CROP.width / 2), // 2
  y: SWU_MOON_CROP.offsetY + Math.floor(SWU_MOON_CROP.height / 2), // 4
};

// ---------------------------------------------------------------------------
// Temperatur-Hilfsfunktionen (unveraendert: rotation-unabhaengig)
// ---------------------------------------------------------------------------
export function celsiusToKelvin(celsius: number): number {
  return Math.round((celsius + 273.15) * 100) / 100;
}

export type SwuTemperatureRangeK = [number, number];

/** Slot 1 = Cold, Slot 2 = Mid, Slot 3 = Hot - Drittel von min/max, immer gleich. */
export function splitZoneTemperatures(
  tempMinC: number | null,
  tempMaxC: number | null,
): Record<SwuZoneSlot, SwuTemperatureRangeK | null> {
  if (tempMinC === null || tempMaxC === null) {
    return { 1: null, 2: null, 3: null };
  }
  const min = celsiusToKelvin(tempMinC);
  const max = celsiusToKelvin(tempMaxC);
  const third = (max - min) / 3;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    1: [min, round2(min + third)],
    2: [round2(min + third), round2(min + 2 * third)],
    3: [round2(min + 2 * third), max],
  };
}

// ---------------------------------------------------------------------------
// Rotationszeit & Tag/Nacht-Zyklus (nur relevant, wenn eine Instanz 'rotating' ist)
// ---------------------------------------------------------------------------
export type SwuTimeState = 'day' | 'night';
export const SWU_REAL_HOURS_TO_GAME_MINUTES_FACTOR = 10; // 24h -> 240 Ingame-Minuten

export function realHoursToGameMinutes(realHours: number): number {
  return realHours * SWU_REAL_HOURS_TO_GAME_MINUTES_FACTOR;
}

export function getSurfaceFieldCode(baseFieldId: number, state: SwuTimeState): string {
  return `${state === 'day' ? 't' : 'n'}${baseFieldId}`;
}

/**
 * Tag/Nacht-Wechsel-Intervall eines konkreten rotierenden Planeten/Monds -
 * deterministisch gewuerfelt (seedKey = z.B. celestialObjectId, damit dasselbe
 * Objekt bei jedem Aufruf denselben Wert liefert), bewusst mit HOHER Varianz und
 * unabhaengig vom Archetyp: Planeten 12-150, Monde 6-80 (drehen tendenziell
 * schneller, die Bereiche ueberlappen aber). null bei Archetypen ohne
 * definierte Rotation.
 *
 * Anzeige-Konvention (Produktvorgabe, keine echte Umrechnung): der Wert wird in
 * der UI als "X Stunden" gezeigt.
 */
export const SWU_DAY_NIGHT_SWITCH_RANGE = {
  planet: [12, 150],
  moon: [6, 80],
} as const;

/**
 * SeededRNG (Park-Miller) liefert bei aehnlichen Seeds ("celestial-16" vs
 * "celestial-17") fast identische erste Werte - die ersten Ziehungen werden
 * daher verworfen, damit benachbarte Objekte breit streuen.
 */
function warmedUpRng(seed: string): SeededRNG {
  const rng = new SeededRNG(seed);
  for (let i = 0; i < 8; i++) rng.next();
  return rng;
}

export function computeSwuDayNightSwitchMinutes(
  archetype: Pick<SwuPlanetArchetype, 'rotationPeriodRealHoursRange'>,
  seedKey: string,
  isMoon = false,
): number | null {
  if (!archetype.rotationPeriodRealHoursRange) return null;
  const [min, max] = isMoon ? SWU_DAY_NIGHT_SWITCH_RANGE.moon : SWU_DAY_NIGHT_SWITCH_RANGE.planet;
  const rng = warmedUpRng(`daylength-${seedKey}`);
  return Math.round(rng.nextFloat(min, max));
}

/**
 * Zufaellige Startphase (Stunden, 0 .. voller Zyklus) des Tag/Nacht-Zyklus, damit
 * nicht alle Koerper gleichzeitig Tag/Nacht haben. Deterministisch je seedKey.
 */
export function computeSwuDayNightPhaseHours(seedKey: string, switchHours: number): number {
  const rng = warmedUpRng(`daylight-phase-${seedKey}`);
  return Math.round(rng.nextFloat(0, switchHours * 2) * 10) / 10;
}

/**
 * Gebundene Planeten/Monde: ewiger Tag auf der einen, ewige Nacht auf der
 * anderen Seite - der Terminator "kreiselt" (Libration) aber langsam. Liefert
 * die Dauer eines Pendelzyklus (Anzeige als "X Stunden"), 400-500.
 */
export const SWU_TERMINATOR_SHIFT_RANGE = [400, 500] as const;

export function computeSwuTerminatorShiftHours(seedKey: string): number {
  const rng = warmedUpRng(`terminator-${seedKey}`);
  return Math.round(rng.nextFloat(SWU_TERMINATOR_SHIFT_RANGE[0], SWU_TERMINATOR_SHIFT_RANGE[1]));
}

/**
 * Tag/Nacht-Status einer Spalte (Rotierend). Nacht wandert gestaffelt rechts nach
 * links, kippt nach halber Rotationsperiode wieder zurueck - durchgehender Zyklus.
 */
export function getColumnTimeState(
  rotationPeriodGameMinutes: number,
  width: number,
  columnIndex: number,
  elapsedGameMinutes: number,
): SwuTimeState {
  const staggerOffset = ((width - 1 - columnIndex) / width) * rotationPeriodGameMinutes;
  const phase =
    (((elapsedGameMinutes - staggerOffset) % rotationPeriodGameMinutes) + rotationPeriodGameMinutes) %
    rotationPeriodGameMinutes;
  return phase < rotationPeriodGameMinutes / 2 ? 'night' : 'day';
}

// ---------------------------------------------------------------------------
// Datenmodell
// ---------------------------------------------------------------------------
export interface SwuBiomeRef {
  primaryBiome: string | null;
  primaryBiomeId: number | null;
  secondaryBiome: string | null;
  secondaryBiomeId: number | null;
}

export interface SwuLandingZoneTemplate {
  slot: SwuZoneSlot;
  /** Verwendet, wenn die Instanz 'rotating' ist ODER kein tidalLockedOverride existiert. */
  default: SwuBiomeRef;
  /** Nur gesetzt, wenn die Quelltabelle fuer Gebunden abweichende Biome auswies. */
  tidalLockedOverride: SwuBiomeRef | null;
}

export interface SwuPlanetArchetype {
  typeId: number;
  typeName: string;
  /** Nur gesetzt, wenn es fuer denselben Typ mehrere inhaltliche Varianten gibt (z.B. Gasplanet A-D). */
  variant: string | null;
  ringPossible: boolean;
  moonPossible: boolean;
  /** Ob fuer diesen Typ bereits Gebunden-spezifische Biom-Overrides vorliegen. */
  tidalLockedPossible: boolean;
  atmosphere: string | null;
  temperatureRangeC: SwuTemperatureRangeK | null;
  landable: boolean;
  rotationPeriodRealHoursRange: SwuTemperatureRangeK | null;
  zones: SwuLandingZoneTemplate[];
  description: string | null;
  /** Zusatz-Beschreibung nur fuer die gebundene Variante (z.B. 'Eyeball Planet'-Flavor). */
  tidalLockedDescription: string | null;
  /**
   * false = kommt NICHT als Startplanet fuer neue Spieler in Frage
   * (Auftraggeber-Vorgabe: Ozeanwelt/Sumpf/Archipel haben an der Oberflaeche
   * kaum Fels/Berge, die abbaubaren Erze liegen erst im Untergrund, der
   * zuerst per Forschung freigeschaltet werden muss - siehe Untergrund-
   * Wissen). Undefined/true = normal startplaneten-faehig.
   */
  starterEligible?: boolean;
}

/** Liefert die tatsaechlich zu verwendende Biom-Referenz fuer eine Zone+Rotation. */
export function resolveZoneBiome(
  zone: SwuLandingZoneTemplate,
  rotation: SwuRotationType,
): SwuBiomeRef {
  if (rotation === 'tidal-locked' && zone.tidalLockedOverride) {
    return zone.tidalLockedOverride;
  }
  return zone.default;
}

export interface SwuResolvedLandingZone {
  slot: SwuZoneSlot;
  label: string;
  biome: SwuBiomeRef;
  temperatureRangeK: SwuTemperatureRangeK | null;
}

const SWU_ZONE_LABELS: Record<SwuRotationType, Record<SwuZoneSlot, string>> = {
  rotating: { 1: 'Kolonie in Polregion', 2: 'Kolonie in Gemäßigter Zone', 3: 'Kolonie am Äquator' },
  'tidal-locked': {
    1: 'Kolonie auf Nachtseite',
    2: 'Kolonie am Terminator',
    3: 'Kolonie auf Tagseite',
  },
};

/** Loest alle 3 Zonen eines Archetyps fuer eine konkrete Rotation auf (Biom + Temp + Label). */
export function resolveLandingZones(
  archetype: SwuPlanetArchetype,
  rotation: SwuRotationType,
): SwuResolvedLandingZone[] {
  const temps = splitZoneTemperatures(archetype.temperatureRangeC?.[0] ?? null, archetype.temperatureRangeC?.[1] ?? null);
  return archetype.zones.map((zone) => ({
    slot: zone.slot,
    label: SWU_ZONE_LABELS[rotation][zone.slot],
    biome: resolveZoneBiome(zone, rotation),
    temperatureRangeK: temps[zone.slot],
  }));
}

function biomeRef(
  primary: string | null,
  primaryId: number | null,
  secondary: string | null,
  secondaryId: number | null,
): SwuBiomeRef {
  return {
    primaryBiome: primary,
    primaryBiomeId: primaryId,
    secondaryBiome: secondary,
    secondaryBiomeId: secondaryId,
  };
}

function zoneTemplate(
  slot: SwuZoneSlot,
  def: [string | null, number | null, string | null, number | null],
  override: [string | null, number | null, string | null, number | null] | null,
): SwuLandingZoneTemplate {
  return {
    slot,
    default: biomeRef(def[0], def[1], def[2], def[3]),
    tidalLockedOverride: override ? biomeRef(override[0], override[1], override[2], override[3]) : null,
  };
}

// ---------------------------------------------------------------------------
// Biom-Registry: stabile IDs fuer alle in der Quelltabelle vorkommenden Biom-Namen
// (nach Ersterscheinung durchnummeriert). Der Biom-Generator arbeitet nur noch
// mit diesen IDs, nicht mit den Namen.
// ---------------------------------------------------------------------------
export const SWU_BIOME_REGISTRY: Record<number, string> = {
  1: "Eis",
  2: "Tundra",
  3: "Gemäßigter Wald",
  4: "Gem Wiesen",
  5: "Regenwald",
  6: "Tropisches Meer",
  7: "Eispanzer",
  8: "Packeis",
  9: "Aktive Vulkane",
  10: "Eisschollen",
  11: "Korallen",
  12: "Mangroven",
  13: "Offenes Meer",
  14: "Tundrawälder",
  15: "Tropischer Sumpfwald",
  16: "Tundrasümpfe",
  17: "Gem Moor",
  18: "Sandwüste",
  19: "Steppe",
  20: "Wiese",
  21: "Felsen",
  22: "Tropische Wiesen",
  23: "Savanne",
  24: "Kälte Wüste",
  25: "Steppe / Ödland",
  26: "Wüste",
  27: "Kalte Wüste",
  28: "Gebirge",
  29: "Schnee",
  30: "Wälder",
  31: "Eiskappe",
  32: "Rotes Ödland",
  33: "Steinmassiv",
  34: "Tundrastreifen",
  35: "Sandbänke",
  36: "Krater",
  37: "Regolith",
  38: "Schnee auf Lava",
  39: "Erstarrte Lava",
  40: "Asche Wüste",
  41: "Schwefelseen",
  42: "Gas",
  43: "Mehr Gas",
};

export const SWU_BIOME_NAME_TO_ID: Record<string, number> = {
  "Eis": 1,
  "Tundra": 2,
  "Gemäßigter Wald": 3,
  "Gem Wiesen": 4,
  "Regenwald": 5,
  "Tropisches Meer": 6,
  "Eispanzer": 7,
  "Packeis": 8,
  "Aktive Vulkane": 9,
  "Eisschollen": 10,
  "Korallen": 11,
  "Mangroven": 12,
  "Offenes Meer": 13,
  "Tundrawälder": 14,
  "Tropischer Sumpfwald": 15,
  "Tundrasümpfe": 16,
  "Gem Moor": 17,
  "Sandwüste": 18,
  "Steppe": 19,
  "Wiese": 20,
  "Felsen": 21,
  "Tropische Wiesen": 22,
  "Savanne": 23,
  "Kälte Wüste": 24,
  "Steppe / Ödland": 25,
  "Wüste": 26,
  "Kalte Wüste": 27,
  "Gebirge": 28,
  "Schnee": 29,
  "Wälder": 30,
  "Eiskappe": 31,
  "Rotes Ödland": 32,
  "Steinmassiv": 33,
  "Tundrastreifen": 34,
  "Sandbänke": 35,
  "Krater": 36,
  "Regolith": 37,
  "Schnee auf Lava": 38,
  "Erstarrte Lava": 39,
  "Asche Wüste": 40,
  "Schwefelseen": 41,
  "Gas": 42,
  "Mehr Gas": 43,
};

// ---------------------------------------------------------------------------
// Die 18 Planeten-Archetypen aus Planetentypen.xlsx (Rotation herausgeloest)
// ---------------------------------------------------------------------------
export const SWU_PLANET_ARCHETYPES: SwuPlanetArchetype[] = [
  {
    typeId: 1,
    typeName: "Erdähnlich",
    variant: null,
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: true,
    atmosphere: "Dicht",
    temperatureRangeC: [-25, 35],
    landable: true,
    rotationPeriodRealHoursRange: [18, 30],
    zones: [
      zoneTemplate(1, ["Eis", 1, "Tundra", 2], ["Eispanzer", 7, "Packeis", 8]),
      zoneTemplate(2, ["Gemäßigter Wald", 3, "Gem Wiesen", 4], ["Gemäßigter Wald", 3, "Gem Wiesen", 4]),
      zoneTemplate(3, ["Regenwald", 5, "Tropisches Meer", 6], ["Aktive Vulkane", 9, null, null]),
    ],
    description: "Breite Range, da 3 Zonen echte Varianz brauchen",
    tidalLockedDescription: "Der Klassiker (Eyeball Planet): Tagseite geschmolzen/warm, Nachtseite vereist, Terminator = einziger bewohnbarer Ring",
  },
  {
    typeId: 2,
    typeName: "Ozeanwelt",
    variant: null,
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: true,
    atmosphere: "Dicht",
    temperatureRangeC: [-10, 32],
    landable: true,
    rotationPeriodRealHoursRange: [18, 30],
    zones: [
      zoneTemplate(1, ["Packeis", 8, "Eisschollen", 10], ["Packeis", 8, "Eisschollen", 10]),
      zoneTemplate(2, ["Korallen", 11, "Mangroven", 12], ["Offenes Meer", 13, "Eisschollen", 10]),
      zoneTemplate(3, ["Offenes Meer", 13, null, null], ["Offenes Meer", 13, null, null]),
    ],
    description: "Meer verhindert Extremwerte (Waermepuffer)",
    tidalLockedDescription: "Tagseite offenes Meer, Nachtseite Packeis/Eispanzer, Terminator = Uebergang mit Eisschollen",
    starterEligible: false,
  },
  {
    typeId: 3,
    typeName: "Waldplanet",
    variant: null,
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: false,
    atmosphere: "Dicht",
    temperatureRangeC: [-15, 30],
    landable: true,
    rotationPeriodRealHoursRange: [18, 30],
    zones: [
      zoneTemplate(1, ["Tundrawälder", 14, null, null], null),
      zoneTemplate(2, ["Gemäßigter Wald", 3, null, null], null),
      zoneTemplate(3, ["Regenwald", 5, "Tropischer Sumpfwald", 15], null),
    ],
    description: "Feuchtigkeit begrenzt Extreme nach oben",
    tidalLockedDescription: null,
  },
  {
    typeId: 4,
    typeName: "Sumpf",
    variant: null,
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: false,
    atmosphere: "Dicht",
    temperatureRangeC: [-5, 33],
    landable: true,
    rotationPeriodRealHoursRange: [18, 30],
    zones: [
      zoneTemplate(1, ["Tundrasümpfe", 16, null, null], null),
      zoneTemplate(2, ["Gem Moor", 17, null, null], null),
      zoneTemplate(3, ["Tropischer Sumpfwald", 15, "Mangroven", 12], null),
    ],
    description: "Braucht durchgaengig Feuchtigkeit, daher enger unten",
    tidalLockedDescription: null,
    starterEligible: false,
  },
  {
    typeId: 5,
    typeName: "Savanne",
    variant: null,
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: false,
    atmosphere: "Mittel",
    temperatureRangeC: [-10, 40],
    landable: true,
    rotationPeriodRealHoursRange: [18, 30],
    zones: [
      zoneTemplate(1, ["Sandwüste", 18, "Steppe", 19], null),
      zoneTemplate(2, ["Wiese", 20, "Felsen", 21], null),
      zoneTemplate(3, ["Tropische Wiesen", 22, "Savanne", 23], null),
    ],
    description: "Trockenheit laesst Tagesspitzen hoch",
    tidalLockedDescription: null,
  },
  {
    typeId: 6,
    typeName: "Wüste",
    variant: null,
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: true,
    atmosphere: "Dünn",
    temperatureRangeC: [-20, 50],
    landable: true,
    rotationPeriodRealHoursRange: [18, 30],
    zones: [
      zoneTemplate(1, ["Kälte Wüste", 24, null, null], ["Kalte Wüste", 27, null, null]),
      zoneTemplate(2, ["Steppe / Ödland", 25, "Wiese", 20], ["Steppe / Ödland", 25, "Wiese", 20]),
      zoneTemplate(3, ["Wüste", 26, null, null], ["Wüste", 26, null, null]),
    ],
    description: "Grosse Tag/Nacht-Schwankung typisch fuer duenne Atmo",
    tidalLockedDescription: "Passt zur ohnehin duennen Atmo - Tagseite Gluthitze, Nachtseite Frostwueste, Terminator = einzige gemaessigte Zone",
  },
  {
    typeId: 7,
    typeName: "Gebirgswelt",
    variant: null,
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: false,
    atmosphere: "Dünn",
    temperatureRangeC: [-40, 15],
    landable: true,
    rotationPeriodRealHoursRange: [18, 30],
    zones: [
      zoneTemplate(1, ["Gebirge", 28, "Schnee", 29], null),
      zoneTemplate(2, ["Gebirge", 28, "Tundra", 2], null),
      zoneTemplate(3, ["Gebirge", 28, "Wälder", 30], null),
    ],
    description: "Hoehenlage drueckt Max stark runter",
    tidalLockedDescription: null,
  },
  {
    typeId: 8,
    typeName: "Tundraartig",
    variant: null,
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: false,
    atmosphere: "Dicht",
    temperatureRangeC: [-45, 5],
    landable: true,
    rotationPeriodRealHoursRange: [18, 30],
    zones: [
      zoneTemplate(1, ["Eispanzer", 7, "Tundrasümpfe", 16], null),
      zoneTemplate(2, ["Tundra", 2, null, null], null),
      zoneTemplate(3, [null, null, null, null], null),
    ],
    description: "Kaum bis keine tropische Zone",
    tidalLockedDescription: null,
  },
  {
    typeId: 9,
    typeName: "Marsartig",
    variant: null,
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: true,
    atmosphere: "Dünn",
    temperatureRangeC: [-80, 20],
    landable: true,
    rotationPeriodRealHoursRange: [18, 30],
    zones: [
      zoneTemplate(1, ["Eiskappe", 31, null, null], ["Eiskappe", 31, "Kalte Wüste", 27]),
      zoneTemplate(2, ["Kalte Wüste", 27, null, null], [null, null, null, null]),
      zoneTemplate(3, ["Rotes Ödland", 32, "Steinmassiv", 33], ["Rotes Ödland", 32, "Steinmassiv", 33]),
    ],
    description: "Riesige Schwankung mangels Atmo-Puffer",
    tidalLockedDescription: "Kaum Atmo = kaum Pufferung, Tagseite mild, Nachtseite extrem kalt, Terminator = schmaler Uebergangsstreifen",
  },
  {
    typeId: 10,
    typeName: "Arktisch",
    variant: null,
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: false,
    atmosphere: "Dünn",
    temperatureRangeC: [-70, -5],
    landable: true,
    rotationPeriodRealHoursRange: [18, 30],
    zones: [
      zoneTemplate(1, ["Eispanzer", 7, "Packeis", 8], null),
      zoneTemplate(2, ["Eispanzer", 7, "Packeis", 8], null),
      zoneTemplate(3, ["Tundrastreifen", 34, null, null], null),
    ],
    description: "Bleibt durchgehend unter Gefrierpunkt",
    tidalLockedDescription: null,
  },
  {
    typeId: 11,
    typeName: "Archipel",
    variant: null,
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: false,
    atmosphere: "Dicht",
    temperatureRangeC: [15, 35],
    landable: true,
    rotationPeriodRealHoursRange: [18, 30],
    zones: [
      zoneTemplate(1, ["Offenes Meer", 13, "Sandbänke", 35], null),
      zoneTemplate(2, ["Tropisches Meer", 6, "Korallen", 11], null),
      zoneTemplate(3, ["Tropisches Meer", 6, "Korallen", 11], null),
    ],
    description: "Enge Range, quasi permanent tropisch",
    tidalLockedDescription: null,
    starterEligible: false,
  },
  {
    typeId: 12,
    typeName: "Mondartig",
    variant: null,
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: true,
    atmosphere: "Keine",
    temperatureRangeC: [-150, 120],
    landable: true,
    rotationPeriodRealHoursRange: [18, 30],
    zones: [
      zoneTemplate(1, ["Krater", 36, "Regolith", 37], ["Krater", 36, "Regolith", 37]),
      zoneTemplate(2, [null, null, null, null], ["Krater", 36, "Regolith", 37]),
      zoneTemplate(3, [null, null, null, null], ["Krater", 36, "Regolith", 37]),
    ],
    description: "Extremste Range im ganzen System (keine Atmo = keine Pufferung)",
    tidalLockedDescription: "Keine Atmo = maximaler Kontrast (wie Merkur real).",
  },
  {
    typeId: 13,
    typeName: "Lavaplanet",
    variant: null,
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: true,
    atmosphere: "Keine",
    temperatureRangeC: [100, 800],
    landable: true,
    rotationPeriodRealHoursRange: [18, 30],
    zones: [
      zoneTemplate(1, ["Schnee auf Lava", 38, null, null], ["Erstarrte Lava", 39, "Asche Wüste", 40]),
      zoneTemplate(2, ["Erstarrte Lava", 39, "Asche Wüste", 40], [null, null, null, null]),
      zoneTemplate(3, ["Aktive Vulkane", 9, null, null], ["Aktive Vulkane", 9, null, null]),
    ],
    description: "Untere Grenze schon lebensfeindlich, Vulkanzonen weit drueber",
    tidalLockedDescription: "Sterne-nahe Umlaufbahn oft Voraussetzung fuer gebundene Rotation sowieso",
  },
  {
    typeId: 14,
    typeName: "Giftwelt",
    variant: null,
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: false,
    atmosphere: "Toxisch",
    temperatureRangeC: [60, 250],
    landable: true,
    rotationPeriodRealHoursRange: [18, 30],
    zones: [
      zoneTemplate(1, [null, null, null, null], null),
      zoneTemplate(2, ["Erstarrte Lava", 39, "Schwefelseen", 41], null),
      zoneTemplate(3, [null, null, null, null], null),
    ],
    description: "Dichte toxische Atmo haelt Hitze, aber kein Erdaehnlich-Level",
    tidalLockedDescription: null,
  },
  {
    typeId: 15,
    typeName: "Gasplanet",
    variant: "A",
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: false,
    atmosphere: "Extrem Dicht",
    temperatureRangeC: null,
    landable: true,
    rotationPeriodRealHoursRange: null,
    zones: [
      zoneTemplate(1, [null, null, null, null], null),
      zoneTemplate(2, ["Gas", 42, null, null], null),
      zoneTemplate(3, ["Erstarrte Lava", 39, "Asche Wüste", 40], null),
    ],
    description: "Dichte Atmo haelt Hitze, aber kein Erdaehnlich-Level",
    tidalLockedDescription: null,
  },
  {
    typeId: 15,
    typeName: "Gasplanet",
    variant: "B",
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: false,
    atmosphere: "Toxisch",
    temperatureRangeC: null,
    landable: true,
    rotationPeriodRealHoursRange: null,
    zones: [
      zoneTemplate(1, [null, null, null, null], null),
      zoneTemplate(2, ["Gas", 42, null, null], null),
      zoneTemplate(3, ["Mehr Gas", 43, null, null], null),
    ],
    description: "Variante B - nur Quelldaten uebernommen",
    tidalLockedDescription: null,
  },
  {
    typeId: 15,
    typeName: "Gasplanet",
    variant: "C",
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: false,
    atmosphere: "Toxisch",
    temperatureRangeC: null,
    landable: true,
    rotationPeriodRealHoursRange: null,
    zones: [
      zoneTemplate(1, [null, null, null, null], null),
      zoneTemplate(2, ["Gas", 42, null, null], null),
      zoneTemplate(3, [null, null, null, null], null),
    ],
    description: "Variante C - nur Quelldaten uebernommen",
    tidalLockedDescription: null,
  },
  {
    typeId: 15,
    typeName: "Gasplanet",
    variant: "D",
    ringPossible: true,
    moonPossible: true,
    tidalLockedPossible: false,
    atmosphere: "Toxisch",
    temperatureRangeC: null,
    landable: true,
    rotationPeriodRealHoursRange: null,
    zones: [
      zoneTemplate(1, [null, null, null, null], null),
      zoneTemplate(2, ["Gas", 42, null, null], null),
      zoneTemplate(3, [null, null, null, null], null),
    ],
    description: "Variante D - nur Quelldaten uebernommen",
    tidalLockedDescription: null,
  },
];

/**
 * Archetypen, die als erste Kolonie fuer neue Spieler in Frage kommen (siehe
 * SwuPlanetArchetype.starterEligible). Noch nirgends verdrahtet - die
 * Starterkolonisierung laeuft aktuell ausschliesslich ueber alte STU-classIds
 * (STU_STARTER_PLANET_CLASS_IDS in colonization.service.ts), SWU-Archetypen
 * sind dort noch gar nicht erreichbar. Sobald das SWU-System dort einzieht,
 * hier statt einer eigenen Liste konsultieren.
 */
export function getStarterEligibleSwuArchetypes(): SwuPlanetArchetype[] {
  return SWU_PLANET_ARCHETYPES.filter((a) => a.starterEligible !== false);
}

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------
export function buildSwuPlanetCode(
  archetype: SwuPlanetArchetype,
  rotation: SwuRotationType,
  bodyFeature: SwuBodyFeature,
  zoneSlot: SwuZoneSlot,
): string {
  return `P${archetype.typeId}${SWU_ROTATION_CODE[rotation]}${SWU_BODY_FEATURE_CODE[bodyFeature]}${zoneSlot}`;
}

// ---------------------------------------------------------------------------
// Platzhalter-Grid
// ---------------------------------------------------------------------------
export type SwuPlanetLayer = 'SURFACE' | 'UNDERGROUND' | 'ORBIT';

export interface SwuPlanetGridCell {
  layer: SwuPlanetLayer;
  x: number;
  y: number;
  /** Basis-Feld-Nummer (Platzhalter), z.B. 101/202/303/304/111 (Start-Feld) */
  fieldType: number;
  /** Nur bei SURFACE-Zellen (ausser Start-Feld) gesetzt: 't101'/'n101' je nach Tag/Nacht */
  surfaceFieldCode?: string;
  zoneSlot: SwuZoneSlot;
}

export interface SwuPlanetGrid {
  width: number;
  height: number;
  hasUnderground: boolean;
  hasRing: boolean;
  cells: SwuPlanetGridCell[];
}

function zoneForCell(rotation: SwuRotationType, x: number, y: number, width: number, height: number): SwuZoneSlot {
  if (rotation === 'rotating') {
    // 5 symmetrische Baender: Cold | Mid | Hot | Mid | Cold (horizontal)
    const relative = (y + 0.5) / height;
    const distFromEquator = Math.abs(relative - 0.5);
    if (distFromEquator > 0.3) return 1; // Cold (Polkappen)
    if (distFromEquator > 0.12) return 2; // Mid (Gemaessigt)
    return 3; // Hot (Aequator)
  }
  // Gebunden: 3 senkrechte Spalten Cold (Hinten) | Mid (Terminator) | Hot (Vorne)
  const band = width / 3;
  if (x < band) return 1;
  if (x >= width - band) return 3;
  return 2;
}

/**
 * Generiert IMMER die volle 6x10-Karte (mit Untergrund) und schneidet danach bei
 * bodyFeature === 'moon' den mittigen 5x7-Ausschnitt heraus (siehe SWU_MOON_CROP),
 * ohne Untergrund. Ein Mond ist also kein eigener Codepfad, sondern ein Zuschnitt
 * des ganz normal generierten Planeten.
 *
 * - Rotierend: horizontale Baender, SURFACE-Zellen bekommen je nach
 *   'elapsedGameMinutes' einen wandernden t/n-Code (siehe getColumnTimeState).
 * - Gebunden: vertikale Baender, t/n ist FEST (Zone 1 immer Nacht, Zone 3 immer
 *   Tag, Zone 2/Terminator hat keinen t/n-Code - eigenes Terrain).
 * - Ring (nur bodyFeature === 'ring'): unterste Orbit-Zeile wird getauscht.
 * - Start-Feld (111) sitzt immer an SWU_START_FIELD_POSITION - dadurch automatisch
 *   auch im Mond-Ausschnitt enthalten.
 */
export function generateSwuPlaceholderGrid(
  archetype: SwuPlanetArchetype,
  rotation: SwuRotationType,
  bodyFeature: SwuBodyFeature,
  elapsedGameMinutes = 0,
): SwuPlanetGrid {
  const width = SWU_BASE_WIDTH;
  const height = SWU_BASE_HEIGHT;
  const hasRing = bodyFeature === 'ring';

  const rotationPeriodGameMinutes = archetype.rotationPeriodRealHoursRange
    ? realHoursToGameMinutes(
        (archetype.rotationPeriodRealHoursRange[0] + archetype.rotationPeriodRealHoursRange[1]) / 2,
      )
    : null;

  const cells: SwuPlanetGridCell[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const zoneSlot = zoneForCell(rotation, x, y, width, height);
      const isStartField = x === SWU_START_FIELD_POSITION.x && y === SWU_START_FIELD_POSITION.y;

      let surfaceFieldCode: string | undefined;
      if (!isStartField) {
        if (rotation === 'rotating' && rotationPeriodGameMinutes) {
          const state = getColumnTimeState(rotationPeriodGameMinutes, width, x, elapsedGameMinutes);
          surfaceFieldCode = getSurfaceFieldCode(PLACEHOLDER_SURFACE_FIELD, state);
        } else if (rotation === 'tidal-locked') {
          if (zoneSlot === 1) surfaceFieldCode = getSurfaceFieldCode(PLACEHOLDER_SURFACE_FIELD, 'night');
          else if (zoneSlot === 3) surfaceFieldCode = getSurfaceFieldCode(PLACEHOLDER_SURFACE_FIELD, 'day');
          // zoneSlot === 2 (Terminator): kein t/n-Code, eigenes Terrain
        }
      }

      cells.push({
        layer: 'SURFACE',
        x,
        y,
        fieldType: isStartField ? SWU_START_FIELD_ID : PLACEHOLDER_SURFACE_FIELD,
        surfaceFieldCode,
        zoneSlot,
      });
      cells.push({
        layer: 'UNDERGROUND',
        x,
        y,
        fieldType: PLACEHOLDER_UNDERGROUND_FIELD,
        zoneSlot,
      });
      const isBottomOrbitRow = y === height - 1;
      const orbitField = hasRing && isBottomOrbitRow ? PLACEHOLDER_RING_FIELD : PLACEHOLDER_ORBIT_FIELD;
      cells.push({ layer: 'ORBIT', x, y, fieldType: orbitField, zoneSlot });
    }
  }

  const fullGrid: SwuPlanetGrid = { width, height, hasUnderground: true, hasRing, cells };

  if (bodyFeature === 'moon') {
    return cropGridToMoon(fullGrid);
  }
  return fullGrid;
}

/**
 * Schneidet den mittigen SWU_MOON_CROP-Ausschnitt aus einer voll generierten
 * 6x10-Karte heraus, verwirft den Untergrund und verschiebt die Koordinaten auf
 * 0-basiert innerhalb des Mondes.
 */
export function cropGridToMoon(fullGrid: SwuPlanetGrid): SwuPlanetGrid {
  const { width, height, offsetX, offsetY } = SWU_MOON_CROP;
  const cells: SwuPlanetGridCell[] = [];

  for (const cell of fullGrid.cells) {
    if (cell.layer === 'UNDERGROUND') continue; // Monde haben keinen Untergrund
    if (
      cell.x < offsetX ||
      cell.x >= offsetX + width ||
      cell.y < offsetY ||
      cell.y >= offsetY + height
    ) {
      continue; // ausserhalb des Ausschnitts
    }
    cells.push({ ...cell, x: cell.x - offsetX, y: cell.y - offsetY });
  }

  return { width, height, hasUnderground: false, hasRing: fullGrid.hasRing, cells };
}

export function getSwuPlanetArchetype(
  typeId: number,
  variant: string | null = null,
): SwuPlanetArchetype | null {
  return (
    SWU_PLANET_ARCHETYPES.find((a) => a.typeId === typeId && a.variant === variant) ?? null
  );
}

// ---------------------------------------------------------------------------
// Biom-Generator: baut die tatsaechliche Oberflaeche aus den Biom-IDs
// ---------------------------------------------------------------------------
export interface SwuBiomeSurfaceCell {
  x: number;
  y: number;
  zoneSlot: SwuZoneSlot;
  biomeId: number | null;
  biomeName: string | null;
  /** Nur gesetzt, wenn diese Zelle einen Tag/Nacht-Unterschied kennt (Rotierend immer,
   *  Gebunden nur in Cold-/Hot-Zone, NICHT im Terminator). */
  timeState: SwuTimeState | null;
  /** z.B. 't7' (Tag, Biom-ID 7), 'n7' (Nacht) oder einfach '7' ohne Tag/Nacht-Bezug. */
  fieldCode: string;
}

/**
 * Baut die SURFACE-Oberflaeche eines Planeten aus den Biom-Referenzen seiner Zonen.
 * Ignoriert bewusst bodyFeature (Ring/Moon/Base) - das Biom haengt nur von
 * (Archetyp, Rotation, Zone) ab, nicht davon, ob es sich um einen Mond handelt.
 * Fuer einen Mond nachtraeglich mit cropSurfaceToMoon() zuschneiden.
 *
 * Pro Zelle wird ueberwiegend das Primaer-Biom verwendet; existiert ein
 * Sekundaer-Biom, wird es geseedet (SECONDARY_BIOME_CHANCE) als Beimischung
 * eingestreut - deterministisch ueber (seed, x, y), keine echte Randomness.
 */
const SECONDARY_BIOME_CHANCE = 0.2;

export function generateSwuBiomeSurface(
  archetype: SwuPlanetArchetype,
  rotation: SwuRotationType,
  elapsedGameMinutes = 0,
  seed: string = `${archetype.typeId}-${archetype.variant ?? 'x'}-${rotation}`,
): SwuBiomeSurfaceCell[] {
  const width = SWU_BASE_WIDTH;
  const height = SWU_BASE_HEIGHT;
  const rng = new SeededRNG(seed);

  const rotationPeriodGameMinutes = archetype.rotationPeriodRealHoursRange
    ? realHoursToGameMinutes(
        (archetype.rotationPeriodRealHoursRange[0] + archetype.rotationPeriodRealHoursRange[1]) / 2,
      )
    : null;

  const cells: SwuBiomeSurfaceCell[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const zoneSlot = zoneForCell(rotation, x, y, width, height);
      const isStartField = x === SWU_START_FIELD_POSITION.x && y === SWU_START_FIELD_POSITION.y;

      if (isStartField) {
        cells.push({
          x,
          y,
          zoneSlot,
          biomeId: null,
          biomeName: null,
          timeState: null,
          fieldCode: String(SWU_START_FIELD_ID),
        });
        continue;
      }

      const zoneTemplateForSlot = archetype.zones.find((z) => z.slot === zoneSlot)!;
      const biome = resolveZoneBiome(zoneTemplateForSlot, rotation);
      const useSecondary = biome.secondaryBiomeId !== null && rng.nextBoolean(SECONDARY_BIOME_CHANCE);
      const biomeId = useSecondary ? biome.secondaryBiomeId : biome.primaryBiomeId;
      const biomeName = useSecondary ? biome.secondaryBiome : biome.primaryBiome;

      let timeState: SwuTimeState | null = null;
      if (rotation === 'rotating' && rotationPeriodGameMinutes) {
        timeState = getColumnTimeState(rotationPeriodGameMinutes, width, x, elapsedGameMinutes);
      } else if (rotation === 'tidal-locked' && zoneSlot !== 2) {
        // Cold Zone (1) = immer Nacht, Hot Zone (3) = immer Tag. Terminator (2) hat
        // keinen Tag/Nacht-Bezug - eigenes, fest stehendes Uebergangs-Terrain.
        timeState = zoneSlot === 1 ? 'night' : 'day';
      }

      const fieldCode =
        biomeId === null
          ? String(PLACEHOLDER_SURFACE_FIELD) // Biom fehlt noch in der Quelltabelle (z.B. Gasplanet-Zonen)
          : timeState
            ? getSurfaceFieldCode(biomeId, timeState)
            : String(biomeId);

      cells.push({ x, y, zoneSlot, biomeId, biomeName, timeState, fieldCode });
    }
  }

  return cells;
}

/** Generischer Zuschnitt auf den Mond-Ausschnitt fuer beliebige {x,y}-Zellen-Arrays. */
export function cropCellsToMoonBounds<T extends { x: number; y: number }>(cells: T[]): T[] {
  const { width, height, offsetX, offsetY } = SWU_MOON_CROP;
  return cells
    .filter((c) => c.x >= offsetX && c.x < offsetX + width && c.y >= offsetY && c.y < offsetY + height)
    .map((c) => ({ ...c, x: c.x - offsetX, y: c.y - offsetY }));
}

/** Baut die Biom-Oberflaeche und schneidet sie direkt auf Mondgroesse zu. */
export function generateSwuBiomeSurfaceForMoon(
  archetype: SwuPlanetArchetype,
  rotation: SwuRotationType,
  elapsedGameMinutes = 0,
  seed?: string,
): SwuBiomeSurfaceCell[] {
  return cropCellsToMoonBounds(generateSwuBiomeSurface(archetype, rotation, elapsedGameMinutes, seed));
}
