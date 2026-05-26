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

// Planet class IDs → terrain distribution weights (STU ID scheme)
const TERRAIN_WEIGHTS_BY_CLASS: Record<number, [number, number][]> = {
  // Klasse M (201) — Temperiert/Ausgewogen — default
  201: [
    [FIELD_TYPES.PLAINS, 30],
    [FIELD_TYPES.ROCK, 20],
    [FIELD_TYPES.FOREST, 18],
    [FIELD_TYPES.OCEAN, 12],
    [FIELD_TYPES.DESERT, 8],
    [FIELD_TYPES.MOUNTAIN, 7],
    [FIELD_TYPES.SWAMP, 5],
  ],
  // Klasse L (203) — Wald/Dschungel
  203: [
    [FIELD_TYPES.FOREST, 35],
    [FIELD_TYPES.PLAINS, 25],
    [FIELD_TYPES.SWAMP, 15],
    [FIELD_TYPES.OCEAN, 10],
    [FIELD_TYPES.MOUNTAIN, 8],
    [FIELD_TYPES.ROCK, 7],
  ],
  // Klasse O (205) — Ozean
  205: [
    [FIELD_TYPES.OCEAN, 40],
    [FIELD_TYPES.PLAINS, 20],
    [FIELD_TYPES.SWAMP, 12],
    [FIELD_TYPES.FOREST, 10],
    [FIELD_TYPES.ICE, 10],
    [FIELD_TYPES.ROCK, 8],
  ],
  // Klasse K (211) — Wüste
  211: [
    [FIELD_TYPES.DESERT, 40],
    [FIELD_TYPES.ROCK, 25],
    [FIELD_TYPES.MOUNTAIN, 15],
    [FIELD_TYPES.PLAINS, 12],
    [FIELD_TYPES.OCEAN, 8],
  ],
  // Klasse P (215) — Eis
  215: [
    [FIELD_TYPES.ICE, 40],
    [FIELD_TYPES.MOUNTAIN, 20],
    [FIELD_TYPES.ROCK, 18],
    [FIELD_TYPES.OCEAN, 12],
    [FIELD_TYPES.PLAINS, 10],
  ],
  // Klasse H (213) — Vulkanisch
  213: [
    [FIELD_TYPES.ROCK, 35],
    [FIELD_TYPES.MOUNTAIN, 30],
    [FIELD_TYPES.DESERT, 20],
    [FIELD_TYPES.PLAINS, 10],
    [FIELD_TYPES.OCEAN, 5],
  ],
};

const STARTING_COMMODITIES = [
  { commodityId: 1, amount: 2500 }, // Credits
  { commodityId: 2, amount: 700 }, // Durastahl
  { commodityId: 3, amount: 200 }, // Tibanna-Gas
  { commodityId: 4, amount: 80 }, // Kyber-Kristalle
  { commodityId: 5, amount: 40 }, // Beskar
  { commodityId: 6, amount: 300 }, // Kristallines Silizium
  { commodityId: 7, amount: 220 }, // Energiemodule
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
      ? await this.objectRepo.findOneBy({
          id: preferredCelestialObjectId,
          isColonizable: true,
        })
      : await this.findAvailablePlanet();

    const colony = this.colonyRepo.create({
      name: `${username}'s Homeworld`,
      userId,
      starSystemId: planet?.systemId || null,
      celestialObjectId: planet?.id || null,
      posX: planet?.posX || 10,
      posY: planet?.posY || 10,
      colonyClassId: planet?.classId || 201,
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

    this.logger.log(
      `Starter colony created for user ${username} (id: ${colony.id})`,
    );
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

    const ORBIT_COUNT = 20;
    const SURFACE_COUNT = 50;
    const UNDERGROUND_COUNT = 20;
    const classId = colony.colonyClassId;

    // Orbit: 20 fields (indices 0-19)
    for (let i = 0; i < ORBIT_COUNT; i++) {
      fields.push(
        this.fieldRepo.create({
          colonyId: colony.id,
          fieldIndex: i,
          fieldType: FIELD_TYPES.ORBIT,
          buildingId: null,
          isBuilding: false,
        }),
      );
    }

    // Surface: 50 fields (indices 20-69)
    for (let i = 0; i < SURFACE_COUNT; i++) {
      fields.push(
        this.fieldRepo.create({
          colonyId: colony.id,
          fieldIndex: ORBIT_COUNT + i,
          fieldType: this.randomSurfaceFieldType(classId),
          buildingId: null,
          isBuilding: false,
        }),
      );
    }

    // Underground: 20 fields (indices 70-89)
    for (let i = 0; i < UNDERGROUND_COUNT; i++) {
      fields.push(
        this.fieldRepo.create({
          colonyId: colony.id,
          fieldIndex: ORBIT_COUNT + SURFACE_COUNT + i,
          fieldType: FIELD_TYPES.UNDERGROUND,
          buildingId: null,
          isBuilding: false,
        }),
      );
    }

    // Place HQ at surface center (index 20 + 25 = 45)
    const hqIndex = ORBIT_COUNT + Math.floor(SURFACE_COUNT / 2);
    const hqField = fields.find((f) => f.fieldIndex === hqIndex)!;
    hqField.fieldType = FIELD_TYPES.PLAINS;
    hqField.buildingId = 1;
    hqField.buildProgress = 100;

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

  private randomSurfaceFieldType(classId = 201): number {
    const weights =
      TERRAIN_WEIGHTS_BY_CLASS[classId] || TERRAIN_WEIGHTS_BY_CLASS[201];
    const totalWeight = weights.reduce((sum, [, w]) => sum + w, 0);
    let rand = Math.random() * totalWeight;
    for (const [fieldType, weight] of weights) {
      rand -= weight;
      if (rand <= 0) return fieldType;
    }
    return FIELD_TYPES.PLAINS;
  }
}
