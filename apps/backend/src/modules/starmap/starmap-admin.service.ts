import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import {
  STARMAP_SYSTEM_TYPE_OPTIONS,
  SYSTEM_TYPE_DEFINITIONS,
  RARITY_WEIGHTS,
  type StarmapSystemTypeOption,
} from './starmap-system-types';
import { Layer } from './entities/layer.entity';
import { GalaxyField, FactionZone } from './entities/galaxy-field.entity';
import { GalaxyFieldType } from './entities/galaxy-field-type.entity';
import { StarSystem } from './entities/star-system.entity';
import { SystemField } from './entities/system-field.entity';
import { CelestialObject } from './entities/celestial-object.entity';
import { MapRegion } from './entities/map-region.entity';
import { BorderType } from './entities/border-type.entity';
import type {
  StarmapBorderTypeDto,
  StarmapBulkEditFieldsDto,
  StarmapCreateBorderTypeDto,
  StarmapCreateLayerDto,
  StarmapCreateMapRegionDto,
  StarmapCreateSystemDto,
  StarmapFieldTypeDto,
  StarmapFillSectorDto,
  StarmapGalaxyFieldDto,
  StarmapInitializeGridDto,
  StarmapLayerDto,
  StarmapLayerOverviewDto,
  StarmapMapRegionDto,
  StarmapOperationResultDto,
  StarmapRegenerateSystemDto,
  StarmapSectorOverviewEntry,
  StarmapSystemFieldDto,
  StarmapSystemListItemDto,
  StarmapUpdateBorderTypeDto,
  StarmapUpdateGalaxyFieldDto,
  StarmapUpdateMapRegionDto,
  StarmapUpdateSystemFieldDto,
} from '@swuniverse/shared';
import { StarmapSystemGeneratorService } from './generator/starmap-system-generator.service';

const AUTO_SYSTEM_NAMES = [
  'Aldoria',
  'Veloran',
  'Tyris',
  'Nexar',
  'Caelum',
  'Orpheon',
  'Seraphis',
  'Draconis',
  'Erebus',
  'Ilyra',
  'Vorash',
  'Rheon',
  'Talora',
  'Xandor',
  'Meridian',
  'Cyrann',
  'Ophira',
  'Kelaris',
  'Damaris',
  'Solara',
  'Nyris',
  'Altairon',
  'Khepri',
  'Novaris',
  'Asteron',
  'Bellatrix',
  'Dione',
  'Eridani',
  'Hyperion',
  'Jandor',
  'Lyonesse',
  'Myrin',
  'Nemoris',
  'Orionis',
  'Perseon',
  'Quintara',
  'Ravena',
  'Siriath',
  'Talos',
  'Umbriel',
];

@Injectable()
export class StarmapAdminService {
  constructor(
    @InjectRepository(Layer)
    private readonly layerRepo: Repository<Layer>,
    @InjectRepository(GalaxyField)
    private readonly galaxyFieldRepo: Repository<GalaxyField>,
    @InjectRepository(GalaxyFieldType)
    private readonly fieldTypeRepo: Repository<GalaxyFieldType>,
    @InjectRepository(StarSystem)
    private readonly systemRepo: Repository<StarSystem>,
    @InjectRepository(SystemField)
    private readonly systemFieldRepo: Repository<SystemField>,
    @InjectRepository(CelestialObject)
    private readonly objectRepo: Repository<CelestialObject>,
    @InjectRepository(MapRegion)
    private readonly regionRepo: Repository<MapRegion>,
    @InjectRepository(BorderType)
    private readonly borderTypeRepo: Repository<BorderType>,
    private readonly systemGenerator: StarmapSystemGeneratorService,
    private readonly entityManager: EntityManager,
  ) {}

  async ensureDefaultFieldTypes(): Promise<StarmapFieldTypeDto[]> {
    const existing = await this.fieldTypeRepo.find();
    const existingKeys = new Set(existing.map((e) => e.key));

    const defaults = [
      {
        key: 'EMPTY_SPACE',
        name: 'Empty Space',
        passable: true,
        energyCost: 1,
        damage: 0,
        isSystem: false,
        isVisible: true,
        effects: [],
        colorKey: 'space',
      },
      {
        key: 'STAR_SYSTEM',
        name: 'Star System',
        passable: true,
        energyCost: 1,
        damage: 0,
        isSystem: true,
        isVisible: true,
        effects: [],
        colorKey: 'system',
      },
      {
        key: 'STAR_CORE',
        name: 'Star Core',
        passable: false,
        energyCost: 99,
        damage: 5,
        isSystem: true,
        isVisible: true,
        effects: ['RADIATION'],
        colorKey: 'star-core',
      },
      {
        key: 'PLANET_ORBIT',
        name: 'Planet Orbit',
        passable: true,
        energyCost: 1,
        damage: 0,
        isSystem: true,
        isVisible: true,
        effects: [],
        colorKey: 'planet-orbit',
      },
      {
        key: 'MOON_ORBIT',
        name: 'Moon Orbit',
        passable: true,
        energyCost: 1,
        damage: 0,
        isSystem: true,
        isVisible: true,
        effects: [],
        colorKey: 'moon-orbit',
      },
      {
        key: 'ASTEROID_CLUSTER',
        name: 'Asteroid Cluster',
        passable: true,
        energyCost: 2,
        damage: 1,
        isSystem: true,
        isVisible: true,
        effects: ['COLLISION_RISK'],
        colorKey: 'asteroid',
      },
      {
        key: 'DEEP_SPACE',
        name: 'Deep Space',
        passable: true,
        energyCost: 1,
        damage: 0,
        isSystem: true,
        isVisible: true,
        effects: [],
        colorKey: 'space',
      },
      {
        key: 'NEBULA',
        name: 'Nebula',
        passable: true,
        energyCost: 3,
        damage: 0,
        isSystem: false,
        isVisible: true,
        effects: ['SCAN_PENALTY'],
        colorKey: 'nebula',
      },
      {
        key: 'ASTEROID_FIELD',
        name: 'Asteroid Field',
        passable: true,
        energyCost: 2,
        damage: 1,
        isSystem: false,
        isVisible: true,
        effects: ['COLLISION_RISK'],
        colorKey: 'asteroid',
      },
      {
        key: 'BLOCKED',
        name: 'Blocked',
        passable: false,
        energyCost: 99,
        damage: 0,
        isSystem: false,
        isVisible: true,
        effects: [],
        colorKey: 'blocked',
      },
    ];

    const missing = defaults.filter((d) => !existingKeys.has(d.key));
    if (missing.length > 0) {
      await this.fieldTypeRepo.save(
        missing.map((entry) => this.fieldTypeRepo.create(entry)),
      );
    }
    return this.listFieldTypes();
  }

  listSystemTypes(): StarmapSystemTypeOption[] {
    return STARMAP_SYSTEM_TYPE_OPTIONS;
  }

  async createLayer(input: StarmapCreateLayerDto): Promise<StarmapLayerDto> {
    const layer = this.layerRepo.create({
      name: input.name,
      width: input.width,
      height: input.height,
      sectorSize: input.sectorSize ?? 20,
      isDefault: input.isDefault ?? false,
      isColonizable: input.isColonizable ?? true,
      isNoobZone: input.isNoobZone ?? false,
      isFinished: input.isFinished ?? false,
      isHidden: input.isHidden ?? false,
    });
    const createdLayer = await this.layerRepo.save(layer);
    return this.toLayerDto(createdLayer);
  }

  async deleteLayer(layerId: number): Promise<StarmapOperationResultDto> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) {
      throw new NotFoundException('Layer not found');
    }

    // Nullify/delete FK references from other tables
    await this.entityManager.query(
      `DELETE FROM "onboarding_selections" WHERE "selectedSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1) OR "selectedLayerId" = $1`,
      [layerId],
    );
    await this.entityManager.query(
      `UPDATE "colonies" SET "celestialObjectId" = NULL, "starSystemId" = NULL WHERE "starSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)`,
      [layerId],
    );
    await this.entityManager.query(
      `UPDATE "spacecraft" SET "celestialObjectId" = NULL, "starSystemId" = NULL WHERE "starSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)`,
      [layerId],
    );

    // Delete planet_fields referencing celestial objects in this layer
    await this.entityManager.query(
      `DELETE FROM "planet_fields" WHERE "celestialObjectId" IN (SELECT id FROM "celestial_objects" WHERE "systemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1))`,
      [layerId],
    );

    // Delete system_fields (references celestial_objects via FK)
    await this.entityManager.query(
      `DELETE FROM "system_fields" WHERE "starSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)`,
      [layerId],
    );

    // Delete celestial_objects (now safe — no more FK references)
    await this.entityManager.query(
      `DELETE FROM "celestial_objects" WHERE "systemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)`,
      [layerId],
    );

    // Delete system explorations referencing star systems in this layer
    await this.entityManager.query(
      `DELETE FROM "system_explorations" WHERE "starSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)`,
      [layerId],
    );

    // Delete exploration states and influence areas for this layer
    await this.entityManager.query(
      `DELETE FROM "exploration_states" WHERE "layerId" = $1`,
      [layerId],
    );
    await this.entityManager.query(
      `DELETE FROM "influence_areas" WHERE "layerId" = $1`,
      [layerId],
    );
    await this.entityManager.query(
      `DELETE FROM "wormholes" WHERE "entryLayerId" = $1 OR "exitLayerId" = $1`,
      [layerId],
    );

    await this.galaxyFieldRepo.delete({ layerId });
    await this.systemRepo.delete({ layerId });
    await this.entityManager.query(
      `DELETE FROM "map_regions" WHERE "layerId" = $1`,
      [layerId],
    );
    await this.layerRepo.delete({ id: layerId });

    return { deleted: true };
  }

  async initializeLayerGrid(
    layerId: number,
    input: StarmapInitializeGridDto,
  ): Promise<StarmapOperationResultDto> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const fieldType = await this.fieldTypeRepo.findOneBy({
      id: input.defaultFieldTypeId,
    });
    if (!fieldType) throw new NotFoundException('Field type not found');

    const existing = await this.galaxyFieldRepo.count({ where: { layerId } });
    if (existing > 0) {
      throw new BadRequestException('Layer grid already initialized');
    }

    const rows: GalaxyField[] = [];
    for (let cy = 1; cy <= layer.height; cy++) {
      for (let cx = 1; cx <= layer.width; cx++) {
        rows.push(
          this.galaxyFieldRepo.create({
            layerId,
            cx,
            cy,
            fieldTypeId: fieldType.id,
            systemTypeId: null,
            factionZone: FactionZone.UNKNOWN,
            starSystemId: null,
            isPassable: fieldType.passable,
            energyCost: fieldType.energyCost,
            damage: fieldType.damage,
            effectFlags: fieldType.effects,
            adminRegionKey: null,
          }),
        );
      }
    }

    await this.galaxyFieldRepo.save(rows, { chunk: 500 });
    return { created: rows.length };
  }

  async listFieldTypes(): Promise<StarmapFieldTypeDto[]> {
    const fieldTypes = await this.fieldTypeRepo.find({ order: { id: 'ASC' } });
    return fieldTypes.map((fieldType) => this.toFieldTypeDto(fieldType));
  }

  async updateGalaxyField(
    fieldId: number,
    patch: StarmapUpdateGalaxyFieldDto,
  ): Promise<StarmapGalaxyFieldDto> {
    const field = await this.galaxyFieldRepo.findOneBy({ id: fieldId });
    if (!field) throw new NotFoundException('Galaxy field not found');

    if (patch.fieldTypeId !== undefined) {
      const fieldType = await this.fieldTypeRepo.findOneBy({
        id: patch.fieldTypeId,
      });
      if (!fieldType) throw new NotFoundException('Field type not found');
      field.fieldTypeId = fieldType.id;
      field.isPassable = fieldType.passable;
      field.energyCost = fieldType.energyCost;
      field.damage = fieldType.damage;
      field.effectFlags = fieldType.effects;
    }

    if (patch.systemTypeId !== undefined) {
      if (patch.systemTypeId === null) {
        field.systemTypeId = null;
      } else {
        const systemType = STARMAP_SYSTEM_TYPE_OPTIONS.find(
          (entry) => entry.id === patch.systemTypeId,
        );
        if (!systemType) throw new BadRequestException('Invalid system type');
        field.systemTypeId = systemType.id;
      }
    }

    if (patch.factionZone !== undefined)
      field.factionZone = patch.factionZone as FactionZone;
    if (patch.adminRegionKey !== undefined)
      field.adminRegionKey = patch.adminRegionKey;
    if (patch.starSystemId !== undefined)
      field.starSystemId = patch.starSystemId;
    if (patch.regionId !== undefined) field.regionId = patch.regionId;
    if (patch.borderTypeId !== undefined) field.borderTypeId = patch.borderTypeId;
    if (patch.effects !== undefined) field.effects = patch.effects;
    if (patch.passableOverride !== undefined)
      field.passableOverride = patch.passableOverride;

    const updatedField = await this.galaxyFieldRepo.save(field);
    const hydratedField = await this.galaxyFieldRepo.findOne({
      where: { id: updatedField.id },
      relations: ['fieldType', 'starSystem'],
    });
    if (!hydratedField) throw new NotFoundException('Galaxy field not found');

    return this.toGalaxyFieldDto(hydratedField);
  }

  // --- Bulk Edit ---

  async bulkEditFields(
    input: StarmapBulkEditFieldsDto,
  ): Promise<StarmapOperationResultDto> {
    if (!input.fieldIds.length) return { updated: 0 };

    const fields = await this.galaxyFieldRepo.find({
      where: { id: In(input.fieldIds) },
    });
    if (!fields.length) throw new NotFoundException('No fields found');

    let fieldType: GalaxyFieldType | null = null;
    if (input.fieldTypeId !== undefined) {
      fieldType = await this.fieldTypeRepo.findOneBy({ id: input.fieldTypeId });
      if (!fieldType) throw new NotFoundException('Field type not found');
    }

    const assignRandomSystemType =
      fieldType?.key === 'STAR_SYSTEM' && input.systemTypeId === undefined;

    for (const field of fields) {
      if (fieldType) {
        field.fieldTypeId = fieldType.id;
        field.isPassable = fieldType.passable;
        field.energyCost = fieldType.energyCost;
        field.damage = fieldType.damage;
        field.effectFlags = fieldType.effects;
      }
      if (assignRandomSystemType) {
        field.systemTypeId = this.pickWeightedSystemType();
      }
      if (input.factionZone !== undefined)
        field.factionZone = input.factionZone as FactionZone;
      if (input.regionId !== undefined) field.regionId = input.regionId;
      if (input.borderTypeId !== undefined)
        field.borderTypeId = input.borderTypeId;
      if (input.adminRegionKey !== undefined)
        field.adminRegionKey = input.adminRegionKey;
      if (input.systemTypeId !== undefined)
        field.systemTypeId = input.systemTypeId;
      if (input.effects !== undefined) field.effects = input.effects;
      if (input.passableOverride !== undefined)
        field.passableOverride = input.passableOverride;
    }

    await this.galaxyFieldRepo.save(fields, { chunk: 500 });
    return { updated: fields.length };
  }

  // --- Map Regions CRUD ---

  async listRegions(layerId: number): Promise<StarmapMapRegionDto[]> {
    const regions = await this.regionRepo.find({
      where: { layerId },
      order: { name: 'ASC' },
    });
    return regions.map((r) => this.toRegionDto(r));
  }

  async createRegion(
    input: StarmapCreateMapRegionDto,
  ): Promise<StarmapMapRegionDto> {
    const layer = await this.layerRepo.findOneBy({ id: input.layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const region = await this.regionRepo.save(
      this.regionRepo.create({
        layerId: input.layerId,
        name: input.name,
        description: input.description ?? null,
        colorKey: input.colorKey ?? 'neutral',
      }),
    );
    return this.toRegionDto(region);
  }

  async updateRegion(
    regionId: number,
    patch: StarmapUpdateMapRegionDto,
  ): Promise<StarmapMapRegionDto> {
    const region = await this.regionRepo.findOneBy({ id: regionId });
    if (!region) throw new NotFoundException('Region not found');

    if (patch.name !== undefined) region.name = patch.name;
    if (patch.description !== undefined) region.description = patch.description;
    if (patch.colorKey !== undefined) region.colorKey = patch.colorKey;

    const updated = await this.regionRepo.save(region);
    return this.toRegionDto(updated);
  }

  async deleteRegion(regionId: number): Promise<StarmapOperationResultDto> {
    const region = await this.regionRepo.findOneBy({ id: regionId });
    if (!region) throw new NotFoundException('Region not found');

    await this.galaxyFieldRepo.update({ regionId }, { regionId: null });
    await this.regionRepo.delete({ id: regionId });
    return { deleted: true };
  }

  // --- Border Types CRUD ---

  async listBorderTypes(): Promise<StarmapBorderTypeDto[]> {
    const types = await this.borderTypeRepo.find({ order: { name: 'ASC' } });
    return types.map((bt) => this.toBorderTypeDto(bt));
  }

  async createBorderType(
    input: StarmapCreateBorderTypeDto,
  ): Promise<StarmapBorderTypeDto> {
    const bt = await this.borderTypeRepo.save(
      this.borderTypeRepo.create({
        name: input.name,
        colorKey: input.colorKey ?? 'border-default',
        style: input.style ?? 'solid',
      }),
    );
    return this.toBorderTypeDto(bt);
  }

  async updateBorderType(
    id: number,
    patch: StarmapUpdateBorderTypeDto,
  ): Promise<StarmapBorderTypeDto> {
    const bt = await this.borderTypeRepo.findOneBy({ id });
    if (!bt) throw new NotFoundException('Border type not found');

    if (patch.name !== undefined) bt.name = patch.name;
    if (patch.colorKey !== undefined) bt.colorKey = patch.colorKey;
    if (patch.style !== undefined) bt.style = patch.style;

    const updated = await this.borderTypeRepo.save(bt);
    return this.toBorderTypeDto(updated);
  }

  async deleteBorderType(id: number): Promise<StarmapOperationResultDto> {
    const bt = await this.borderTypeRepo.findOneBy({ id });
    if (!bt) throw new NotFoundException('Border type not found');

    await this.galaxyFieldRepo.update({ borderTypeId: id }, { borderTypeId: null });
    await this.borderTypeRepo.delete({ id });
    return { deleted: true };
  }

  // --- Layer Overview ---

  async getLayerOverview(layerId: number): Promise<StarmapLayerOverviewDto> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const sectorsX = Math.ceil(layer.width / layer.sectorSize);
    const sectorsY = Math.ceil(layer.height / layer.sectorSize);

    const rawData = await this.galaxyFieldRepo
      .createQueryBuilder('f')
      .select([
        `FLOOR((f.cx - 1) / ${layer.sectorSize})::int AS "sectorX"`,
        `FLOOR((f.cy - 1) / ${layer.sectorSize})::int AS "sectorY"`,
        'COUNT(*)::int AS "fieldCount"',
        'COUNT(f."starSystemId")::int AS "systemCount"',
        'MODE() WITHIN GROUP (ORDER BY f."factionZone") AS "dominantFactionZone"',
        'MODE() WITHIN GROUP (ORDER BY f."regionId") AS "dominantRegionId"',
      ])
      .where('f."layerId" = :layerId', { layerId })
      .groupBy('"sectorX"')
      .addGroupBy('"sectorY"')
      .getRawMany();

    const regionIds = rawData
      .map((r) => r.dominantRegionId)
      .filter((id): id is number => id !== null);
    const regions =
      regionIds.length > 0
        ? await this.regionRepo.find({ where: { id: In(regionIds) } })
        : [];
    const regionMap = new Map(regions.map((r) => [r.id, r.name]));

    const sectors: StarmapSectorOverviewEntry[] = rawData.map((r) => ({
      sectorX: r.sectorX,
      sectorY: r.sectorY,
      fieldCount: r.fieldCount,
      systemCount: r.systemCount,
      dominantFactionZone: r.dominantFactionZone ?? 'UNKNOWN',
      dominantRegionId: r.dominantRegionId ?? null,
      dominantRegionName: regionMap.get(r.dominantRegionId) ?? null,
    }));

    return { layerId, sectors };
  }

  async bulkUpdateSectorFields(
    input: StarmapFillSectorDto,
  ): Promise<StarmapOperationResultDto> {
    const layer = await this.layerRepo.findOneBy({ id: input.layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const minX = input.sectorX * layer.sectorSize + 1;
    const maxX = Math.min((input.sectorX + 1) * layer.sectorSize, layer.width);
    const minY = input.sectorY * layer.sectorSize + 1;
    const maxY = Math.min((input.sectorY + 1) * layer.sectorSize, layer.height);

    const fields = await this.galaxyFieldRepo
      .createQueryBuilder('field')
      .where('field.layerId = :layerId', { layerId: input.layerId })
      .andWhere('field.cx BETWEEN :minX AND :maxX', { minX, maxX })
      .andWhere('field.cy BETWEEN :minY AND :maxY', { minY, maxY })
      .getMany();

    let fieldType: GalaxyFieldType | null = null;
    if (input.fieldTypeId !== undefined) {
      fieldType = await this.fieldTypeRepo.findOneBy({ id: input.fieldTypeId });
      if (!fieldType) throw new NotFoundException('Field type not found');
    }

    for (const field of fields) {
      if (fieldType) {
        field.fieldTypeId = fieldType.id;
        field.isPassable = fieldType.passable;
        field.energyCost = fieldType.energyCost;
        field.damage = fieldType.damage;
        field.effectFlags = fieldType.effects;
      }
      if (input.systemTypeId !== undefined) {
        field.systemTypeId = input.systemTypeId;
      }
      if (input.factionZone !== undefined)
        field.factionZone = input.factionZone as FactionZone;
      if (input.adminRegionKey !== undefined)
        field.adminRegionKey = input.adminRegionKey;
    }

    await this.galaxyFieldRepo.save(fields, { chunk: 500 });
    return { updated: fields.length };
  }

  async createStarSystem(
    input: StarmapCreateSystemDto,
  ): Promise<StarmapSystemListItemDto> {
    const existing = await this.systemRepo.findOneBy({
      layerId: input.layerId,
      cx: input.cx,
      cy: input.cy,
    });
    if (existing) {
      throw new BadRequestException(
        'Star system already exists at coordinates',
      );
    }

    const systemType = this.requireSystemType(input.systemTypeId);
    const systemName = input.name.trim() || (await this.generateSystemName());
    const system = await this.systemRepo.save(
      this.systemRepo.create({
        name: systemName,
        layerId: input.layerId,
        cx: input.cx,
        cy: input.cy,
        systemTypeId: input.systemTypeId,
        maxX: input.maxX ?? 22,
        maxY: input.maxY ?? 22,
      }),
    );

    await this.attachSystemToGalaxyField(system, input.systemTypeId);
    await this.generateSystemContent(system, systemType);

    return this.toSystemListItemDto(system);
  }

  async generateSystemsForLayer(
    layerId: number,
    limit = 10,
  ): Promise<StarmapOperationResultDto> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const candidateFields = await this.galaxyFieldRepo.find({
      where: { layerId },
      order: { cy: 'ASC', cx: 'ASC' },
    });
    const seedFields = candidateFields.filter(
      (field) => field.systemTypeId !== null && field.starSystemId === null,
    );

    let generated = 0;

    for (const field of seedFields) {
      if (generated >= Math.max(1, limit)) break;

      const systemType = this.requireSystemType(field.systemTypeId as number);
      const systemName = await this.generateSystemName();
      const layout = this.systemGenerator.createLayout(systemName, systemType.id);

      const system = await this.systemRepo.save(
        this.systemRepo.create({
          name: systemName,
          layerId,
          cx: field.cx,
          cy: field.cy,
          systemTypeId: systemType.id,
          maxX: layout.width,
          maxY: layout.height,
        }),
      );

      await this.attachSystemToGalaxyField(system, systemType.id);
      await this.persistGeneratedLayout(system, layout);
      generated++;
    }

    return { generated };
  }

  async regenerateSystem(
    systemId: number,
    input: StarmapRegenerateSystemDto = {},
  ): Promise<StarmapOperationResultDto> {
    const system = await this.systemRepo.findOneBy({ id: systemId });
    if (!system) throw new NotFoundException('Star system not found');

    const galaxyField = await this.galaxyFieldRepo.findOne({
      where: { layerId: system.layerId, cx: system.cx, cy: system.cy },
    });

    const targetSystemTypeId =
      input.systemTypeId ?? galaxyField?.systemTypeId ?? system.systemTypeId;
    const systemType = this.requireSystemType(targetSystemTypeId);

    await this.systemFieldRepo.delete({ starSystemId: system.id });
    await this.objectRepo.delete({ systemId: system.id });

    system.systemTypeId = systemType.id;
    const layout = this.systemGenerator.createLayout(system.name, systemType.id, input.seed);
    system.maxX = layout.width;
    system.maxY = layout.height;
    await this.systemRepo.save(system);

    if (galaxyField) {
      galaxyField.systemTypeId = systemType.id;
      galaxyField.starSystemId = system.id;
      await this.galaxyFieldRepo.save(galaxyField);
    }

    await this.persistGeneratedLayout(system, layout);
    return { generated: 1, updated: 1 };
  }

  async initializeSystemGrid(
    systemId: number,
    input: StarmapInitializeGridDto,
  ): Promise<StarmapOperationResultDto> {
    const system = await this.systemRepo.findOneBy({ id: systemId });
    if (!system) throw new NotFoundException('Star system not found');

    const fieldType = await this.fieldTypeRepo.findOneBy({
      id: input.defaultFieldTypeId,
    });
    if (!fieldType) throw new NotFoundException('Field type not found');

    const existing = await this.systemFieldRepo.count({
      where: { starSystemId: systemId },
    });
    if (existing > 0) {
      throw new BadRequestException('System grid already initialized');
    }

    const rows: SystemField[] = [];
    for (let sy = 1; sy <= system.maxY; sy++) {
      for (let sx = 1; sx <= system.maxX; sx++) {
        rows.push(
          this.systemFieldRepo.create({
            starSystemId: systemId,
            sx,
            sy,
            fieldTypeId: fieldType.id,
            celestialObjectId: null,
            isPassable: fieldType.passable,
            energyCost: fieldType.energyCost,
            damage: fieldType.damage,
            effects: fieldType.effects,
            regionKey: null,
            adminRegionKey: null,
            influenceAreaId: null,
            borderMask: null,
          }),
        );
      }
    }

    await this.systemFieldRepo.save(rows, { chunk: 500 });
    return { created: rows.length };
  }

  async updateSystemField(
    fieldId: number,
    patch: StarmapUpdateSystemFieldDto,
  ): Promise<StarmapSystemFieldDto> {
    const field = await this.systemFieldRepo.findOneBy({ id: fieldId });
    if (!field) throw new NotFoundException('System field not found');

    if (patch.fieldTypeId !== undefined) {
      const fieldType = await this.fieldTypeRepo.findOneBy({
        id: patch.fieldTypeId,
      });
      if (!fieldType) throw new NotFoundException('Field type not found');
      field.fieldTypeId = fieldType.id;
      field.isPassable = fieldType.passable;
      field.energyCost = fieldType.energyCost;
      field.damage = fieldType.damage;
      field.effects = fieldType.effects;
    }

    if (patch.celestialObjectId !== undefined) {
      field.celestialObjectId = patch.celestialObjectId;
    }
    if (patch.regionKey !== undefined) {
      field.regionKey = patch.regionKey;
    }
    if (patch.adminRegionKey !== undefined) {
      field.adminRegionKey = patch.adminRegionKey;
    }
    if (patch.influenceAreaId !== undefined) {
      field.influenceAreaId = patch.influenceAreaId;
    }
    if (patch.borderMask !== undefined) {
      field.borderMask = patch.borderMask;
    }

    const updatedField = await this.systemFieldRepo.save(field);
    const hydratedField = await this.systemFieldRepo.findOne({
      where: { id: updatedField.id },
      relations: ['fieldType'],
    });
    if (!hydratedField) throw new NotFoundException('System field not found');

    return this.toSystemFieldDto(hydratedField);
  }

  private async generateSystemContent(
    system: StarSystem,
    systemType: StarmapSystemTypeOption,
  ): Promise<void> {
    const existingGrid = await this.systemFieldRepo.count({
      where: { starSystemId: system.id },
    });
    if (existingGrid > 0) return;

    const layout = this.systemGenerator.createLayout(system.name, systemType.id);
    system.maxX = layout.width;
    system.maxY = layout.height;
    await this.systemRepo.save(system);
    await this.persistGeneratedLayout(system, layout);
  }

  private async persistGeneratedLayout(
    system: StarSystem,
    layout: ReturnType<StarmapSystemGeneratorService['createLayout']>,
  ): Promise<void> {
    const fieldTypes = await this.fieldTypeRepo.find();
    const fieldTypeByKey = new Map(
      fieldTypes.map((fieldType) => [fieldType.key, fieldType]),
    );

    const objects = await this.objectRepo.save(
      layout.objects.map((object) =>
        this.objectRepo.create({
          systemId: system.id,
          objectType: object.objectType,
          name: object.name,
          posX: object.posX,
          posY: object.posY,
          classId: object.classId,
          isColonizable: object.isColonizable,
        }),
      ),
    );

    const objectByKey = new Map<string, CelestialObject>();
    layout.objects.forEach((object, index) => {
      const savedObject = objects[index];
      if (savedObject) objectByKey.set(object.key, savedObject);
    });

    const rows = layout.fields.map((field) => {
      const fieldType =
        fieldTypeByKey.get(field.fieldTypeKey) ??
        fieldTypeByKey.get('EMPTY_SPACE');
      if (!fieldType) {
        throw new NotFoundException(
          `Field type ${field.fieldTypeKey} not found`,
        );
      }
      const celestialObject = field.objectKey
        ? (objectByKey.get(field.objectKey) ?? null)
        : null;

      return this.systemFieldRepo.create({
        starSystemId: system.id,
        sx: field.sx,
        sy: field.sy,
        fieldTypeId: fieldType.id,
        celestialObjectId: celestialObject?.id ?? null,
        isPassable: fieldType.passable,
        energyCost: fieldType.energyCost,
        damage: fieldType.damage,
        effects: fieldType.effects,
        regionKey: field.regionKey ?? null,
        adminRegionKey: field.adminRegionKey ?? null,
        influenceAreaId: field.influenceAreaId ?? null,
        borderMask: field.borderMask ?? null,
      });
    });

    await this.systemFieldRepo.save(rows, { chunk: 500 });
  }

  private async attachSystemToGalaxyField(
    system: StarSystem,
    systemTypeId: number,
  ): Promise<void> {
    const systemFieldType = await this.fieldTypeRepo.findOne({
      where: { key: 'STAR_SYSTEM' },
    });
    const galaxyField = await this.galaxyFieldRepo.findOne({
      where: { layerId: system.layerId, cx: system.cx, cy: system.cy },
    });
    if (galaxyField && systemFieldType) {
      galaxyField.systemTypeId = systemTypeId;
      galaxyField.starSystemId = system.id;
      galaxyField.fieldTypeId = systemFieldType.id;
      galaxyField.isPassable = systemFieldType.passable;
      galaxyField.energyCost = systemFieldType.energyCost;
      galaxyField.damage = systemFieldType.damage;
      galaxyField.effectFlags = systemFieldType.effects;
      await this.galaxyFieldRepo.save(galaxyField);
    }
  }

  private async generateSystemName(): Promise<string> {
    const usedSystems = await this.systemRepo.find({ select: { name: true } });
    const usedNames = new Set(
      usedSystems.map((system) => system.name.toLowerCase()),
    );
    const nextName = AUTO_SYSTEM_NAMES.find(
      (name) => !usedNames.has(name.toLowerCase()),
    );
    if (nextName) return nextName;
    return `System-${usedSystems.length + 1}`;
  }

  private requireSystemType(systemTypeId: number): StarmapSystemTypeOption {
    const systemType = STARMAP_SYSTEM_TYPE_OPTIONS.find(
      (entry) => entry.id === systemTypeId,
    );
    if (!systemType) {
      throw new BadRequestException('Invalid system type');
    }
    return systemType;
  }

  private toFieldTypeDto(fieldType: GalaxyFieldType): StarmapFieldTypeDto {
    return {
      id: fieldType.id,
      key: fieldType.key,
      name: fieldType.name,
      passable: fieldType.passable,
      energyCost: fieldType.energyCost,
      damage: fieldType.damage,
      isSystem: fieldType.isSystem,
      colorKey: fieldType.colorKey,
    };
  }

  private toLayerDto(layer: Layer): StarmapLayerDto {
    return {
      id: layer.id,
      name: layer.name,
      width: layer.width,
      height: layer.height,
      sectorSize: layer.sectorSize,
      isDefault: layer.isDefault,
      isColonizable: layer.isColonizable,
      isNoobZone: layer.isNoobZone,
      isFinished: layer.isFinished,
      isHidden: layer.isHidden,
    };
  }

  private toSystemListItemDto(system: StarSystem): StarmapSystemListItemDto {
    return {
      id: system.id,
      name: system.name,
      cx: system.cx,
      cy: system.cy,
      maxX: system.maxX,
      maxY: system.maxY,
      systemTypeId: system.systemTypeId,
    };
  }

  private toGalaxyFieldDto(field: GalaxyField): StarmapGalaxyFieldDto {
    return {
      id: field.id,
      cx: field.cx,
      cy: field.cy,
      fieldTypeId: field.fieldTypeId,
      systemTypeId: field.systemTypeId,
      factionZone: field.factionZone,
      adminRegionKey: field.adminRegionKey,
      starSystemId: field.starSystemId,
      regionId: field.regionId,
      borderTypeId: field.borderTypeId,
      effects: field.effects,
      passableOverride: field.passableOverride,
      fieldType: this.toFieldTypeDto(field.fieldType),
      starSystem: field.starSystem
        ? this.toSystemListItemDto(field.starSystem)
        : null,
    };
  }

  private toRegionDto(region: MapRegion): StarmapMapRegionDto {
    return {
      id: region.id,
      layerId: region.layerId,
      name: region.name,
      description: region.description,
      colorKey: region.colorKey,
    };
  }

  private toBorderTypeDto(bt: BorderType): StarmapBorderTypeDto {
    return {
      id: bt.id,
      name: bt.name,
      colorKey: bt.colorKey,
      style: bt.style,
    };
  }

  private toSystemFieldDto(field: SystemField): StarmapSystemFieldDto {
    return {
      id: field.id,
      sx: field.sx,
      sy: field.sy,
      fieldTypeId: field.fieldTypeId,
      celestialObjectId: field.celestialObjectId,
      isPassable: field.isPassable,
      energyCost: field.energyCost,
      damage: field.damage,
      effects: field.effects ?? [],
      regionKey: field.regionKey,
      adminRegionKey: field.adminRegionKey,
      influenceAreaId: field.influenceAreaId,
      borderMask: field.borderMask,
      fieldType: this.toFieldTypeDto(field.fieldType),
    };
  }

  private pickWeightedSystemType(): number {
    const totalWeight = Object.values(RARITY_WEIGHTS).reduce((s, w) => s + w, 0);
    let roll = Math.random() * totalWeight;
    let selectedRarity = 'COMMON';
    for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
      roll -= weight;
      if (roll <= 0) {
        selectedRarity = rarity;
        break;
      }
    }
    const candidates = SYSTEM_TYPE_DEFINITIONS.filter(d => d.rarity === selectedRarity);
    return candidates[Math.floor(Math.random() * candidates.length)].id;
  }
}
