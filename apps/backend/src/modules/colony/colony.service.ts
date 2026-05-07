import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { GameDataService, BuildingCosts } from '../game-data/game-data.service';

@Injectable()
export class ColonyService {
  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    @InjectRepository(ColonyStorage)
    readonly storageRepo: Repository<ColonyStorage>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    private readonly gameData: GameDataService,
  ) {}

  async findAllByUser(userId: number): Promise<Colony[]> {
    const colonies = await this.colonyRepo.find({
      where: { userId },
      relations: ['starSystem', 'celestialObject'],
      order: { id: 'ASC' },
    });
    return colonies.map((colony) => this.toColonySummary(colony));
  }

  async findOne(colonyId: number, userId: number): Promise<Colony> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId, userId },
      relations: ['fields', 'storage', 'starSystem', 'celestialObject'],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    return this.toColonyDetail(colony);
  }

  async rename(
    colonyId: number,
    userId: number,
    name: string,
  ): Promise<Colony> {
    const colony = await this.findOne(colonyId, userId);
    colony.name = name;
    return this.colonyRepo.save(colony);
  }

  async build(
    colonyId: number,
    userId: number,
    fieldIndex: number,
    buildingId: number,
  ): Promise<ColonyField> {
    const colony = await this.findOne(colonyId, userId);
    const field = colony.fields.find((f) => f.fieldIndex === fieldIndex);
    if (!field) throw new NotFoundException('Field not found');
    if (field.buildingId && !field.isBuilding) {
      throw new BadRequestException('Field already has a building');
    }

    const buildingDef = this.gameData.getBuilding(buildingId);
    if (!buildingDef) {
      throw new BadRequestException('Unknown building type');
    }

    if (!buildingDef.allowedFieldTypes.includes(field.fieldType)) {
      throw new BadRequestException(
        'Building cannot be placed on this terrain',
      );
    }

    if (buildingDef.isUnique) {
      const existing = colony.fields.find(
        (f) => f.buildingId === buildingId && !f.isBuilding,
      );
      if (existing) {
        throw new BadRequestException('This building is unique per colony');
      }
    }

    await this.deductBuildCosts(colony, buildingDef.costs);

    const buildTimeMs = buildingDef.costs.buildTime * 1000;
    field.buildingId = buildingId;
    field.isBuilding = true;
    field.buildProgress = 0;
    field.buildFinishesAt = new Date(Date.now() + buildTimeMs);

    return this.fieldRepo.save(field);
  }

  private async deductBuildCosts(
    colony: Colony,
    costs: BuildingCosts,
  ): Promise<void> {
    const costMap: [number, number][] = [
      [1, costs.credits || 0],
      [2, costs.durastahl || 0],
      [3, costs.tibannaGas || 0],
      [4, costs.kyberKristalle || 0],
      [5, costs.beskar || 0],
      [6, costs.kristallinesSilizium || 0],
      [7, costs.energiemodule || 0],
    ];

    for (const [commodityId, required] of costMap) {
      if (required <= 0) continue;
      const storage = await this.storageRepo.findOne({
        where: { colonyId: colony.id, commodityId },
      });
      const available = storage?.amount || 0;
      if (available < required) {
        const commodity = this.gameData.getCommodity(commodityId);
        throw new BadRequestException(
          `Not enough ${commodity?.name || `resource #${commodityId}`}: need ${required}, have ${available}`,
        );
      }
    }

    for (const [commodityId, required] of costMap) {
      if (required <= 0) continue;
      const storage = await this.storageRepo.findOne({
        where: { colonyId: colony.id, commodityId },
      });
      storage!.amount -= required;
      await this.storageRepo.save(storage!);
    }
  }

  async buildShip(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name: string,
  ): Promise<Spacecraft> {
    const colony = await this.findOne(colonyId, userId);

    const hasShipyard = colony.fields.some(
      (f) => f.buildingId === 7 && !f.isBuilding,
    );
    if (!hasShipyard) {
      throw new BadRequestException('Colony needs a completed Shipyard');
    }

    const ship = this.shipRepo.create({
      name,
      shipClassId,
      userId,
      starSystemId: colony.starSystemId,
      posX: colony.posX,
      posY: colony.posY,
    });

    return this.shipRepo.save(ship);
  }

  private toColonySummary(colony: Colony): Colony {
    return Object.assign(colony, {
      locationLabel:
        colony.celestialObject?.name || colony.starSystem?.name || 'Unknown',
    });
  }

  private toColonyDetail(colony: Colony): Colony {
    return Object.assign(this.toColonySummary(colony), {
      fieldCount: colony.fields?.length || 0,
      storageItemCount: colony.storage?.length || 0,
    });
  }

  async processTick(colony: Colony): Promise<void> {
    await this.checkBuildingCompletions(colony);
    await this.produceResources(colony);
    await this.growPopulation(colony);
  }

  async checkBuildingCompletions(colony: Colony): Promise<void> {
    const now = new Date();
    for (const field of colony.fields) {
      if (
        field.isBuilding &&
        field.buildFinishesAt &&
        field.buildFinishesAt <= now
      ) {
        field.isBuilding = false;
        field.buildProgress = 100;
        field.buildFinishesAt = null;
        await this.fieldRepo.save(field);
      }
    }
  }

  private async produceResources(colony: Colony): Promise<void> {
    const completedBuildings = colony.fields.filter(
      (f) => f.buildingId && !f.isBuilding,
    );

    const production = new Map<number, number>();
    let energyDelta = 0;

    for (const field of completedBuildings) {
      const def = this.gameData.getBuilding(field.buildingId!);
      if (!def) continue;

      for (const out of def.production) {
        production.set(
          out.commodityId,
          (production.get(out.commodityId) || 0) + out.amount,
        );
      }

      if (def.bonuses.energy) {
        energyDelta += def.bonuses.energy;
      }
    }

    if (energyDelta !== 0) {
      colony.energy = Math.max(
        0,
        Math.min(colony.energy + energyDelta, colony.energyMax),
      );
    }

    if (production.size > 0) {
      for (const [commodityId, amount] of production) {
        let storage = await this.storageRepo.findOne({
          where: { colonyId: colony.id, commodityId },
        });
        if (storage) {
          storage.amount += amount;
        } else {
          storage = this.storageRepo.create({
            colonyId: colony.id,
            commodityId,
            amount,
          });
        }
        await this.storageRepo.save(storage);
      }

      const totalStored = await this.storageRepo
        .createQueryBuilder('s')
        .select('SUM(s.amount)', 'total')
        .where('s.colonyId = :id', { id: colony.id })
        .getRawOne();
      colony.storageUsed = Number(totalStored?.total || 0);
    }

    if (energyDelta !== 0 || production.size > 0) {
      await this.colonyRepo.save(colony);
    }
  }

  private async growPopulation(colony: Colony): Promise<void> {
    const completedBuildings = colony.fields.filter(
      (f) => f.buildingId && !f.isBuilding,
    );

    let growth = 1;
    for (const field of completedBuildings) {
      const def = this.gameData.getBuilding(field.buildingId!);
      if (def?.bonuses.population) {
        growth += def.bonuses.population;
      }
    }

    if (colony.population < colony.populationMax) {
      colony.population = Math.min(
        colony.population + growth,
        colony.populationMax,
      );
      await this.colonyRepo.save(colony);
    }
  }
}
