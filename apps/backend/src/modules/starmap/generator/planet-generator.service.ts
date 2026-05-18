import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanetField, PlanetFieldLayer } from '../entities/planet-field.entity';
import { CelestialObject } from '../entities/celestial-object.entity';
import { PLANET_CLASS_BY_KEY, type PlanetClassDefinition } from './planet-classes.config';
import { SeededRNG } from './seeded-rng';

export interface PlanetLayout {
  orbit: PlanetFieldData[];
  surface: PlanetFieldData[];
  underground: PlanetFieldData[];
}

export interface PlanetFieldData {
  layer: PlanetFieldLayer;
  px: number;
  py: number;
  terrainType: string;
  isBuildable: boolean;
  resourceModifier: number;
}

@Injectable()
export class PlanetGeneratorService {
  constructor(
    @InjectRepository(PlanetField)
    private readonly planetFieldRepo: Repository<PlanetField>,
    @InjectRepository(CelestialObject)
    private readonly objectRepo: Repository<CelestialObject>,
  ) {}

  generateLayout(planetClass: string, seed: string): PlanetLayout {
    const classDef = PLANET_CLASS_BY_KEY.get(planetClass);
    if (!classDef) {
      return { orbit: [], surface: [], underground: [] };
    }

    const rng = new SeededRNG(seed);
    const orbit = this.generateOrbit(classDef, rng);
    const surface = this.generateSurface(classDef, rng);
    const underground = this.generateUnderground(classDef, rng);

    return { orbit, surface, underground };
  }

  async generateAndPersist(celestialObjectId: number): Promise<number> {
    const obj = await this.objectRepo.findOneBy({ id: celestialObjectId });
    if (!obj || !obj.planetClass) return 0;

    const existing = await this.planetFieldRepo.count({
      where: { celestialObjectId },
    });
    if (existing > 0) return 0;

    const seed = obj.terrainSeed ?? `planet-${obj.id}`;
    const layout = this.generateLayout(obj.planetClass, seed);
    const allFields = [...layout.orbit, ...layout.surface, ...layout.underground];

    if (allFields.length === 0) return 0;

    const entities = allFields.map(f =>
      this.planetFieldRepo.create({
        celestialObjectId,
        fieldLayer: f.layer,
        px: f.px,
        py: f.py,
        terrainType: f.terrainType,
        isBuildable: f.isBuildable,
        resourceModifier: f.resourceModifier,
      }),
    );

    await this.planetFieldRepo.save(entities, { chunk: 500 });
    return entities.length;
  }

  async getPlanetFields(celestialObjectId: number): Promise<PlanetField[]> {
    return this.planetFieldRepo.find({
      where: { celestialObjectId },
      order: { fieldLayer: 'ASC', py: 'ASC', px: 'ASC' },
    });
  }

  private generateOrbit(classDef: PlanetClassDefinition, rng: SeededRNG): PlanetFieldData[] {
    const fields: PlanetFieldData[] = [];
    const width = classDef.orbitSlots;
    for (let px = 1; px <= width; px++) {
      fields.push({
        layer: PlanetFieldLayer.ORBIT,
        px,
        py: 1,
        terrainType: 'ORBIT_SPACE',
        isBuildable: true,
        resourceModifier: 0,
      });
      fields.push({
        layer: PlanetFieldLayer.ORBIT,
        px,
        py: 2,
        terrainType: 'ORBIT_SPACE',
        isBuildable: true,
        resourceModifier: 0,
      });
    }
    return fields;
  }

  private generateSurface(classDef: PlanetClassDefinition, rng: SeededRNG): PlanetFieldData[] {
    if (classDef.surfaceWidth === 0) return [];

    const fields: PlanetFieldData[] = [];
    const { surfaceWidth: w, surfaceHeight: h } = classDef;
    const terrainKeys = Object.keys(classDef.terrainWeights);
    const weights = Object.values(classDef.terrainWeights);

    for (let py = 1; py <= h; py++) {
      for (let px = 1; px <= w; px++) {
        let terrain: string;

        const isPolar = py === 1 || py === h;
        const isEquatorial = py === Math.ceil(h / 2);

        if (isPolar && classDef.polarTerrains.length > 0 && rng.nextFloat() < 0.6) {
          terrain = rng.choice(classDef.polarTerrains);
        } else if (isEquatorial && classDef.equatorialTerrains.length > 0 && rng.nextFloat() < 0.5) {
          terrain = rng.choice(classDef.equatorialTerrains);
        } else if (classDef.rareTerrains.length > 0 && rng.nextFloat() < 0.08) {
          terrain = rng.choice(classDef.rareTerrains);
        } else {
          terrain = rng.weightedChoice(terrainKeys, weights);
        }

        const resourceMod = rng.nextFloat() < 0.15 ? rng.nextInt(1, 3) : 0;

        fields.push({
          layer: PlanetFieldLayer.SURFACE,
          px,
          py,
          terrainType: terrain,
          isBuildable: true,
          resourceModifier: resourceMod,
        });
      }
    }

    return fields;
  }

  private generateUnderground(classDef: PlanetClassDefinition, rng: SeededRNG): PlanetFieldData[] {
    if (classDef.undergroundSlots === 0) return [];

    const fields: PlanetFieldData[] = [];
    const width = classDef.surfaceWidth || classDef.orbitSlots;

    for (let px = 1; px <= width; px++) {
      for (let py = 1; py <= classDef.undergroundSlots; py++) {
        const terrainKeys = Object.keys(classDef.terrainWeights);
        const isMineral = rng.nextFloat() < 0.3;
        const terrain = isMineral ? 'MINERAL_DEPOSIT' : (terrainKeys.length > 0 ? rng.choice(terrainKeys) : 'BARE_ROCK');
        const resourceMod = isMineral ? rng.nextInt(2, 5) : 0;

        fields.push({
          layer: PlanetFieldLayer.UNDERGROUND,
          px,
          py,
          terrainType: terrain,
          isBuildable: py === 1,
          resourceModifier: resourceMod,
        });
      }
    }

    return fields;
  }
}
