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
  planetProbabilities: Record<number, number>;
  moonProbabilities: Record<number, number>;
  asteroidProbabilities: Record<number, number>;
  planetProbabilityBlacklist: number[];
  moonProbabilityBlacklist: number[];
  asteroidProbabilityBlacklist: number[];
  /** @deprecated use planetProbabilities + planetProbabilityBlacklist */
  classPool: number[];
};

export const STU_PLANET_PROBABILITIES: Record<number, number> = {
  231: 100,
  215: 92,
  213: 86,
  219: 85,
  211: 84,
  201: 74,
  203: 73,
  217: 70,
  205: 69,
  221: 63,
  223: 57,
  209: 47,
  207: 43,
  361: 25,
  262: 19,
  216: 18,
  362: 18,
  263: 15,
  363: 15,
  317: 14,
  331: 13,
  313: 12,
  315: 12,
  261: 11,
  305: 9,
  303: 9,
  301: 9,
};

export const STU_MOON_PROBABILITIES: Record<number, number> = {
  431: 100,
  415: 41,
  419: 40,
  413: 40,
  411: 39,
  403: 25,
  405: 22,
  401: 21,
  417: 15,
  407: 13,
  416: 12,
  421: 11,
  423: 9,
  409: 6,
};

export const STU_ASTEROID_PROBABILITIES: Record<number, number> = {
  701: 18,
  702: 14,
  703: 8,
  704: 14,
  705: 11,
  706: 6,
  707: 14,
  708: 11,
  709: 6,
  716: 10,
  717: 8,
  718: 5,
};

const ALL_STU_PLANET_CLASS_IDS = Object.keys(STU_PLANET_PROBABILITIES).map(
  Number,
);

function getPlanetBlacklistForType(def: SystemTypeDefinition): number[] {
  if (def.rarity === 'VERY_RARE' || def.minPlanets === 0) {
    return ALL_STU_PLANET_CLASS_IDS;
  }
  // Very hot / hostile systems should not contain starter-friendly M/L/O worlds.
  if (def.id >= 1061 && def.id <= 1066) {
    return [201, 203, 205, 301, 303, 305];
  }
  // Rare compact/special systems skew toward uncommon and uninhabitable classes.
  if (def.rarity === 'RARE') {
    return [201, 203, 205, 211, 213, 215, 301, 303, 305];
  }
  return [];
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

  const planetProbabilityBlacklist = getPlanetBlacklistForType(def);

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
    planetProbabilities: STU_PLANET_PROBABILITIES,
    moonProbabilities: STU_MOON_PROBABILITIES,
    asteroidProbabilities: STU_ASTEROID_PROBABILITIES,
    planetProbabilityBlacklist,
    moonProbabilityBlacklist: [],
    asteroidProbabilityBlacklist: [],
    classPool: ALL_STU_PLANET_CLASS_IDS.filter(
      (id) => !planetProbabilityBlacklist.includes(id),
    ),
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
    planetProbabilities: STU_PLANET_PROBABILITIES,
    moonProbabilities: STU_MOON_PROBABILITIES,
    asteroidProbabilities: STU_ASTEROID_PROBABILITIES,
    planetProbabilityBlacklist: [],
    moonProbabilityBlacklist: [],
    asteroidProbabilityBlacklist: [],
    classPool: ALL_STU_PLANET_CLASS_IDS,
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
