import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as yaml from 'js-yaml';

export function migrationBuildingSeedPath(): string {
  return (
    process.env.SWU_MIGRATION_BUILDING_SEED_PATH ??
    join(process.cwd(), 'game-data/data/buildings/stu-buildings.yaml')
  );
}

export function loadMigrationBuildingSeed(): unknown {
  const configuredPath = process.env.SWU_MIGRATION_BUILDING_SEED_PATH;
  const path = migrationBuildingSeedPath();
  const seed = yaml.load(readFileSync(path, 'utf-8'));
  // Preserve the historical production parsing behavior when no override is set.
  if (configuredPath !== undefined && !validSeed(seed)) {
    throw new Error(`Invalid migration building seed: ${path}`);
  }
  return seed;
}

function validSeed(seed: unknown): boolean {
  if (!seed || typeof seed !== 'object' || !('buildings' in seed)) return false;
  const buildings = seed.buildings;
  if (!Array.isArray(buildings) || buildings.length === 0) return false;
  const integer = (value: unknown) =>
    typeof value === 'number' && Number.isSafeInteger(value);
  return buildings.every((building: unknown) => {
    if (
      !building ||
      typeof building !== 'object' ||
      !('id' in building) ||
      !integer(building.id)
    )
      return false;
    if ('bevPro' in building && !integer(building.bevPro)) return false;
    if (!('fieldAlternatives' in building)) return true;
    return (
      Array.isArray(building.fieldAlternatives) &&
      building.fieldAlternatives.every(
        (alternative: unknown) =>
          !!alternative &&
          typeof alternative === 'object' &&
          'fieldtype' in alternative &&
          integer(alternative.fieldtype) &&
          'alternateBuildingId' in alternative &&
          integer(alternative.alternateBuildingId),
      )
    );
  });
}
