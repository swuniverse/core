import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  STARMAP_SYSTEM_TYPE_OPTIONS,
  type StarmapSystemTypeOption,
} from './starmap-system-types';
import { Layer } from './entities/layer.entity';
import { GalaxyField, FactionZone } from './entities/galaxy-field.entity';
import { GalaxyFieldType } from './entities/galaxy-field-type.entity';
import { StarSystem } from './entities/star-system.entity';
import { SystemField } from './entities/system-field.entity';

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
  ) {}

  async ensureDefaultFieldTypes(): Promise<GalaxyFieldType[]> {
    const existing = await this.fieldTypeRepo.count();
    if (existing > 0) {
      return this.fieldTypeRepo.find({ order: { id: 'ASC' } });
    }

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

    await this.fieldTypeRepo.save(
      defaults.map((entry) => this.fieldTypeRepo.create(entry)),
    );
    return this.fieldTypeRepo.find({ order: { id: 'ASC' } });
  }

  listSystemTypes(): StarmapSystemTypeOption[] {
    return STARMAP_SYSTEM_TYPE_OPTIONS;
  }

  async createLayer(input: {
    name: string;
    width: number;
    height: number;
    sectorSize?: number;
    isDefault?: boolean;
    isColonizable?: boolean;
    isNoobZone?: boolean;
    isFinished?: boolean;
    isHidden?: boolean;
  }): Promise<Layer> {
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
    return this.layerRepo.save(layer);
  }

  async deleteLayer(layerId: number): Promise<{ deleted: boolean }> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) {
      throw new NotFoundException('Layer not found');
    }

    await this.systemFieldRepo
      .createQueryBuilder()
      .delete()
      .where(
        '"starSystemId" IN ' +
          this.systemRepo
            .createQueryBuilder('system')
            .subQuery()
            .select('system.id')
            .from(StarSystem, 'system')
            .where('system."layerId" = :layerId')
            .getQuery(),
      )
      .setParameter('layerId', layerId)
      .execute();

    await this.galaxyFieldRepo.delete({ layerId });
    await this.systemRepo.delete({ layerId });
    await this.layerRepo.delete({ id: layerId });

    return { deleted: true };
  }

  async initializeLayerGrid(
    layerId: number,
    defaultFieldTypeId: number,
  ): Promise<{ created: number }> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const fieldType = await this.fieldTypeRepo.findOneBy({
      id: defaultFieldTypeId,
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

  async listFieldTypes(): Promise<GalaxyFieldType[]> {
    return this.fieldTypeRepo.find({ order: { id: 'ASC' } });
  }

  async updateGalaxyField(
    fieldId: number,
    patch: {
      fieldTypeId?: number;
      factionZone?: FactionZone;
      adminRegionKey?: string | null;
      starSystemId?: number | null;
    },
  ): Promise<GalaxyField> {
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

    if (patch.factionZone !== undefined) field.factionZone = patch.factionZone;
    if (patch.adminRegionKey !== undefined)
      field.adminRegionKey = patch.adminRegionKey;
    if (patch.starSystemId !== undefined)
      field.starSystemId = patch.starSystemId;

    return this.galaxyFieldRepo.save(field);
  }

  async bulkUpdateSectorFields(input: {
    layerId: number;
    sectorX: number;
    sectorY: number;
    fieldTypeId?: number;
    factionZone?: FactionZone;
    adminRegionKey?: string | null;
  }): Promise<{ updated: number }> {
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
      if (input.factionZone !== undefined)
        field.factionZone = input.factionZone;
      if (input.adminRegionKey !== undefined)
        field.adminRegionKey = input.adminRegionKey;
    }

    await this.galaxyFieldRepo.save(fields, { chunk: 500 });
    return { updated: fields.length };
  }

  async createStarSystem(input: {
    layerId: number;
    name: string;
    cx: number;
    cy: number;
    systemTypeId: number;
    maxX?: number;
    maxY?: number;
  }): Promise<StarSystem> {
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

    const systemType = STARMAP_SYSTEM_TYPE_OPTIONS.find(
      (entry) => entry.id === input.systemTypeId,
    );
    if (!systemType) {
      throw new BadRequestException('Invalid system type');
    }

    const system = await this.systemRepo.save(
      this.systemRepo.create({
        name: input.name,
        layerId: input.layerId,
        cx: input.cx,
        cy: input.cy,
        systemTypeId: input.systemTypeId,
        maxX: input.maxX ?? 22,
        maxY: input.maxY ?? 22,
      }),
    );

    const systemFieldType = await this.fieldTypeRepo.findOne({
      where: { key: 'STAR_SYSTEM' },
    });
    const galaxyField = await this.galaxyFieldRepo.findOne({
      where: { layerId: input.layerId, cx: input.cx, cy: input.cy },
    });
    if (galaxyField && systemFieldType) {
      galaxyField.starSystemId = system.id;
      galaxyField.fieldTypeId = systemFieldType.id;
      galaxyField.isPassable = systemFieldType.passable;
      galaxyField.energyCost = systemFieldType.energyCost;
      galaxyField.damage = systemFieldType.damage;
      galaxyField.effectFlags = systemFieldType.effects;
      await this.galaxyFieldRepo.save(galaxyField);
    }

    return system;
  }

  async initializeSystemGrid(
    systemId: number,
    defaultFieldTypeId: number,
  ): Promise<{ created: number }> {
    const system = await this.systemRepo.findOneBy({ id: systemId });
    if (!system) throw new NotFoundException('Star system not found');

    const fieldType = await this.fieldTypeRepo.findOneBy({
      id: defaultFieldTypeId,
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
          }),
        );
      }
    }

    await this.systemFieldRepo.save(rows, { chunk: 500 });
    return { created: rows.length };
  }

  async updateSystemField(
    fieldId: number,
    patch: {
      fieldTypeId?: number;
      celestialObjectId?: number | null;
    },
  ): Promise<SystemField> {
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

    return this.systemFieldRepo.save(field);
  }
}
