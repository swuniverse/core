import {
  type StuCelestialClassDefinition,
  getStuCelestialClass,
} from './planet-classes.js';

export type ColonizationObjectType = 'PLANET' | 'MOON' | 'ASTEROID';
export type ColonizationLimitType = Lowercase<ColonizationObjectType>;
export type ColonizationClassGate =
  | 'STARTER'
  | 'HOSTILE'
  | 'EXTREME'
  | 'ASTEROID_THIN'
  | 'ASTEROID_MEDIUM'
  | 'ASTEROID_DENSE';

export const COLONIZATION_TECH_IDS = {
  REBEL_TIER_1_COLONIZER: 415001,
  EMPIRE_TIER_1_COLONIZER: 415003,
  REBEL_TIER_2_COLONIZER: 465001,
  EMPIRE_TIER_2_COLONIZER: 465003,
  REBEL_HOSTILE_PLANETS: 101101,
  EMPIRE_HOSTILE_PLANETS: 101103,
  REBEL_MOON_COLONIZATION_1: 102101,
  EMPIRE_MOON_COLONIZATION_1: 102103,
  REBEL_EXTREME_PLANETS: 101201,
  EMPIRE_EXTREME_PLANETS: 101203,
  REBEL_MOON_COLONIZATION_2: 102201,
  EMPIRE_MOON_COLONIZATION_2: 102203,
  REBEL_ASTEROID_THIN: 102301,
  EMPIRE_ASTEROID_THIN: 102303,
  REBEL_ASTEROID_MEDIUM: 102401,
  EMPIRE_ASTEROID_MEDIUM: 102403,
  REBEL_ASTEROID_DENSE: 102501,
  EMPIRE_ASTEROID_DENSE: 102503,
} as const;

export const COLONIZATION_BUILDING_IDS = {
  REBEL_BASE_CAMP: 81010100,
  REBEL_COLONY_CENTRAL: 82010100,
  EMPIRE_BASE_CAMP: 81010300,
  EMPIRE_COLONY_CENTRAL: 82010300,
} as const;

export const COLONIZER_SHIP_CLASS_KEYS = {
  REBEL_TIER_1: 'REBEL_CORVETTE_GR75',
  EMPIRE_TIER_1: 'EMPIRE_FRIGATE_SENTINEL',
  REBEL_TIER_2: 'REBEL_CORVETTE_CR90_COLONIZER',
  EMPIRE_TIER_2: 'EMPIRE_LAMBDA_SETTLEMENT_SHUTTLE',
} as const;

export const COLONIZATION_OBJECT_TYPES: Record<
  ColonizationLimitType,
  ColonizationObjectType
> = {
  planet: 'PLANET',
  moon: 'MOON',
  asteroid: 'ASTEROID',
};

export const COLONIZATION_BASE_LIMITS: Record<ColonizationLimitType, number> = {
  planet: 1,
  moon: 0,
  asteroid: 0,
};

export const COLONIZATION_MAX_LIMITS: Record<ColonizationLimitType, number> = {
  planet: 3,
  moon: 3,
  asteroid: 1,
};

export interface ColonizationTechPair {
  rebel: number;
  empire: number;
}

export interface ColonizationLimitRule {
  type: ColonizationLimitType;
  label: string;
  tech?: ColonizationTechPair;
}

export const COLONIZATION_LIMIT_RULES: readonly ColonizationLimitRule[] = [
  { type: 'planet', label: 'Heimatplanet' },
  {
    type: 'planet',
    label: 'weiterer Planet',
    tech: {
      rebel: COLONIZATION_TECH_IDS.REBEL_HOSTILE_PLANETS,
      empire: COLONIZATION_TECH_IDS.EMPIRE_HOSTILE_PLANETS,
    },
  },
  {
    type: 'planet',
    label: 'weiterer Planet',
    tech: {
      rebel: COLONIZATION_TECH_IDS.REBEL_EXTREME_PLANETS,
      empire: COLONIZATION_TECH_IDS.EMPIRE_EXTREME_PLANETS,
    },
  },
  {
    type: 'moon',
    label: 'erster Mond',
    tech: {
      rebel: COLONIZATION_TECH_IDS.REBEL_TIER_1_COLONIZER,
      empire: COLONIZATION_TECH_IDS.EMPIRE_TIER_1_COLONIZER,
    },
  },
  {
    type: 'moon',
    label: 'weiterer Mond',
    tech: {
      rebel: COLONIZATION_TECH_IDS.REBEL_MOON_COLONIZATION_1,
      empire: COLONIZATION_TECH_IDS.EMPIRE_MOON_COLONIZATION_1,
    },
  },
  {
    type: 'moon',
    label: 'weiterer Mond',
    tech: {
      rebel: COLONIZATION_TECH_IDS.REBEL_MOON_COLONIZATION_2,
      empire: COLONIZATION_TECH_IDS.EMPIRE_MOON_COLONIZATION_2,
    },
  },
  {
    type: 'asteroid',
    label: 'erster Asteroid',
    tech: {
      rebel: COLONIZATION_TECH_IDS.REBEL_ASTEROID_THIN,
      empire: COLONIZATION_TECH_IDS.EMPIRE_ASTEROID_THIN,
    },
  },
] as const;

export interface ColonizationClassGateRule {
  gate: ColonizationClassGate;
  label: string;
  planetTech?: ColonizationTechPair;
  moonTech?: ColonizationTechPair;
  asteroidTech?: ColonizationTechPair;
}

export const COLONIZATION_CLASS_GATE_RULES: readonly ColonizationClassGateRule[] =
  [
    { gate: 'STARTER', label: 'M/L/O-Klasse' },
    {
      gate: 'HOSTILE',
      label: 'lebensfeindliche Klassen D/G/H/K/P',
      planetTech: {
        rebel: COLONIZATION_TECH_IDS.REBEL_HOSTILE_PLANETS,
        empire: COLONIZATION_TECH_IDS.EMPIRE_HOSTILE_PLANETS,
      },
      moonTech: {
        rebel: COLONIZATION_TECH_IDS.REBEL_MOON_COLONIZATION_1,
        empire: COLONIZATION_TECH_IDS.EMPIRE_MOON_COLONIZATION_1,
      },
    },
    {
      gate: 'EXTREME',
      label: 'extreme Klassen Q/X',
      planetTech: {
        rebel: COLONIZATION_TECH_IDS.REBEL_EXTREME_PLANETS,
        empire: COLONIZATION_TECH_IDS.EMPIRE_EXTREME_PLANETS,
      },
      moonTech: {
        rebel: COLONIZATION_TECH_IDS.REBEL_MOON_COLONIZATION_2,
        empire: COLONIZATION_TECH_IDS.EMPIRE_MOON_COLONIZATION_2,
      },
    },
    {
      gate: 'ASTEROID_THIN',
      label: 'dünne Asteroiden',
      asteroidTech: {
        rebel: COLONIZATION_TECH_IDS.REBEL_ASTEROID_THIN,
        empire: COLONIZATION_TECH_IDS.EMPIRE_ASTEROID_THIN,
      },
    },
    {
      gate: 'ASTEROID_MEDIUM',
      label: 'mittlere Asteroiden',
      asteroidTech: {
        rebel: COLONIZATION_TECH_IDS.REBEL_ASTEROID_MEDIUM,
        empire: COLONIZATION_TECH_IDS.EMPIRE_ASTEROID_MEDIUM,
      },
    },
    {
      gate: 'ASTEROID_DENSE',
      label: 'dichte Asteroiden',
      asteroidTech: {
        rebel: COLONIZATION_TECH_IDS.REBEL_ASTEROID_DENSE,
        empire: COLONIZATION_TECH_IDS.EMPIRE_ASTEROID_DENSE,
      },
    },
  ] as const;

export function getFactionTechId(
  pair: ColonizationTechPair,
  factionKey: string | null | undefined,
): number {
  return factionKey === 'GALACTIC_EMPIRE' ? pair.empire : pair.rebel;
}

export function getColonizationObjectType(
  celestialObjectType: number | null | undefined,
): ColonizationObjectType | null {
  switch (celestialObjectType) {
    case 1:
      return 'PLANET';
    case 2:
      return 'MOON';
    case 3:
      return 'ASTEROID';
    default:
      return null;
  }
}

export function getColonizationLimitType(
  celestialObjectType: number | null | undefined,
): ColonizationLimitType | null {
  const objectType = getColonizationObjectType(celestialObjectType);
  return objectType
    ? (objectType.toLowerCase() as ColonizationLimitType)
    : null;
}

export function getColonizationClassGate(
  classId: number | null | undefined,
): ColonizationClassGate | null {
  const definition = getStuCelestialClass(classId);
  if (!definition) return null;
  return getColonizationClassGateForDefinition(definition);
}

export function getColonizationClassGateForDefinition(
  definition: StuCelestialClassDefinition,
): ColonizationClassGate | null {
  if (
    definition.colonization === 'UNINHABITABLE' ||
    definition.colonization === 'UNUSED'
  ) {
    return null;
  }

  if (definition.group === 'ASTEROID') {
    switch (definition.variant) {
      case 'THIN':
        return 'ASTEROID_THIN';
      case 'MEDIUM':
        return 'ASTEROID_MEDIUM';
      case 'DENSE':
        return 'ASTEROID_DENSE';
      default:
        return null;
    }
  }

  if (
    definition.group === 'M_CLASS' ||
    definition.group === 'L_CLASS' ||
    definition.group === 'O_CLASS'
  ) {
    return 'STARTER';
  }

  if (definition.group === 'EXTREME') return 'EXTREME';
  if (definition.group === 'HOSTILE') return 'HOSTILE';
  return null;
}

export function getClassGateRequiredTechPair(
  gate: ColonizationClassGate,
  limitType: ColonizationLimitType,
): ColonizationTechPair | null {
  const rule = COLONIZATION_CLASS_GATE_RULES.find(
    (candidate) => candidate.gate === gate,
  );
  if (!rule) return null;
  if (limitType === 'planet') return rule.planetTech ?? null;
  if (limitType === 'moon') return rule.moonTech ?? null;
  return rule.asteroidTech ?? null;
}

export function getDefaultColonizationBuildingId(
  factionKey: string | null | undefined,
  tier: number,
): number {
  const empire = factionKey === 'GALACTIC_EMPIRE';
  if (tier >= 2) {
    return empire
      ? COLONIZATION_BUILDING_IDS.EMPIRE_COLONY_CENTRAL
      : COLONIZATION_BUILDING_IDS.REBEL_COLONY_CENTRAL;
  }
  return empire
    ? COLONIZATION_BUILDING_IDS.EMPIRE_BASE_CAMP
    : COLONIZATION_BUILDING_IDS.REBEL_BASE_CAMP;
}
