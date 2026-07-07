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

    const alreadyQueued = userResearch.find(
      (r) =>
        r.techId === techId &&
        (r.status === ResearchStatus.IN_PROGRESS ||
          r.status === ResearchStatus.QUEUED),
    );
    if (alreadyQueued) {
      throw new BadRequestException('Already in research queue');
    }

    const inProgress = userResearch.find(
      (r) => r.status === ResearchStatus.IN_PROGRESS,
    );
    const queued = userResearch.find(
      (r) => r.status === ResearchStatus.QUEUED,
    );

    let targetStatus: ResearchStatus;
    if (!inProgress) {
      targetStatus = ResearchStatus.IN_PROGRESS;
    } else if (!queued) {
      const activeCommodityId = inProgress.sourceCommodityId;
      const newCommodityId = tech.mappedCommodityId ?? tech.commodityId ?? null;
      if (activeCommodityId !== newCommodityId) {
        throw new BadRequestException(
          'Queued research must use the same research point type as active research',
        );
      }
      targetStatus = ResearchStatus.QUEUED;
    } else {
      throw new BadRequestException('Research queue is full');
    }

    let research = userResearch.find((r) => r.techId === techId);
    if (research) {
      research.status = targetStatus;
      research.remainingPoints =
        research.remainingPoints ?? this.getPointsRequired(tech);
    } else {
      research = this.researchRepo.create({
        userId,
        techId,
        status: targetStatus,
        progress: 0,
        remainingPoints: this.getPointsRequired(tech),
        spentPoints: 0,
        sourceCommodityId: tech.mappedCommodityId ?? tech.commodityId ?? null,
        blockedReason: null,
      });
    }

    return this.researchRepo.save(research);
  }

  async cancelResearch(userId: number, techId?: number): Promise<Research> {
    let research: Research | null;

    if (techId) {
      research = await this.researchRepo.findOne({
        where: [
          { userId, techId, status: ResearchStatus.IN_PROGRESS },
          { userId, techId, status: ResearchStatus.QUEUED },
        ],
      });
    } else {
      research = await this.researchRepo.findOne({
        where: { userId, status: ResearchStatus.IN_PROGRESS },
      });
    }

    if (!research) {
      throw new BadRequestException('No active research to cancel');
    }

    const wasActive = research.status === ResearchStatus.IN_PROGRESS;
    research.status = ResearchStatus.AVAILABLE;
    research.blockedReason = null;
    await this.researchRepo.save(research);

    if (wasActive) {
      await this.promoteQueued(userId);
    }

    return research;
  }

  private async promoteQueued(userId: number): Promise<Research | null> {
    const queued = await this.researchRepo.findOne({
      where: { userId, status: ResearchStatus.QUEUED },
    });
    if (!queued) return null;
    queued.status = ResearchStatus.IN_PROGRESS;
    await this.researchRepo.save(queued);
    return queued;
  }

  async processTick(
    userId: number,
    _producedResearchPoints = 0,
    commodityProduction: Map<number, number> = new Map(),
  ): Promise<void> {
    let current = await this.researchRepo.findOne({
      where: { userId, status: ResearchStatus.IN_PROGRESS },
    });
    if (!current) return;

    const tech = this.gameData.getTech(current.techId);
    if (!tech) return;

    const commodityId = tech.mappedCommodityId ?? tech.commodityId ?? null;
    const totalPoints =
      commodityId != null ? commodityProduction.get(commodityId) || 0 : 0;

    if (totalPoints <= 0) {
      current.blockedReason =
        tech.researchMode === 'commodity'
          ? 'NO_COMMODITY_PRODUCTION'
          : 'NO_RESEARCH_PRODUCTION';
      await this.researchRepo.save(current);
      return;
    }

    let leftover = totalPoints;

    while (leftover > 0 && current) {
      const currentTech = this.gameData.getTech(current.techId);
      if (!currentTech) break;

      const remaining =
        current.remainingPoints ?? this.getPointsRequired(currentTech);

      if (remaining <= 0) {
        current.status = ResearchStatus.COMPLETED;
        current.remainingPoints = 0;
        current.finishesAt = null;
        current.blockedReason = null;
        await this.researchRepo.save(current);
        current = await this.promoteQueued(userId);
        continue;
      }

      const applied = Math.min(leftover, remaining);
      leftover -= applied;

      current.spentPoints = (current.spentPoints ?? 0) + applied;
      current.progress = current.spentPoints;
      current.remainingPoints = remaining - applied;
      current.blockedReason = null;
      current.lastAdvancedAt = new Date();

      if (current.remainingPoints <= 0) {
        current.status = ResearchStatus.COMPLETED;
        current.remainingPoints = 0;
        current.finishesAt = null;
        await this.researchRepo.save(current);
        current = leftover > 0 ? await this.promoteQueued(userId) : null;
      } else {
        await this.researchRepo.save(current);
        current = null;
      }
    }
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
