import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';

const BUILDING_PRODUCTION: Record<number, { commodityId: number; amount: number }[]> = {
  1: [], // HQ — no production
  2: [{ commodityId: 2, amount: 20 }], // Mine → Durasteel
  3: [{ commodityId: 3, amount: 15 }], // Solar Plant → Energy Cells
  4: [{ commodityId: 1, amount: 10 }], // Farm → Credits (trade value)
  5: [], // Barracks
  6: [], // Research Lab
  7: [], // Shipyard
  8: [], // Storage Depot
};

const BUILDING_ENERGY: Record<number, number> = {
  3: 10, // Solar Plant produces energy
};

const BUILDING_POPULATION: Record<number, number> = {
  4: 5,  // Farm supports population growth
  5: 3,  // Barracks supports population
};

@Injectable()
export class ColonyService {
  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    @InjectRepository(ColonyStorage)
    readonly storageRepo: Repository<ColonyStorage>,
  ) {}

  async findAllByUser(userId: number): Promise<Colony[]> {
    return this.colonyRepo.find({
      where: { userId },
      relations: ['starSystem'],
      order: { id: 'ASC' },
    });
  }

  async findOne(colonyId: number, userId: number): Promise<Colony> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId, userId },
      relations: ['fields', 'storage', 'starSystem'],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    return colony;
  }

  async rename(colonyId: number, userId: number, name: string): Promise<Colony> {
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

    field.buildingId = buildingId;
    field.isBuilding = true;
    field.buildProgress = 0;
    field.buildFinishesAt = new Date(Date.now() + 60_000);

    return this.fieldRepo.save(field);
  }

  async processTick(colony: Colony): Promise<void> {
    await this.checkBuildingCompletions(colony);
    await this.produceResources(colony);
    await this.growPopulation(colony);
  }

  async checkBuildingCompletions(colony: Colony): Promise<void> {
    const now = new Date();
    for (const field of colony.fields) {
      if (field.isBuilding && field.buildFinishesAt && field.buildFinishesAt <= now) {
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

    for (const field of completedBuildings) {
      const outputs = BUILDING_PRODUCTION[field.buildingId!];
      if (!outputs) continue;
      for (const out of outputs) {
        production.set(out.commodityId, (production.get(out.commodityId) || 0) + out.amount);
      }

      const energyOutput = BUILDING_ENERGY[field.buildingId!];
      if (energyOutput) {
        colony.energy = Math.min(colony.energy + energyOutput, colony.energyMax);
      }
    }

    if (production.size > 0) {
      for (const [commodityId, amount] of production) {
        let storage = await this.storageRepo.findOne({
          where: { colonyId: colony.id, commodityId },
        });
        if (storage) {
          storage.amount += amount;
        } else {
          storage = this.storageRepo.create({ colonyId: colony.id, commodityId, amount });
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

    if (colony.energy > 0 || production.size > 0) {
      await this.colonyRepo.save(colony);
    }
  }

  private async growPopulation(colony: Colony): Promise<void> {
    const completedBuildings = colony.fields.filter(
      (f) => f.buildingId && !f.isBuilding,
    );

    let growth = 1; // Base growth per tick
    for (const field of completedBuildings) {
      const bonus = BUILDING_POPULATION[field.buildingId!];
      if (bonus) growth += bonus;
    }

    if (colony.population < colony.populationMax) {
      colony.population = Math.min(colony.population + growth, colony.populationMax);
      await this.colonyRepo.save(colony);
    }
  }
}
