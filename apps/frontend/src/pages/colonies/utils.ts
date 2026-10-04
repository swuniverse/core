import type {
  BuildingDef,
  ColonyField,
  ColonyStorageItem,
  FieldCategoriesSummary,
} from './types';

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
  // terrainTileId ist string|null (SWU-Codes wie "A540") - nur reine Zahlen (alte STU-Felder) einbeziehen.
  const terrainTileId =
    field.terrainTileId != null && /^\d+$/.test(field.terrainTileId)
      ? Number(field.terrainTileId)
      : undefined;
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

/** Numerische Feldtyp-Kandidaten plus roher terrainTileId-String (auch nicht-numerisch, z.B. "E432"), fuer Terraforming-Matching. */
export function getFieldIdentityCandidates(field: ColonyField): string[] {
  const candidates = getFieldTypeCandidates(field).map((candidate) =>
    String(candidate),
  );
  if (field.terrainTileId != null && !candidates.includes(field.terrainTileId)) {
    candidates.push(field.terrainTileId);
  }
  return candidates;
}

/**
 * Baubarkeits-Check analog zum Backend (isBuildingAllowedOnField): erst die
 * alten numerischen allowedFieldTypes, dann zusaetzlich die SWU-Feldkategorien
 * (terrainTileId -> Kategorien wie "standard"/"bergbau"/"orbit"). "any"-
 * Kategorien erlauben jedes Gebaeude.
 */
export function buildingAllowedOnField(
  building: BuildingDef,
  field: ColonyField,
  fieldCategories: FieldCategoriesSummary,
): boolean {
  if (
    getFieldTypeCandidates(field).some((fieldType) =>
      building.allowedFieldTypes.includes(fieldType),
    )
  ) {
    return true;
  }
  if (!field.terrainTileId) return false;
  const categories = fieldCategories.tiles[field.terrainTileId] ?? [];
  return categories.some(
    (category) =>
      fieldCategories.anyCategories.includes(category) ||
      building.allowedFieldTypes.includes(category),
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
