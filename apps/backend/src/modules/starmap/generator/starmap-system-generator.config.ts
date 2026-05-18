import {
  SYSTEM_TYPE_BY_ID,
  type SystemTypeDefinition,
} from '../starmap-system-types';
import { SeededRNG } from './seeded-rng';

export type StarmapGeneratorConfig = {
  width: number;
  height: number;
  starRadius: number;
  minPlanets: number;
  maxPlanets: number;
  asteroidRingChance: number;
  moonChance: number;
  colonizableChance: number;
  isBinary: boolean;
  primarySystemTypeId: number;
  secondarySystemTypeId: number | null;
  classPool: number[];
};

/**
 * Planet class pools by system context (STU ID scheme).
 * Planets: 201=M, 203=L, 205=O, 211=K, 213=H, 215=P, 217=X, 219=G, 221=Q, 231=D
 * Ring planets: 301=M-R, 303=L-R, 305=O-R
 * Moons: 401=M, 403=L, 405=O, 411=K, 413=H, 415=P
 * Asteroids: 701-718
 */
const CLASS_POOL_STANDARD = [201, 203, 205, 211, 215];
const CLASS_POOL_LARGE = [201, 203, 205, 211, 213, 215, 301, 303, 305];
const CLASS_POOL_HOSTILE = [211, 213, 217, 231];
const CLASS_POOL_RARE = [219, 221, 261, 262, 263];

function getClassPoolForType(def: SystemTypeDefinition): number[] {
  if (def.rarity === 'VERY_RARE' || def.minPlanets === 0) return [];
  if (def.rarity === 'RARE') return CLASS_POOL_RARE;
  if (def.id >= 1061 && def.id <= 1066) return CLASS_POOL_HOSTILE;
  if (def.gridSizeMax >= 25) return CLASS_POOL_LARGE;
  return CLASS_POOL_STANDARD;
}

/**
 * Resolve a full generator config from a system type definition and an optional seed.
 * Grid size is randomized within the type's range using the provided RNG.
 */
export function resolveGeneratorConfig(
  systemTypeId: number,
  rng: SeededRNG,
): StarmapGeneratorConfig {
  const def = SYSTEM_TYPE_BY_ID[systemTypeId];
  if (!def) {
    return buildFallbackConfig();
  }

  const gridSize = rng.nextInt(def.gridSizeMin, def.gridSizeMax);
  const starRadius = gridSize >= 25 ? 2 : 1;

  return {
    width: gridSize,
    height: gridSize,
    starRadius,
    minPlanets: def.minPlanets,
    maxPlanets: def.maxPlanets,
    asteroidRingChance: def.asteroidRingChance,
    moonChance: def.moonChance,
    colonizableChance: def.colonizableChance,
    isBinary: def.isBinary,
    primarySystemTypeId: systemTypeId,
    secondarySystemTypeId: null,
    classPool: getClassPoolForType(def),
  };
}

function buildFallbackConfig(): StarmapGeneratorConfig {
  return {
    width: 22,
    height: 22,
    starRadius: 1,
    minPlanets: 8,
    maxPlanets: 14,
    asteroidRingChance: 0.45,
    moonChance: 0.35,
    colonizableChance: 0.45,
    isBinary: false,
    primarySystemTypeId: 1050,
    secondarySystemTypeId: null,
    classPool: CLASS_POOL_STANDARD,
  };
}

/**
 * Legacy config map for backward compatibility with the 5 original types.
 * Maps old IDs (1-5) to the closest new system type IDs.
 */
export const LEGACY_TYPE_MAPPING: Record<number, number> = {
  1: 1050, // STANDARD → common giant
  2: 1049, // HOMEWORLD → giant (large, colonizable)
  3: 1064, // NEBULA_SYSTEM → medium special
  4: 1069, // ASTEROID_SYSTEM → rare medium
  5: 1068, // DEEP_SPACE_OUTPOST → neutron star (small)
};

export const STARMAP_SYSTEM_CONFIG_BY_TYPE: Record<
  number,
  StarmapGeneratorConfig
> = {};
