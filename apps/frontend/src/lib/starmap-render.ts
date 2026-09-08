import type { StarmapSystemGridDto, StarmapSystemListItemDto } from '@swuniverse/shared';
import { getStarTileConfig, getStarTileIdAt, type StarAssetConfig } from './star-tiles';

export type StarTileLayer = { key: 'primary' | 'secondary'; config: StarAssetConfig; center: { x: number; y: number } };
export const STARMAP_CELL_SIZE = 30;
export type InlineSystemPlacement = {
  fieldPixelSize: number;
  frame: { x: number; y: number; width: number; height: number };
  grid: { x: number; y: number; width: number; height: number };
};
export const canLoadInlineSystem = (system: { isMapOnly?: boolean }) => !system.isMapOnly;
export function getInlineSystemPlacement(systemGrid: Pick<StarmapSystemGridDto, 'system'>, anchor: Pick<StarmapSystemListItemDto, 'cx' | 'cy'>): InlineSystemPlacement {
  const { maxX, maxY } = systemGrid.system;
  const fieldPixelSize = STARMAP_CELL_SIZE / (Math.max(maxX, maxY) + 2);
  const width = maxX * fieldPixelSize;
  const height = maxY * fieldPixelSize;
  const x = (anchor.cx - 1) * STARMAP_CELL_SIZE;
  const y = (anchor.cy - 1) * STARMAP_CELL_SIZE;
  return { fieldPixelSize, frame: { x, y, width: STARMAP_CELL_SIZE, height: STARMAP_CELL_SIZE }, grid: { x: x + (STARMAP_CELL_SIZE - width) / 2, y: y + (STARMAP_CELL_SIZE - height) / 2, width, height } };
}

export const OBJECT_TYPE_ICONS: Record<number, string> = { 1: '🪐', 2: '🌙', 3: '☄️' };
export const OBJECT_TYPE_NAMES: Record<number, string> = { 1: 'Planet', 2: 'Mond', 3: 'Asteroid' };
export const SYSTEM_FIELD_STYLES: Record<string, string> = { EMPTY_SPACE: 'bg-slate-950/80 border-slate-800 text-slate-500', STAR_CORE: 'bg-amber-500/60 border-amber-300 text-amber-100', PLANET_ORBIT: 'bg-sky-900/70 border-sky-500 text-sky-100', MOON_ORBIT: 'bg-indigo-900/70 border-indigo-400 text-indigo-100', ASTEROID_CLUSTER: 'bg-stone-800/70 border-stone-500 text-stone-100', NEBULA: 'bg-fuchsia-900/60 border-fuchsia-500 text-fuchsia-100' };
export const SECTOR_OVERLAY_STYLES: Record<string, string> = { EMPTY_SPACE: 'bg-slate-950/20', DEEP_SPACE: 'bg-slate-950/60', NEBULA: 'bg-fuchsia-900/35 shadow-[0_0_12px_rgba(217,70,239,0.25)]', ASTEROID_FIELD: 'bg-stone-800/35', ASTEROID_CLUSTER: 'bg-stone-800/35', STAR_SYSTEM: 'bg-amber-500/10' };
export const isStarObject = (classId: number | null | undefined) => classId != null && classId >= 9001 && classId <= 9005;
export function getObjectTypeName(objectType: number, classId?: number | null): string { if (classId === 9001) return 'Stern A'; if (classId === 9002) return 'Stern B'; if (isStarObject(classId)) return 'Stern'; return OBJECT_TYPE_NAMES[objectType] ?? 'Objekt'; }
export const getSystemFieldClasses = (key: string | undefined) => SYSTEM_FIELD_STYLES[key ?? ''] || 'bg-swu-bg border-swu-border/40 text-swu-muted';
export const getSectorFieldClasses = (isActive: boolean) => ['relative h-7 w-7 border-0 text-[10px] flex items-center justify-center transition-all bg-center overflow-hidden', isActive ? 'ring-2 ring-swu-accent z-10' : ''].join(' ');
export function calculateRenderedStarAreaSize(assetGridSize: number, systemGridSize: number): number { return Math.min(Math.max(Math.ceil(assetGridSize / 3), 2), Math.floor(systemGridSize / 6)); }
export function calculateFallbackBinaryStarCenters(systemGridSize: number, primary: StarAssetConfig, secondary: StarAssetConfig) {
  const center = Math.floor(systemGridSize / 2);
  const primaryRadius = Math.floor(calculateRenderedStarAreaSize(primary.gridSize, systemGridSize) / 2);
  const secondaryRadius = Math.floor(calculateRenderedStarAreaSize(secondary.gridSize, systemGridSize) / 2);
  const offset = Math.max(3, Math.floor((primaryRadius + secondaryRadius + 2) / 2));
  return { primary: { x: Math.max(primaryRadius + 1, center - offset), y: Math.max(primaryRadius + 1, center - offset) }, secondary: { x: Math.min(systemGridSize - secondaryRadius, center + offset), y: Math.min(systemGridSize - secondaryRadius, center + offset) } };
}
export function buildStarTileLayers(systemGrid: StarmapSystemGridDto | null): StarTileLayer[] {
  if (!systemGrid) return [];
  const config = getStarTileConfig(systemGrid.system.systemTypeId);
  if (!config) return [];
  const stars = (systemGrid.celestialObjects ?? []).filter((object) => isStarObject(object.classId));
  const fallback = { x: Math.ceil(systemGrid.system.maxX / 2), y: Math.ceil(systemGrid.system.maxY / 2) };
  const primaryObject = stars.find((object) => object.classId === 9001) ?? stars[0];
  const primary = primaryObject ? { x: primaryObject.posX, y: primaryObject.posY } : fallback;
  if (!config.secondary) return [{ key: 'primary', config: config.primary, center: primary }];
  const fallbackBinary = calculateFallbackBinaryStarCenters(Math.min(systemGrid.system.maxX, systemGrid.system.maxY), config.primary, config.secondary);
  const secondaryObject = stars.find((object) => object.classId === 9002) ?? stars.find((object) => object.id !== primaryObject?.id);
  const secondary = secondaryObject ? { x: secondaryObject.posX, y: secondaryObject.posY } : fallbackBinary.secondary;
  const overlap = primary.x - Math.floor(config.primary.gridSize / 2) <= secondary.x + Math.floor(config.secondary.gridSize / 2) && secondary.x - Math.floor(config.secondary.gridSize / 2) <= primary.x + Math.floor(config.primary.gridSize / 2) && primary.y - Math.floor(config.primary.gridSize / 2) <= secondary.y + Math.floor(config.secondary.gridSize / 2) && secondary.y - Math.floor(config.secondary.gridSize / 2) <= primary.y + Math.floor(config.primary.gridSize / 2);
  return [{ key: 'primary', config: config.primary, center: overlap ? fallbackBinary.primary : primary }, { key: 'secondary', config: config.secondary, center: overlap ? fallbackBinary.secondary : secondary }];
}
export { getStarTileIdAt };
