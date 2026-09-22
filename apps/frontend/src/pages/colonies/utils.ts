import type {
  BuildingDef,
  ColonyField,
  ColonyStorageItem,
  TerraformingDef,
} from './types';

export function canAfford(
  building: BuildingDef,
  storage: ColonyStorageItem[],
  energy: number,
): boolean {
  return (
    energy >= (building.epsCost || 0) &&
    (building.resourceCosts || []).every(
      (cost) =>
        (storage.find((item) => item.commodityId === cost.commodityId)
          ?.amount || 0) >= cost.amount,
    )
  );
}

export function maxAffordable(
  building: BuildingDef,
  storage: ColonyStorageItem[],
  energy: number,
): number {
  const costs = building.resourceCosts || [];
  const limits = costs.map((cost) => {
    const avail =
      storage.find((item) => item.commodityId === cost.commodityId)?.amount ||
      0;
    return cost.amount > 0 ? Math.floor(avail / cost.amount) : Infinity;
  });
  const energyCost = building.epsCost || 0;
  if (energyCost > 0) {
    limits.push(Math.floor(energy / energyCost));
  }
  return limits.length > 0 ? Math.min(...limits) : Infinity;
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

export function getTerraformingOptionsForField(
  field: ColonyField,
  terraformingDefs: TerraformingDef[],
): TerraformingDef[] {
  return getFieldTypeCandidates(field)
    .flatMap((fieldType) =>
      terraformingDefs.filter((option) => option.fromFieldType === fieldType),
    )
    .filter((option, index, options) => {
      const targetType =
        option.toFieldType >= 10000
          ? Math.floor(option.toFieldType / 100)
          : option.toFieldType;
      return (
        options.findIndex((candidate) => {
          const candidateTargetType =
            candidate.toFieldType >= 10000
              ? Math.floor(candidate.toFieldType / 100)
              : candidate.toFieldType;
          return candidateTargetType === targetType;
        }) === index
      );
    });
}
