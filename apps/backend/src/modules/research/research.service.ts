import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Research, ResearchStatus } from './entities/research.entity';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyField } from '../colony/entities/colony-field.entity';
import { GameDataService, TechDef } from '../game-data/game-data.service';

@Injectable()
export class ResearchService {
  constructor(
    @InjectRepository(Research)
    private readonly researchRepo: Repository<Research>,
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    private readonly gameData: GameDataService,
  ) {}

  getTechTree(): TechDef[] {
    return this.gameData.getTechTree();
  }

  async getUserResearch(userId: number): Promise<Research[]> {
    return this.researchRepo.find({
      where: { userId },
      order: { techId: 'ASC' },
    });
  }

  async getResearchState(userId: number) {
    const techTree = this.gameData.getTechTree();
    const userResearch = await this.getUserResearch(userId);
    const completed = new Set(
      userResearch.filter((r) => r.status === ResearchStatus.COMPLETED).map((r) => r.techId),
    );

    return techTree.map((tech) => {
      const existing = userResearch.find((r) => r.techId === tech.id);
      let status: ResearchStatus;

      if (existing) {
        status = existing.status;
      } else if (this.areDependenciesMet(tech, completed)) {
        status = ResearchStatus.AVAILABLE;
      } else {
        status = ResearchStatus.LOCKED;
      }

      return {
        ...tech,
        status,
        progress: existing?.progress || 0,
        pointsRequired: this.getPointsRequired(tech),
        finishesAt: existing?.finishesAt || null,
      };
    });
  }

  async startResearch(userId: number, techId: number): Promise<Research> {
    const tech = this.gameData.getTech(techId);
    if (!tech) throw new NotFoundException('Technology not found');

    const inProgress = await this.researchRepo.findOne({
      where: { userId, status: ResearchStatus.IN_PROGRESS },
    });
    if (inProgress) {
      throw new BadRequestException('Already researching something');
    }

    const userResearch = await this.getUserResearch(userId);
    const completed = new Set(
      userResearch.filter((r) => r.status === ResearchStatus.COMPLETED).map((r) => r.techId),
    );

    if (completed.has(techId)) {
      throw new BadRequestException('Already researched');
    }
    if (!this.areDependenciesMet(tech, completed)) {
      throw new BadRequestException('Dependencies not met');
    }

    let research = userResearch.find((r) => r.techId === techId);
    if (research) {
      research.status = ResearchStatus.IN_PROGRESS;
    } else {
      research = this.researchRepo.create({
        userId,
        techId,
        status: ResearchStatus.IN_PROGRESS,
        progress: 0,
      });
    }

    return this.researchRepo.save(research);
  }

  async processTick(userId: number): Promise<void> {
    const inProgress = await this.researchRepo.findOne({
      where: { userId, status: ResearchStatus.IN_PROGRESS },
    });
    if (!inProgress) return;

    const tech = this.gameData.getTech(inProgress.techId);
    if (!tech) return;

    const pointsPerTick = await this.calculateResearchOutput(userId);
    const pointsRequired = this.getPointsRequired(tech);

    inProgress.progress += pointsPerTick;

    if (inProgress.progress >= pointsRequired) {
      inProgress.status = ResearchStatus.COMPLETED;
      inProgress.progress = pointsRequired;
      inProgress.finishesAt = null;
    }

    await this.researchRepo.save(inProgress);
  }

  private async calculateResearchOutput(userId: number): Promise<number> {
    const colonies = await this.colonyRepo.find({ where: { userId } });
    let totalPoints = 1; // Base 1 point per tick even without labs

    for (const colony of colonies) {
      const fields = await this.fieldRepo.find({ where: { colonyId: colony.id } });
      for (const field of fields) {
        if (!field.buildingId || field.isBuilding) continue;
        const def = this.gameData.getBuilding(field.buildingId);
        if (def?.researchPoints) {
          totalPoints += def.researchPoints;
        }
      }
    }

    return totalPoints;
  }

  private getPointsRequired(tech: TechDef): number {
    return tech.duration * 10;
  }

  private areDependenciesMet(tech: TechDef, completed: Set<number>): boolean {
    for (const dep of tech.dependencies) {
      switch (dep.type) {
        case 'REQUIRE':
          if (!dep.techIds.every((id) => completed.has(id))) return false;
          break;
        case 'REQUIRE_SOME':
          if (!dep.techIds.some((id) => completed.has(id))) return false;
          break;
        case 'EXCLUDE':
          if (dep.techIds.some((id) => completed.has(id))) return false;
          break;
      }
    }
    return true;
  }
}
