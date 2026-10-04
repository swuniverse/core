export type SwuTimeState = 'day' | 'night';

export type SwuDaylightInfo = {
  tidalLocked: boolean;
  zoneSlot: number;
  /** Rotierend: Dauer von Tag bzw. Nacht in Stunden (halbe Rotationsperiode). */
  dayNightSwitchMinutes: number | null;
  /** Gebunden: Dauer eines Terminator-Pendelzyklus in Stunden. */
  terminatorShiftHours?: number | null;
  dayNightPhaseHours?: number | null;
};

/** Anteil der Kartenbreite, um den der Terminator vom Zentrum aus pendelt. */
const TERMINATOR_AMPLITUDE = 0.35;

/** Anteil eines Tag/Nacht-Abschnitts, in dem die Grenze ueber die Karte wandert. */
const SWEEP_FRACTION = 0.3;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Umrechnung: 1 angezeigte "Stunde" = 1 echte Minute (110 Stunden Tag = 110 Minuten). */
const MS_PER_DISPLAY_HOUR = 60_000;

/**
 * Tag/Nacht-Zustand einer Spalte (Oberflaeche und Orbit).
 * - Rotierend: Tag und Nacht dauern je `dayNightSwitchMinutes` Stunden, die
 *   Grenze wandert dabei von links nach rechts ueber die Karte.
 * - Gebunden: Nachtseite (Zone 1) immer Nacht, Tagseite (Zone 3) immer Tag,
 *   am Terminator (Zone 2) pendelt die Tag/Nacht-Grenze langsam hin und her.
 */
export function surfaceTimeState(
  info: SwuDaylightInfo,
  column: number,
  width: number,
  nowMs: number,
): SwuTimeState {
  const hours = nowMs / MS_PER_DISPLAY_HOUR + (info.dayNightPhaseHours ?? 0);

  if (info.tidalLocked) {
    if (info.zoneSlot === 1) return 'night';
    if (info.zoneSlot === 3) return 'day';
    const cycle = info.terminatorShiftHours;
    if (!cycle) return 'day';
    const boundary =
      width / 2 +
      width * TERMINATOR_AMPLITUDE * Math.sin((2 * Math.PI * hours) / cycle);
    return column + 0.5 < boundary ? 'day' : 'night';
  }

  const half = info.dayNightSwitchMinutes;
  if (!half) return 'day';
  // Die Karte ist nur ein Ausschnitt: es wandert immer hoechstens EINE Grenze
  // von links nach rechts ueber die Spalten (Sonnenuntergang, spaeter
  // Sonnenaufgang) - nie ein Nachtband in der Mitte. Dazwischen ist die
  // ganze Karte Tag bzw. Nacht.
  const sweep = half * SWEEP_FRACTION;
  const columnDelay = (column / width) * sweep;
  const phase = mod(hours, half * 2);
  return phase >= columnDelay && phase < half + columnDelay ? 'night' : 'day';
}
