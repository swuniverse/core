import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';

const FIELD_TYPES = {
  PLAINS: 101,
  FOREST: 111,
  OCEAN: 201,
  DESERT: 401,
  ICE: 501,
  SWAMP: 601,
  ROCK: 701,
  MOUNTAIN: 703,
  UNDERGROUND: 801,
  ORBIT: 900,
};

const STARTING_COMMODITIES = [
  { commodityId: 1, amount: 500 },   // Credits
  { commodityId: 2, amount: 300 },   // Durastahl
  { commodityId: 3, amount: 150 },   // Tibanna-Gas
  { commodityId: 4, amount: 50 },    // Kyber-Kristalle
  { commodityId: 5, amount: 0 },     // Beskar
  { commodityId: 6, amount: 100 },   // Kristallines Silizium
  { commodityId: 7, amount: 80 },    // Energiemodule
];

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
    @InjectRepository(CelestialObject)
    private readonly objectRepo: Repository<CelestialObject>,
  ) {}

  async createStarterColony(
    userId: number,
    username: string,
    preferredCelestialObjectId?: number,
  ): Promise<Colony> {
    const planet = preferredCelestialObjectId
      ? await this.objectRepo.findOneBy({ id: preferredCelestialObjectId, isColonizable: true })
      : await this.findAvailablePlanet();

    const colony = this.colonyRepo.create({
      name: `${username}'s Homeworld`,
      userId,
      starSystemId: planet?.systemId || null,
      celestialObjectId: planet?.id || null,
      posX: planet?.posX || 10,
      posY: planet?.posY || 10,
      colonyClassId: planet?.classId || 101,
      energy: 50,
      energyMax: 100,
      population: 20,
      populationMax: 100,
      storageUsed: 0,
      storageMax: 3000,
    });
    await this.colonyRepo.save(colony);

    await this.generateFields(colony);
    await this.grantStartingResources(colony);

    this.logger.log(`Starter colony created for user ${username} (id: ${colony.id})`);
    return colony;
  }

  private async findAvailablePlanet(): Promise<CelestialObject | null> {
    // Find a colonizable planet not yet claimed
    const claimed = await this.colonyRepo
      .createQueryBuilder('c')
      .select('c.celestialObjectId')
      .where('c.celestialObjectId IS NOT NULL')
      .getMany();

    const claimedIds = claimed
      .map((c) => c.celestialObjectId)
      .filter((id): id is number => id !== null);

    const query = this.objectRepo
      .createQueryBuilder('obj')
      .where('obj.isColonizable = true')
      .andWhere('obj.objectType = 1');

    if (claimedIds.length > 0) {
      query.andWhere('obj.id NOT IN (:...ids)', { ids: claimedIds });
    }

    return query.orderBy('RANDOM()').getOne();
  }

  private async generateFields(colony: Colony): Promise<void> {
    const fields: ColonyField[] = [];

    // Orbit row: 6 fields (indices 0-5)
    for (let i = 0; i < 6; i++) {
      fields.push(this.fieldRepo.create({
        colonyId: colony.id,
        fieldIndex: i,
        fieldType: FIELD_TYPES.ORBIT,
        buildingId: null,
        isBuilding: false,
      }));
    }

    // Surface: 10×6 = 60 fields (indices 6-65)
    for (let i = 0; i < 60; i++) {
      fields.push(this.fieldRepo.create({
        colonyId: colony.id,
        fieldIndex: 6 + i,
        fieldType: this.randomSurfaceFieldType(),
        buildingId: null,
        isBuilding: false,
      }));
    }

    // Underground: 6 fields (indices 66-71)
    for (let i = 0; i < 6; i++) {
      fields.push(this.fieldRepo.create({
        colonyId: colony.id,
        fieldIndex: 66 + i,
        fieldType: FIELD_TYPES.UNDERGROUND,
        buildingId: null,
        isBuilding: false,
      }));
    }

    // Place HQ at surface center (index 6 + 30 = 36)
    fields[36].buildingId = 1;
    fields[36].buildProgress = 100;

    await this.fieldRepo.save(fields);
  }

  private async grantStartingResources(colony: Colony): Promise<void> {
    const storage = STARTING_COMMODITIES.map((c) =>
      this.storageRepo.create({
        colonyId: colony.id,
        commodityId: c.commodityId,
        amount: c.amount,
      }),
    );
    await this.storageRepo.save(storage);
  }

  private randomSurfaceFieldType(): number {
    const rand = Math.random();
    if (rand < 0.35) return FIELD_TYPES.PLAINS;
    if (rand < 0.55) return FIELD_TYPES.ROCK;
    if (rand < 0.70) return FIELD_TYPES.FOREST;
    if (rand < 0.80) return FIELD_TYPES.DESERT;
    if (rand < 0.88) return FIELD_TYPES.MOUNTAIN;
    if (rand < 0.94) return FIELD_TYPES.SWAMP;
    return FIELD_TYPES.OCEAN;
  }
}
