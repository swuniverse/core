/**
 * SWU Orbit-Generator
 * ------------------------------------------------------------------
 * Bisher komplett ausgelassen: die Orbit-Reihen kommen jetzt dazu, aus
 * Orbit.xlsx. Zwei Reihen:
 *
 *   UNTERER Orbit (OU*): abhaengig vom Atmosphaerentyp des Archetyps (5
 *     Kategorien: A=Atmosphaerisch, B=Gasriese, C=Duenne Eisenatmosphaere,
 *     D=Giftatmosphaere, E=Keine Atmosphaere). Felder 1-4 rotieren fest
 *     gleichmaessig (1,2,3,4,1,2,...). AUSNAHME: in Polnaehe (aeusserste
 *     Spalten links/rechts) wird IMMER Feld 9 statt Feld 4 verwendet, egal
 *     wo genau die 1-2-3-4-Rotation gerade steht.
 *
 *   OBERER Orbit (OO*): haengt davon ab, ob die Instanz einen Ring hat.
 *     Ohne Ring: OO10/20/30/40 (nur fuer "keine Atmosphaere" in der Tabelle
 *     vorhanden, aber als generischer ringloser Orbit fuer ALLE Atmosphaeren-
 *     typen verwendet - es gibt keine A/B/C/D-Varianten fuer den oberen Orbit
 *     ohne Ring). Mit Ring: OO1<Farbe>, EINE Farbe fest pro Planeten-Archetyp
 *     (nicht zufaellig) - einfacher zu handhaben und visuell konsistent pro Typ.
 *
 * ANNAHME (bitte gegenchecken): "Polnaehe" = die jeweils aeusserste Spalte
 * links und rechts der 10 breiten Orbit-Reihe. Falls das nicht stimmt, sag
 * Bescheid, wie viele Spalten das genau sein sollen.
 */

export type SwuOrbitAtmosphereType = 'A' | 'B' | 'C' | 'D' | 'E';

export type SwuRingColor =
  | 'F' // Weiss
  | 'G' // Grau
  | 'H' // Rot
  | 'I' // Orange
  | 'J' // Gelb
  | 'K' // Gruen
  | 'L' // Blau
  | 'M' // Lila
  | 'N'; // Bunt

/**
 * Atmosphaerentyp je Archetyp (typeId, optional variant) - aus den urspruenglichen
 * Planetentypen.xlsx-Atmosphaere-Werten abgeleitet:
 *   A = Erdaehnlich/Ozeanwelt/Waldplanet/Sumpf/Savanne/Wueste/Gebirgswelt/
 *       Tundraartig/Arktisch/Archipel (Dicht/Mittel/Duenn - "normale" Atmosphaere)
 *   B = Gasplanet (Extrem Dicht/Toxisch, aber strukturell Gasriese)
 *   C = Marsartig (passt zu "Duenne Eisenatmosphaere" - Mars-Analogie)
 *   D = Giftwelt (Atmosphaere=Toxisch)
 *   E = Mondartig UND Lavaplanet (Atmosphaere=Keine; Giftwelt = Lavaplanet mit Atmosphaere)
 */
export const SWU_ARCHETYPE_ATMOSPHERE: Record<string, SwuOrbitAtmosphereType> = {
  '1': 'A', // Erdaehnlich
  '2': 'A', // Ozeanwelt
  '3': 'A', // Waldplanet
  '4': 'A', // Sumpf
  '5': 'A', // Savanne
  '6': 'A', // Wueste
  '7': 'A', // Gebirgswelt
  '8': 'A', // Tundraartig
  '9': 'C', // Marsartig
  '10': 'A', // Arktisch
  '11': 'A', // Archipel
  '12': 'E', // Mondartig
  '13': 'E', // Lavaplanet (keine Atmosphaere)
  '14': 'D', // Giftwelt
  '15-A': 'B', // Gasplanet A
  '15-B': 'B', // Gasplanet B
  '15-C': 'B', // Gasplanet C
  '15-D': 'B', // Gasplanet D
};

/** Ringfarbe je Archetyp, FEST (nicht zufaellig) - eigene Vorschlaege, bitte gegenchecken. */
export const SWU_ARCHETYPE_RING_COLOR: Record<string, SwuRingColor> = {
  '1': 'N', // Erdaehnlich - Bunt
  '2': 'L', // Ozeanwelt - Blau
  '3': 'N', // Waldplanet - Bunt
  '4': 'N', // Sumpf - Bunt
  '5': 'J', // Savanne - Gelb
  '6': 'I', // Wueste - Orange
  '7': 'G', // Gebirgswelt - Grau
  '8': 'F', // Tundraartig - Weiss
  '9': 'H', // Marsartig - Rot
  '10': 'F', // Arktisch - Weiss
  '11': 'L', // Archipel - Blau
  '12': 'G', // Mondartig - Grau
  '13': 'I', // Lavaplanet - Orange
  '14': 'M', // Giftwelt - Lila
  '15-A': 'I', // Gasplanet A - Orange
  '15-B': 'J', // Gasplanet B - Gelb
  '15-C': 'K', // Gasplanet C - Gruen
  '15-D': 'M', // Gasplanet D - Lila
};

export function getArchetypeKey(typeId: number, variant: string | null): string {
  return variant ? `${typeId}-${variant}` : `${typeId}`;
}

/**
 * Baut die untere Orbit-Reihe: die aeusserste Spalte links UND rechts (Pol-
 * naehe) bekommt IMMER Feld 9, unabhaengig von der Rotation. Die mittleren
 * Spalten rotieren fest gleichmaessig 1-2-3-4-1-2-... (eigener Zaehler, startet
 * bei der ersten Nicht-Pol-Spalte neu bei 1).
 */
export function buildLowerOrbitRow(atmosphere: SwuOrbitAtmosphereType, width = 10): string[] {
  const row: string[] = [];
  let middleCounter = 0;
  for (let x = 0; x < width; x++) {
    const isPoleRegion = x === 0 || x === width - 1;
    if (isPoleRegion) {
      row.push(`OU9${atmosphere}`);
    } else {
      const rotationIndex = (middleCounter % 4) + 1;
      row.push(`OU${rotationIndex}${atmosphere}`);
      middleCounter++;
    }
  }
  return row;
}

/**
 * Baut die obere Orbit-Reihe: mit Ring eine feste Farbe (archetypgebunden),
 * ohne Ring die generische ringlose Rotation OO10/20/30/40.
 */
export function buildUpperOrbitRow(hasRing: boolean, ringColor: SwuRingColor, width = 10): string[] {
  if (hasRing) {
    return Array.from({ length: width }, () => `OO1${ringColor}`);
  }
  const genericCodes = ['OO10', 'OO20', 'OO30', 'OO40'];
  return Array.from({ length: width }, (_, x) => genericCodes[x % 4]);
}

/** Baut beide Orbit-Reihen fuer einen Archetyp (typeId+variant) und ein bodyFeature. */
export function buildOrbitRows(
  typeId: number,
  variant: string | null,
  hasRing: boolean,
  width = 10,
): { lower: string[]; upper: string[] } {
  const key = getArchetypeKey(typeId, variant);
  const atmosphere = SWU_ARCHETYPE_ATMOSPHERE[key] ?? 'A';
  const ringColor = SWU_ARCHETYPE_RING_COLOR[key] ?? 'F';
  return {
    lower: buildLowerOrbitRow(atmosphere, width),
    upper: buildUpperOrbitRow(hasRing, ringColor, width),
  };
}
