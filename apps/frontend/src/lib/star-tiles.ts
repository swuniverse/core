export interface StarAssetConfig {
  baseId: number;
  gridSize: number;
}

interface StarTileConfig {
  primary: StarAssetConfig;
  secondary?: StarAssetConfig;
}

const SINGLE_STAR_NAMES: Record<number, string> = {
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

const SINGLE_STAR_ASSETS: Record<number, StarAssetConfig> = {
  1041: { baseId: 104100, gridSize: 10 },
  1042: { baseId: 104200, gridSize: 10 },
  1043: { baseId: 104300, gridSize: 10 },
  1044: { baseId: 104400, gridSize: 10 },
  1045: { baseId: 104500, gridSize: 10 },
  1046: { baseId: 104600, gridSize: 10 },
  1047: { baseId: 104700, gridSize: 10 },
  1048: { baseId: 104800, gridSize: 10 },
  1049: { baseId: 104900, gridSize: 5 },
  1050: { baseId: 105000, gridSize: 5 },
  1051: { baseId: 105100, gridSize: 5 },
  1052: { baseId: 105200, gridSize: 5 },
  1053: { baseId: 105300, gridSize: 6 },
  1054: { baseId: 105400, gridSize: 6 },
  1055: { baseId: 105500, gridSize: 6 },
  1056: { baseId: 105600, gridSize: 6 },
  1057: { baseId: 105700, gridSize: 4 },
  1058: { baseId: 105800, gridSize: 4 },
  1059: { baseId: 105900, gridSize: 4 },
  1060: { baseId: 106000, gridSize: 4 },
  1061: { baseId: 106100, gridSize: 4 },
  1062: { baseId: 106200, gridSize: 4 },
  1063: { baseId: 106300, gridSize: 4 },
  1064: { baseId: 106400, gridSize: 6 },
  1065: { baseId: 106500, gridSize: 6 },
  1066: { baseId: 106600, gridSize: 6 },
  1067: { baseId: 106700, gridSize: 2 },
  1068: { baseId: 106800, gridSize: 2 },
  1069: { baseId: 106900, gridSize: 4 },
  1070: { baseId: 107000, gridSize: 4 },
  1071: { baseId: 107100, gridSize: 10 },
  1072: { baseId: 107200, gridSize: 10 },
  1073: { baseId: 107300, gridSize: 10 },
  1074: { baseId: 107400, gridSize: 10 },
  1075: { baseId: 107500, gridSize: 10 },
};

const BINARY_SYSTEM_COMBOS: Record<
  number,
  { primary: number; secondary: number }
> = {
  1001: { primary: 1049, secondary: 1049 },
  1002: { primary: 1049, secondary: 1050 },
  1003: { primary: 1050, secondary: 1050 },
  1004: { primary: 1051, secondary: 1050 },
  1005: { primary: 1050, secondary: 1052 },
  1006: { primary: 1049, secondary: 1051 },
  1007: { primary: 1051, secondary: 1051 },
  1008: { primary: 1051, secondary: 1052 },
  1009: { primary: 1052, secondary: 1049 },
  1010: { primary: 1052, secondary: 1052 },
  1011: { primary: 1049, secondary: 1053 },
  1012: { primary: 1050, secondary: 1053 },
  1013: { primary: 1050, secondary: 1054 },
  1014: { primary: 1050, secondary: 1055 },
  1015: { primary: 1050, secondary: 1056 },
  1016: { primary: 1051, secondary: 1053 },
  1017: { primary: 1051, secondary: 1055 },
  1018: { primary: 1051, secondary: 1056 },
  1019: { primary: 1052, secondary: 1053 },
  1020: { primary: 1052, secondary: 1056 },
  1021: { primary: 1049, secondary: 1057 },
  1022: { primary: 1049, secondary: 1058 },
  1023: { primary: 1050, secondary: 1058 },
  1024: { primary: 1051, secondary: 1058 },
  1025: { primary: 1052, secondary: 1058 },
  1026: { primary: 1049, secondary: 1059 },
  1027: { primary: 1051, secondary: 1059 },
  1028: { primary: 1052, secondary: 1059 },
  1029: { primary: 1049, secondary: 1060 },
  1030: { primary: 1052, secondary: 1060 },
  1031: { primary: 1057, secondary: 1057 },
  1032: { primary: 1058, secondary: 1057 },
  1033: { primary: 1058, secondary: 1058 },
  1034: { primary: 1058, secondary: 1059 },
  1035: { primary: 1058, secondary: 1060 },
  1036: { primary: 1059, secondary: 1057 },
  1037: { primary: 1059, secondary: 1059 },
  1038: { primary: 1059, secondary: 1060 },
  1039: { primary: 1060, secondary: 1057 },
  1040: { primary: 1060, secondary: 1060 },
  1041: { primary: 1067, secondary: 1049 },
  1042: { primary: 1067, secondary: 1050 },
  1043: { primary: 1067, secondary: 1051 },
  1044: { primary: 1067, secondary: 1052 },
  1045: { primary: 1063, secondary: 1049 },
  1046: { primary: 1061, secondary: 1050 },
  1047: { primary: 1061, secondary: 1051 },
  1048: { primary: 1062, secondary: 1052 },
};

export function getSystemTypeName(systemTypeId: number): string | null {
  const binary = BINARY_SYSTEM_COMBOS[systemTypeId];
  if (binary) {
    const primary = SINGLE_STAR_NAMES[binary.primary];
    const secondary = SINGLE_STAR_NAMES[binary.secondary];
    if (primary && secondary) {
      return `Binärsystem ${primary} - ${secondary}`;
    }
  }

  return SINGLE_STAR_NAMES[systemTypeId] ?? null;
}

export function getStarTileConfig(systemTypeId: number): StarTileConfig | null {
  const binary = BINARY_SYSTEM_COMBOS[systemTypeId];
  if (binary) {
    const primary = SINGLE_STAR_ASSETS[binary.primary];
    const secondary = SINGLE_STAR_ASSETS[binary.secondary];
    if (primary && secondary) {
      return { primary, secondary };
    }
  }

  const single = SINGLE_STAR_ASSETS[systemTypeId];
  if (single) {
    return { primary: single };
  }

  return null;
}

/**
 * Compute tile asset ID for a grid position relative to a star's center.
 * Row-major order: tileId = baseId + row * gridSize + col + 1 (row/col 0-based)
 */
export function getStarTileIdAt(
  config: StarAssetConfig,
  sx: number,
  sy: number,
  centerX: number,
  centerY: number,
): number | null {
  const halfSize = Math.floor(config.gridSize / 2);
  const startX = centerX - halfSize;
  const startY = centerY - halfSize;

  const col = sx - startX;
  const row = sy - startY;

  if (col < 0 || col >= config.gridSize || row < 0 || row >= config.gridSize) {
    return null;
  }

  return config.baseId + row * config.gridSize + col + 1;
}
