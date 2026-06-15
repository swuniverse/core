import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanetField, PlanetFieldLayer } from '../entities/planet-field.entity';
import { CelestialObject } from '../entities/celestial-object.entity';
import { StarSystem } from '../entities/star-system.entity';
import {
  getStuSurfaceClassConfig,
  stuPlanetSurfaceGenerator,
  supportsStuSurface,
} from './stu-planet-surface.generator';

export interface PlanetLayout {
  orbit: PlanetFieldData[];
  surface: PlanetFieldData[];
  underground: PlanetFieldData[];
}

export interface PlanetFieldData {
  layer: PlanetFieldLayer;
  px: number;
  py: number;
  fieldType: number;
  terrainTileId: number;
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
    @InjectRepository(StarSystem)
    private readonly systemRepo: Repository<StarSystem>,
  ) {}

  generateLayout(
    classId: number,
    seed: string,
    bonusFieldAmount = 2,
  ): PlanetLayout {
    if (!supportsStuSurface(classId)) {
      return { orbit: [], surface: [], underground: [] };
    }

    const generated = stuPlanetSurfaceGenerator.generate(
      classId,
      seed,
      bonusFieldAmount,
    );
    const fields = generated.fields.map((field) => ({
      layer: field.layer as unknown as PlanetFieldLayer,
      px: field.px,
      py: field.py,
      fieldType: field.fieldType,
      terrainTileId: field.terrainTileId,
      isBuildable: field.layer !== 'ORBIT',
      resourceModifier: this.resourceModifierFor(field.terrainTileId),
    }));

    return {
      orbit: fields.filter((field) => field.layer === PlanetFieldLayer.ORBIT),
      surface: fields.filter(
        (field) => field.layer === PlanetFieldLayer.SURFACE,
      ),
      underground: fields.filter(
        (field) => field.layer === PlanetFieldLayer.UNDERGROUND,
      ),
    };
  }

  async generateAndPersist(celestialObjectId: number): Promise<number> {
    const obj = await this.objectRepo.findOneBy({ id: celestialObjectId });
    if (!obj || !supportsStuSurface(obj.classId)) return 0;

    const existing = await this.planetFieldRepo.count({
      where: { celestialObjectId },
    });
    if (existing > 0) return 0;

    const classId = obj.classId;
    if (classId == null) return 0;

    const seed = obj.terrainSeed ?? `planet-${obj.id}`;
    const system = obj.systemId
      ? await this.systemRepo.findOneBy({ id: obj.systemId })
      : null;
    const bonusAmount = system?.bonusFields ?? 2;
    const layout = this.generateLayout(classId, seed, bonusAmount);
    const allFields = [
      ...layout.orbit,
      ...layout.surface,
      ...layout.underground,
    ];

    if (allFields.length === 0) return 0;

    const config = getStuSurfaceClassConfig(classId);
    obj.terrainSeed = seed;
    obj.surfaceWidth = config?.width ?? null;
    obj.surfaceHeight = config?.surfaceHeight ?? null;
    await this.objectRepo.save(obj);

    const entities = allFields.map((field) =>
      this.planetFieldRepo.create({
        celestialObjectId,
        fieldLayer: field.layer,
        px: field.px,
        py: field.py,
        fieldType: field.fieldType,
        terrainTileId: field.terrainTileId,
        isBuildable: field.isBuildable,
        resourceModifier: field.resourceModifier,
      }),
    );

    await this.planetFieldRepo.save(entities, { chunk: 500 });
    return entities.length;
  }

  async ensureGenerated(celestialObjectId: number): Promise<void> {
    await this.generateAndPersist(celestialObjectId);
  }

  async getPlanetFields(celestialObjectId: number): Promise<PlanetField[]> {
    return this.planetFieldRepo.find({
      where: { celestialObjectId },
      order: { fieldLayer: 'ASC', py: 'ASC', px: 'ASC' },
    });
  }

  private resourceModifierFor(terrainTileId: number): number {
    const suffix = terrainTileId % 100;
    if ([11, 12, 21, 31, 32, 99].includes(suffix)) return 2;
    if ([1, 2, 3, 4].includes(suffix)) return 1;
    return 0;
  }
}
