import type { StarmapSystemTypeOptionDto } from '@swuniverse/shared';

export type StarmapSystemTypeOption = StarmapSystemTypeOptionDto;

/**
 * Rarity tiers for weighted random system type selection.
 * - COMMON (50%): 1049-1060 (medium single stars)
 * - BINARY (35%): 1001-1040 (binary systems)
 * - UNCOMMON (10%): 1041-1048, 1061-1066
 * - RARE (4%): 1067-1070
 * - VERY_RARE (1%): 1071-1075
 */
export type SystemTypeRarity =
  | 'COMMON'
  | 'BINARY'
  | 'UNCOMMON'
  | 'RARE'
  | 'VERY_RARE';

export interface SystemTypeDefinition {
  id: number;
  key: string;
  name: string;
  isBinary: boolean;
  rarity: SystemTypeRarity;
  gridSizeMin: number;
  gridSizeMax: number;
  minPlanets: number;
  maxPlanets: number;
  minAsteroids: number;
  maxAsteroids: number;
  moonChance: number;
  colonizableChance: number;
  asteroidRingChance: number;
}

export interface BinarySystemCombo {
  primarySystemTypeId: number;
  secondarySystemTypeId: number;
}

// 48 binary system combinations (BIN_1001 - BIN_1048)
export const BINARY_SYSTEM_COMBOS: Record<number, BinarySystemCombo> = {
  // Riese + Riese (1001-1010)
  1001: { primarySystemTypeId: 1049, secondarySystemTypeId: 1049 },
  1002: { primarySystemTypeId: 1049, secondarySystemTypeId: 1050 },
  1003: { primarySystemTypeId: 1050, secondarySystemTypeId: 1050 },
  1004: { primarySystemTypeId: 1051, secondarySystemTypeId: 1050 },
  1005: { primarySystemTypeId: 1050, secondarySystemTypeId: 1052 },
  1006: { primarySystemTypeId: 1049, secondarySystemTypeId: 1051 },
  1007: { primarySystemTypeId: 1051, secondarySystemTypeId: 1051 },
  1008: { primarySystemTypeId: 1051, secondarySystemTypeId: 1052 },
  1009: { primarySystemTypeId: 1052, secondarySystemTypeId: 1049 },
  1010: { primarySystemTypeId: 1052, secondarySystemTypeId: 1052 },
  // Riese + Ueberriese (1011-1020)
  1011: { primarySystemTypeId: 1049, secondarySystemTypeId: 1053 },
  1012: { primarySystemTypeId: 1050, secondarySystemTypeId: 1053 },
  1013: { primarySystemTypeId: 1050, secondarySystemTypeId: 1054 },
  1014: { primarySystemTypeId: 1050, secondarySystemTypeId: 1055 },
  1015: { primarySystemTypeId: 1050, secondarySystemTypeId: 1056 },
  1016: { primarySystemTypeId: 1051, secondarySystemTypeId: 1053 },
  1017: { primarySystemTypeId: 1051, secondarySystemTypeId: 1055 },
  1018: { primarySystemTypeId: 1051, secondarySystemTypeId: 1056 },
  1019: { primarySystemTypeId: 1052, secondarySystemTypeId: 1053 },
  1020: { primarySystemTypeId: 1052, secondarySystemTypeId: 1056 },
  // Riese + Zwerg (1021-1030)
  1021: { primarySystemTypeId: 1049, secondarySystemTypeId: 1057 },
  1022: { primarySystemTypeId: 1049, secondarySystemTypeId: 1058 },
  1023: { primarySystemTypeId: 1050, secondarySystemTypeId: 1058 },
  1024: { primarySystemTypeId: 1051, secondarySystemTypeId: 1058 },
  1025: { primarySystemTypeId: 1052, secondarySystemTypeId: 1058 },
  1026: { primarySystemTypeId: 1049, secondarySystemTypeId: 1059 },
  1027: { primarySystemTypeId: 1051, secondarySystemTypeId: 1059 },
  1028: { primarySystemTypeId: 1052, secondarySystemTypeId: 1059 },
  1029: { primarySystemTypeId: 1049, secondarySystemTypeId: 1060 },
  1030: { primarySystemTypeId: 1052, secondarySystemTypeId: 1060 },
  // Zwerg + Zwerg (1031-1040)
  1031: { primarySystemTypeId: 1057, secondarySystemTypeId: 1057 },
  1032: { primarySystemTypeId: 1058, secondarySystemTypeId: 1057 },
  1033: { primarySystemTypeId: 1058, secondarySystemTypeId: 1058 },
  1034: { primarySystemTypeId: 1058, secondarySystemTypeId: 1059 },
  1035: { primarySystemTypeId: 1058, secondarySystemTypeId: 1060 },
  1036: { primarySystemTypeId: 1059, secondarySystemTypeId: 1057 },
  1037: { primarySystemTypeId: 1059, secondarySystemTypeId: 1059 },
  1038: { primarySystemTypeId: 1059, secondarySystemTypeId: 1060 },
  1039: { primarySystemTypeId: 1060, secondarySystemTypeId: 1057 },
  1040: { primarySystemTypeId: 1060, secondarySystemTypeId: 1060 },
  // Neutronenstern + Riese (1041-1044)
  1041: { primarySystemTypeId: 1067, secondarySystemTypeId: 1049 },
  1042: { primarySystemTypeId: 1067, secondarySystemTypeId: 1050 },
  1043: { primarySystemTypeId: 1067, secondarySystemTypeId: 1051 },
  1044: { primarySystemTypeId: 1067, secondarySystemTypeId: 1052 },
  // Schwarzes Loch + Riese (1045-1048)
  1045: { primarySystemTypeId: 1063, secondarySystemTypeId: 1049 },
  1046: { primarySystemTypeId: 1061, secondarySystemTypeId: 1050 },
  1047: { primarySystemTypeId: 1061, secondarySystemTypeId: 1051 },
  1048: { primarySystemTypeId: 1062, secondarySystemTypeId: 1052 },
};

const SINGLE_SYSTEM_TYPE_NAMES: Record<number, string> = {
  1049: 'Blauer Riese',
  1050: 'Gelber Riese',
  1051: 'Orangener Riese',
  1052: 'Roter Riese',
  1053: 'Blauer Überriese',
  1054: 'Gelber Überriese',
  1055: 'Orangener Überriese',
  1056: 'Roter Überriese',
  1057: 'Blauer Zwerg',
  1058: 'Gelber Zwerg',
  1059: 'Orangener Zwerg',
  1060: 'Roter Zwerg',
  1061: 'Schwarzes Loch ZO',
  1062: 'Schwarzes Loch ZR',
  1063: 'Schwarzes Loch ZL',
  1064: 'Schwarzes Loch',
  1065: 'Schwarzes Loch',
  1066: 'Schwarzes Loch',
  1067: 'Neutronenstern',
  1068: 'Neutronenstern',
  1069: 'Asteroiden-System',
  1070: 'Asteroiden-System',
  1071: 'Seltenes Tiefraum-System',
  1072: 'Seltenes Tiefraum-System',
  1073: 'Seltenes Tiefraum-System',
  1074: 'Seltenes Tiefraum-System',
  1075: 'Seltenes Tiefraum-System',
};

function getSystemTypeDisplayName(systemTypeId: number): string {
  const combo = BINARY_SYSTEM_COMBOS[systemTypeId];
  if (combo) {
    const primary = SINGLE_SYSTEM_TYPE_NAMES[combo.primarySystemTypeId];
    const secondary = SINGLE_SYSTEM_TYPE_NAMES[combo.secondarySystemTypeId];
    if (primary && secondary) {
      return `Binärsystem ${primary} - ${secondary}`;
    }
  }

  return SINGLE_SYSTEM_TYPE_NAMES[systemTypeId] ?? `Typ ${systemTypeId}`;
}

// All 75 system type definitions
export const SYSTEM_TYPE_DEFINITIONS: SystemTypeDefinition[] = [
  // === BINARY SYSTEMS (1001-1040): 35% of all systems ===
  ...Array.from({ length: 10 }, (_, i) => ({
    id: 1001 + i,
    key: `BIN_${1001 + i}`,
    name: getSystemTypeDisplayName(1001 + i),
    isBinary: true,
    rarity: 'BINARY' as SystemTypeRarity,
    gridSizeMin: 23,
    gridSizeMax: 26,
    minPlanets: 10,
    maxPlanets: 17,
    minAsteroids: 5,
    maxAsteroids: 12,
    moonChance: 0.3,
    colonizableChance: 0.4,
    asteroidRingChance: 0.6,
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    id: 1011 + i,
    key: `BIN_${1011 + i}`,
    name: getSystemTypeDisplayName(1011 + i),
    isBinary: true,
    rarity: 'BINARY' as SystemTypeRarity,
    gridSizeMin: 25,
    gridSizeMax: 27,
    minPlanets: 10,
    maxPlanets: 17,
    minAsteroids: 5,
    maxAsteroids: 12,
    moonChance: 0.35,
    colonizableChance: 0.35,
    asteroidRingChance: 0.65,
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    id: 1021 + i,
    key: `BIN_${1021 + i}`,
    name: getSystemTypeDisplayName(1021 + i),
    isBinary: true,
    rarity: 'BINARY' as SystemTypeRarity,
    gridSizeMin: 22,
    gridSizeMax: 25,
    minPlanets: 8,
    maxPlanets: 14,
    minAsteroids: 4,
    maxAsteroids: 10,
    moonChance: 0.3,
    colonizableChance: 0.45,
    asteroidRingChance: 0.55,
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    id: 1031 + i,
    key: `BIN_${1031 + i}`,
    name: getSystemTypeDisplayName(1031 + i),
    isBinary: true,
    rarity: 'BINARY' as SystemTypeRarity,
    gridSizeMin: 20,
    gridSizeMax: 23,
    minPlanets: 6,
    maxPlanets: 12,
    minAsteroids: 3,
    maxAsteroids: 8,
    moonChance: 0.25,
    colonizableChance: 0.5,
    asteroidRingChance: 0.5,
  })),

  // === BINARY SPECIAL (1041-1048): Neutron stars + black holes ===
  ...Array.from({ length: 4 }, (_, i) => ({
    id: 1041 + i,
    key: `BIN_${1041 + i}`,
    name: getSystemTypeDisplayName(1041 + i),
    isBinary: true,
    rarity: 'BINARY' as SystemTypeRarity,
    gridSizeMin: 22,
    gridSizeMax: 25,
    minPlanets: 4,
    maxPlanets: 7,
    minAsteroids: 2,
    maxAsteroids: 4,
    moonChance: 0.2,
    colonizableChance: 0.2,
    asteroidRingChance: 0.7,
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    id: 1045 + i,
    key: `BIN_${1045 + i}`,
    name: getSystemTypeDisplayName(1045 + i),
    isBinary: true,
    rarity: 'BINARY' as SystemTypeRarity,
    gridSizeMin: 24,
    gridSizeMax: 27,
    minPlanets: 3,
    maxPlanets: 6,
    minAsteroids: 3,
    maxAsteroids: 8,
    moonChance: 0.15,
    colonizableChance: 0.15,
    asteroidRingChance: 0.8,
  })),

  // === COMMON SINGLE STARS (1049-1060): 50% of all systems ===
  // Giants (1049-1052)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: 1049 + i,
    key: `SYS_${1049 + i}`,
    name: getSystemTypeDisplayName(1049 + i),
    isBinary: false,
    rarity: 'COMMON' as SystemTypeRarity,
    gridSizeMin: 22,
    gridSizeMax: 25,
    minPlanets: 8,
    maxPlanets: 13,
    minAsteroids: 3,
    maxAsteroids: 8,
    moonChance: 0.4,
    colonizableChance: 0.5,
    asteroidRingChance: 0.5,
  })),
  // Supergiants (1053-1056)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: 1053 + i,
    key: `SYS_${1053 + i}`,
    name: getSystemTypeDisplayName(1053 + i),
    isBinary: false,
    rarity: 'COMMON' as SystemTypeRarity,
    gridSizeMin: 24,
    gridSizeMax: 27,
    minPlanets: 8,
    maxPlanets: 13,
    minAsteroids: 3,
    maxAsteroids: 8,
    moonChance: 0.35,
    colonizableChance: 0.45,
    asteroidRingChance: 0.55,
  })),
  // Dwarfs (1057-1060)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: 1057 + i,
    key: `SYS_${1057 + i}`,
    name: getSystemTypeDisplayName(1057 + i),
    isBinary: false,
    rarity: 'COMMON' as SystemTypeRarity,
    gridSizeMin: 20,
    gridSizeMax: 22,
    minPlanets: 5,
    maxPlanets: 10,
    minAsteroids: 2,
    maxAsteroids: 5,
    moonChance: 0.3,
    colonizableChance: 0.55,
    asteroidRingChance: 0.4,
  })),

  // === UNCOMMON (1061-1066): 10% ===
  // Special small (1061-1063): no planets, just star
  ...Array.from({ length: 3 }, (_, i) => ({
    id: 1061 + i,
    key: `SYS_${1061 + i}`,
    name: getSystemTypeDisplayName(1061 + i),
    isBinary: false,
    rarity: 'UNCOMMON' as SystemTypeRarity,
    gridSizeMin: 7,
    gridSizeMax: 10,
    minPlanets: 0,
    maxPlanets: 0,
    minAsteroids: 0,
    maxAsteroids: 0,
    moonChance: 0,
    colonizableChance: 0,
    asteroidRingChance: 0,
  })),
  // Medium special (1064-1066)
  ...Array.from({ length: 3 }, (_, i) => ({
    id: 1064 + i,
    key: `SYS_${1064 + i}`,
    name: getSystemTypeDisplayName(1064 + i),
    isBinary: false,
    rarity: 'UNCOMMON' as SystemTypeRarity,
    gridSizeMin: 15,
    gridSizeMax: 20,
    minPlanets: 3,
    maxPlanets: 6,
    minAsteroids: 1,
    maxAsteroids: 3,
    moonChance: 0.25,
    colonizableChance: 0.35,
    asteroidRingChance: 0.4,
  })),

  // === RARE (1067-1070): 4% ===
  // Neutron stars (1067-1068)
  ...Array.from({ length: 2 }, (_, i) => ({
    id: 1067 + i,
    key: `SYS_${1067 + i}`,
    name: getSystemTypeDisplayName(1067 + i),
    isBinary: false,
    rarity: 'RARE' as SystemTypeRarity,
    gridSizeMin: 17,
    gridSizeMax: 20,
    minPlanets: 3,
    maxPlanets: 5,
    minAsteroids: 1,
    maxAsteroids: 2,
    moonChance: 0.15,
    colonizableChance: 0.2,
    asteroidRingChance: 0.3,
  })),
  // Rare medium (1069-1070)
  ...Array.from({ length: 2 }, (_, i) => ({
    id: 1069 + i,
    key: `SYS_${1069 + i}`,
    name: getSystemTypeDisplayName(1069 + i),
    isBinary: false,
    rarity: 'RARE' as SystemTypeRarity,
    gridSizeMin: 19,
    gridSizeMax: 23,
    minPlanets: 3,
    maxPlanets: 5,
    minAsteroids: 1,
    maxAsteroids: 2,
    moonChance: 0.2,
    colonizableChance: 0.25,
    asteroidRingChance: 0.35,
  })),

  // === VERY RARE (1071-1075): 1% ===
  ...Array.from({ length: 5 }, (_, i) => ({
    id: 1071 + i,
    key: `SYS_${1071 + i}`,
    name: getSystemTypeDisplayName(1071 + i),
    isBinary: false,
    rarity: 'VERY_RARE' as SystemTypeRarity,
    gridSizeMin: 7,
    gridSizeMax: 15,
    minPlanets: 0,
    maxPlanets: 0,
    minAsteroids: 0,
    maxAsteroids: 0,
    moonChance: 0,
    colonizableChance: 0,
    asteroidRingChance: 0,
  })),
];

/**
 * Lookup map by ID for fast access.
 */
export const SYSTEM_TYPE_BY_ID: Record<number, SystemTypeDefinition> =
  Object.fromEntries(SYSTEM_TYPE_DEFINITIONS.map((d) => [d.id, d]));

/**
 * Legacy DTO list for admin dropdown (all 75 types).
 */
export const STARMAP_SYSTEM_TYPE_OPTIONS: StarmapSystemTypeOption[] =
  SYSTEM_TYPE_DEFINITIONS.map((d) => ({ id: d.id, key: d.key, name: d.name }));

/**
 * Rarity weight table for weighted random selection.
 */
export const RARITY_WEIGHTS: Record<SystemTypeRarity, number> = {
  COMMON: 50,
  BINARY: 35,
  UNCOMMON: 10,
  RARE: 4,
  VERY_RARE: 1,
};
