import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Repository } from 'typeorm';
import {
  STARMAP_SYSTEM_TYPE_OPTIONS,
  SYSTEM_TYPE_DEFINITIONS,
  SYSTEM_TYPE_BY_ID,
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
import { HyperspaceRoute } from './entities/hyperspace-route.entity';
import { HyperspaceRouteSegment } from './entities/hyperspace-route-segment.entity';
import {
  STAR_WARS_HYPERSPACE_ROUTES,
  STAR_WARS_LANDMARKS,
  type StarWarsHyperspaceRouteSegmentPreset,
  type StarWarsLandmarkPresetEntry,
} from './presets/star-wars-landmarks';
import type {
  ApplyStarWarsPresetOptionsDto,
  ApplyStarWarsPresetResultDto,
  DefaultStarWarsGalaxySeedResultDto,
  StarmapBorderTypeDto,
  StarmapBulkEditFieldsDto,
  StarmapCelestialObjectDto,
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

interface StarWarsSystemCatalogEntry {
  name: string;
  sector: string;
  region: string;
  grid: string;
}

const STAR_WARS_SYSTEM_CATALOG = loadStarWarsSystemCatalog(
  'star-wars-systems.json',
);
const STAR_WARS_FULL_SYSTEM_CATALOG = loadStarWarsSystemCatalog(
  'star-wars-systems.full.json',
);
const STAR_WARS_SYSTEM_CATALOG_BY_KEY = new Map(
  STAR_WARS_SYSTEM_CATALOG.map((entry) => [systemKey(entry.name), entry]),
);

function systemKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function loadStarWarsSystemCatalog(
  fileName: string,
): StarWarsSystemCatalogEntry[] {
  const candidates = [
    join(process.cwd(), 'game-data/starmap', fileName),
    join(process.cwd(), '../../game-data/starmap', fileName),
  ];
  const catalogPath = candidates.find((candidate) => existsSync(candidate));
  if (!catalogPath) return [];
  const parsed = JSON.parse(
    readFileSync(catalogPath, 'utf8'),
  ) as StarWarsSystemCatalogEntry[];
  return parsed.filter(
    (entry) => entry.name && entry.sector && entry.region && entry.grid,
  );
}

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
    @InjectRepository(HyperspaceRoute)
    private readonly hyperspaceRouteRepo: Repository<HyperspaceRoute>,
    @InjectRepository(HyperspaceRouteSegment)
    private readonly hyperspaceRouteSegmentRepo: Repository<HyperspaceRouteSegment>,
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
      isFinished: input.isFinished ?? false,
      isHidden: input.isHidden ?? false,
    });
    const createdLayer = await this.layerRepo.save(layer);
    return this.toLayerDto(createdLayer);
  }

  async initializeDefaultStarWarsGalaxy(): Promise<DefaultStarWarsGalaxySeedResultDto> {
    const conflicts: string[] = [];
    const fieldTypes = await this.ensureDefaultFieldTypes();

    let layer = await this.layerRepo.findOne({
      where: { name: 'Star Wars Galaxy' },
    });
    let createdLayer = false;
    if (!layer) {
      layer = await this.layerRepo.save(
        this.layerRepo.create({
          name: 'Star Wars Galaxy',
          width: 120,
          height: 120,
          sectorSize: 20,
          isDefault: true,
          isFinished: true,
          isHidden: false,
        }),
      );
      createdLayer = true;
    } else if (
      layer.width !== 120 ||
      layer.height !== 120 ||
      layer.sectorSize !== 20
    ) {
      conflicts.push(
        `Existing Star Wars Galaxy layer has ${layer.width}x${layer.height}/${layer.sectorSize}; expected 120x120/20`,
      );
    }

    const emptyFieldType = await this.fieldTypeRepo.findOne({
      where: { key: 'EMPTY_SPACE' },
    });
    if (!emptyFieldType)
      throw new NotFoundException('EMPTY_SPACE field type not found');

    const existingFields = await this.galaxyFieldRepo.count({
      where: { layerId: layer.id },
    });
    let createdFields = 0;
    if (existingFields === 0) {
      const initialized = await this.initializeLayerGrid(layer.id, {
        defaultFieldTypeId: emptyFieldType.id,
      });
      createdFields = initialized.created ?? 0;
      await this.applyDefaultStarWarsFactionZones(layer.id);
    } else if (existingFields !== layer.width * layer.height) {
      conflicts.push(
        `Layer grid already has ${existingFields} fields; expected ${layer.width * layer.height}`,
      );
    }

    const existingSystems = await this.systemRepo.count({
      where: { layerId: layer.id },
    });
    let preset: ApplyStarWarsPresetResultDto | null = null;
    let skippedPreset = false;
    if (existingSystems === 0) {
      preset = await this.applyStarWarsPreset(layer.id, {
        mode: 'curated',
        recreateRoutes: true,
        overwriteExisting: false,
      });
      conflicts.push(...preset.conflicts);
    } else {
      skippedPreset = true;
      conflicts.push(
        `Preset skipped because layer already contains ${existingSystems} systems`,
      );
    }

    const seededPlayableFields = await this.seedDefaultPlayableSystemFields(
      layer.id,
    );
    const generated = await this.generateSystemsForLayer(
      layer.id,
      seededPlayableFields,
    );
    const generatedPlayableSystems = generated.generated ?? 0;

    return {
      layerId: layer.id,
      createdLayer,
      createdFields,
      fieldTypes: fieldTypes.length,
      seededPlayableFields,
      generatedPlayableSystems,
      preset,
      conflicts,
      skippedPreset,
      created: createdFields,
      generated: generatedPlayableSystems,
    };
  }

  async deleteLayer(layerId: number): Promise<StarmapOperationResultDto> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) {
      throw new NotFoundException('Layer not found');
    }

    await this.entityManager.transaction(async (manager) => {
      // Nullify/delete FK references from other tables. Keep player-owned data,
      // but detach it from the removed map layer/systems/objects.
      await manager.query(
        `DELETE FROM "onboarding_selections"
         WHERE "selectedSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)
            OR "selectedLayerId" = $1`,
        [layerId],
      );
      await manager.query(
        `UPDATE "colonies"
         SET "celestialObjectId" = NULL, "starSystemId" = NULL
         WHERE "starSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)
            OR "celestialObjectId" IN (
              SELECT id FROM "celestial_objects"
              WHERE "systemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)
            )`,
        [layerId],
      );
      await manager.query(
        `UPDATE "spacecraft"
         SET "celestialObjectId" = NULL,
             "starSystemId" = NULL,
             "currentLayerId" = CASE WHEN "currentLayerId" = $1 THEN NULL ELSE "currentLayerId" END,
             "targetSystemId" = CASE
               WHEN "targetSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1) THEN NULL
               ELSE "targetSystemId"
             END,
             "inSystem" = CASE WHEN "starSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1) THEN false ELSE "inSystem" END,
             "currentSystemFieldX" = CASE WHEN "starSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1) THEN NULL ELSE "currentSystemFieldX" END,
             "currentSystemFieldY" = CASE WHEN "starSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1) THEN NULL ELSE "currentSystemFieldY" END
         WHERE "currentLayerId" = $1
            OR "starSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)
            OR "targetSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)
            OR "celestialObjectId" IN (
              SELECT id FROM "celestial_objects"
              WHERE "systemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)
            )`,
        [layerId],
      );

      await manager.query(
        `DELETE FROM "hyperspace_route_segments"
         WHERE "routeId" IN (SELECT id FROM "hyperspace_routes" WHERE "layerId" = $1)
            OR "fromSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)
            OR "toSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)`,
        [layerId],
      );
      await manager.query(
        `DELETE FROM "hyperspace_routes" WHERE "layerId" = $1`,
        [layerId],
      );
      await manager.query(
        `DELETE FROM "planet_fields"
         WHERE "celestialObjectId" IN (
           SELECT id FROM "celestial_objects"
           WHERE "systemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)
         )`,
        [layerId],
      );
      await manager.query(
        `DELETE FROM "system_fields"
         WHERE "starSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)`,
        [layerId],
      );
      await manager.query(
        `DELETE FROM "celestial_objects"
         WHERE "systemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)`,
        [layerId],
      );
      await manager.query(
        `DELETE FROM "system_explorations"
         WHERE "starSystemId" IN (SELECT id FROM "star_systems" WHERE "layerId" = $1)`,
        [layerId],
      );
      await manager.query(
        `DELETE FROM "exploration_states" WHERE "layerId" = $1`,
        [layerId],
      );
      await manager.query(
        `DELETE FROM "influence_areas" WHERE "layerId" = $1`,
        [layerId],
      );
      await manager.query(
        `DELETE FROM "wormholes" WHERE "entryLayerId" = $1 OR "exitLayerId" = $1`,
        [layerId],
      );
      await manager.query(`DELETE FROM "galaxy_fields" WHERE "layerId" = $1`, [
        layerId,
      ]);
      await manager.query(`DELETE FROM "star_systems" WHERE "layerId" = $1`, [
        layerId,
      ]);
      await manager.query(`DELETE FROM "map_regions" WHERE "layerId" = $1`, [
        layerId,
      ]);
      await manager.query(`DELETE FROM "layers" WHERE id = $1`, [layerId]);
    });

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
    if (patch.borderTypeId !== undefined)
      field.borderTypeId = patch.borderTypeId;
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

    await this.galaxyFieldRepo.update(
      { borderTypeId: id },
      { borderTypeId: null },
    );
    await this.borderTypeRepo.delete({ id });
    return { deleted: true };
  }

  // --- Layer Overview ---

  async getLayerOverview(layerId: number): Promise<StarmapLayerOverviewDto> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

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
      const layout = this.systemGenerator.createLayout(
        systemName,
        systemType.id,
      );

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

  async applyStarWarsPreset(
    layerId: number,
    options: ApplyStarWarsPresetOptionsDto = {},
  ): Promise<ApplyStarWarsPresetResultDto> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const systemFieldType = await this.fieldTypeRepo.findOne({
      where: { key: 'STAR_SYSTEM' },
    });
    if (!systemFieldType)
      throw new NotFoundException('STAR_SYSTEM field type not found');

    const emptyFieldType = await this.fieldTypeRepo.findOne({
      where: { key: 'EMPTY_SPACE' },
    });
    if (!emptyFieldType)
      throw new NotFoundException('EMPTY_SPACE field type not found');

    const mode = options.mode ?? 'curated';
    const recreateRoutes = options.recreateRoutes ?? true;
    const overwriteExisting = options.overwriteExisting ?? true;
    const fullLimitInput = Number.isFinite(options.fullLimit)
      ? Number(options.fullLimit)
      : 500;
    const fullOffsetInput = Number.isFinite(options.fullOffset)
      ? Number(options.fullOffset)
      : 0;
    const fullLimit = Math.max(1, Math.min(fullLimitInput, 5000));
    const fullOffset = Math.max(0, fullOffsetInput);
    const normalizedRegionFilter = options.regionFilter?.trim().toLowerCase();
    const fullCatalog = normalizedRegionFilter
      ? STAR_WARS_FULL_SYSTEM_CATALOG.filter((entry) =>
          entry.region.toLowerCase().includes(normalizedRegionFilter),
        )
      : STAR_WARS_FULL_SYSTEM_CATALOG;
    const selectedCatalog =
      mode === 'full'
        ? fullCatalog.slice(fullOffset, fullOffset + fullLimit)
        : STAR_WARS_SYSTEM_CATALOG;
    const selectedCatalogByKey = new Map(
      selectedCatalog.map((entry) => [systemKey(entry.name), entry]),
    );

    const landmarkByKey = new Map<string, StarSystem>();
    let createdLandmarks = 0;
    let updatedLandmarks = 0;
    const conflicts: string[] = [];

    for (const entry of STAR_WARS_LANDMARKS) {
      const target = this.resolvePresetCoordinate(layer, entry);
      const placement = await this.findLandmarkPlacement(
        layer.id,
        target.cx,
        target.cy,
        entry.key,
      );
      if (placement.cx !== target.cx || placement.cy !== target.cy) {
        conflicts.push(
          `${entry.name}: moved from ${target.cx}|${target.cy} to ${placement.cx}|${placement.cy}`,
        );
      }

      const atlasKey = `atlas:${entry.key}`;
      let system = await this.systemRepo.findOne({
        where: { layerId, landmarkKey: In([entry.key, atlasKey]) },
      });

      if (system && !overwriteExisting) {
        system.isLandmark = false;
        system.landmarkKey = atlasKey;
        system.landmarkCategory = entry.category;
        system = await this.systemRepo.save(system);
        updatedLandmarks++;
        await this.attachLandmarkToGalaxyField(
          system,
          systemFieldType,
          emptyFieldType,
        );
        await this.purgeSystemContent(system.id);
        landmarkByKey.set(entry.key, system);
        continue;
      }

      if (!system) {
        system = await this.systemRepo.save(
          this.systemRepo.create({
            name: entry.name,
            layerId,
            cx: placement.cx,
            cy: placement.cy,
            systemTypeId: entry.systemTypeId,
            maxX: 22,
            maxY: 22,
            isLandmark: false,
            landmarkKey: atlasKey,
            landmarkCategory: entry.category,
          }),
        );
        createdLandmarks++;
      } else {
        system.name = entry.name;
        system.cx = placement.cx;
        system.cy = placement.cy;
        system.systemTypeId = entry.systemTypeId;
        system.isLandmark = false;
        system.landmarkKey = atlasKey;
        system.landmarkCategory = entry.category;
        system = await this.systemRepo.save(system);
        updatedLandmarks++;
      }

      await this.attachLandmarkToGalaxyField(
        system,
        systemFieldType,
        emptyFieldType,
      );
      await this.purgeSystemContent(system.id);
      landmarkByKey.set(entry.key, system);
    }

    const ensureSeedSystem = async (
      waypointKey: string,
      mapOnly = true,
    ): Promise<StarSystem | null> => {
      const existing = landmarkByKey.get(waypointKey);
      if (existing) return existing;

      const catalogEntry =
        selectedCatalogByKey.get(waypointKey) ??
        STAR_WARS_SYSTEM_CATALOG_BY_KEY.get(waypointKey);
      if (!catalogEntry) return null;

      const seedEntry: StarWarsLandmarkPresetEntry = {
        key: waypointKey,
        name: catalogEntry.name,
        grid: catalogEntry.grid,
        sector: catalogEntry.sector,
        region: catalogEntry.region,
        category: this.starWarsCategoryFromRegion(catalogEntry.region),
        systemTypeId: this.starWarsSystemTypeFromRegion(catalogEntry.region),
        seedSystem: true,
      };
      const target = this.resolvePresetCoordinate(layer, seedEntry);
      const placement = await this.findLandmarkPlacement(
        layer.id,
        target.cx,
        target.cy,
        seedEntry.key,
      );

      const atlasKey = `atlas:${seedEntry.key}`;
      let system = await this.systemRepo.findOne({
        where: { layerId, landmarkKey: mapOnly ? atlasKey : seedEntry.key },
      });
      if (!system) {
        system = await this.systemRepo.findOne({
          where: { layerId, name: seedEntry.name },
        });
      }

      if (system && !overwriteExisting && mapOnly) {
        system.isLandmark = false;
        system.landmarkKey = atlasKey;
        system.landmarkCategory = seedEntry.category;
        system = await this.systemRepo.save(system);
        updatedLandmarks++;
        await this.attachLandmarkToGalaxyField(
          system,
          systemFieldType,
          emptyFieldType,
        );
        await this.purgeSystemContent(system.id);
        landmarkByKey.set(seedEntry.key, system);
        return system;
      }

      if (system && !overwriteExisting) {
        landmarkByKey.set(seedEntry.key, system);
        return system;
      }

      if (!system) {
        system = await this.systemRepo.save(
          this.systemRepo.create({
            name: seedEntry.name,
            layerId,
            cx: placement.cx,
            cy: placement.cy,
            systemTypeId: seedEntry.systemTypeId,
            maxX: 22,
            maxY: 22,
            isLandmark: !mapOnly,
            landmarkKey: mapOnly ? atlasKey : seedEntry.key,
            landmarkCategory: seedEntry.category,
          }),
        );
        createdLandmarks++;
      } else {
        system.name = seedEntry.name;
        system.cx = placement.cx;
        system.cy = placement.cy;
        system.systemTypeId = seedEntry.systemTypeId;
        system.isLandmark = !mapOnly;
        system.landmarkKey = mapOnly ? atlasKey : seedEntry.key;
        system.landmarkCategory = seedEntry.category;
        system = await this.systemRepo.save(system);
        updatedLandmarks++;
      }

      await this.attachLandmarkToGalaxyField(
        system,
        systemFieldType,
        emptyFieldType,
      );
      if (mapOnly) {
        await this.purgeSystemContent(system.id);
      } else {
        await this.ensureLandmarkSystemContent(system, seedEntry.systemTypeId);
      }
      landmarkByKey.set(seedEntry.key, system);
      return system;
    };

    if (mode !== 'landmarks') {
      for (const catalogEntry of selectedCatalog) {
        await ensureSeedSystem(systemKey(catalogEntry.name), true);
      }
    }

    let createdRoutes = 0;
    if (recreateRoutes) {
      await this.hyperspaceRouteSegmentRepo
        .createQueryBuilder()
        .delete()
        .where(
          '"routeId" IN (SELECT id FROM "hyperspace_routes" WHERE "layerId" = :layerId)',
          { layerId },
        )
        .execute();
      await this.hyperspaceRouteRepo.delete({ layerId });

      for (
        let routeIndex = 0;
        routeIndex < STAR_WARS_HYPERSPACE_ROUTES.length;
        routeIndex++
      ) {
        const presetRoute = STAR_WARS_HYPERSPACE_ROUTES[routeIndex];
        const route = await this.hyperspaceRouteRepo.save(
          this.hyperspaceRouteRepo.create({
            layerId,
            key: presetRoute.key,
            name: presetRoute.name,
            color: presetRoute.color,
            sortOrder: routeIndex,
          }),
        );
        const segments: HyperspaceRouteSegment[] = [];
        for (
          let segmentIndex = 0;
          segmentIndex < presetRoute.segments.length;
          segmentIndex++
        ) {
          const presetSegment: StarWarsHyperspaceRouteSegmentPreset =
            presetRoute.segments[segmentIndex];
          const fromAllowed =
            landmarkByKey.has(presetSegment.fromKey) ||
            selectedCatalogByKey.has(presetSegment.fromKey);
          const toAllowed =
            landmarkByKey.has(presetSegment.toKey) ||
            selectedCatalogByKey.has(presetSegment.toKey);
          if (mode === 'full' && (!fromAllowed || !toAllowed)) {
            conflicts.push(
              `${presetRoute.name}: skipped segment ${presetSegment.fromKey} -> ${presetSegment.toKey} outside selected full-atlas batch`,
            );
            continue;
          }
          const fromSystem = await ensureSeedSystem(presetSegment.fromKey);
          const toSystem = await ensureSeedSystem(presetSegment.toKey);
          if (!fromSystem || !toSystem) {
            conflicts.push(
              `${presetRoute.name}: missing segment ${presetSegment.fromKey} -> ${presetSegment.toKey}`,
            );
            continue;
          }
          segments.push(
            this.hyperspaceRouteSegmentRepo.create({
              routeId: route.id,
              fromSystemId: fromSystem.id,
              toSystemId: toSystem.id,
              sortOrder: segmentIndex,
              controlPointJson: (presetSegment.controlPoints ?? []).map(
                (point) => {
                  const coord = this.resolveGridCoordinate(
                    layer,
                    point.grid,
                    `${presetRoute.key}-${segmentIndex}-${point.grid}`,
                  );
                  return { x: coord.cx, y: coord.cy };
                },
              ),
            }),
          );
        }
        await this.hyperspaceRouteSegmentRepo.save(segments);
        createdRoutes++;
      }
    }

    return {
      createdLandmarks,
      updatedLandmarks,
      createdRoutes,
      conflicts,
      created: createdLandmarks,
      updated: updatedLandmarks,
    };
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
    const layout = this.systemGenerator.createLayout(
      system.name,
      systemType.id,
      input.seed,
    );
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
      relations: ['fieldType', 'celestialObject'],
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

    const layout = this.systemGenerator.createLayout(
      system.name,
      systemType.id,
    );
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

  private async applyDefaultStarWarsFactionZones(
    layerId: number,
  ): Promise<void> {
    await this.entityManager.query(
      `UPDATE "galaxy_fields"
       SET "factionZone" = CASE
         WHEN cx <= 40 AND cy <= 60 THEN 'REBEL'
         WHEN cx >= 81 AND cy >= 61 THEN 'EMPIRE'
         WHEN cx BETWEEN 41 AND 80 OR cy BETWEEN 41 AND 80 THEN 'CONTESTED'
         ELSE 'UNKNOWN'
       END
       WHERE "layerId" = $1`,
      [layerId],
    );
  }

  private async seedDefaultPlayableSystemFields(
    layerId: number,
  ): Promise<number> {
    const systemFieldType = await this.fieldTypeRepo.findOne({
      where: { key: 'STAR_SYSTEM' },
    });
    if (!systemFieldType)
      throw new NotFoundException('STAR_SYSTEM field type not found');

    const existingPlayableSystems = await this.systemRepo.count({
      where: { layerId, landmarkKey: IsNull() },
    });
    if (existingPlayableSystems > 0) return 0;

    const perFaction = 36;
    const [rebelCandidates, empireCandidates] = await Promise.all([
      this.getPlayableFieldCandidates(layerId, FactionZone.REBEL),
      this.getPlayableFieldCandidates(layerId, FactionZone.EMPIRE),
    ]);

    const rebelFields = this.pickSpreadOutFields(
      rebelCandidates,
      perFaction,
      'rebel-starter-systems',
    );
    const empireFields = this.pickSpreadOutFields(
      empireCandidates,
      perFaction,
      'empire-starter-systems',
    );
    const fields = [...rebelFields, ...empireFields];

    for (const field of fields) {
      field.fieldTypeId = systemFieldType.id;
      field.systemTypeId = this.pickWeightedSystemType();
      field.isPassable = systemFieldType.passable;
      field.energyCost = systemFieldType.energyCost;
      field.damage = systemFieldType.damage;
      field.effectFlags = systemFieldType.effects;
    }

    await this.galaxyFieldRepo.save(fields, { chunk: 500 });
    return fields.length;
  }

  private getPlayableFieldCandidates(
    layerId: number,
    factionZone: FactionZone,
  ): Promise<GalaxyField[]> {
    return this.galaxyFieldRepo
      .createQueryBuilder('field')
      .where('field.layerId = :layerId', { layerId })
      .andWhere('field.starSystemId IS NULL')
      .andWhere('field.systemTypeId IS NULL')
      .andWhere('field.factionZone = :factionZone', { factionZone })
      .orderBy('field.cy', 'ASC')
      .addOrderBy('field.cx', 'ASC')
      .getMany();
  }

  private pickSpreadOutFields(
    candidates: GalaxyField[],
    targetCount: number,
    salt: string,
  ): GalaxyField[] {
    const shuffled = [...candidates].sort(
      (a, b) =>
        this.hashString(`${salt}:${a.cx}:${a.cy}`) -
        this.hashString(`${salt}:${b.cx}:${b.cy}`),
    );
    const selected: GalaxyField[] = [];
    let minDistance = 6;

    while (selected.length < targetCount && minDistance >= 1) {
      for (const field of shuffled) {
        if (selected.length >= targetCount) break;
        if (selected.some((entry) => entry.id === field.id)) continue;
        const tooClose = selected.some(
          (entry) =>
            Math.abs(entry.cx - field.cx) + Math.abs(entry.cy - field.cy) <
            minDistance,
        );
        if (!tooClose) selected.push(field);
      }
      minDistance--;
    }

    return selected.slice(0, targetCount);
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

  private resolvePresetCoordinate(
    layer: Layer,
    entry: Pick<StarWarsLandmarkPresetEntry, 'grid' | 'key' | 'name'>,
  ): { cx: number; cy: number } {
    return this.resolveGridCoordinate(
      layer,
      entry.grid,
      entry.key || entry.name,
    );
  }

  private resolveGridCoordinate(
    layer: Layer,
    grid: string,
    salt: string,
  ): { cx: number; cy: number } {
    const match = /^([A-W])-(\d{1,2})$/i.exec(grid.trim());
    if (!match)
      return {
        cx: Math.ceil(layer.width / 2),
        cy: Math.ceil(layer.height / 2),
      };

    const column = match[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    const row = Number(match[2]) - 1;
    const columns = 23;
    const rows = 21;
    const cellWidth = layer.width / columns;
    const cellHeight = layer.height / rows;
    const hash = this.hashString(salt);
    const offsetX = ((hash % 997) / 996 - 0.5) * 0.68;
    const offsetY = (((hash >> 10) % 997) / 996 - 0.5) * 0.68;
    const rawX = (column + 0.5 + offsetX) * cellWidth;
    const rawY = (row + 0.5 + offsetY) * cellHeight;

    return {
      cx: Math.max(1, Math.min(layer.width, Math.round(rawX))),
      cy: Math.max(1, Math.min(layer.height, Math.round(rawY))),
    };
  }

  private hashString(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private starWarsCategoryFromRegion(
    region: string,
  ): StarWarsLandmarkPresetEntry['category'] {
    const normalized = region.toLowerCase();
    if (normalized.includes('core')) return 'CORE';
    if (normalized.includes('colonies')) return 'COLONIES';
    if (normalized.includes('inner')) return 'INNER_RIM';
    if (normalized.includes('mid')) return 'MID_RIM';
    if (normalized.includes('expansion')) return 'EXPANSION_REGION';
    if (normalized.includes('unknown')) return 'UNKNOWN_REGIONS';
    if (normalized.includes('hutt')) return 'HUTT_SPACE';
    if (normalized.includes('wild')) return 'WILD_SPACE';
    return 'OUTER_RIM';
  }

  private starWarsSystemTypeFromRegion(region: string): number {
    const category = this.starWarsCategoryFromRegion(region);
    if (category === 'CORE' || category === 'COLONIES') return 1050;
    if (category === 'UNKNOWN_REGIONS') return 1067;
    if (category === 'HUTT_SPACE') return 1058;
    if (category === 'WILD_SPACE') return 1068;
    if (category === 'OUTER_RIM') return 1057;
    return 1058;
  }

  private factionZoneForStarWarsCategory(category: string | null): FactionZone {
    if (category === 'CORE' || category === 'COLONIES')
      return FactionZone.EMPIRE;
    if (category === 'HUTT_SPACE') return FactionZone.CONTESTED;
    if (category === 'UNKNOWN_REGIONS' || category === 'WILD_SPACE') {
      return FactionZone.UNKNOWN;
    }
    return FactionZone.NEUTRAL;
  }

  private async findLandmarkPlacement(
    layerId: number,
    targetCx: number,
    targetCy: number,
    landmarkKey: string,
  ): Promise<{ cx: number; cy: number }> {
    const existingAtTarget = await this.systemRepo.findOneBy({
      layerId,
      cx: targetCx,
      cy: targetCy,
    });
    if (!existingAtTarget || existingAtTarget.landmarkKey === landmarkKey) {
      return { cx: targetCx, cy: targetCy };
    }

    for (let radius = 1; radius <= 4; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const cx = targetCx + dx;
          const cy = targetCy + dy;
          if (cx < 1 || cy < 1) continue;
          const existing = await this.systemRepo.findOneBy({ layerId, cx, cy });
          if (!existing) return { cx, cy };
        }
      }
    }

    return { cx: targetCx, cy: targetCy };
  }

  private async attachLandmarkToGalaxyField(
    system: StarSystem,
    systemFieldType: GalaxyFieldType,
    emptyFieldType: GalaxyFieldType,
  ): Promise<void> {
    await this.galaxyFieldRepo.update(
      { layerId: system.layerId, starSystemId: system.id },
      { starSystemId: null },
    );

    let galaxyField = await this.galaxyFieldRepo.findOne({
      where: { layerId: system.layerId, cx: system.cx, cy: system.cy },
    });

    if (!galaxyField) {
      galaxyField = this.galaxyFieldRepo.create({
        layerId: system.layerId,
        cx: system.cx,
        cy: system.cy,
        fieldTypeId: emptyFieldType.id,
        factionZone: FactionZone.NEUTRAL,
        systemTypeId: null,
        starSystemId: null,
        isPassable: emptyFieldType.passable,
        energyCost: emptyFieldType.energyCost,
        damage: emptyFieldType.damage,
        effectFlags: emptyFieldType.effects,
        effects: emptyFieldType.effects,
      });
    }

    galaxyField.fieldTypeId = systemFieldType.id;
    galaxyField.systemTypeId = system.systemTypeId;
    galaxyField.starSystemId = system.id;
    galaxyField.factionZone = this.factionZoneForStarWarsCategory(
      system.landmarkCategory,
    );
    if (!galaxyField.adminRegionKey && system.landmarkCategory) {
      galaxyField.adminRegionKey = `SW_${system.landmarkCategory}`;
    }
    galaxyField.isPassable = systemFieldType.passable;
    galaxyField.energyCost = systemFieldType.energyCost;
    galaxyField.damage = systemFieldType.damage;
    galaxyField.effectFlags = systemFieldType.effects;
    galaxyField.effects = systemFieldType.effects;
    await this.galaxyFieldRepo.save(galaxyField);
  }

  private async purgeSystemContent(systemId: number): Promise<void> {
    await this.systemFieldRepo.delete({ starSystemId: systemId });
    await this.objectRepo.delete({ systemId });
  }

  private async ensureLandmarkSystemContent(
    system: StarSystem,
    systemTypeId: number,
  ): Promise<void> {
    const existingGrid = await this.systemFieldRepo.count({
      where: { starSystemId: system.id },
    });
    if (existingGrid === 0) {
      const systemType = this.requireSystemType(systemTypeId);
      await this.generateSystemContent(system, systemType);
    }
    await this.objectRepo.update(
      { systemId: system.id },
      { isColonizable: false },
    );
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
      systemTypeName: this.getSystemTypeName(system.systemTypeId),
      isLandmark: system.isLandmark,
      landmarkKey: system.landmarkKey,
      landmarkCategory: system.landmarkCategory,
    };
  }

  private getSystemTypeName(systemTypeId: number): string {
    return SYSTEM_TYPE_BY_ID[systemTypeId]?.name ?? `Typ ${systemTypeId}`;
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
      celestialObject: field.celestialObject
        ? this.toCelestialObjectDto(field.celestialObject)
        : null,
    };
  }

  private toCelestialObjectDto(
    object: CelestialObject,
  ): StarmapCelestialObjectDto {
    return {
      id: object.id,
      objectType: object.objectType,
      name: object.name,
      posX: object.posX,
      posY: object.posY,
      classId: object.classId,
      isColonizable: object.isColonizable,
    };
  }

  private pickWeightedSystemType(): number {
    const totalWeight = Object.values(RARITY_WEIGHTS).reduce(
      (s, w) => s + w,
      0,
    );
    let roll = Math.random() * totalWeight;
    let selectedRarity = 'COMMON';
    for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
      roll -= weight;
      if (roll <= 0) {
        selectedRarity = rarity;
        break;
      }
    }
    const candidates = SYSTEM_TYPE_DEFINITIONS.filter(
      (d) => d.rarity === selectedRarity,
    );
    return candidates[Math.floor(Math.random() * candidates.length)].id;
  }
}
