export interface PlanetClassDefinition {
  key: string;
  name: string;
  surfaceWidth: number;
  surfaceHeight: number;
  orbitSlots: number;
  undergroundSlots: number;
  terrainWeights: Record<string, number>;
  polarTerrains: string[];
  equatorialTerrains: string[];
  rareTerrains: string[];
  colonizableChance: number;
}

export const PLANET_CLASSES: PlanetClassDefinition[] = [
  {
    key: 'DESERT',
    name: 'Wüstenplanet',
    surfaceWidth: 7,
    surfaceHeight: 5,
    orbitSlots: 7,
    undergroundSlots: 2,
    terrainWeights: { SAND_DUNES: 40, ROCKY_DESERT: 25, MESA: 15, OASIS: 8, CANYON: 12 },
    polarTerrains: ['ROCKY_DESERT'],
    equatorialTerrains: ['SAND_DUNES', 'MESA'],
    rareTerrains: ['OASIS'],
    colonizableChance: 0.7,
  },
  {
    key: 'ICE',
    name: 'Eisplanet',
    surfaceWidth: 6,
    surfaceHeight: 5,
    orbitSlots: 6,
    undergroundSlots: 2,
    terrainWeights: { GLACIER: 35, TUNDRA: 25, FROZEN_LAKE: 15, ICE_CAVE: 10, SNOW_PLAIN: 15 },
    polarTerrains: ['GLACIER', 'ICE_CAVE'],
    equatorialTerrains: ['TUNDRA', 'SNOW_PLAIN'],
    rareTerrains: ['FROZEN_LAKE'],
    colonizableChance: 0.5,
  },
  {
    key: 'FOREST',
    name: 'Waldplanet',
    surfaceWidth: 8,
    surfaceHeight: 6,
    orbitSlots: 8,
    undergroundSlots: 2,
    terrainWeights: { DENSE_FOREST: 35, JUNGLE: 20, CLEARING: 15, RIVER: 12, SWAMP: 10, LAKE: 8 },
    polarTerrains: ['DENSE_FOREST'],
    equatorialTerrains: ['JUNGLE', 'SWAMP'],
    rareTerrains: ['CLEARING', 'LAKE'],
    colonizableChance: 0.85,
  },
  {
    key: 'VOLCANIC',
    name: 'Vulkanplanet',
    surfaceWidth: 6,
    surfaceHeight: 4,
    orbitSlots: 6,
    undergroundSlots: 3,
    terrainWeights: { LAVA_FIELD: 35, VOLCANIC_ROCK: 30, ASH_PLAIN: 20, OBSIDIAN: 10, MAGMA_VENT: 5 },
    polarTerrains: ['ASH_PLAIN'],
    equatorialTerrains: ['LAVA_FIELD', 'MAGMA_VENT'],
    rareTerrains: ['OBSIDIAN'],
    colonizableChance: 0.3,
  },
  {
    key: 'OCEAN',
    name: 'Ozeanplanet',
    surfaceWidth: 8,
    surfaceHeight: 6,
    orbitSlots: 8,
    undergroundSlots: 2,
    terrainWeights: { DEEP_OCEAN: 40, SHALLOW_SEA: 25, CORAL_REEF: 12, ISLAND: 10, UNDERWATER_CAVE: 8, KELP_FOREST: 5 },
    polarTerrains: ['DEEP_OCEAN'],
    equatorialTerrains: ['SHALLOW_SEA', 'CORAL_REEF'],
    rareTerrains: ['ISLAND'],
    colonizableChance: 0.6,
  },
  {
    key: 'GAS_GIANT',
    name: 'Gasriese',
    surfaceWidth: 0,
    surfaceHeight: 0,
    orbitSlots: 12,
    undergroundSlots: 0,
    terrainWeights: {},
    polarTerrains: [],
    equatorialTerrains: [],
    rareTerrains: [],
    colonizableChance: 0.0,
  },
  {
    key: 'TEMPERATE',
    name: 'Gemäßigter Planet',
    surfaceWidth: 9,
    surfaceHeight: 7,
    orbitSlots: 9,
    undergroundSlots: 2,
    terrainWeights: { GRASSLAND: 30, FOREST: 20, HILLS: 15, RIVER: 12, MOUNTAIN: 10, COASTAL: 8, LAKE: 5 },
    polarTerrains: ['MOUNTAIN', 'HILLS'],
    equatorialTerrains: ['GRASSLAND', 'FOREST'],
    rareTerrains: ['LAKE', 'COASTAL'],
    colonizableChance: 0.95,
  },
  {
    key: 'BARREN',
    name: 'Unfruchtbarer Planet',
    surfaceWidth: 5,
    surfaceHeight: 4,
    orbitSlots: 5,
    undergroundSlots: 3,
    terrainWeights: { BARE_ROCK: 40, CRATER: 25, DUST_PLAIN: 20, MINERAL_DEPOSIT: 10, CAVE_SYSTEM: 5 },
    polarTerrains: ['BARE_ROCK', 'CRATER'],
    equatorialTerrains: ['DUST_PLAIN'],
    rareTerrains: ['MINERAL_DEPOSIT', 'CAVE_SYSTEM'],
    colonizableChance: 0.2,
  },
  {
    key: 'TOXIC',
    name: 'Giftplanet',
    surfaceWidth: 5,
    surfaceHeight: 4,
    orbitSlots: 5,
    undergroundSlots: 2,
    terrainWeights: { ACID_LAKE: 30, TOXIC_MARSH: 25, CORROSIVE_PLAIN: 25, CRYSTAL_GROWTH: 12, GAS_VENT: 8 },
    polarTerrains: ['CORROSIVE_PLAIN'],
    equatorialTerrains: ['ACID_LAKE', 'TOXIC_MARSH'],
    rareTerrains: ['CRYSTAL_GROWTH'],
    colonizableChance: 0.15,
  },
  {
    key: 'SWAMP',
    name: 'Sumpfplanet',
    surfaceWidth: 7,
    surfaceHeight: 5,
    orbitSlots: 7,
    undergroundSlots: 2,
    terrainWeights: { DEEP_SWAMP: 35, BOG: 25, MARSH_FOREST: 20, MURKY_POOL: 12, DRY_GROUND: 8 },
    polarTerrains: ['BOG'],
    equatorialTerrains: ['DEEP_SWAMP', 'MARSH_FOREST'],
    rareTerrains: ['DRY_GROUND'],
    colonizableChance: 0.55,
  },
  {
    key: 'CRYSTAL',
    name: 'Kristallplanet',
    surfaceWidth: 6,
    surfaceHeight: 5,
    orbitSlots: 6,
    undergroundSlots: 3,
    terrainWeights: { CRYSTAL_FIELD: 35, GEODE_CAVE: 20, PRISM_PLAIN: 20, SHARD_MOUNTAIN: 15, ENERGY_POOL: 10 },
    polarTerrains: ['SHARD_MOUNTAIN'],
    equatorialTerrains: ['CRYSTAL_FIELD', 'PRISM_PLAIN'],
    rareTerrains: ['ENERGY_POOL'],
    colonizableChance: 0.4,
  },
];

export const PLANET_CLASS_BY_KEY = new Map(
  PLANET_CLASSES.map(pc => [pc.key, pc]),
);

export const TERRAIN_TYPES_ALL = [
  ...new Set(PLANET_CLASSES.flatMap(pc => Object.keys(pc.terrainWeights))),
];
