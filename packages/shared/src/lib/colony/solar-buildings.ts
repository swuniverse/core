/**
 * Solar-Gebaeude, deren Energie-Output am tatsaechlichen Solarertrag der
 * Kolonie haengt (colony.solarOutputTJ), statt an der festen epsProc aus dem
 * Gebaeude-Katalog. Faktor = Multiplikator auf solarOutputTJ/100 (Referenz:
 * 1600 TJ Basisertrag == 16 Energie, die alte STU-Pauschale). Ionensegel- und
 * Orbital-Solarkollektor sind baugleich (Faktor 1), Solarfokus 4.5-fach.
 */
export const SWU_SOLAR_BUILDING_ENERGY_FACTOR: Record<number, number> = {
  31010100: 1, // Ionensegel-Kollektor (Rebellen)
  31010300: 1, // Ionensegel-Kollektor (Imperium)
  31910100: 1, // Orbital-Solarkollektor / Solarsatellit (Rebellen)
  31910300: 1, // Orbital-Solarkollektor / Solarsatellit (Imperium)
  33020100: 4.5, // Solarfokus (Rebellen)
  33020300: 4.5, // Solarfokus (Imperium)
};

/** Energie-Output (pro Tick) eines Gebaeudes; Solar-Gebaeude skalieren mit dem Solarertrag, falls bekannt. */
export function resolveBuildingEpsProc(
  buildingId: number,
  catalogEpsProc: number | null | undefined,
  solarOutputTJ: number | null | undefined,
): number {
  const factor = SWU_SOLAR_BUILDING_ENERGY_FACTOR[buildingId];
  if (factor != null && solarOutputTJ != null) {
    return Math.floor((solarOutputTJ / 100) * factor);
  }
  return catalogEpsProc || 0;
}
