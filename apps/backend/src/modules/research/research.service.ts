import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Research, ResearchStatus } from './entities/research.entity';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { GameDataService, TechDef } from '../game-data/game-data.service';

@Injectable()
export class ResearchService {
  constructor(
    @InjectRepository(Research)
    private readonly researchRepo: Repository<Research>,
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
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
      userResearch
        .filter((r) => r.status === ResearchStatus.COMPLETED)
        .map((r) => r.techId),
    );
    return techTree
      .filter((tech) => !tech.hidden && !tech.excludeFromNormalProgression)
      .filter((tech) => {
        if (tech.id !== 1001 && tech.id !== 1002) return true;
        return userResearch.some(
          (research) =>
            research.techId === tech.id &&
            research.status === ResearchStatus.COMPLETED,
        );
      })
      .map((tech) => {
        const existing = userResearch.find((r) => r.techId === tech.id);
        let status: ResearchStatus;

        if (existing) {
          status = existing.status;
        } else if (this.areDependenciesMet(tech, completed)) {
          status = ResearchStatus.AVAILABLE;
        } else {
          status = ResearchStatus.LOCKED;
        }

        const effort = this.getPointsRequired(tech);
        const spentPoints = existing?.spentPoints ?? existing?.progress ?? 0;
        const remainingPoints =
          existing?.remainingPoints ?? Math.max(0, effort - spentPoints);
        const commodityId = tech.mappedCommodityId ?? tech.commodityId ?? null;
        return {
          ...tech,
          status,
          effort,
          progress: spentPoints,
          spentPoints,
          remainingPoints,
          pointsRequired: effort,
          commodity: commodityId
            ? (this.gameData.getCommodity(commodityId) ?? {
                id: commodityId,
                name: `Ware #${commodityId}`,
              })
            : null,
          blockedReason: existing?.blockedReason ?? null,
          unlocks: tech.unlocks ?? {},
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
      userResearch
        .filter((r) => r.status === ResearchStatus.COMPLETED)
        .map((r) => r.techId),
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
        remainingPoints: this.getPointsRequired(tech),
        spentPoints: 0,
        sourceCommodityId: tech.mappedCommodityId ?? tech.commodityId ?? null,
        blockedReason: null,
      });
    }

    return this.researchRepo.save(research);
  }

  async cancelResearch(userId: number): Promise<Research> {
    const research = await this.researchRepo.findOne({
      where: { userId, status: ResearchStatus.IN_PROGRESS },
    });
    if (!research) {
      throw new BadRequestException('No active research to cancel');
    }

    research.status = ResearchStatus.AVAILABLE;
    research.blockedReason = null;
    return this.researchRepo.save(research);
  }

  async processTick(userId: number): Promise<void> {
    const inProgress = await this.researchRepo.findOne({
      where: { userId, status: ResearchStatus.IN_PROGRESS },
    });
    if (!inProgress) return;

    const tech = this.gameData.getTech(inProgress.techId);
    if (!tech) return;

    const commodityId =
      inProgress.sourceCommodityId ??
      tech.mappedCommodityId ??
      tech.commodityId;
    if (!commodityId) {
      inProgress.status = ResearchStatus.COMPLETED;
      inProgress.remainingPoints = 0;
      inProgress.blockedReason = null;
      await this.researchRepo.save(inProgress);
      return;
    }

    const colony = await this.getPrimaryColony(userId);
    if (!colony) return;

    const storage = await this.getStorage(colony.id, commodityId);
    const available = storage?.amount ?? 0;
    const remaining =
      inProgress.remainingPoints ?? this.getPointsRequired(tech);
    const amount = Math.min(available, remaining);

    if (!storage || amount <= 0) {
      inProgress.blockedReason = 'MISSING_RESOURCE';
      await this.researchRepo.save(inProgress);
      return;
    }

    storage.amount -= amount;
    await this.storageRepo.save(storage);

    inProgress.spentPoints = (inProgress.spentPoints ?? 0) + amount;
    inProgress.progress = inProgress.spentPoints;
    inProgress.remainingPoints = remaining - amount;
    inProgress.blockedReason = null;
    inProgress.lastAdvancedAt = new Date();

    if (inProgress.remainingPoints <= 0) {
      inProgress.status = ResearchStatus.COMPLETED;
      inProgress.remainingPoints = 0;
      inProgress.finishesAt = null;
    }

    await this.researchRepo.save(inProgress);
  }

  private async getPrimaryColony(userId: number): Promise<Colony | null> {
    return this.colonyRepo.findOne({
      where: { userId },
      order: { id: 'ASC' },
    });
  }

  private async getStorage(colonyId: number, commodityId: number) {
    return this.storageRepo.findOne({ where: { colonyId, commodityId } });
  }

  private getPointsRequired(tech: TechDef): number {
    return tech.effort ?? (tech.duration ?? 1) * 10;
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
