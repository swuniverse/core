/**
 * Dateinamen der SWU-Planetengrafiken (assets/SWU_PLANETS).
 *
 * Schema: SWU_<KK>_<R><K><G><S>.png
 *   KK  Klassenkuerzel (siehe SWU_PLANET_ASSET_CODE)
 *   R   Rotation: R = rotierend, T = Tidal Locked
 *   K   Koerper:  P = Planet, M = Mond
 *   G   Ringe:    R = Ringe, 0 = keine
 *   S   Schild:   S = planetarer Schild errichtet, 0 = keiner (Standard)
 *
 * Rotation und Ring stehen nicht in eigenen Spalten, sondern als Code im
 * Objektnamen ("... [P1GR]", siehe inferSwuInstanceFromName im Backend):
 * G = gebunden, R = rotierend; R = Ring, M = Mond, B = Basis.
 */

/** Synthetische SWU-classIds liegen im Bereich 90000-90999 (90000 + typeId*10 + Variante). */
export function isSwuClassId(classId: number | null | undefined): boolean {
  return classId != null && classId >= 90000 && classId < 91000;
}

export const SWU_PLANET_ASSET_CODE: Record<number, string> = {
  90010: 'TE', // Erdaehnlich
  90020: 'OZ', // Ozeanwelt
  90030: 'WA', // Waldplanet
  90040: 'SU', // Sumpf
  90050: 'SA', // Savanne
  90060: 'DE', // Wueste
  90070: 'GE', // Gebirgswelt
  90080: 'TU', // Tundraartig
  90090: 'MA', // Marsartig
  90100: 'PO', // Arktisch / Polar
  90110: 'AR', // Archipel
  90120: 'PL', // Mondartig / Planetoid
  90130: 'VU', // Lavaplanet / Vulkanisch
  90140: 'GI', // Giftwelt
  90150: 'G1', // Gasplanet A
  90151: 'G2', // Gasplanet B
  90152: 'G3', // Gasplanet C
  90153: 'G4', // Gasplanet D
};

/** Klassenkuerzel, fuer die es eine Tidal-Locked-Grafik gibt (= tidalLockedPossible im Generator). */
export const SWU_TIDAL_LOCKED_ASSET_CODES: ReadonlySet<string> = new Set([
  'TE',
  'OZ',
  'DE',
  'MA',
  'PL',
  'VU',
]);

export interface SwuPlanetAssetInput {
  classId: number | null | undefined;
  /** Objektname, der ggf. den Instanz-Code " [P1GR]" traegt. */
  name?: string | null;
  /** 1 = Planet, 2 = Mond, 3 = Asteroid (CelestialObjectType). */
  objectType?: number | null;
  /** Planetarer Schild errichtet (Kolonie mit shields > 0). */
  shielded?: boolean;
}

/** Dateiname (ohne Ordner) der SWU-Grafik, null wenn die classId kein SWU-Planet ist. */
export function getSwuPlanetAssetFileName(
  input: SwuPlanetAssetInput,
): string | null {
  if (input.classId == null) return null;
  const code = SWU_PLANET_ASSET_CODE[input.classId];
  if (!code) return null;

  const match = /\[P\d+([GR])([RMB])\]/.exec(input.name ?? '');
  const isMoon = input.objectType === 2 || match?.[2] === 'M';
  const tidalLocked =
    match?.[1] === 'G' && SWU_TIDAL_LOCKED_ASSET_CODES.has(code);
  const ring = !isMoon && match?.[2] === 'R';

  const rotation = tidalLocked ? 'T' : 'R';
  const body = isMoon ? 'M' : 'P';
  return `SWU_${code}_${rotation}${body}${ring ? 'R' : '0'}${input.shielded ? 'S' : '0'}.png`;
}
