import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';

const FIELD_TYPES = {
  PLAIN: 1,
  ROCK: 2,
  WATER: 3,
  FOREST: 4,
};

const STARTING_COMMODITIES = [
  { commodityId: 1, amount: 500 },  // Credits
  { commodityId: 2, amount: 200 },  // Durasteel
  { commodityId: 3, amount: 100 },  // Energy Cells
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

  async createStarterColony(userId: number, username: string): Promise<Colony> {
    const planet = await this.findAvailablePlanet();

    const colony = this.colonyRepo.create({
      name: `${username}'s Homeworld`,
      userId,
      starSystemId: planet?.systemId || null,
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
      .select('c.starSystemId')
      .where('c.starSystemId IS NOT NULL')
      .getMany();

    const claimedIds = claimed.map((c) => c.starSystemId);

    const query = this.objectRepo
      .createQueryBuilder('obj')
      .where('obj.isColonizable = true')
      .andWhere('obj.objectType = 1');

    if (claimedIds.length > 0) {
      query.andWhere('obj.systemId NOT IN (:...ids)', { ids: claimedIds });
    }

    return query.orderBy('RANDOM()').getOne();
  }

  private async generateFields(colony: Colony): Promise<void> {
    const fields: ColonyField[] = [];
    const gridSize = 7; // 7x7 = 49 fields

    for (let i = 0; i < gridSize * gridSize; i++) {
      const fieldType = this.randomFieldType();
      fields.push(
        this.fieldRepo.create({
          colonyId: colony.id,
          fieldIndex: i,
          fieldType,
          buildingId: null,
          isBuilding: false,
        }),
      );
    }

    // Place starter building (HQ) at center
    const center = Math.floor((gridSize * gridSize) / 2);
    fields[center].buildingId = 1; // HQ
    fields[center].buildProgress = 100;

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

  private randomFieldType(): number {
    const rand = Math.random();
    if (rand < 0.5) return FIELD_TYPES.PLAIN;
    if (rand < 0.7) return FIELD_TYPES.ROCK;
    if (rand < 0.85) return FIELD_TYPES.FOREST;
    return FIELD_TYPES.WATER;
  }
}
