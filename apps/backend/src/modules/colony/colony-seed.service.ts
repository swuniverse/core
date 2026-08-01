import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colony } from './entities/colony.entity';
import { assertOwnedColony, OwnedColony } from './colony-owner.util';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { ColonyStats } from './entities/colony-stats.entity';
import { ColonyChangeable } from './entities/colony-changeable.entity';
import { ColonyDepositMining } from './entities/colony-deposit-mining.entity';
import {
  CelestialObject,
  CelestialObjectType,
} from '../starmap/entities/celestial-object.entity';
import { GameDataService } from '../game-data/game-data.service';
import {
  STU_DEFAULT_COLONY_CLASS_ID,
  stuColonySurfaceGenerator,
  type StuColonyFieldData,
} from './stu-colony-surface.generator';
const FIELD_TYPES = {
  PLAINS: 101,
};

const STU_STARTER_BUILDINGS_BY_FACTION_ID: Record<number, number> = {
  1: 82010100, // Föderation -> später Rebel
  2: 82010300, // Klingonen -> später Imperial
};

const STARTING_COMMODITIES = [
  { commodityId: 2, amount: 300 }, // Baumaterial
  { commodityId: 4, amount: 150 }, // Transparistahl
  { commodityId: 5, amount: 100 }, // Deuterium
  { commodityId: 21, amount: 150 }, // Durastahl
];

const FOLLOW_UP_STARTING_COMMODITIES = [
  { commodityId: 2, amount: 150 },
  { commodityId: 4, amount: 75 },
  { commodityId: 5, amount: 50 },
  { commodityId: 21, amount: 75 },
];

export interface CreateFollowUpColonyOptions {
  userId: number;
  username: string;
  celestialObjectId: number;
  buildingId: number;
  resources?: Array<{ commodityId: number; amount: number }>;
  name?: string;
}

@Injectable()
export class ColonySeedService {
  private readonly logger = new Logger(ColonySeedService.name);

  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
    @InjectRepository(ColonyStats)
    private readonly statsRepo: Repository<ColonyStats>,
    @InjectRepository(ColonyChangeable)
    private readonly changeableRepo: Repository<ColonyChangeable>,
    @InjectRepository(ColonyDepositMining)
    private readonly depositMiningRepo: Repository<ColonyDepositMining>,
    @InjectRepository(CelestialObject)
    private readonly objectRepo: Repository<CelestialObject>,
    private readonly gameData: GameDataService,
  ) {}

  async createStarterColony(
    userId: number,
    username: string,
    preferredCelestialObjectId?: number,
    factionId?: number | null,
  ): Promise<Colony> {
    const starterTargets = await this.findStarterTargets();
    const planet = preferredCelestialObjectId
      ? starterTargets.find((target) => target.id === preferredCelestialObjectId) ??
        null
      : starterTargets[0] ?? null;

    if (!planet) {
      throw new BadRequestException('Starterplanet ist nicht verfügbar');
    }
    const surface = this.generateSurfaceSnapshot(
      planet.classId || STU_DEFAULT_COLONY_CLASS_ID,
      `starter-${userId}-${planet.id}`,
      planet.starSystem?.bonusFields ?? 2,
    );
    const colony = this.colonyRepo.create({
      name: `${username}'s Homeworld`,
      userId,
      starSystemId: planet.systemId,
      celestialObjectId: planet.id,
      posX: planet.posX,
      posY: planet.posY,
      colonyClassId: planet.classId || STU_DEFAULT_COLONY_CLASS_ID,
      surfaceMask: surface.mask,
      surfaceWidth: surface.width,
      rotationFactor: surface.rotationFactor,
      energy: 50,
      energyMax: 100,
      population: 20,
      populationMax: 100,
      storageUsed: 0,
      storageMax: 3000,
    });
    await this.colonyRepo.save(colony);

    await this.generateFields(colony, { factionId, fields: surface.fields });
    await this.createInitialStats(colony);
    await this.createInitialChangeable(colony);
    assertOwnedColony(colony);
    await this.createInitialDepositMining(colony);
    await this.grantStartingResources(colony, STARTING_COMMODITIES);

    this.logger.log(
      `Starter colony created for user ${username} (id: ${colony.id})`,
    );
    return colony;
  }

  async createFollowUpColony(
    options: CreateFollowUpColonyOptions,
  ): Promise<Colony> {
    const object = await this.objectRepo.findOne({
      where: { id: options.celestialObjectId, isColonizable: true },
      relations: ['starSystem'],
    });
    const classId = object?.classId || STU_DEFAULT_COLONY_CLASS_ID;
    const surface = this.generateSurfaceSnapshot(
      classId,
      `colony-${options.userId}-${options.celestialObjectId}`,
      object?.starSystem?.bonusFields ?? 2,
    );

    const colony = this.colonyRepo.create({
      name: options.name?.trim() || `${options.username}'s Kolonie`,
      userId: options.userId,
      starSystemId: object?.systemId || null,
      celestialObjectId: object?.id || null,
      posX: object?.posX || 10,
      posY: object?.posY || 10,
      colonyClassId: classId,
      surfaceMask: surface.mask,
      surfaceWidth: surface.width,
      rotationFactor: surface.rotationFactor,
      energy: 25,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageUsed: 0,
      storageMax: 1500,
    });
    await this.colonyRepo.save(colony);

    await this.generateFields(colony, {
      initialBuildingId: options.buildingId,
      fields: surface.fields,
    });
    await this.createInitialStats(colony);
    await this.createInitialChangeable(colony);
    assertOwnedColony(colony);
    await this.createInitialDepositMining(colony);
    await this.grantStartingResources(
      colony,
      options.resources ?? FOLLOW_UP_STARTING_COMMODITIES,
    );

    this.logger.log(
      `Follow-up colony created for user ${options.username} (id: ${colony.id})`,
    );
    return colony;
  }

  private async findStarterTargets(): Promise<CelestialObject[]> {
    return this.objectRepo
      .createQueryBuilder('obj')
      .leftJoin(
        Colony,
        'colony',
        'colony.celestialObjectId = obj.id AND colony.isAbandoned = false',
      )
      .where('obj.isColonizable = true')
      .andWhere('obj.objectType = :objectType', {
        objectType: CelestialObjectType.PLANET,
      })
      .andWhere('obj.classId IS NOT NULL')
      .andWhere('colony.id IS NULL')
      .orderBy('obj.id', 'ASC')
      .getMany();
  }

  generateSurfaceSnapshot(
    classId: number,
    seed: string,
    bonusFields: number,
  ): {
    mask: string;
    width: number;
    rotationFactor: number;
    fields: StuColonyFieldData[];
  } {
    const generated = stuColonySurfaceGenerator.generate(
      classId,
      seed,
      bonusFields,
    );
    const mask = Buffer.from(
      JSON.stringify(
        generated.fields.map((field) => ({
          fieldIndex: field.fieldIndex,
          fieldType: field.fieldType,
          terrainTileId: field.terrainTileId,
          layer: field.layer,
        })),
      ),
    ).toString('base64');
    return {
      mask,
      width: generated.width,
      rotationFactor: 1,
      fields: generated.fields,
    };
  }

  private async generateFields(
    colony: Colony,
    options: {
      factionId?: number | null;
      initialBuildingId?: number;
      fields: StuColonyFieldData[];
    },
  ): Promise<void> {
    const fields = options.fields.map((field) =>
      this.fieldRepo.create({
        colonyId: colony.id,
        fieldIndex: field.fieldIndex,
        fieldType: field.fieldType,
        terrainTileId: field.terrainTileId,
        layer: field.layer,
        buildingId: null,
        isBuilding: false,
      }),
    );

    const hqField = this.findHeadquartersField(fields);
    hqField.fieldType = FIELD_TYPES.PLAINS;
    hqField.terrainTileId = FIELD_TYPES.PLAINS;
    hqField.layer = 'SURFACE';
    hqField.buildingId =
      options.initialBuildingId ??
      STU_STARTER_BUILDINGS_BY_FACTION_ID[options.factionId ?? 1] ??
      STU_STARTER_BUILDINGS_BY_FACTION_ID[1];
    hqField.buildProgress = 100;
    hqField.isActive = true;

    await this.fieldRepo.save(fields);
  }

  private async createInitialStats(colony: Colony): Promise<void> {
    const activeFields = await this.fieldRepo.find({
      where: { colonyId: colony.id, isBuilding: false, isActive: true },
    });
    const activeHousing = activeFields.reduce((sum, field) => {
      const building = field.buildingId
        ? this.gameData.getBuilding(field.buildingId)
        : undefined;
      return sum + (building?.bevPro ?? 0);
    }, 0);

    await this.statsRepo.save(
      this.statsRepo.create({
        colonyId: colony.id,
        workers: 0,
        workless: colony.population,
        maxPopulation: activeHousing || colony.populationMax,
        populationLimit: 0,
        immigrationEnabled: true,
        colonyMessage: null,
        maxEnergy: colony.energyMax,
        maxStorage: colony.storageMax,
        shields: null,
        maxShields: 0,
        shieldFrequency: null,
        torpedoTypeId: null,
        trainedCrew: 0,
        isBlockaded: false,
      }),
    );
  }

  private async createInitialChangeable(colony: Colony): Promise<void> {
    const activeFields = await this.fieldRepo.find({
      where: { colonyId: colony.id, isBuilding: false, isActive: true },
    });
    const activeHousing = activeFields.reduce((sum, field) => {
      const building = field.buildingId
        ? this.gameData.getBuilding(field.buildingId)
        : undefined;
      return sum + (building?.bevPro ?? 0);
    }, 0);

    await this.changeableRepo.save(
      this.changeableRepo.create({
        colonyId: colony.id,
        workers: 0,
        workless: colony.population,
        maxPopulation: activeHousing || colony.populationMax,
        populationLimit: 0,
        immigrationEnabled: true,
        energy: colony.energy,
        maxEnergy: colony.energyMax,
        maxStorage: colony.storageMax,
        shields: 0,
        maxShields: 0,
        shieldFrequency: null,
        torpedoTypeId: null,
        colonyMessage: null,
        isBlockaded: false,
        trainedCrew: 0,
      }),
    );
  }

  private async createInitialDepositMining(colony: OwnedColony): Promise<void> {
    const deposits = this.gameData.getColonyClassDeposits(colony.colonyClassId);
    if (deposits.length === 0) return;
    await this.depositMiningRepo.save(
      deposits.map((deposit) =>
        this.depositMiningRepo.create({
          userId: colony.userId,
          colonyId: colony.id,
          commodityId: deposit.commodityId,
          amountLeft: deposit.maxAmount,
        }),
      ),
    );
  }

  private async grantStartingResources(
    colony: Colony,
    resources: Array<{ commodityId: number; amount: number }>,
  ): Promise<void> {
    const storage = resources.map((c) =>
      this.storageRepo.create({
        colonyId: colony.id,
        commodityId: c.commodityId,
        amount: c.amount,
      }),
    );
    await this.storageRepo.save(storage);
  }

  private findHeadquartersField(fields: ColonyField[]): ColonyField {
    const surfaceFields = fields.filter((field) => field.fieldType < 800);
    const center = Math.floor(surfaceFields.length / 2);
    return (
      surfaceFields
        .slice()
        .sort(
          (a, b) =>
            Math.abs(a.fieldIndex - surfaceFields[center].fieldIndex) -
            Math.abs(b.fieldIndex - surfaceFields[center].fieldIndex),
        )
        .find((field) => field.fieldType !== 201) ??
      surfaceFields[center] ??
      fields[0]
    );
  }
}
