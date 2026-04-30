import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';

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

    // TODO: validate building requirements from game-data
    // TODO: deduct resources
    // TODO: calculate build time from game-data

    field.buildingId = buildingId;
    field.isBuilding = true;
    field.buildProgress = 0;
    field.buildFinishesAt = new Date(Date.now() + 60_000); // placeholder: 1min

    return this.fieldRepo.save(field);
  }

  async processTick(colony: Colony): Promise<void> {
    // Check building completions
    const now = new Date();
    for (const field of colony.fields) {
      if (field.isBuilding && field.buildFinishesAt && field.buildFinishesAt <= now) {
        field.isBuilding = false;
        field.buildProgress = 100;
        await this.fieldRepo.save(field);
      }
    }

    // TODO: produce resources based on buildings from game-data
    // TODO: energy production/consumption
    // TODO: population growth
  }
}
