import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { Colony } from '../colony/entities/colony.entity';
import { PlanetGeneratorService } from '../starmap/generator/planet-generator.service';
import { supportsStuSurface } from '../starmap/generator/stu-planet-surface.generator';
import { GameDataService } from '../game-data/game-data.service';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { ColonyScan } from './entities/colony-scan.entity';
import { SpacecraftCrewService } from './spacecraft-crew.service';

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
    private readonly planetGenerator: PlanetGeneratorService,
    private readonly gameData: GameDataService,
    private readonly spacecraftCrewService: SpacecraftCrewService,
  ) {}

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
      owner: { id: number; username: string | null };
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
    scan.colonyOwnerUsername = colony.user?.username ?? 'Unknown';
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
