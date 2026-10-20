/**
 * Canon names for the generated tactical systems. Fixed order, used by the
 * rename migration (Tactical-N -> TACTICAL_CANON_NAMES[N - 1]) and as the
 * fallback when no catalog is available.
 */
export const TACTICAL_CANON_NAMES = [
  'Tatooine',
  'Corellia',
  'Alderaan',
  'Naboo',
  'Kashyyyk',
  'Hoth',
  'Endor',
  'Bespin',
  'Dantooine',
  'Yavin',
  'Sullust',
  'Mon Cala',
  'Kessel',
  'Geonosis',
  'Dagobah',
  'Ryloth',
  'Lothal',
  'Scarif',
  'Jakku',
  'Mustafar',
  'Felucia',
  'Utapau',
  'Kamino',
  'Mandalore',
  'Chandrila',
  'Ord Mantell',
  'Nal Hutta',
  'Dathomir',
  'Malastare',
  'Ithor',
  'Taris',
  'Onderon',
  'Rodia',
  'Atollon',
  'Jedha',
  'Eriadu',
  'Fondor',
  'Kuat',
  'Rendili',
  'Ralltiir',
  'Abregado-rae',
  'Bothawui',
  'Cato Neimoidia',
  'Christophsis',
  'Denon',
  'Duro',
  'Mygeeto',
  'Manaan',
  'Nevarro',
  'Takodana',
  'Savareen',
  'Pasaana',
  'Ahch-To',
  'Ilum',
  'Ruusan',
  'Zeffo',
] as const;

/**
 * Deterministic, collision-free names for a tactical layer: a seeded shuffle
 * of the pool, taking the first `count` entries.
 */
export function pickTacticalSystemNames(
  pool: readonly string[],
  count: number,
  seed: string,
  hash: (value: string) => number,
): string[] {
  const unique = [...new Set(pool)];
  const ranked = unique
    .map((name) => ({ name, rank: hash(`${seed}:name:${name}`) }))
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    .map((entry) => entry.name);
  const names = ranked.slice(0, count);
  for (let index = names.length; index < count; index++) {
    names.push(`Tactical-${index + 1}`);
  }
  return names;
}
