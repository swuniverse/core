import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Colony } from './entities/colony.entity';
import { ColonyStats } from './entities/colony-stats.entity';
import {
  ColonyCrewTrainingQueue,
  ColonyCrewTrainingQueueStatus,
} from './entities/colony-crew-training-queue.entity';
import { Crew, CrewGender, CrewType } from './entities/crew.entity';
import { CrewAssignment } from './entities/crew-assignment.entity';
import { ColonyStatsService } from './colony-stats.service';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';

@Injectable()
export class ColonyCrewService {
  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyStats)
    private readonly statsRepo: Repository<ColonyStats>,
    @InjectRepository(ColonyCrewTrainingQueue)
    private readonly crewTrainingQueueRepo: Repository<ColonyCrewTrainingQueue>,
    @InjectRepository(Crew)
    private readonly crewRepo: Repository<Crew>,
    @InjectRepository(CrewAssignment)
    private readonly crewAssignmentRepo: Repository<CrewAssignment>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    private readonly colonyStatsService: ColonyStatsService,
  ) {}

  getLocalCrewLimit(colony: Colony): number {
    const summary = this.colonyStatsService.calculateSummary(colony);
    const workers = colony.stats?.workers ?? summary.workersUsed;
    const population = Math.max(0, colony.population ?? 0);
    const lifeStandardProduction = summary.productionDelta.get(1300) ?? 0;
    const lifeStandardPercentage = this.getLifeStandardPercentage(
      population,
      lifeStandardProduction,
    );
    const negativeEffect = Math.ceil(population / 70);

    // STU uses faction primary/secondary effect commodities. SWU does not yet
    // model those fully, so use available life-standard production as a
    // conservative positive effect fallback while keeping the formula shape.
    const positiveEffectPrimary = Math.max(lifeStandardProduction, workers);
    const positiveEffectSecondary = 0;
    const effectivePositive = Math.min(
      Math.max(
        positiveEffectPrimary -
          4 * Math.max(0, negativeEffect - positiveEffectSecondary),
        0,
      ),
      workers,
    );

    return Math.floor(
      10 + (effectivePositive / 5) * (lifeStandardPercentage / 100),
    );
  }

  private getLifeStandardPercentage(
    population: number,
    production: number,
  ): number {
    if (production <= 0 || population <= 0) return production > 0 ? 100 : 0;
    if (production > population) return 100;
    return Math.floor((production * 100) / population);
  }

  async getGlobalCrewLimit(userId: number): Promise<number> {
    const colonies = await this.colonyRepo.find({
      where: { userId },
      relations: ['fields', 'stats'],
    });
    return colonies.reduce(
      (sum, colony) => sum + this.getLocalCrewLimit(colony),
      0,
    );
  }

  async getAssignedCount(userId: number): Promise<number> {
    return this.crewAssignmentRepo.count({ where: { userId } });
  }

  async getInTrainingCount(userId: number): Promise<number> {
    const queues = await this.crewTrainingQueueRepo.find({
      where: { userId, status: ColonyCrewTrainingQueueStatus.QUEUED },
    });
    return queues.reduce((sum, queue) => sum + queue.amount, 0);
  }

  async getRemainingCount(userId: number): Promise<number> {
    const [globalLimit, assigned, inTraining] = await Promise.all([
      this.getGlobalCrewLimit(userId),
      this.getAssignedCount(userId),
      this.getInTrainingCount(userId),
    ]);
    return Math.max(0, globalLimit - assigned - inTraining);
  }

  async getTrainableCount(userId: number): Promise<number> {
    const globalLimit = await this.getGlobalCrewLimit(userId);
    return Math.ceil(globalLimit / 10);
  }

  async getFreeAssignmentCount(colony: Colony): Promise<number> {
    const assigned = await this.getAssignedToColonyCount(colony.id);
    return Math.max(0, this.getLocalCrewLimit(colony) - assigned);
  }

  async getAssignedToColonyCount(colonyId: number): Promise<number> {
    return this.crewAssignmentRepo.count({ where: { colonyId } });
  }

  async getAvailableColonyCrew(colonyId: number): Promise<CrewAssignment[]> {
    return this.crewAssignmentRepo.find({
      where: { colonyId },
      relations: ['crew'],
      order: { crewId: 'ASC' },
    });
  }

  async createCrewOnColony(
    colony: Colony,
    amount: number,
  ): Promise<CrewAssignment[]> {
    const created: CrewAssignment[] = [];
    for (let i = 0; i < amount; i++) {
      const crew = await this.crewRepo.save(
        this.crewRepo.create({
          userId: colony.userId,
          type: CrewType.CREWMAN,
          gender: CrewGender.DIVERSE,
          name: `Crew ${Date.now()}-${i + 1}`,
        }),
      );
      const assignment = await this.crewAssignmentRepo.save(
        this.crewAssignmentRepo.create({
          crewId: crew.id,
          userId: colony.userId,
          colonyId: colony.id,
          spacecraftId: null,
          slot: CrewType.CREWMAN,
        }),
      );
      created.push(assignment);
    }
    await this.refreshColonyCrewCache(colony);
    return created;
  }

  async reserveCrewForShipBuild(
    colony: Colony,
    amount: number,
  ): Promise<number[]> {
    if (amount <= 0) return [];
    const available = await this.getAvailableColonyCrew(colony.id);
    if (available.length < amount) return [];
    const selected = available.slice(0, amount);
    for (const assignment of selected) {
      assignment.colonyId = null;
      assignment.spacecraftId = null;
      await this.crewAssignmentRepo.save(assignment);
    }
    await this.refreshColonyCrewCache(colony);
    return selected.map((assignment) => assignment.crewId);
  }

  async assignCrewToShip(
    userId: number,
    spacecraftId: number,
    crewIds: number[],
  ): Promise<void> {
    if (crewIds.length === 0) return;
    const assignments = await this.crewAssignmentRepo.find({
      where: { userId, crewId: In(crewIds) },
    });
    for (const assignment of assignments) {
      assignment.colonyId = null;
      assignment.spacecraftId = spacecraftId;
      await this.crewAssignmentRepo.save(assignment);
    }
  }

  async transferCrewFromColonyToShip(
    colony: Colony,
    ship: Spacecraft,
    amount: number,
  ): Promise<void> {
    this.assertSameOwnerAndLocation(colony, ship);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    const available = await this.getAvailableColonyCrew(colony.id);
    if (available.length < amount) {
      throw new BadRequestException('Not enough crew on colony');
    }
    const shipCrew = await this.crewAssignmentRepo.count({
      where: { spacecraftId: ship.id },
    });
    const freeShipCapacity = Math.max(0, ship.crewMax - shipCrew);
    if (freeShipCapacity < amount) {
      throw new BadRequestException('Not enough crew capacity on ship');
    }

    for (const assignment of available.slice(0, amount)) {
      assignment.colonyId = null;
      assignment.spacecraftId = ship.id;
      await this.crewAssignmentRepo.save(assignment);
    }
    await this.refreshColonyCrewCache(colony);
    ship.crew = shipCrew + amount;
    await this.shipRepo.save(ship);
  }

  async transferCrewFromShipToColony(
    colony: Colony,
    ship: Spacecraft,
    amount: number,
  ): Promise<void> {
    this.assertSameOwnerAndLocation(colony, ship);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    const freeLocal = await this.getFreeAssignmentCount(colony);
    if (freeLocal < amount) {
      throw new BadRequestException('Not enough crew capacity on colony');
    }
    const assignments = await this.crewAssignmentRepo.find({
      where: { userId: colony.userId, spacecraftId: ship.id },
      order: { crewId: 'ASC' },
    });
    if (assignments.length < amount) {
      throw new BadRequestException('Not enough crew on ship');
    }
    for (const assignment of assignments.slice(0, amount)) {
      assignment.spacecraftId = null;
      assignment.colonyId = colony.id;
      await this.crewAssignmentRepo.save(assignment);
    }
    await this.refreshColonyCrewCache(colony);
    ship.crew = Math.max(0, assignments.length - amount);
    await this.shipRepo.save(ship);
  }

  private assertSameOwnerAndLocation(colony: Colony, ship: Spacecraft): void {
    if (colony.userId !== ship.userId) {
      throw new BadRequestException('Ship does not belong to colony owner');
    }
    if (colony.starSystemId !== ship.starSystemId) {
      throw new BadRequestException('Ship is not in colony system');
    }
    if (
      colony.celestialObjectId &&
      ship.celestialObjectId &&
      colony.celestialObjectId !== ship.celestialObjectId
    ) {
      throw new BadRequestException('Ship is not in colony orbit');
    }
  }

  async returnCrewToColony(colony: Colony, crewIds: number[]): Promise<void> {
    if (crewIds.length === 0) return;
    const assignments = await this.crewAssignmentRepo.find({
      where: { userId: colony.userId, crewId: In(crewIds) },
    });
    for (const assignment of assignments) {
      assignment.colonyId = colony.id;
      assignment.spacecraftId = null;
      await this.crewAssignmentRepo.save(assignment);
    }
    await this.refreshColonyCrewCache(colony);
  }

  async enforceGlobalCrewLimit(userId: number): Promise<number> {
    const [globalLimit, assigned] = await Promise.all([
      this.getGlobalCrewLimit(userId),
      this.getAssignedCount(userId),
    ]);
    let excess = Math.max(0, assigned - globalLimit);
    if (excess === 0) return 0;

    const colonyAssignments = await this.crewAssignmentRepo.find({
      where: { userId },
      order: { crewId: 'ASC' },
    });
    const removedCrewIds: number[] = [];
    for (const assignment of colonyAssignments.filter(
      (entry) => entry.colonyId,
    )) {
      if (excess === 0) break;
      removedCrewIds.push(assignment.crewId);
      await this.crewAssignmentRepo.delete({ crewId: assignment.crewId });
      await this.crewRepo.delete({ id: assignment.crewId });
      excess -= 1;
    }
    if (excess > 0) {
      const shipAssignments = await this.crewAssignmentRepo.find({
        where: { userId },
        order: { crewId: 'ASC' },
      });
      for (const assignment of shipAssignments.filter(
        (entry) => entry.spacecraftId,
      )) {
        if (excess === 0) break;
        removedCrewIds.push(assignment.crewId);
        await this.crewAssignmentRepo.delete({ crewId: assignment.crewId });
        await this.crewRepo.delete({ id: assignment.crewId });
        excess -= 1;
      }
    }
    return removedCrewIds.length;
  }

  async removeExcessColonyCrew(colony: Colony): Promise<number> {
    const localLimit = this.getLocalCrewLimit(colony);
    const assignments = await this.getAvailableColonyCrew(colony.id);
    const excess = Math.max(0, assignments.length - localLimit);
    if (excess === 0) return 0;
    const toRemove = assignments.slice(-excess);
    for (const assignment of toRemove) {
      await this.crewAssignmentRepo.delete({ crewId: assignment.crewId });
      await this.crewRepo.delete({ id: assignment.crewId });
    }
    await this.refreshColonyCrewCache(colony);
    return toRemove.length;
  }

  async refreshColonyCrewCache(colony: Colony): Promise<void> {
    if (!colony.stats) return;
    colony.stats.trainedCrew = await this.getAssignedToColonyCount(colony.id);
    await this.statsRepo.save(colony.stats);
  }
}
