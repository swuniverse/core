import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  SpacecraftScanPageDto,
  SpacecraftScanResultDto,
} from '@swuniverse/shared';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { Colony } from '../colony/entities/colony.entity';
import { PlanetGeneratorService } from '../starmap/generator/planet-generator.service';
import { supportsStuSurface } from '../starmap/generator/stu-planet-surface.generator';
import { GameDataService } from '../game-data/game-data.service';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { ColonyScan } from './entities/colony-scan.entity';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import { assertSpacecraftNotInStandby } from './spacecraft-mode.util';
import { ExplorationService } from '../starmap/exploration.service';
import { SystemTypeDiscoveryService } from '../starmap/system-type-discovery.service';
import { SYSTEM_TYPE_BY_ID } from '../starmap/starmap-system-types';
import { ExplorationLevel } from '../starmap/entities/exploration-state.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import {
  SpacecraftScanResult,
  SpacecraftScanType,
} from './entities/spacecraft-scan-result.entity';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';

@Injectable()
export class SpacecraftScanService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(SpacecraftModule)
    private readonly moduleRepo: Repository<SpacecraftModule>,
    @InjectRepository(CelestialObject)
    private readonly objectRepo: Repository<CelestialObject>,
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyScan)
    private readonly colonyScanRepo: Repository<ColonyScan>,
    @InjectRepository(SpacecraftScanResult)
    private readonly scanResultRepo: Repository<SpacecraftScanResult>,
    @InjectRepository(SystemField)
    private readonly systemFieldRepo: Repository<SystemField>,
    @InjectRepository(GalaxyField)
    private readonly galaxyFieldRepo: Repository<GalaxyField>,
    private readonly planetGenerator: PlanetGeneratorService,
    private readonly gameData: GameDataService,
    private readonly spacecraftCrewService: SpacecraftCrewService,
    private readonly runtimeState: SpacecraftRuntimeStateService,
    private readonly explorationService: ExplorationService,
    private readonly systemTypeDiscoveryService: SystemTypeDiscoveryService,
  ) {}

  async sectorScan(
    shipId: number,
    userId: number,
  ): Promise<SpacecraftScanResultDto> {
    const ship = await this.requireOperationalScanner(
      shipId,
      userId,
      'SHORT_RANGE_SENSORS',
      1,
    );
    const x = ship.inSystem
      ? (ship.currentSystemFieldX ?? ship.posX)
      : ship.posX;
    const y = ship.inSystem
      ? (ship.currentSystemFieldY ?? ship.posY)
      : ship.posY;
    const field =
      ship.inSystem && ship.starSystemId
        ? await this.systemFieldRepo.findOne({
            where: { starSystemId: ship.starSystemId, sx: x, sy: y },
            relations: ['fieldType', 'celestialObject'],
          })
        : await this.galaxyFieldRepo.findOne({
            where: { layerId: ship.currentLayerId ?? -1, cx: x, cy: y },
            relations: ['fieldType', 'starSystem'],
          });
    if (!field) throw new NotFoundException('Aktuelles Feld nicht gefunden');
    if (!ship.inSystem && ship.currentLayerId) {
      await this.explorationService.discoverArea({
        userId,
        layerId: ship.currentLayerId,
        cx: x,
        cy: y,
        radius: 1,
        level: ExplorationLevel.TERRAIN,
        source: 'sector_scan',
      });
    }
    const object = 'celestialObject' in field ? field.celestialObject : null;
    const systemTypeId =
      !ship.inSystem && 'systemTypeId' in field ? field.systemTypeId : null;
    const discovery =
      systemTypeId != null && SYSTEM_TYPE_BY_ID[systemTypeId]
        ? await this.systemTypeDiscoveryService.discover({
            userId,
            systemTypeId,
            source: 'SECTOR_SCAN',
            spacecraftId: ship.id,
            layerId: ship.currentLayerId,
            x,
            y,
          })
        : null;
    return this.persistScan(ship, SpacecraftScanType.SECTOR, x, y, 1, {
      field: {
        scope: ship.inSystem ? 'SYSTEM' : 'GALAXY',
        x,
        y,
        fieldType: {
          id: field.fieldType.id,
          key: field.fieldType.key,
          name: field.fieldType.name,
        },
        movementEnergyCost: field.energyCost,
        damage: field.damage,
        specialDamage: 0,
        effects: field.effects ?? [],
        celestialObject: object
          ? {
              id: object.id,
              name: object.name,
              objectType: object.objectType,
              classId: object.classId,
            }
          : null,
        starSystem:
          !ship.inSystem &&
          'starSystem' in field &&
          field.starSystem &&
          systemTypeId != null
            ? {
                id: field.starSystem.id,
                name: field.starSystem.name,
                systemTypeId,
                systemTypeName: SYSTEM_TYPE_BY_ID[systemTypeId]?.name ?? null,
              }
            : null,
      },
      discovery,
      signatures: [],
      fadedSignatures: { uncloaked: 0, cloaked: 0 },
      buoys: [],
    });
  }

  async systemFieldScan(
    shipId: number,
    userId: number,
    targetX: number,
    targetY: number,
  ): Promise<SpacecraftScanResultDto> {
    const ship = await this.requireOperationalScanner(
      shipId,
      userId,
      'LONG_RANGE_SENSORS',
      2,
    );
    if (!ship.inSystem || !ship.starSystemId) {
      throw new BadRequestException(
        'Systemfeldscan erfordert ein Sternensystem',
      );
    }
    const x = ship.currentSystemFieldX ?? ship.posX;
    const y = ship.currentSystemFieldY ?? ship.posY;
    const range = await this.getSensorRange(ship);
    if (Math.max(Math.abs(targetX - x), Math.abs(targetY - y)) > range) {
      throw new BadRequestException(
        'Zielfeld liegt außerhalb der Sensorreichweite',
      );
    }
    const field = await this.systemFieldRepo.findOne({
      where: { starSystemId: ship.starSystemId, sx: targetX, sy: targetY },
      relations: ['fieldType', 'celestialObject'],
    });
    if (!field) throw new NotFoundException('Systemfeld nicht gefunden');
    await this.explorationService.discoverSystem({
      userId,
      starSystemId: ship.starSystemId,
      source: 'system_field_scan',
    });
    return this.persistScan(
      ship,
      SpacecraftScanType.SYSTEM_FIELD,
      targetX,
      targetY,
      2,
      {
        fieldType: field.fieldType?.name ?? null,
        passable: field.isPassable,
        effects: field.effects ?? [],
        celestialObject: field.celestialObject
          ? {
              id: field.celestialObject.id,
              name: field.celestialObject.name,
              classId: field.celestialObject.classId,
            }
          : null,
      },
    );
  }

  async listScans(
    shipId: number,
    userId: number,
    page = 1,
    limit = 20,
  ): Promise<SpacecraftScanPageDto> {
    const ship = await this.shipRepo.findOneBy({ id: shipId, userId });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(50, limit));
    const [rows, total] = await this.scanResultRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return {
      data: rows.map((row) => this.toScanDto(row)),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  private async requireOperationalScanner(
    shipId: number,
    userId: number,
    key: 'LONG_RANGE_SENSORS' | 'SHORT_RANGE_SENSORS',
    cost: number,
  ): Promise<Spacecraft> {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['modules'],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    assertSpacecraftNotInStandby(ship, 'einem Scan');
    if (ship.status === SpacecraftStatus.DESTROYED)
      throw new BadRequestException('Destroyed ship cannot scan');
    if (!(await this.spacecraftCrewService.hasEnoughCrew(ship)))
      throw new BadRequestException('Not enough crew');
    const systems = this.runtimeState.initialize(ship);
    const sensor = systems[key];
    if (!sensor?.active)
      throw new BadRequestException(`${key} sind nicht aktiv`);
    if (sensor.integrity <= 0)
      throw new BadRequestException(`${key} ist zerstört`);
    if (ship.energy < cost) throw new BadRequestException('Nicht genug EPS');
    ship.energy -= cost;
    ship.runtimeSystems = systems;
    await this.shipRepo.save(ship);
    return ship;
  }

  private async persistScan(
    ship: Spacecraft,
    type: SpacecraftScanType,
    x: number,
    y: number,
    energyCost: number,
    result: Record<string, unknown>,
  ): Promise<SpacecraftScanResultDto> {
    const saved = await this.scanResultRepo.save(
      this.scanResultRepo.create({
        userId: ship.userId,
        spacecraftId: ship.id,
        type,
        layerId: ship.currentLayerId,
        starSystemId: ship.starSystemId,
        x,
        y,
        energyCost,
        cooldown: 1,
        result,
      }),
    );
    return this.toScanDto(saved);
  }

  private toScanDto(row: SpacecraftScanResult): SpacecraftScanResultDto {
    return {
      id: row.id,
      type: row.type,
      spacecraftId: row.spacecraftId,
      createdAt: row.createdAt.toISOString(),
      energyCost: row.energyCost,
      cooldown: row.cooldown,
      layerId: row.layerId,
      starSystemId: row.starSystemId,
      x: row.x,
      y: row.y,
      result: row.result,
    };
  }

  async surfaceScan(
    shipId: number,
    userId: number,
    celestialObjectId: number,
  ): Promise<{ celestialObjectId: number; created: number }> {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['modules'],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    assertSpacecraftNotInStandby(ship, 'einem Scan');
    if (!ship.inSystem || !ship.starSystemId) {
      throw new BadRequestException(
        'Surface scan requires ship inside a system',
      );
    }
    if (!this.hasSurfaceScanner(ship.modules ?? [])) {
      throw new BadRequestException('Matrixsensoren module required');
    }
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Destroyed ship cannot scan');
    }
    if (!(await this.spacecraftCrewService.hasEnoughCrew(ship))) {
      throw new BadRequestException('Not enough crew');
    }

    const object = await this.objectRepo.findOneBy({ id: celestialObjectId });
    if (!object) throw new NotFoundException('Celestial object not found');
    if (object.systemId !== ship.starSystemId) {
      throw new BadRequestException(
        'Celestial object is not in current system',
      );
    }
    if (!supportsStuSurface(object.classId)) {
      throw new BadRequestException(
        'Celestial object has no scannable surface',
      );
    }

    const shipX = ship.currentSystemFieldX ?? ship.posX;
    const shipY = ship.currentSystemFieldY ?? ship.posY;
    const distance = Math.max(
      Math.abs(object.posX - shipX),
      Math.abs(object.posY - shipY),
    );
    const range = await this.getSensorRange(ship);
    if (distance > range) {
      throw new BadRequestException('Celestial object is outside sensor range');
    }

    const created = await this.planetGenerator.generateAndPersist(object.id);
    return { celestialObjectId: object.id, created };
  }

  async colonyScan(
    shipId: number,
    userId: number,
    colonyId: number,
  ): Promise<{
    scanId: number;
    colony: {
      id: number;
      name: string;
      owner: { id: number | null; username: string | null };
      colonyClassId: number;
      starSystemId: number | null;
      celestialObject: {
        id: number;
        name: string | null;
        classId: number | null;
        posX: number;
        posY: number;
      } | null;
    };
    surface: {
      width: number | null;
      height: number | null;
      fields: Array<{
        fieldIndex: number;
        fieldType: number;
        terrainTileId: number | null;
        buildingId: number | null;
        buildingName: string | null;
        hasBuilding: boolean;
        isConstruction: boolean;
        isActive: boolean;
        integrityPercent: number | null;
      }>;
    };
    intelligence: { level: 'SURFACE_SCAN'; redacted: string[] };
  }> {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['modules'],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    assertSpacecraftNotInStandby(ship, 'einem Scan');
    if (!ship.inSystem || !ship.starSystemId) {
      throw new BadRequestException(
        'Colony scan requires ship inside a system',
      );
    }
    if (!this.hasSurfaceScanner(ship.modules ?? [])) {
      throw new BadRequestException('Matrixsensoren module required');
    }
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Destroyed ship cannot scan');
    }
    if (!(await this.spacecraftCrewService.hasEnoughCrew(ship))) {
      throw new BadRequestException('Not enough crew');
    }

    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId },
      relations: ['fields', 'user', 'celestialObject'],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    if (colony.starSystemId !== ship.starSystemId) {
      throw new BadRequestException('Colony is not in current system');
    }

    const shipX = ship.currentSystemFieldX ?? ship.posX;
    const shipY = ship.currentSystemFieldY ?? ship.posY;
    const colonyX = colony.celestialObject?.posX ?? colony.posX;
    const colonyY = colony.celestialObject?.posY ?? colony.posY;
    const distance = Math.max(
      Math.abs(colonyX - shipX),
      Math.abs(colonyY - shipY),
    );
    const range = await this.getSensorRange(ship);
    if (distance > range) {
      throw new BadRequestException('Colony is outside sensor range');
    }

    const fields = [...(colony.fields ?? [])].sort(
      (a, b) => a.fieldIndex - b.fieldIndex,
    );

    const surfaceFields = fields.map((field) => {
      const building = field.buildingId
        ? this.gameData.getBuilding(field.buildingId)
        : undefined;
      return {
        fieldIndex: field.fieldIndex,
        fieldType: field.fieldType,
        terrainTileId: field.terrainTileId,
        buildingId: field.buildingId,
        buildingName: building?.name ?? null,
        hasBuilding: field.buildingId != null,
        isConstruction: field.isBuilding,
        isActive: field.isActive,
        integrityPercent:
          field.maxIntegrity > 0
            ? Math.round((field.integrity / field.maxIntegrity) * 100)
            : null,
      };
    });

    const scan = this.colonyScanRepo.create();
    scan.colonyId = colony.id;
    scan.userId = userId;
    scan.colonyOwnerId = colony.userId;
    scan.colonyName = colony.name;
    scan.colonyOwnerUsername = colony.user?.username ?? null;
    scan.starSystemId = colony.starSystemId;
    scan.celestialObjectId = colony.celestialObjectId;
    scan.colonyClassId = colony.colonyClassId;
    scan.surfaceWidth = colony.celestialObject?.surfaceWidth ?? null;
    scan.surfaceHeight = colony.celestialObject?.surfaceHeight ?? null;
    scan.surfaceFields = surfaceFields;
    const savedScan = await this.colonyScanRepo.save(scan);

    return {
      scanId: savedScan.id,
      colony: {
        id: colony.id,
        name: colony.name,
        owner: { id: colony.userId, username: colony.user?.username ?? null },
        colonyClassId: colony.colonyClassId,
        starSystemId: colony.starSystemId,
        celestialObject: colony.celestialObject
          ? {
              id: colony.celestialObject.id,
              name: colony.celestialObject.name,
              classId: colony.celestialObject.classId,
              posX: colony.celestialObject.posX,
              posY: colony.celestialObject.posY,
            }
          : null,
      },
      surface: {
        width: colony.celestialObject?.surfaceWidth ?? null,
        height: colony.celestialObject?.surfaceHeight ?? null,
        fields: surfaceFields,
      },
      intelligence: {
        level: 'SURFACE_SCAN',
        redacted: [
          'storage',
          'defense',
          'population',
          'production',
          'events',
          'queues',
        ],
      },
    };
  }

  private hasSurfaceScanner(modules: SpacecraftModule[]): boolean {
    return modules.some((module) => {
      if (!module.isActive || module.integrity <= 0) return false;
      const def = this.gameData
        .getAllModules()
        .find((candidate) => candidate.name === module.moduleType);
      return Boolean(
        def &&
        def.category === 'SENSORS' &&
        (def.public as Record<string, unknown>)?.canSurfaceScan === true,
      );
    });
  }

  async listColonyScans(userId: number) {
    const scans = await this.colonyScanRepo.find({
      where: { userId },
      relations: ['colony'],
      order: { createdAt: 'DESC' },
    });
    const latestByColony = new Map<number, (typeof scans)[number]>();
    for (const scan of scans) {
      if (!latestByColony.has(scan.colonyId)) {
        latestByColony.set(scan.colonyId, scan);
      }
    }
    const toListItem = (scan: ColonyScan) => ({
      id: scan.id,
      colonyId: scan.colonyId,
      colonyOwnerId: scan.colonyOwnerId,
      colonyName: scan.colonyName,
      colonyOwnerUsername: scan.colonyOwnerUsername,
      starSystemId: scan.starSystemId,
      celestialObjectId: scan.celestialObjectId,
      colonyClassId: scan.colonyClassId,
      surfaceWidth: scan.surfaceWidth,
      surfaceHeight: scan.surfaceHeight,
      createdAt: scan.createdAt,
      abandoned: !!scan.colony && scan.colony.userId !== scan.colonyOwnerId,
    });
    return Array.from(latestByColony.values()).map((scan) => ({
      ...toListItem(scan),
      history: scans
        .filter((candidate) => candidate.colonyId === scan.colonyId)
        .map(toListItem),
    }));
  }

  async getColonyScan(scanId: number, userId: number) {
    const scan = await this.colonyScanRepo.findOne({
      where: { id: scanId, userId },
      relations: ['colony'],
    });
    if (!scan) throw new NotFoundException('Colony scan not found');
    return {
      id: scan.id,
      colonyId: scan.colonyId,
      colonyOwnerId: scan.colonyOwnerId,
      colonyName: scan.colonyName,
      colonyOwnerUsername: scan.colonyOwnerUsername,
      starSystemId: scan.starSystemId,
      celestialObjectId: scan.celestialObjectId,
      colonyClassId: scan.colonyClassId,
      surfaceWidth: scan.surfaceWidth,
      surfaceHeight: scan.surfaceHeight,
      surface: scan.surfaceFields,
      createdAt: scan.createdAt,
      abandoned: !!scan.colony && scan.colony.userId !== scan.colonyOwnerId,
    };
  }

  async deleteColonyScan(scanId: number, userId: number) {
    const scan = await this.colonyScanRepo.findOne({
      where: { id: scanId, userId },
    });
    if (!scan) throw new NotFoundException('Colony scan not found');
    await this.colonyScanRepo.remove(scan);
    return { deleted: true, id: scanId };
  }

  private async getSensorRange(ship: Spacecraft): Promise<number> {
    const modules =
      ship.modules ??
      (await this.moduleRepo.find({ where: { spacecraftId: ship.id } }));
    let maxRange = 3;
    for (const mod of modules) {
      const def = this.gameData
        .getAllModules()
        .find((m) => m.name === mod.moduleType);
      if (def?.category === 'SENSORS') {
        const base =
          (def.public as Record<string, number>)?.baseSensorRange ?? 2;
        const range = base + (mod.level - 1);
        if (range > maxRange) maxRange = range;
      }
    }
    return maxRange;
  }
}
