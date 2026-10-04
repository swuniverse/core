/**
 * Erzverfuegbarkeit einer SWU-Kolonisierungszone fuer die Gruendungs-Vorschau.
 * Datenbasis sind die Rohstoff-Profile je Biom-Buchstabe
 * (swu-letter-resources.yaml) - "Quellen" ist der dortige Planeten-/Mond-Betrag.
 *
 * Einstufung (aus den Profil-Daten abgeleitet):
 * - Grunderze (Phrik, Kyber, Hypermaterie): "Reich an" ab 9 Quellen (Mond: 5),
 *   Kyber schon ab 3 (Mond: 2), sonst "Spuren von".
 * - Uebrige Rohstoffe: der mengenmaessig groesste ist das Sondererz
 *   (Planet "Reich an", Mond "Spuren von"), der zweitgroesste das Sekundaererz
 *   (nur Planet, "Spuren von"). Monde haben nur das Sondererz.
 */
export type SwuZoneOreTier = 'rich' | 'trace';

export interface SwuZoneOre {
  commodityId: number;
  name: string;
  tier: SwuZoneOreTier;
  sources: number;
}

const BASE_ORE_IDS = [1511, 1508, 1505] as const;
const RICH_THRESHOLD_PLANET = 9;
const RICH_THRESHOLD_MOON = 5;
// Kyber ist seltener: schon ab 3 Quellen (Mond: 2) "reich".
const KYBER_ID = 1508;
const KYBER_RICH_THRESHOLD_PLANET = 3;
const KYBER_RICH_THRESHOLD_MOON = 2;

const ORE_DISPLAY_NAMES: Record<number, string> = {
  1511: 'Phrik',
  1508: 'Kyber',
  1505: 'Hypermaterie',
  1520: 'Hochenergie-Plasma',
};

export function oreDisplayName(commodityId: number, rawName: string | undefined): string {
  return (
    ORE_DISPLAY_NAMES[commodityId] ??
    (rawName ?? `Rohstoff ${commodityId}`).replace(/-?Vorkommen$/, '').replace(/-Erz$/, '')
  );
}

export function classifyZoneOres(
  amounts: Map<number, number>,
  isMoon: boolean,
  nameOf: (commodityId: number) => string,
): SwuZoneOre[] {
  const thresholdFor = (id: number) =>
    id === KYBER_ID
      ? isMoon ? KYBER_RICH_THRESHOLD_MOON : KYBER_RICH_THRESHOLD_PLANET
      : isMoon ? RICH_THRESHOLD_MOON : RICH_THRESHOLD_PLANET;
  const ore = (commodityId: number, tier: SwuZoneOreTier, sources: number): SwuZoneOre => ({
    commodityId,
    name: nameOf(commodityId),
    tier,
    sources,
  });

  const result: SwuZoneOre[] = [];
  for (const id of BASE_ORE_IDS) {
    const sources = amounts.get(id) ?? 0;
    if (sources > 0) result.push(ore(id, sources >= thresholdFor(id) ? 'rich' : 'trace', sources));
  }

  const specials = Array.from(amounts.entries())
    .filter(([id, sources]) => sources > 0 && !(BASE_ORE_IDS as readonly number[]).includes(id))
    .sort((a, b) => b[1] - a[1]);
  const [special, secondary] = specials;
  if (special) result.push(ore(special[0], isMoon ? 'trace' : 'rich', special[1]));
  if (secondary && !isMoon) result.push(ore(secondary[0], 'trace', secondary[1]));
  return result;
}

/**
 * Erzquellen Q einer Zone: Phrik + Kyber + Sondererz (das mengenmaessig groesste
 * Nicht-Grunderz, siehe classifyZoneOres - steht dort direkt nach den Grunderzen).
 */
export function zoneOreSources(ores: SwuZoneOre[]): number {
  const baseIds = BASE_ORE_IDS as readonly number[];
  const phrikKyber = ores
    .filter((ore) => ore.commodityId === 1511 || ore.commodityId === KYBER_ID)
    .reduce((sum, ore) => sum + ore.sources, 0);
  const special = ores.find((ore) => !baseIds.includes(ore.commodityId));
  return phrikKyber + (special?.sources ?? 0);
}

/** Deuterium-Quellen (Rohstoff 1505) einer Zone, 0 wenn keine. */
export function zoneDeuteriumSources(ores: SwuZoneOre[]): number {
  return ores.find((ore) => ore.commodityId === 1505)?.sources ?? 0;
}
