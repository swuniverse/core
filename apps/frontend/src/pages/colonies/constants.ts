export const FIELD_TYPE_COLORS: Record<number, string> = {
  101: 'bg-green-900/40',
  111: 'bg-emerald-900/50',
  201: 'bg-blue-900/40',
  401: 'bg-amber-900/40',
  501: 'bg-cyan-900/30',
  601: 'bg-lime-900/40',
  701: 'bg-stone-700/60',
  703: 'bg-stone-600/70',
  801: 'bg-zinc-800/60',
  900: 'bg-indigo-900/30',
};

export const FIELD_TYPE_NAMES: Record<number, string> = {
  101: 'Wiese',
  111: 'Wald',
  201: 'Wasser',
  401: 'Wüste',
  501: 'Eis',
  601: 'Sumpf',
  701: 'Berge',
  703: 'Gebirge',
  801: 'Untergrund',
  900: 'Weltraum',
};

export const TILE_TYPE_NAMES: Record<number, string> = {
  ...FIELD_TYPE_NAMES,
  112: 'Nadelwald',
  121: 'Sumpf',
  122: 'Sumpf',
  210: 'Seichtes Wasser',
  211: 'Korallen',
  212: 'Korallen',
  221: 'Küste',
  222: 'Küste',
  501: 'Eis',
  802: 'Untergrund-Fels',
  851: 'Tiefsee',
};

export const BMCOL_LABELS: Record<number, string> = {
  1: 'Soziales',
  2: 'Industrie',
  3: 'Infrastruktur',
  4: 'Energie',
};
