import type { BuildingDef, ColonyStorageItem } from './types';

export function canAfford(
  building: BuildingDef,
  storage: ColonyStorageItem[],
): boolean {
  return (building.resourceCosts || []).every(
    (cost) =>
      (storage.find((item) => item.commodityId === cost.commodityId)?.amount ||
        0) >= cost.amount,
  );
}

export function formatBuildTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function formatSignedAmount(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
