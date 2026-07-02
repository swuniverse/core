import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Research, ResearchStatus } from './entities/research.entity';
import { GameDataService, TechDef } from '../game-data/game-data.service';

const ROOT_TECH_IDS = new Set([1001, 1003]);

@Injectable()
export class ResearchService {
  constructor(
    @InjectRepository(Research)
    private readonly researchRepo: Repository<Research>,
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
        if (!ROOT_TECH_IDS.has(tech.id)) return true;
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
          unlocks: {
            ...tech.unlocks,
            buildings: (tech.unlocks?.buildings ?? [])
              .filter((b: any) => b.visible !== false)
              .map((b: any) => {
                const def = this.gameData.getBuilding(b.id);
                return {
                  id: b.id,
                  name: b.name ?? def?.name,
                  buildTime: def?.costs?.buildTime ?? 0,
                  resourceCosts: (def?.resourceCosts ?? []).map((c) => ({
                    ...c,
                    name:
                      this.gameData.getCommodity(c.commodityId)?.name ??
                      `#${c.commodityId}`,
                  })),
                  production: (def?.production ?? []).map((p) => ({
                    ...p,
                    name:
                      this.gameData.getCommodity(p.commodityId)?.name ??
                      `#${p.commodityId}`,
                  })),
                  epsProc: def?.epsProc ?? 0,
                  bevPro: def?.bevPro ?? 0,
                  bonuses: def?.bonuses ?? {
                    energy: 0,
                    population: 0,
                    storage: 0,
                  },
                };
              }),
          },
          finishesAt: existing?.finishesAt || null,
        };
      });
  }

  async startResearch(userId: number, techId: number): Promise<Research> {
    const tech = this.gameData.getTech(techId);
    if (!tech) throw new NotFoundException('Technology not found');
    if (ROOT_TECH_IDS.has(techId)) {
      throw new BadRequestException('Root research cannot be started manually');
    }

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

  async processTick(
    userId: number,
    _producedResearchPoints = 0,
    commodityProduction: Map<number, number> = new Map(),
  ): Promise<void> {
    const inProgress = await this.researchRepo.findOne({
      where: { userId, status: ResearchStatus.IN_PROGRESS },
    });
    if (!inProgress) return;

    const tech = this.gameData.getTech(inProgress.techId);
    if (!tech) return;

    const remaining =
      inProgress.remainingPoints ?? this.getPointsRequired(tech);
    if (remaining <= 0 || this.getPointsRequired(tech) <= 0) {
      inProgress.status = ResearchStatus.COMPLETED;
      inProgress.remainingPoints = 0;
      inProgress.blockedReason = null;
      inProgress.finishesAt = null;
      await this.researchRepo.save(inProgress);
      return;
    }

    const commodityId = tech.mappedCommodityId ?? tech.commodityId ?? null;
    const points =
      commodityId != null ? commodityProduction.get(commodityId) || 0 : 0;

    if (points <= 0) {
      inProgress.blockedReason =
        tech.researchMode === 'commodity'
          ? 'NO_COMMODITY_PRODUCTION'
          : 'NO_RESEARCH_PRODUCTION';
      await this.researchRepo.save(inProgress);
      return;
    }

    const amount = Math.min(Math.max(0, points), remaining);

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
