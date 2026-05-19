export type StuCelestialObjectKind =
  | 'PLANET'
  | 'RING_PLANET'
  | 'MOON'
  | 'ASTEROID';

export type StuColonizationCategory =
  | 'STARTER'
  | 'TECH'
  | 'ASTEROID_TECH'
  | 'UNINHABITABLE'
  | 'UNUSED';

export interface StuCelestialClassDefinition {
  id: number;
  code: string;
  name: string;
  description: string;
  objectKind: StuCelestialObjectKind;
  /** Matches backend CelestialObjectType: PLANET=1, MOON=2, ASTEROID=3. */
  celestialObjectType: 1 | 2 | 3;
  colonization: StuColonizationCategory;
  allowStart: boolean;
  assetId?: number;
  variant?: 'NORMAL' | 'RING' | 'THIN' | 'MEDIUM' | 'DENSE' | 'UNUSED';
  group?:
    | 'M_CLASS'
    | 'L_CLASS'
    | 'O_CLASS'
    | 'HOSTILE'
    | 'EXTREME'
    | 'UNINHABITABLE'
    | 'ASTEROID';
}

const PLANET_DESCRIPTIONS: Record<string, string> = {
  M: 'Erdähnlich — ausgewogene Mischung aus Ozeanen, Landmassen und Polkappen',
  L: 'Bewaldet — dichte Vegetation, Wälder und fruchtbare Landflächen',
  O: 'Ozeanisch — wasserreich mit wenigen Landmassen',
  S: 'Unbewohnbar — gebundene Rotation mit extremer Tag-/Nachtseite',
  T: 'Unbewohnbar — gebundene Rotation mit extremen Temperaturzonen',
  K: 'Marsähnlich/Ödland — karg und trocken, technologieabhängig kolonisierbar',
  H: 'Wüstenbedeckt — lebensfeindlich, technologieabhängig kolonisierbar',
  P: 'Eisbedeckt — lebensfeindlich, technologieabhängig kolonisierbar',
  'P-T': 'Eis-Wasser-Mix — P-Unterklasse mit geringen Wasserfeldern',
  X: 'Vulkanisch — extreme Klasse, technologieabhängig kolonisierbar',
  G: 'Tundrabedeckt — lebensfeindlich, technologieabhängig kolonisierbar',
  Q: 'Dichte Atmosphäre — extreme Klasse, technologieabhängig kolonisierbar',
  N: 'Unbewohnbar — reduktive Atmosphäre',
  D: 'Mondähnlich/Fels — lebensfeindlich, technologieabhängig kolonisierbar',
  'I-1': 'Gasriese — unbewohnbar',
  'I-2': 'Gasriese — unbewohnbar',
  'I-3': 'Gasriese — unbewohnbar',
  'J-1': 'Gasriese mit Ring — unbewohnbar',
  'J-2': 'Gasriese mit Ring — unbewohnbar',
  'J-3': 'Gasriese mit Ring — unbewohnbar',
};

function planet(
  id: number,
  code: string,
  colonization: StuColonizationCategory,
  allowStart = false,
): StuCelestialClassDefinition {
  return {
    id,
    code,
    name: `Klasse ${code}`,
    description: PLANET_DESCRIPTIONS[code] ?? `Klasse ${code}`,
    objectKind: 'PLANET',
    celestialObjectType: 1,
    colonization,
    allowStart,
    group:
      colonization === 'STARTER'
        ? code === 'M'
          ? 'M_CLASS'
          : code === 'L'
            ? 'L_CLASS'
            : 'O_CLASS'
        : colonization === 'UNINHABITABLE'
          ? 'UNINHABITABLE'
          : code === 'Q' || code === 'X'
            ? 'EXTREME'
            : 'HOSTILE',
  };
}

function ringPlanet(
  id: number,
  code: string,
  colonization: StuColonizationCategory,
): StuCelestialClassDefinition {
  const baseCode = code.replace('-R', '');
  return {
    id,
    code,
    name: `Klasse ${code}`,
    description: `${PLANET_DESCRIPTIONS[baseCode] ?? `Klasse ${baseCode}`} — Ringplanet`,
    objectKind: 'RING_PLANET',
    celestialObjectType: 1,
    colonization,
    allowStart: false,
    variant: 'RING',
    group:
      colonization === 'UNINHABITABLE'
        ? 'UNINHABITABLE'
        : baseCode === 'Q' || baseCode === 'X'
          ? 'EXTREME'
          : 'HOSTILE',
  };
}

function moon(
  id: number,
  code: string,
  colonization: StuColonizationCategory,
  variant?: 'UNUSED',
): StuCelestialClassDefinition {
  return {
    id,
    code,
    name: variant === 'UNUSED' ? 'unused' : `Klasse ${code}`,
    description:
      variant === 'UNUSED'
        ? 'Nicht verwendeter STU-Mondtyp; darf nicht generiert werden'
        : `${PLANET_DESCRIPTIONS[code] ?? `Klasse ${code}`} — Mond`,
    objectKind: 'MOON',
    celestialObjectType: 2,
    colonization,
    allowStart: false,
    variant,
    group:
      colonization === 'UNUSED' || colonization === 'UNINHABITABLE'
        ? 'UNINHABITABLE'
        : code === 'Q' || code === 'X'
          ? 'EXTREME'
          : colonization === 'STARTER'
            ? code === 'M'
              ? 'M_CLASS'
              : code === 'L'
                ? 'L_CLASS'
                : 'O_CLASS'
            : 'HOSTILE',
  };
}

function asteroid(
  id: number,
  family: 'Normal' | 'Gelb' | 'Braun' | 'Eis',
  density: 'Dünnes' | 'Mittleres' | 'Dichtes',
  variant: 'THIN' | 'MEDIUM' | 'DENSE',
): StuCelestialClassDefinition {
  const ice = family === 'Eis';
  const name = `${density} ${ice ? 'Eisasteroidenfeld' : 'Asteroidenfeld'}`;
  return {
    id,
    code: `${family}-${variant}`,
    name,
    description: `${name} — technologieabhängig kolonisierbares Asteroidenfeld`,
    objectKind: 'ASTEROID',
    celestialObjectType: 3,
    colonization: 'ASTEROID_TECH',
    allowStart: false,
    variant,
    group: 'ASTEROID',
  };
}

export const STU_CELESTIAL_CLASSES = [
  planet(201, 'M', 'STARTER', true),
  planet(203, 'L', 'STARTER', true),
  planet(205, 'O', 'STARTER', true),
  planet(207, 'S', 'UNINHABITABLE'),
  planet(209, 'T', 'UNINHABITABLE'),
  planet(211, 'K', 'TECH'),
  planet(213, 'H', 'TECH'),
  planet(215, 'P', 'TECH'),
  planet(216, 'P-T', 'TECH'),
  planet(217, 'X', 'TECH'),
  planet(219, 'G', 'TECH'),
  planet(221, 'Q', 'TECH'),
  planet(223, 'N', 'UNINHABITABLE'),
  planet(231, 'D', 'TECH'),
  planet(261, 'I-1', 'UNINHABITABLE'),
  planet(262, 'I-2', 'UNINHABITABLE'),
  planet(263, 'I-3', 'UNINHABITABLE'),
  ringPlanet(301, 'M-R', 'TECH'),
  ringPlanet(303, 'L-R', 'TECH'),
  ringPlanet(305, 'O-R', 'TECH'),
  ringPlanet(311, 'K-R', 'TECH'),
  ringPlanet(313, 'H-R', 'TECH'),
  ringPlanet(315, 'P-R', 'TECH'),
  ringPlanet(317, 'X-R', 'TECH'),
  ringPlanet(331, 'D-R', 'TECH'),
  ringPlanet(361, 'J-1', 'UNINHABITABLE'),
  ringPlanet(362, 'J-2', 'UNINHABITABLE'),
  ringPlanet(363, 'J-3', 'UNINHABITABLE'),
  moon(401, 'M', 'TECH'),
  moon(403, 'L', 'TECH'),
  moon(405, 'O', 'TECH'),
  moon(407, 'S', 'UNINHABITABLE'),
  moon(409, 'T', 'UNINHABITABLE'),
  moon(411, 'K', 'TECH'),
  moon(413, 'H', 'TECH'),
  moon(415, 'P', 'TECH'),
  moon(416, 'P-T', 'TECH'),
  moon(417, 'X', 'TECH'),
  moon(419, 'G', 'TECH'),
  moon(421, 'Q', 'TECH'),
  moon(423, 'N', 'UNINHABITABLE'),
  moon(431, 'D', 'TECH'),
  moon(432, 'unused', 'UNUSED', 'UNUSED'),
  asteroid(701, 'Normal', 'Dünnes', 'THIN'),
  asteroid(702, 'Normal', 'Mittleres', 'MEDIUM'),
  asteroid(703, 'Normal', 'Dichtes', 'DENSE'),
  asteroid(704, 'Gelb', 'Dünnes', 'THIN'),
  asteroid(705, 'Gelb', 'Mittleres', 'MEDIUM'),
  asteroid(706, 'Gelb', 'Dichtes', 'DENSE'),
  asteroid(707, 'Braun', 'Dünnes', 'THIN'),
  asteroid(708, 'Braun', 'Mittleres', 'MEDIUM'),
  asteroid(709, 'Braun', 'Dichtes', 'DENSE'),
  asteroid(716, 'Eis', 'Dünnes', 'THIN'),
  asteroid(717, 'Eis', 'Mittleres', 'MEDIUM'),
  asteroid(718, 'Eis', 'Dichtes', 'DENSE'),
] as const satisfies readonly StuCelestialClassDefinition[];

export const STU_CELESTIAL_CLASS_BY_ID = new Map<
  number,
  StuCelestialClassDefinition
>(STU_CELESTIAL_CLASSES.map((definition) => [definition.id, definition]));

export const STU_STARTER_PLANET_CLASS_IDS = STU_CELESTIAL_CLASSES.filter(
  (definition) => definition.allowStart && definition.objectKind === 'PLANET',
).map((definition) => definition.id);

export function getStuCelestialClass(
  classId: number | null | undefined,
): StuCelestialClassDefinition | undefined {
  return classId == null ? undefined : STU_CELESTIAL_CLASS_BY_ID.get(classId);
}

export function getStuClassLabel(classId: number | null | undefined): string {
  return (
    getStuCelestialClass(classId)?.code ??
    (classId == null ? 'Unbekannt' : String(classId))
  );
}

export function getStuClassName(classId: number | null | undefined): string {
  return (
    getStuCelestialClass(classId)?.name ??
    (classId == null ? 'Unbekannt' : String(classId))
  );
}

export function getStuClassDescription(
  classId: number | null | undefined,
): string {
  return getStuCelestialClass(classId)?.description ?? 'Unbekannte Klasse';
}

export function isStarterPlanetClass(
  classId: number | null | undefined,
): boolean {
  return getStuCelestialClass(classId)?.allowStart === true;
}

export function isHabitableByClass(
  classId: number | null | undefined,
): boolean {
  const definition = getStuCelestialClass(classId);
  return (
    !!definition &&
    definition.colonization !== 'UNINHABITABLE' &&
    definition.colonization !== 'UNUSED'
  );
}

export function requiresColonizationTech(
  classId: number | null | undefined,
): boolean {
  const colonization = getStuCelestialClass(classId)?.colonization;
  return colonization === 'TECH' || colonization === 'ASTEROID_TECH';
}

export function getClassIdsByObjectType(
  celestialObjectType: 1 | 2 | 3,
  options: { includeUnused?: boolean } = {},
): number[] {
  return STU_CELESTIAL_CLASSES.filter(
    (definition) => definition.celestialObjectType === celestialObjectType,
  )
    .filter(
      (definition) =>
        options.includeUnused || definition.colonization !== 'UNUSED',
    )
    .map((definition) => definition.id);
}

export function getClassIdsByKind(
  objectKind: StuCelestialObjectKind,
  options: { includeUnused?: boolean } = {},
): number[] {
  return STU_CELESTIAL_CLASSES.filter(
    (definition) => definition.objectKind === objectKind,
  )
    .filter(
      (definition) =>
        options.includeUnused || definition.colonization !== 'UNUSED',
    )
    .map((definition) => definition.id);
}
