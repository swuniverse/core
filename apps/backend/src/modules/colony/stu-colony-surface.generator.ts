import { SeededRNG } from '../starmap/generator/seeded-rng';

export enum StuColonyLayer {
  ORBIT = 'ORBIT',
  SURFACE = 'SURFACE',
  UNDERGROUND = 'UNDERGROUND',
}

export interface StuColonyFieldData {
  layer: StuColonyLayer;
  fieldIndex: number;
  fieldType: number;
}

export interface StuColonySurfaceConfig {
  name: string;
  width: number;
  surfaceHeight: number;
  hasOrbit: boolean;
  hasUnderground: boolean;
  fields: StuColonyFieldData[];
}

type GeneratorMode =
  | 'normal'
  | 'nocluster'
  | 'polar'
  | 'strict polar'
  | 'polar seeding north'
  | 'polar seeding south'
  | 'equatorial'
  | 'forced adjacency'
  | 'forced rim'
  | 'lower orbit'
  | 'upper orbit';

interface Phase {
  mode: GeneratorMode;
  description: string;
  num: number;
  from: number[];
  to: number[];
  adjacent: number[];
  noAdjacent: number[];
  noAdjacentLimit: number;
  fragmentation: number;
}

interface StuPlanetClassConfig {
  name: string;
  width: number;
  surfaceHeight: number;
  hasOrbit: boolean;
  hasUnderground: boolean;
  surfaceBaseField: number;
  orbitBaseField: number;
  undergroundBaseField: number;
  surfacePhases: Phase[];
  orbitPhases: Phase[];
  undergroundPhases: Phase[];
}

interface WeightedField {
  x: number;
  y: number;
  baseWeight: number;
  weight: number;
}

const DEFAULT_CLASS_ID = 201;

export function normalizeStuTerrainType(fieldType: number): number {
  if (fieldType >= 10000) {
    return normalizeStuTerrainType(Math.floor(fieldType / 100));
  }
  if (fieldType === 900) return 900;
  if (fieldType === 801 || fieldType === 802 || fieldType === 851) return 801;
  if (fieldType >= 1000) return 701;

  const base = Math.floor(fieldType / 100);
  if (base === 1) return fieldType === 121 || fieldType === 122 ? 601 : 101;
  if (base === 2) return 201;
  if (base === 4) return 401;
  if (base === 5) return 501;
  if (base === 6) return 601;
  if (base === 7) return fieldType >= 703 && fieldType <= 706 ? 703 : 701;
  return fieldType;
}

function range(rng: SeededRNG, min: number, max: number): number {
  return rng.nextInt(min, max);
}

function phase(
  mode: GeneratorMode,
  description: string,
  num: number,
  from: number[],
  to: number[],
  fragmentation: number,
  adjacent: number[] = [],
  noAdjacent: number[] = [],
  noAdjacentLimit = 0,
): Phase {
  return {
    mode,
    description,
    num,
    from,
    to,
    adjacent,
    noAdjacent,
    noAdjacentLimit,
    fragmentation,
  };
}

function buildClassConfig(
  classId: number,
  rng: SeededRNG,
): StuPlanetClassConfig {
  switch (classId) {
    case 203: {
      const water = range(rng, 12, 16);
      const mountains = range(rng, 6, 10);
      const swamp = range(rng, 5, 7);
      const trees = range(rng, 15, 22);
      const undergroundRock = range(rng, 8, 12);
      return {
        name: 'Klasse L - Basisklasse Wald',
        width: 10,
        surfaceHeight: 6,
        hasOrbit: true,
        hasUnderground: true,
        surfaceBaseField: 101,
        orbitBaseField: 900,
        undergroundBaseField: 801,
        surfacePhases: [
          phase('equatorial', 'Sümpfe', swamp, [101], [121], 15),
          phase('normal', 'Wasserflächen', water, [101], [201], 8, [], [121]),
          phase('normal', 'Berge', mountains, [101], [701], 10, [], [201], 1),
          phase('normal', 'Bäume', trees, [101], [111], 12, [], [401]),
        ],
        orbitPhases: [],
        undergroundPhases: [
          phase('normal', 'Untergrundfels', undergroundRock, [801], [802], 10),
        ],
      };
    }
    case 205: {
      const land = range(rng, 27, 32);
      const coral = range(rng, 4, 6);
      const shallow = range(rng, 9, 13);
      const trees = range(rng, 9, 13);
      const undergroundRock = range(rng, 4, 7);
      return {
        name: 'Klasse O - Basisklasse Ozean',
        width: 10,
        surfaceHeight: 6,
        hasOrbit: true,
        hasUnderground: true,
        surfaceBaseField: 201,
        orbitBaseField: 900,
        undergroundBaseField: 801,
        surfacePhases: [
          phase('equatorial', 'Korallen', coral, [201], [211], 25),
          phase('normal', 'Landmassen', land, [201], [101], 100),
          phase(
            'forced adjacency',
            'Seichtes Wasser',
            shallow,
            [201],
            [210],
            200,
            [101, 210],
          ),
          phase('normal', 'Berge', 6, [101], [701], 10, [], [], 1),
          phase('normal', 'Bäume', trees, [101], [111], 12, [], [401]),
        ],
        orbitPhases: [],
        undergroundPhases: [
          phase('normal', 'Untergrundwasser', 5, [801], [851], 2),
          phase('normal', 'Untergrundfels', undergroundRock, [801], [802], 10),
        ],
      };
    }
    case 201:
    default: {
      const iceNorth = range(rng, 2, 3);
      const iceSouth = iceNorth === 3 ? 2 : range(rng, 2, 3);
      const land = range(rng, 35, 40);
      const mountains = range(rng, 6, 8);
      const desert = range(rng, 3, 4);
      const trees = range(rng, 9, 13);
      const undergroundRock = range(rng, 4, 7);
      return {
        name: 'Klasse M - Basisklasse Erdähnlich',
        width: 10,
        surfaceHeight: 6,
        hasOrbit: true,
        hasUnderground: true,
        surfaceBaseField: 201,
        orbitBaseField: 900,
        undergroundBaseField: 801,
        surfacePhases: [
          phase('polar seeding north', 'Polkappe N', iceNorth, [201], [501], 2),
          phase('polar seeding south', 'Polkappe S', iceSouth, [201], [501], 2),
          phase('normal', 'Landmassen', land, [201], [101], 8),
          phase('equatorial', 'Wüsten', desert, [101], [401], 5, [], [201]),
          phase('normal', 'Berge', mountains, [101], [701], 10, [], [201], 1),
          phase('normal', 'Bäume', trees, [101], [111], 12, [], [401]),
          phase('strict polar', 'Nadelwald 1', 40, [111], [112], 20, [], [401]),
          phase(
            'forced adjacency',
            'Nadelwald 2',
            60,
            [111],
            [112],
            20,
            [501],
            [401],
          ),
        ],
        orbitPhases: [],
        undergroundPhases: [
          phase('normal', 'Untergrundwasser', 5, [801], [851], 2),
          phase('normal', 'Untergrundfels', undergroundRock, [801], [802], 10),
        ],
      };
    }
  }
}

export class StuColonySurfaceGenerator {
  generate(
    classId: number,
    seed: string,
    bonusFieldAmount = 2,
  ): StuColonySurfaceConfig {
    const rng = new SeededRNG(`${seed}:${classId}`);
    const config = buildClassConfig(classId, rng);
    const phases = [
      ...config.surfacePhases,
      ...this.createBonusPhases(config, rng, bonusFieldAmount),
    ];

    const orbit = config.hasOrbit
      ? this.doPhases(
          config.width,
          2,
          config.orbitBaseField,
          config.orbitPhases,
          rng,
        )
      : [];
    const surface = this.doPhases(
      config.width,
      config.surfaceHeight,
      config.surfaceBaseField,
      phases,
      rng,
    );
    const underground = config.hasUnderground
      ? this.doPhases(
          config.width,
          2,
          config.undergroundBaseField,
          config.undergroundPhases,
          rng,
        )
      : [];

    let fieldIndex = 0;
    const fields: StuColonyFieldData[] = [];
    this.appendFields(fields, orbit, StuColonyLayer.ORBIT, fieldIndex);
    fieldIndex += orbit.length;
    this.appendFields(fields, surface, StuColonyLayer.SURFACE, fieldIndex);
    fieldIndex += surface.length;
    this.appendFields(
      fields,
      underground,
      StuColonyLayer.UNDERGROUND,
      fieldIndex,
    );

    return {
      name: config.name,
      width: config.width,
      surfaceHeight: config.surfaceHeight,
      hasOrbit: config.hasOrbit,
      hasUnderground: config.hasUnderground,
      fields,
    };
  }

  getSupportedClassIds(): number[] {
    return [201, 203, 205];
  }

  private appendFields(
    target: StuColonyFieldData[],
    fieldTypes: number[],
    layer: StuColonyLayer,
    startIndex: number,
  ): void {
    fieldTypes.forEach((fieldType, offset) => {
      target.push({ layer, fieldIndex: startIndex + offset, fieldType });
    });
  }

  private doPhases(
    width: number,
    height: number,
    baseFieldType: number,
    phases: Phase[],
    rng: SeededRNG,
  ): number[] {
    const fieldArray = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => baseFieldType),
    );

    for (const p of phases) {
      for (let i = 0; i < p.num; i++) {
        const weighting = this.getWeightingList(fieldArray, p);
        if (weighting.length === 0) break;
        const field = this.weightedDraw(weighting, p.fragmentation, rng);
        const current = fieldArray[field.y][field.x];
        const possibleTargets = p.from.flatMap((fromType, index) =>
          current === fromType ? [p.to[index]] : [],
        );
        if (possibleTargets.length > 0) {
          fieldArray[field.y][field.x] = rng.choice(possibleTargets);
        }
      }
    }

    return fieldArray.flat();
  }

  private weightedDraw(
    fields: WeightedField[],
    fragmentation: number,
    rng: SeededRNG,
  ): WeightedField {
    return fields
      .map((field) => ({
        ...field,
        weight: rng.nextInt(1, Math.ceil(field.baseWeight + fragmentation)),
      }))
      .sort((a, b) => b.weight - a.weight || rng.nextInt(-1, 1))[0];
  }

  private getWeightingList(fieldArray: number[][], p: Phase): WeightedField[] {
    const height = fieldArray.length;
    const width = fieldArray[0]?.length ?? 0;
    const result: WeightedField[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!p.from.includes(fieldArray[y][x])) continue;

        let baseWeight = 1;
        if (
          (p.mode === 'polar' || p.mode === 'strict polar') &&
          (y === 0 || y === height - 1)
        ) {
          baseWeight += 1;
        }
        if (p.mode === 'polar seeding north' && y === 0) baseWeight += 2;
        if (p.mode === 'polar seeding south' && y === height - 1)
          baseWeight += 2;
        if (
          p.mode === 'equatorial' &&
          ((y === 2 && height === 5) || ((y === 2 || y === 3) && height === 6))
        ) {
          baseWeight += 1;
        }

        if (
          ![
            'nocluster',
            'forced adjacency',
            'forced rim',
            'polar seeding north',
            'polar seeding south',
          ].includes(p.mode)
        ) {
          baseWeight += this.countAdjacentWeight(fieldArray, x, y, p.to);
        }

        if (p.mode === 'polar seeding north' && y === 0) {
          baseWeight += this.countHorizontalWeight(fieldArray, x, y, p.to, 2);
        }
        if (p.mode === 'polar seeding south' && y === height - 1) {
          baseWeight += this.countHorizontalWeight(fieldArray, x, y, p.to, 2);
        }

        if (p.adjacent.length > 0) {
          baseWeight += this.countAdjacentWeight(fieldArray, x, y, p.adjacent);
        }

        if (p.noAdjacent.length > 0) {
          for (const terrain of p.noAdjacent) {
            if (
              this.countAdjacentWeight(fieldArray, x, y, [terrain]) >
              p.noAdjacentLimit
            ) {
              baseWeight = 0;
            }
          }
        }

        if (p.mode === 'forced adjacency' && baseWeight < 2) baseWeight = 0;
        if (p.mode === 'forced rim' && baseWeight < 1.5) baseWeight = 0;
        if (p.mode === 'polar' && y > 1 && y < height - 2) baseWeight = 0;
        if (p.mode === 'strict polar' && y > 0 && y < height - 1)
          baseWeight = 0;
        if (p.mode === 'polar seeding north' && y > 1) baseWeight = 0;
        if (p.mode === 'polar seeding south' && y < height - 2) baseWeight = 0;
        if (p.mode === 'equatorial' && height === 6 && (y < 2 || y > 3))
          baseWeight = 0;
        if (p.mode === 'equatorial' && height === 5 && (y < 2 || y > 3))
          baseWeight = 0;
        if (p.mode === 'lower orbit' && y !== 1) baseWeight = 0;
        if (p.mode === 'upper orbit' && y !== 0) baseWeight = 0;

        if (baseWeight > 0) result.push({ x, y, baseWeight, weight: 0 });
      }
    }

    return result;
  }

  private countAdjacentWeight(
    fieldArray: number[][],
    x: number,
    y: number,
    terrainTypes: number[],
  ): number {
    let weight = 0;
    for (const terrain of terrainTypes) {
      if (this.isFieldEqual(fieldArray, x - 1, y, terrain)) weight += 1;
      if (this.isFieldEqual(fieldArray, x + 1, y, terrain)) weight += 1;
      if (this.isFieldEqual(fieldArray, x, y - 1, terrain)) weight += 1;
      if (this.isFieldEqual(fieldArray, x, y + 1, terrain)) weight += 1;
      if (this.isFieldEqual(fieldArray, x - 1, y - 1, terrain)) weight += 0.5;
      if (this.isFieldEqual(fieldArray, x + 1, y + 1, terrain)) weight += 0.5;
      if (this.isFieldEqual(fieldArray, x + 1, y - 1, terrain)) weight += 0.5;
      if (this.isFieldEqual(fieldArray, x - 1, y + 1, terrain)) weight += 0.5;
    }
    return weight;
  }

  private countHorizontalWeight(
    fieldArray: number[][],
    x: number,
    y: number,
    terrainTypes: number[],
    multiplier: number,
  ): number {
    let weight = 0;
    for (const terrain of terrainTypes) {
      if (this.isFieldEqual(fieldArray, x - 1, y, terrain))
        weight += multiplier;
      if (this.isFieldEqual(fieldArray, x + 1, y, terrain))
        weight += multiplier;
    }
    return weight;
  }

  private isFieldEqual(
    fieldArray: number[][],
    x: number,
    y: number,
    terrain: number,
  ): boolean {
    return (
      y >= 0 &&
      y < fieldArray.length &&
      x >= 0 &&
      x < fieldArray[y].length &&
      fieldArray[y][x] === terrain
    );
  }

  private createBonusPhases(
    config: StuPlanetClassConfig,
    rng: SeededRNG,
    bonusFieldAmount: number,
  ): Phase[] {
    let remaining =
      config.width !== 10 ? bonusFieldAmount - 1 : bonusFieldAmount;
    if (remaining <= 0) return [];

    const candidates: Array<() => Phase | null> = [
      () =>
        this.maybeBonusPhase(rng, () =>
          phase('nocluster', 'Bonusfeld', 1, [701], [70121], 100),
        ),
      () =>
        this.maybeBonusPhase(rng, () =>
          phase(
            'nocluster',
            'Bonusfeld',
            1,
            [701, 201, 210, 211],
            [70112, 20111, 21011, 21111],
            100,
          ),
        ),
      () =>
        this.maybeBonusPhase(rng, () =>
          phase(
            'nocluster',
            'Bonusfeld',
            1,
            [401, 201, 211],
            [40131, 20132, 21132],
            100,
          ),
        ),
      () =>
        this.maybeBonusPhase(rng, () =>
          phase(
            'nocluster',
            'Bonusfeld',
            1,
            [101, 111, 601],
            [10103, 11103, 60103],
            100,
          ),
        ),
      () =>
        this.maybeBonusPhase(rng, () =>
          phase(
            'nocluster',
            'Bonusfeld',
            1,
            [101, 111, 121, 201, 211],
            [10101, 11101, 12101, 20102, 21102],
            100,
          ),
        ),
    ];

    const phases: Phase[] = [];
    for (const build of rng.shuffle(candidates)) {
      if (remaining <= 0) break;
      const next = build();
      if (next) {
        phases.push(next);
        remaining -= 1;
      }
    }
    return phases;
  }

  private maybeBonusPhase(rng: SeededRNG, build: () => Phase): Phase | null {
    return rng.nextInt(1, 100) <= 75 ? build() : null;
  }
}

export const stuColonySurfaceGenerator = new StuColonySurfaceGenerator();
export const STU_DEFAULT_COLONY_CLASS_ID = DEFAULT_CLASS_ID;
