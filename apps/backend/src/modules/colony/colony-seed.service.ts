import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import {
  STU_DEFAULT_COLONY_CLASS_ID,
  normalizeStuTerrainType,
  stuColonySurfaceGenerator,
} from './stu-colony-surface.generator';

const FIELD_TYPES = {
  PLAINS: 101,
  UNDERGROUND: 801,
};

const STARTING_COMMODITIES = [
  { commodityId: 2, amount: 300 }, // Baumaterial
  { commodityId: 4, amount: 150 }, // Transparistahl
  { commodityId: 5, amount: 100 }, // Deuterium
  { commodityId: 21, amount: 150 }, // Durastahl
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
      colonyClassId: planet?.classId || STU_DEFAULT_COLONY_CLASS_ID,
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
    const seed =
      colony.celestialObject?.terrainSeed ??
      (colony.celestialObjectId
        ? `celestial-${colony.celestialObjectId}`
        : `colony-${colony.id}`);
    const surface = stuColonySurfaceGenerator.generate(
      colony.colonyClassId,
      seed,
      2,
    );

    const fields: ColonyField[] = surface.fields.map((field) =>
      this.fieldRepo.create({
        colonyId: colony.id,
        fieldIndex: field.fieldIndex,
        fieldType: normalizeStuTerrainType(field.fieldType),
        terrainTileId: field.fieldType,
        buildingId: null,
        isBuilding: false,
      }),
    );

    const hqField = this.findHeadquartersField(fields);
    hqField.fieldType = FIELD_TYPES.PLAINS;
    hqField.terrainTileId = FIELD_TYPES.PLAINS;
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

  private findHeadquartersField(fields: ColonyField[]): ColonyField {
    const surfaceFields = fields.filter(
      (field) =>
        field.fieldType !== FIELD_TYPES.UNDERGROUND && field.fieldType !== 900,
    );
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
