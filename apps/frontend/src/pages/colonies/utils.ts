import type { BuildingDef, ColonyField, ColonyStorageItem } from './types';

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

export function maxAffordable(
  building: BuildingDef,
  storage: ColonyStorageItem[],
): number {
  const costs = building.resourceCosts || [];
  if (costs.length === 0) return Infinity;
  return Math.min(
    ...costs.map((cost) => {
      const avail =
        storage.find((item) => item.commodityId === cost.commodityId)?.amount ||
        0;
      return cost.amount > 0 ? Math.floor(avail / cost.amount) : Infinity;
    }),
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

export function getFieldTypeCandidates(field: ColonyField): number[] {
  const terrainTileId = field.terrainTileId ?? undefined;
  const normalizedFieldType =
    field.fieldType >= 10000
      ? Math.floor(field.fieldType / 100)
      : field.fieldType;
  return [terrainTileId, field.fieldType, normalizedFieldType].filter(
    (fieldType, index, values): fieldType is number =>
      fieldType !== null &&
      fieldType !== undefined &&
      values.indexOf(fieldType) === index,
  );
}

export function getEffectiveBuildingForField(
  building: BuildingDef,
  field: ColonyField,
  buildingMap: Record<number, BuildingDef | undefined>,
): BuildingDef {
  for (const fieldType of getFieldTypeCandidates(field)) {
    const alternative = building.fieldAlternatives?.find(
      (entry) => entry.fieldtype === fieldType,
    );
    if (alternative) {
      return buildingMap[alternative.alternateBuildingId] ?? building;
    }
  }
  return building;
}
