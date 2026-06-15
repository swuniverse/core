import { SeededRNG } from './seeded-rng';
import {
  STU_SURFACE_CLASS_CONFIGS,
  STU_SURFACE_SUPPORTED_CLASS_IDS,
  type StuSurfaceClassConfig,
  type StuSurfacePhaseConfig,
} from './stu-surface-class-configs';

export enum StuPlanetSurfaceLayer {
  ORBIT = 'ORBIT',
  SURFACE = 'SURFACE',
  UNDERGROUND = 'UNDERGROUND',
}

export interface StuPlanetSurfaceFieldData {
  layer: StuPlanetSurfaceLayer;
  fieldIndex: number;
  px: number;
  py: number;
  fieldType: number;
  terrainTileId: number;
}

export interface StuPlanetSurfaceConfig {
  classId: number;
  name: string;
  width: number;
  surfaceHeight: number;
  hasOrbit: boolean;
  hasUnderground: boolean;
  fields: StuPlanetSurfaceFieldData[];
}

interface WeightedField {
  x: number;
  y: number;
  baseWeight: number;
  weight: number;
}

export const STU_DEFAULT_COLONY_CLASS_ID = 201;

export function getStuSurfaceClassConfig(
  classId: number,
): StuSurfaceClassConfig | null {
  return STU_SURFACE_CLASS_CONFIGS[classId] ?? null;
}

export function getSupportedStuSurfaceClassIds(): number[] {
  return STU_SURFACE_SUPPORTED_CLASS_IDS;
}

export function supportsStuSurface(
  classId: number | null | undefined,
): boolean {
  return (
    typeof classId === 'number' && Boolean(STU_SURFACE_CLASS_CONFIGS[classId])
  );
}

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

export class StuPlanetSurfaceGenerator {
  generate(
    classId: number,
    seed: string,
    bonusFieldAmount = 2,
  ): StuPlanetSurfaceConfig {
    const config =
      STU_SURFACE_CLASS_CONFIGS[classId] ??
      STU_SURFACE_CLASS_CONFIGS[STU_DEFAULT_COLONY_CLASS_ID];
    const rng = new SeededRNG(`${seed}:${classId}`);
    const bonusPhases = this.createBonusPhases(config, rng, bonusFieldAmount);
    const surface = this.doPhases(
      config.width,
      config.surfaceHeight,
      config.surfaceBaseField,
      [...config.surfacePhases, ...bonusPhases],
      rng,
    );
    const orbit = config.hasOrbit
      ? this.doPhases(
          config.width,
          2,
          config.orbitBaseField,
          config.orbitPhases,
          rng,
        )
      : [];
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
    const fields: StuPlanetSurfaceFieldData[] = [];
    this.appendFields(
      fields,
      orbit,
      StuPlanetSurfaceLayer.ORBIT,
      config.width,
      fieldIndex,
    );
    fieldIndex += orbit.length;
    this.appendFields(
      fields,
      surface,
      StuPlanetSurfaceLayer.SURFACE,
      config.width,
      fieldIndex,
    );
    fieldIndex += surface.length;
    this.appendFields(
      fields,
      underground,
      StuPlanetSurfaceLayer.UNDERGROUND,
      config.width,
      fieldIndex,
    );

    return {
      classId: config.classId,
      name: config.name,
      width: config.width,
      surfaceHeight: config.surfaceHeight,
      hasOrbit: config.hasOrbit,
      hasUnderground: config.hasUnderground,
      fields,
    };
  }

  private appendFields(
    target: StuPlanetSurfaceFieldData[],
    fieldTypes: number[],
    layer: StuPlanetSurfaceLayer,
    width: number,
    startIndex: number,
  ): void {
    fieldTypes.forEach((terrainTileId, offset) => {
      target.push({
        layer,
        fieldIndex: startIndex + offset,
        px: (offset % width) + 1,
        py: Math.floor(offset / width) + 1,
        fieldType: normalizeStuTerrainType(terrainTileId),
        terrainTileId,
      });
    });
  }

  private doPhases(
    width: number,
    height: number,
    baseFieldType: number,
    phases: StuSurfacePhaseConfig[],
    rng: SeededRNG,
  ): number[] {
    const fieldArray = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => baseFieldType),
    );

    for (const phase of phases) {
      for (let i = 0; i < phase.num; i++) {
        const weighting = this.getWeightingList(fieldArray, phase);
        if (weighting.length === 0) break;
        const field = this.weightedDraw(weighting, phase.fragmentation, rng);
        const current = fieldArray[field.y][field.x];
        const possibleTargets = phase.from.flatMap((fromType, index) =>
          current === fromType ? [phase.to[index]] : [],
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

  private getWeightingList(
    fieldArray: number[][],
    phase: StuSurfacePhaseConfig,
  ): WeightedField[] {
    const height = fieldArray.length;
    const width = fieldArray[0]?.length ?? 0;
    const result: WeightedField[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!phase.from.includes(fieldArray[y][x])) continue;

        let baseWeight = 1;
        if (
          (phase.mode === 'polar' || phase.mode === 'strict polar') &&
          (y === 0 || y === height - 1)
        ) {
          baseWeight += 1;
        }
        if (phase.mode === 'top left' && y === 0 && x === 0) baseWeight += 2;
        if (phase.mode === 'polar seeding north' && y === 0) baseWeight += 2;
        if (phase.mode === 'polar seeding south' && y === height - 1) {
          baseWeight += 2;
        }
        if (
          phase.mode === 'equatorial' &&
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
          ].includes(phase.mode)
        ) {
          baseWeight += this.countAdjacentWeight(fieldArray, x, y, phase.to);
        }

        if (phase.mode === 'polar seeding north' && y === 0) {
          baseWeight += this.countHorizontalWeight(
            fieldArray,
            x,
            y,
            phase.to,
            2,
          );
        }
        if (phase.mode === 'polar seeding south' && y === height - 1) {
          baseWeight += this.countHorizontalWeight(
            fieldArray,
            x,
            y,
            phase.to,
            2,
          );
        }

        if (phase.adjacent.length > 0) {
          baseWeight += this.countAdjacentWeight(
            fieldArray,
            x,
            y,
            phase.adjacent,
          );
        }

        if (phase.noadjacent.length > 0) {
          for (const terrain of phase.noadjacent) {
            if (
              this.countAdjacentWeight(fieldArray, x, y, [terrain]) >
              phase.noadjacentlimit
            ) {
              baseWeight = 0;
            }
          }
        }

        if (phase.mode === 'forced adjacency' && baseWeight < 2) baseWeight = 0;
        if (phase.mode === 'forced rim' && baseWeight < 1.5) baseWeight = 0;
        if (phase.mode === 'polar' && y > 1 && y < height - 2) baseWeight = 0;
        if (phase.mode === 'strict polar' && y > 0 && y < height - 1) {
          baseWeight = 0;
        }
        if (phase.mode === 'polar seeding north' && y > 1) baseWeight = 0;
        if (phase.mode === 'polar seeding south' && y < height - 2)
          baseWeight = 0;
        if (phase.mode === 'equatorial' && height === 6 && (y < 2 || y > 3)) {
          baseWeight = 0;
        }
        if (phase.mode === 'equatorial' && height === 5 && (y < 2 || y > 3)) {
          baseWeight = 0;
        }
        if (phase.mode === 'lower orbit' && y !== 1) baseWeight = 0;
        if (phase.mode === 'upper orbit' && y !== 0) baseWeight = 0;
        if (phase.mode === 'tidal seeding' && x !== 0) baseWeight = 0;
        if (phase.mode === 'top left' && (y !== 0 || x !== 0)) baseWeight = 0;
        if (
          phase.mode === 'right' &&
          (phase.adjacent.length === 0 ||
            this.isFieldUnequal(fieldArray, x - 1, y, phase.adjacent[0]))
        ) {
          baseWeight = 0;
        }
        if (
          phase.mode === 'below' &&
          (phase.adjacent.length === 0 ||
            this.isFieldUnequal(fieldArray, x, y - 1, phase.adjacent[0]))
        ) {
          baseWeight = 0;
        }
        if (
          phase.mode === 'crater seeding' &&
          (x === width - 1 || y === height - 1)
        ) {
          baseWeight = 0;
        }

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

  private isFieldUnequal(
    fieldArray: number[][],
    x: number,
    y: number,
    terrain: number,
  ): boolean {
    return !this.isFieldEqual(fieldArray, x, y, terrain);
  }

  private createBonusPhases(
    config: StuSurfaceClassConfig,
    rng: SeededRNG,
    bonusFieldAmount: number,
  ): StuSurfacePhaseConfig[] {
    let remaining =
      config.width !== 10 ? bonusFieldAmount - 1 : bonusFieldAmount;
    if (remaining <= 0) return [];

    const bonusTypes = config.bonusTypes.length > 0
      ? config.bonusTypes
      : ['AENERGY', 'HABITAT'];

    const phases: StuSurfacePhaseConfig[] = [];
    for (const bonusType of rng.shuffle([...bonusTypes])) {
      if (remaining <= 0) break;
      const phase = this.maybeBonusPhase(rng, () =>
        this.bonusPhaseForType(bonusType),
      );
      if (phase) {
        phases.push(phase);
        remaining -= 1;
      }
    }
    return phases;
  }

  private bonusPhaseForType(
    type: string,
  ): StuSurfacePhaseConfig | null {
    switch (type) {
      case 'SUPER':
        return this.bonusPhase([701], [70121]);
      case 'ORE':
        return this.bonusPhase([701, 702, 703, 704, 705, 706], [70112, 70212, 70312, 70412, 70512, 70612]);
      case 'DEUTERIUM':
        return this.bonusPhase([201, 210, 211, 221, 222, 231, 501], [20111, 21011, 21111, 22111, 22211, 23111, 50111]);
      case 'AENERGY':
        return this.bonusPhase([401, 201, 211], [40131, 20132, 21132]);
      case 'SENERGY':
        return this.bonusPhase([401, 402, 403, 404], [40131, 40231, 40331, 40431]);
      case 'WENERGY':
        return this.bonusPhase([201, 211, 212, 221, 222], [20132, 21132, 21232, 22132, 22232]);
      case 'HABITAT':
        return this.bonusPhase([101, 111, 601], [10103, 11103, 60103]);
      case 'ANYRESOURCE':
        return this.bonusPhase([701, 201, 210, 211], [70112, 20111, 21011, 21111]);
      case 'QUALITY':
        return this.bonusPhase([101, 111, 121, 201, 211], [10101, 11101, 12101, 20102, 21102]);
      default:
        return null;
    }
  }

  private bonusPhase(from: number[], to: number[]): StuSurfacePhaseConfig {
    return {
      mode: 'nocluster',
      description: 'Bonusfeld',
      num: 1,
      from,
      to,
      adjacent: [],
      noadjacent: [],
      noadjacentlimit: 0,
      fragmentation: 100,
    };
  }

  private maybeBonusPhase(
    rng: SeededRNG,
    build: () => StuSurfacePhaseConfig | null,
  ): StuSurfacePhaseConfig | null {
    if (rng.nextInt(1, 100) > 75) return null;
    return build();
  }
}

export const stuPlanetSurfaceGenerator = new StuPlanetSurfaceGenerator();
