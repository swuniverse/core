export type StarWarsLandmarkCategory =
  | 'CORE'
  | 'COLONIES'
  | 'INNER_RIM'
  | 'MID_RIM'
  | 'OUTER_RIM'
  | 'UNKNOWN_REGIONS'
  | 'EXPANSION_REGION'
  | 'HUTT_SPACE'
  | 'WILD_SPACE';

export interface StarWarsLandmarkPresetEntry {
  key: string;
  name: string;
  grid: string;
  sector?: string;
  region?: string;
  category: StarWarsLandmarkCategory;
  systemTypeId: number;
  seedSystem?: boolean;
  notes?: string;
}

export interface StarWarsHyperspaceRouteSegmentPreset {
  fromKey: string;
  toKey: string;
  controlPoints?: Array<{ grid: string }>;
}

export interface StarWarsHyperspaceRoutePreset {
  key: string;
  name: string;
  color: string;
  segments: StarWarsHyperspaceRouteSegmentPreset[];
}

function key(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function landmark(
  name: string,
  grid: string,
  category: StarWarsLandmarkCategory,
  systemTypeId = 1050,
  extra: Partial<StarWarsLandmarkPresetEntry> = {},
): StarWarsLandmarkPresetEntry {
  return { key: key(name), name, grid, category, systemTypeId, ...extra };
}

function segment(
  from: string,
  to: string,
  controlPoints: Array<{ grid: string }> = [],
): StarWarsHyperspaceRouteSegmentPreset {
  return { fromKey: key(from), toKey: key(to), controlPoints };
}

export const STAR_WARS_LANDMARKS: StarWarsLandmarkPresetEntry[] = [
  landmark('Coruscant', 'L-9', 'CORE', 1050),
  landmark('Corellia', 'M-11', 'CORE', 1050),
  landmark('Alderaan', 'M-10', 'CORE', 1050),
  landmark('Chandrila', 'L-9', 'CORE', 1058),
  landmark('Kuat', 'K-10', 'CORE', 1053),
  landmark('Duro', 'L-10', 'CORE', 1050),
  landmark('Anaxes', 'L-9', 'CORE', 1053),
  landmark('Alsakan', 'L-9', 'CORE', 1050),
  landmark('Rendili', 'M-11', 'CORE', 1053),
  landmark('Brentaal', 'L-9', 'CORE', 1050),
  landmark('Aargau', 'L-10', 'CORE', 1050),
  landmark('Fondor', 'L-13', 'COLONIES', 1053),
  landmark('Commenor', 'N-10', 'COLONIES', 1050),
  landmark('Cato Neimoidia', 'N-11', 'COLONIES', 1050),
  landmark('Carida', 'M-9', 'COLONIES', 1053),
  landmark('Teyr', 'L-13', 'COLONIES', 1050),
  landmark('Ord Mantell', 'L-7', 'MID_RIM', 1057),
  landmark('Naboo', 'O-17', 'MID_RIM', 1058),
  landmark('Kashyyyk', 'P-9', 'MID_RIM', 1050),
  landmark('Bothawui', 'R-14', 'MID_RIM', 1058),
  landmark('Manaan', 'P-14', 'MID_RIM', 1051),
  landmark('Malastare', 'M-17', 'MID_RIM', 1057),
  landmark('Mandalore', 'O-7', 'OUTER_RIM', 1057),
  landmark('Concord Dawn', 'O-7', 'OUTER_RIM', 1057),
  landmark('Dathomir', 'O-6', 'OUTER_RIM', 1059),
  landmark('Yavin', 'P-6', 'OUTER_RIM', 1051),
  landmark('Lothal', 'U-7', 'OUTER_RIM', 1057),
  landmark('Mon Cala', 'U-6', 'OUTER_RIM', 1051),
  landmark('Kessel', 'T-10', 'OUTER_RIM', 1069),
  landmark('Nal Hutta', 'S-12', 'HUTT_SPACE', 1058),
  landmark('Nar Shaddaa', 'S-12', 'HUTT_SPACE', 1058),
  landmark('Toydaria', 'S-12', 'HUTT_SPACE', 1057),
  landmark('Tatooine', 'R-16', 'OUTER_RIM', 1052),
  landmark('Geonosis', 'R-16', 'OUTER_RIM', 1052),
  landmark('Ryloth', 'R-17', 'OUTER_RIM', 1052),
  landmark('Rodia', 'Q-16', 'OUTER_RIM', 1058),
  landmark('Christophsis', 'Q-16', 'OUTER_RIM', 1052),
  landmark('Savareen', 'Q-17', 'OUTER_RIM', 1052),
  landmark('Kamino', 'S-15', 'WILD_SPACE', 1068),
  landmark('Scarif', 'S-15', 'OUTER_RIM', 1058),
  landmark('Bespin', 'K-18', 'OUTER_RIM', 1051),
  landmark('Hoth', 'K-18', 'OUTER_RIM', 1057),
  landmark('Anoat', 'K-18', 'OUTER_RIM', 1057),
  landmark('Sullust', 'M-17', 'OUTER_RIM', 1064),
  landmark('Mustafar', 'L-19', 'OUTER_RIM', 1064),
  landmark('Dagobah', 'M-19', 'OUTER_RIM', 1058),
  landmark('Sluis Van', 'M-19', 'OUTER_RIM', 1053),
  landmark('Eriadu', 'M-18', 'OUTER_RIM', 1050),
  landmark('Endor', 'H-16', 'OUTER_RIM', 1057),
  landmark('Batuu', 'G-15', 'OUTER_RIM', 1057),
  landmark('Nevarro', 'K-20', 'OUTER_RIM', 1052),
  landmark('Jakku', 'J-11', 'INNER_RIM', 1052),
  landmark('Ilum', 'G-7', 'UNKNOWN_REGIONS', 1067),
  landmark('Exegol', 'G-11', 'UNKNOWN_REGIONS', 1061),
  landmark('Ahch-To', 'F-13', 'UNKNOWN_REGIONS', 1051),
  landmark('Csilla', 'F-8', 'UNKNOWN_REGIONS', 1057),
];

export const STAR_WARS_HYPERSPACE_ROUTES: StarWarsHyperspaceRoutePreset[] = [
  {
    key: 'hydian-way',
    name: 'Hydian Way',
    color: '#22c55e',
    segments: [
      segment('Bonadan', 'Lothal', [{ grid: 'T-5' }]),
      segment('Lothal', 'Mandalore', [{ grid: 'R-7' }]),
      segment('Mandalore', 'Ord Mantell', [{ grid: 'N-7' }]),
      segment('Ord Mantell', 'Brentaal'),
      segment('Brentaal', 'Coruscant'),
      segment('Coruscant', 'Corellia', [{ grid: 'M-10' }]),
      segment('Corellia', 'Fondor', [{ grid: 'L-12' }]),
      segment('Fondor', 'Eriadu', [{ grid: 'M-15' }]),
      segment('Eriadu', 'Bespin', [{ grid: 'L-18' }]),
    ],
  },
  {
    key: 'perlemian-trade-route',
    name: 'Perlemian Trade Route',
    color: '#facc15',
    segments: [
      segment('Coruscant', 'Brentaal'),
      segment('Brentaal', 'Chandrila'),
      segment('Chandrila', 'Kashyyyk', [{ grid: 'N-9' }]),
      segment('Kashyyyk', 'Mandalore', [{ grid: 'O-8' }]),
      segment('Mandalore', 'Lothal', [{ grid: 'R-7' }]),
    ],
  },
  {
    key: 'corellian-run',
    name: 'Corellian Run',
    color: '#ef4444',
    segments: [
      segment('Coruscant', 'Corellia'),
      segment('Corellia', 'Duro'),
      segment('Duro', 'Fondor', [{ grid: 'L-12' }]),
      segment('Fondor', 'Ryloth', [{ grid: 'O-15' }]),
      segment('Ryloth', 'Tatooine'),
    ],
  },
  {
    key: 'corellian-trade-spine',
    name: 'Corellian Trade Spine',
    color: '#a78bfa',
    segments: [
      segment('Corellia', 'Duro'),
      segment('Duro', 'Kuat', [{ grid: 'L-10' }]),
      segment('Kuat', 'Mandalore', [{ grid: 'M-8' }]),
      segment('Mandalore', 'Dathomir'),
      segment('Dathomir', 'Corellia', [{ grid: 'N-8' }]),
      segment('Corellia', 'Fondor', [{ grid: 'L-12' }]),
      segment('Fondor', 'Hoth', [{ grid: 'L-16' }]),
      segment('Hoth', 'Bespin'),
    ],
  },
  {
    key: 'rimma-trade-route',
    name: 'Rimma Trade Route',
    color: '#38bdf8',
    segments: [
      segment('Corellia', 'Abregado-rae', [{ grid: 'M-12' }]),
      segment('Abregado-rae', 'Cato Neimoidia', [{ grid: 'N-12' }]),
      segment('Cato Neimoidia', 'Bothawui', [{ grid: 'P-13' }]),
      segment('Bothawui', 'Naboo', [{ grid: 'P-15' }]),
      segment('Naboo', 'Sullust', [{ grid: 'O-18' }]),
      segment('Sullust', 'Eriadu'),
      segment('Eriadu', 'Dagobah', [{ grid: 'M-19' }]),
    ],
  },
  {
    key: 'kessel-run',
    name: 'Kessel Run',
    color: '#fb923c',
    segments: [
      segment('Nal Hutta', 'Kessel', [{ grid: 'S-11' }]),
      segment('Kessel', 'Formos', [{ grid: 'T-10' }]),
      segment('Formos', 'Ryloth', [{ grid: 'S-13' }]),
      segment('Ryloth', 'Tatooine'),
    ],
  },
];
