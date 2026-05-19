import type { StarmapSystemGridDto } from '@swuniverse/shared';
import {
  getStarTileConfig,
  getStarTileIdAt,
  type StarAssetConfig,
} from './star-tiles';

export type StarTileLayer = {
  key: 'primary' | 'secondary';
  config: StarAssetConfig;
  center: { x: number; y: number };
};

export const OBJECT_TYPE_ICONS: Record<number, string> = {
  1: '🪐',
  2: '🌙',
  3: '☄️',
};

export const OBJECT_TYPE_NAMES: Record<number, string> = {
  1: 'Planet',
  2: 'Mond',
  3: 'Asteroid',
};

export const SYSTEM_FIELD_STYLES: Record<string, string> = {
  EMPTY_SPACE: 'bg-slate-950/80 border-slate-800 text-slate-500',
  STAR_CORE: 'bg-amber-500/60 border-amber-300 text-amber-100',
  PLANET_ORBIT: 'bg-sky-900/70 border-sky-500 text-sky-100',
  MOON_ORBIT: 'bg-indigo-900/70 border-indigo-400 text-indigo-100',
  ASTEROID_CLUSTER: 'bg-stone-800/70 border-stone-500 text-stone-100',
  NEBULA: 'bg-fuchsia-900/60 border-fuchsia-500 text-fuchsia-100',
};

export const SECTOR_OVERLAY_STYLES: Record<string, string> = {
  EMPTY_SPACE: 'bg-slate-950/20',
  DEEP_SPACE: 'bg-slate-950/60',
  NEBULA: 'bg-fuchsia-900/35 shadow-[0_0_12px_rgba(217,70,239,0.25)]',
  ASTEROID_FIELD: 'bg-stone-800/35',
  ASTEROID_CLUSTER: 'bg-stone-800/35',
  STAR_SYSTEM: 'bg-amber-500/10',
};

export function isStarObject(classId: number | null | undefined): boolean {
  return classId != null && classId >= 9001 && classId <= 9005;
}

export function getObjectTypeName(
  objectType: number,
  classId?: number | null,
): string {
  if (classId === 9001) return 'Stern A';
  if (classId === 9002) return 'Stern B';
  if (isStarObject(classId)) return 'Stern';
  return OBJECT_TYPE_NAMES[objectType] ?? 'Objekt';
}

export function getSystemFieldClasses(key: string | undefined): string {
  return (
    SYSTEM_FIELD_STYLES[key ?? ''] ||
    'bg-swu-bg border-swu-border/40 text-swu-muted'
  );
}

export function getSectorFieldClasses(isActive: boolean): string {
  return [
    'relative h-7 w-7 border-0 text-[10px] flex items-center justify-center transition-all bg-center overflow-hidden',
    isActive ? 'ring-2 ring-swu-accent z-10' : '',
  ].join(' ');
}

export function calculateRenderedStarAreaSize(
  assetGridSize: number,
  systemGridSize: number,
): number {
  const scaled = Math.ceil(assetGridSize / 3);
  const maxStarArea = Math.floor(systemGridSize / 6);
  return Math.min(Math.max(scaled, 2), maxStarArea);
}

export function calculateFallbackBinaryStarCenters(
  systemGridSize: number,
  primary: StarAssetConfig,
  secondary: StarAssetConfig,
): { primary: { x: number; y: number }; secondary: { x: number; y: number } } {
  const gridCenter = Math.floor(systemGridSize / 2);
  const primaryRadius = Math.floor(
    calculateRenderedStarAreaSize(primary.gridSize, systemGridSize) / 2,
  );
  const secondaryRadius = Math.floor(
    calculateRenderedStarAreaSize(secondary.gridSize, systemGridSize) / 2,
  );
  const minSeparation = primaryRadius + secondaryRadius + 2;
  const offsetDistance = Math.max(3, Math.floor(minSeparation / 2));

  return {
    primary: {
      x: Math.max(primaryRadius + 1, gridCenter - offsetDistance),
      y: Math.max(primaryRadius + 1, gridCenter - offsetDistance),
    },
    secondary: {
      x: Math.min(
        systemGridSize - secondaryRadius,
        gridCenter + offsetDistance,
      ),
      y: Math.min(
        systemGridSize - secondaryRadius,
        gridCenter + offsetDistance,
      ),
    },
  };
}

export function buildStarTileLayers(
  systemGrid: StarmapSystemGridDto | null,
): StarTileLayer[] {
  if (!systemGrid) return [];
  const config = getStarTileConfig(systemGrid.system.systemTypeId);
  if (!config) return [];

  const starObjects = (systemGrid.celestialObjects ?? []).filter(
    (o) => o.classId != null && o.classId >= 9001 && o.classId <= 9005,
  );

  const fallbackCenter = {
    x: Math.ceil(systemGrid.system.maxX / 2),
    y: Math.ceil(systemGrid.system.maxY / 2),
  };

  const primaryObject =
    starObjects.find((o) => o.classId === 9001) ?? starObjects[0];
  const primaryCenter = primaryObject
    ? { x: primaryObject.posX, y: primaryObject.posY }
    : fallbackCenter;

  if (!config.secondary) {
    return [{ key: 'primary', config: config.primary, center: primaryCenter }];
  }

  const fallbackBinaryCenters = calculateFallbackBinaryStarCenters(
    Math.min(systemGrid.system.maxX, systemGrid.system.maxY),
    config.primary,
    config.secondary,
  );
  const secondaryObject =
    starObjects.find((o) => o.classId === 9002) ??
    starObjects.find((o) => o.id !== primaryObject?.id);

  return [
    {
      key: 'primary',
      config: config.primary,
      center: primaryObject
        ? { x: primaryObject.posX, y: primaryObject.posY }
        : fallbackBinaryCenters.primary,
    },
    {
      key: 'secondary',
      config: config.secondary,
      center: secondaryObject
        ? { x: secondaryObject.posX, y: secondaryObject.posY }
        : fallbackBinaryCenters.secondary,
    },
  ];
}

export { getStarTileIdAt };
