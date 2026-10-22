import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Research, ResearchStatus } from './entities/research.entity';
import { GameDataService, TechDef } from '../game-data/game-data.service';
import { Faction, WsEventType } from '@swuniverse/shared';
import { MessagingService } from '../messaging/messaging.service';
import { MessageFolder } from '../messaging/message-folder';
import { GameGateway } from '../websocket/game.gateway';

const ROOT_TECH_IDS = new Set([1001, 1003]);
const MAX_QUEUE_SIZE = 10;

function isTechForFaction(tech: TechDef, faction: Faction | null): boolean {
  return !faction || tech.faction === 'SHARED' || tech.faction === faction;
}

@Injectable()
export class ResearchService {
  constructor(
    @InjectRepository(Research)
    private readonly researchRepo: Repository<Research>,
    private readonly gameData: GameDataService,
    private readonly messagingService: MessagingService,
    private readonly gameGateway: GameGateway,
  ) {}

  getTechTree(): TechDef[] {
    return this.gameData.getTechTree();
  }

  private getTechForFaction(
    techId: number,
    faction?: Faction | null,
  ): TechDef | undefined {
    if (!faction) return this.gameData.getTech(techId);
    return this.gameData
      .getTechTree()
      .find((tech) => tech.id === techId && isTechForFaction(tech, faction));
  }

  async getUserResearch(userId: number): Promise<Research[]> {
    return this.researchRepo.find({
      where: { userId },
      order: { techId: 'ASC' },
    });
  }

  async getResearchState(userId: number, faction?: Faction | null) {
    const techTree = this.gameData.getTechTree();
    const userResearch = await this.getUserResearch(userId);
    const completed = new Set(
      userResearch
        .filter((r) => r.status === ResearchStatus.COMPLETED)
        .map((r) => r.techId),
    );
    const exclusionSources = new Set(
      userResearch
        .filter((r) =>
          [
            ResearchStatus.IN_PROGRESS,
            ResearchStatus.QUEUED,
            ResearchStatus.COMPLETED,
          ].includes(r.status),
        )
        .map((r) => r.techId),
    );
    const excludedByStartedResearch = new Set<number>();
    for (const sourceTechId of exclusionSources) {
      const sourceTech = this.getTechForFaction(sourceTechId, faction ?? null);
      if (!sourceTech) continue;
      for (const dep of sourceTech.dependencies) {
        if (dep.type !== 'EXCLUDE') continue;
        for (const techId of dep.techIds) {
          excludedByStartedResearch.add(techId);
        }
      }
    }
    const visibleTechs = new Map<number, TechDef>();
    for (const tech of techTree) {
      if (tech.hidden || tech.excludeFromNormalProgression) continue;
      if (excludedByStartedResearch.has(tech.id)) continue;
      if (!isTechForFaction(tech, faction ?? null)) continue;
      if (
        ROOT_TECH_IDS.has(tech.id) &&
        !userResearch.some(
          (research) =>
            research.techId === tech.id &&
            research.status === ResearchStatus.COMPLETED,
        )
      ) {
        continue;
      }
      if (!visibleTechs.has(tech.id)) {
        visibleTechs.set(tech.id, tech);
      }
    }
    return [...visibleTechs.values()].map((tech) => {
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
          shipClasses: (tech.unlocks?.shipClasses ?? []).map((id) => {
            const definition = this.gameData
              .getShipClassDefs()
              .find((shipClass) => shipClass.stuRumpId === id);
            return {
              id,
              key: definition?.key,
              name: definition?.name ?? `Schiffsklasse #${id}`,
            };
          }),
          modules: (tech.unlocks?.modules ?? []).map((name) => {
            const item = this.gameData
              .getAllFabricationItems()
              .find(
                (candidate) =>
                  candidate.moduleType === name || candidate.displayName === name,
              );
            return {
              name: item?.displayName ?? name,
              commodityId: item?.outputCommodityId ?? null,
            };
          }),
          buildings: (tech.unlocks?.buildings ?? [])
            .filter(
              (
                b,
              ): b is Exclude<
                NonNullable<TechDef['unlocks']>['buildings'],
                undefined
              >[number] => typeof b === 'number' || b.visible !== false,
            )
            .map((b) => {
              const buildingId = typeof b === 'number' ? b : b.id;
              const def = this.gameData.getBuilding(buildingId);
              return {
                id: buildingId,
                name: typeof b === 'number' ? def?.name : (b.name ?? def?.name),
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
        completedAt: existing?.completedAt || null,
      };
    });
  }

  async startResearch(
    userId: number,
    techId: number,
    faction?: Faction | null,
  ): Promise<Research> {
    const tech = this.getTechForFaction(techId, faction ?? null);
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
    const queuedItems = userResearch.filter(
      (r) => r.status === ResearchStatus.QUEUED,
    );

    let targetStatus: ResearchStatus;
    let queuePosition: number | null = null;

    if (!inProgress) {
      targetStatus = ResearchStatus.IN_PROGRESS;
    } else if (queuedItems.length < MAX_QUEUE_SIZE) {
      targetStatus = ResearchStatus.QUEUED;
      queuePosition = this.getNextQueuePosition(queuedItems);
    } else {
      throw new BadRequestException('Research queue is full');
    }

    let research = userResearch.find((r) => r.techId === techId);
    if (research) {
      research.status = targetStatus;
      research.queuePosition = queuePosition;
      research.blockedReason = null;
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
        queuePosition,
        targetTechId: null,
      });
    }

    return this.researchRepo.save(research);
  }

  async queueTarget(
    userId: number,
    targetTechId: number,
    faction?: Faction | null,
  ): Promise<Research[]> {
    const tech = this.getTechForFaction(targetTechId, faction ?? null);
    if (!tech) throw new NotFoundException('Technology not found');
    if (ROOT_TECH_IDS.has(targetTechId)) {
      throw new BadRequestException('Cannot target root research');
    }

    const userResearch = await this.getUserResearch(userId);
    const completed = new Set(
      userResearch
        .filter((r) => r.status === ResearchStatus.COMPLETED)
        .map((r) => r.techId),
    );

    if (completed.has(targetTechId)) {
      throw new BadRequestException('Already researched');
    }

    const path = this.resolvePrerequisitePath(
      targetTechId,
      completed,
      faction ?? null,
    );
    if (path.length === 0) {
      throw new BadRequestException('No prerequisites needed');
    }

    // Clear existing queue
    await this.clearQueue(userId);

    const inProgress = userResearch.find(
      (r) => r.status === ResearchStatus.IN_PROGRESS,
    );

    const trimmedPath = path.slice(0, MAX_QUEUE_SIZE);
    const results: Research[] = [];

    for (let i = 0; i < trimmedPath.length; i++) {
      const techId = trimmedPath[i];
      const techDef = this.getTechForFaction(techId, faction ?? null)!;
      const isFirst = i === 0 && !inProgress;

      let research = userResearch.find((r) => r.techId === techId);
      if (research) {
        research.status = isFirst
          ? ResearchStatus.IN_PROGRESS
          : ResearchStatus.QUEUED;
        research.queuePosition = isFirst ? null : i;
        research.targetTechId = targetTechId;
        research.remainingPoints =
          research.remainingPoints ?? this.getPointsRequired(techDef);
      } else {
        research = this.researchRepo.create({
          userId,
          techId,
          status: isFirst ? ResearchStatus.IN_PROGRESS : ResearchStatus.QUEUED,
          progress: 0,
          remainingPoints: this.getPointsRequired(techDef),
          spentPoints: 0,
          sourceCommodityId:
            techDef.mappedCommodityId ?? techDef.commodityId ?? null,
          blockedReason: null,
          queuePosition: isFirst ? null : i,
          targetTechId,
        });
      }
      results.push(await this.researchRepo.save(research));
    }

    return results;
  }

  getQueuePreview(
    _userId: number,
    targetTechId: number,
    faction?: Faction | null,
  ): number[] {
    const tech = this.getTechForFaction(targetTechId, faction ?? null);
    if (!tech) throw new NotFoundException('Technology not found');
    // ponytail: sync method, no DB call needed — path resolution is pure game-data
    return this.resolvePrerequisitePath(
      targetTechId,
      new Set(),
      faction ?? null,
    );
  }

  async getQueuePreviewForUser(
    userId: number,
    targetTechId: number,
    faction?: Faction | null,
  ): Promise<TechDef[]> {
    const tech = this.getTechForFaction(targetTechId, faction ?? null);
    if (!tech) throw new NotFoundException('Technology not found');

    const userResearch = await this.getUserResearch(userId);
    const completed = new Set(
      userResearch
        .filter((r) => r.status === ResearchStatus.COMPLETED)
        .map((r) => r.techId),
    );

    const path = this.resolvePrerequisitePath(
      targetTechId,
      completed,
      faction ?? null,
    );
    return path
      .map((id) => this.getTechForFaction(id, faction ?? null))
      .filter((t): t is TechDef => t != null);
  }

  async clearQueue(userId: number): Promise<void> {
    const queued = await this.researchRepo.find({
      where: { userId, status: ResearchStatus.QUEUED },
    });
    for (const r of queued) {
      r.status = ResearchStatus.AVAILABLE;
      r.queuePosition = null;
      r.targetTechId = null;
      r.blockedReason = null;
    }
    if (queued.length > 0) {
      await this.researchRepo.save(queued);
    }
  }

  private resolvePrerequisitePath(
    targetId: number,
    completed: Set<number>,
    faction?: Faction | null,
  ): number[] {
    const needed: number[] = [];
    const visited = new Set<number>();
    const stack = [targetId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current) || completed.has(current)) continue;
      if (ROOT_TECH_IDS.has(current)) continue;
      visited.add(current);

      const tech = this.getTechForFaction(current, faction ?? null);
      if (!tech) continue;

      for (const dep of tech.dependencies) {
        if (dep.type === 'REQUIRE') {
          for (const id of dep.techIds) {
            if (
              this.getTechForFaction(id, faction ?? null) &&
              !completed.has(id) &&
              !visited.has(id)
            ) {
              stack.push(id);
            }
          }
        }
        if (dep.type === 'REQUIRE_SOME') {
          const alreadyDone = dep.techIds.find((id) => completed.has(id));
          if (!alreadyDone) {
            // Pick cheapest unresearched prerequisite
            const cheapest = dep.techIds
              .map((id) => ({
                id,
                tech: this.getTechForFaction(id, faction ?? null),
              }))
              .filter((t) => t.tech && !completed.has(t.id))
              .sort(
                (a, b) =>
                  this.getPointsRequired(a.tech!) -
                  this.getPointsRequired(b.tech!),
              )[0];
            if (cheapest) stack.push(cheapest.id);
          }
        }
      }

      needed.push(current);
    }

    return this.topologicalSort(needed, faction ?? null);
  }

  private topologicalSort(
    techIds: number[],
    faction?: Faction | null,
  ): number[] {
    const idSet = new Set(techIds);
    const inDegree = new Map<number, number>();
    const adjacency = new Map<number, number[]>();

    for (const id of techIds) {
      inDegree.set(id, 0);
      adjacency.set(id, []);
    }

    for (const id of techIds) {
      const tech = this.getTechForFaction(id, faction ?? null);
      if (!tech) continue;
      for (const dep of tech.dependencies) {
        if (dep.type === 'EXCLUDE') continue;
        for (const depId of dep.techIds) {
          if (idSet.has(depId)) {
            adjacency.get(depId)!.push(id);
            inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
          }
        }
      }
    }

    const queue: number[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const sorted: number[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      for (const next of adjacency.get(current) ?? []) {
        const newDeg = (inDegree.get(next) ?? 1) - 1;
        inDegree.set(next, newDeg);
        if (newDeg === 0) queue.push(next);
      }
    }

    return sorted;
  }

  private getNextQueuePosition(queuedItems: Research[]): number {
    if (queuedItems.length === 0) return 1;
    return Math.max(...queuedItems.map((r) => r.queuePosition ?? 0)) + 1;
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
    research.queuePosition = null;
    research.targetTechId = null;
    await this.researchRepo.save(research);

    if (wasActive) {
      await this.promoteQueued(userId);
    }

    await this.reorderQueue(userId);
    return research;
  }

  private async promoteQueued(userId: number): Promise<Research | null> {
    const queued = await this.researchRepo.find({
      where: { userId, status: ResearchStatus.QUEUED },
      order: { queuePosition: 'ASC' },
      take: 1,
    });
    if (queued.length === 0) return null;
    const next = queued[0];
    next.status = ResearchStatus.IN_PROGRESS;
    next.queuePosition = null;
    await this.researchRepo.save(next);
    return next;
  }

  private async reorderQueue(userId: number): Promise<void> {
    const queued = await this.researchRepo.find({
      where: { userId, status: ResearchStatus.QUEUED },
      order: { queuePosition: 'ASC' },
    });
    for (let i = 0; i < queued.length; i++) {
      queued[i].queuePosition = i + 1;
    }
    if (queued.length > 0) {
      await this.researchRepo.save(queued);
    }
  }

  async processTick(
    userId: number,
    _producedResearchPoints = 0,
    commodityProduction: Map<number, number> = new Map(),
  ): Promise<void> {
    let current = await this.researchRepo.findOne({
      where: { userId, status: ResearchStatus.IN_PROGRESS },
    });
    if (!current) {
      current = await this.promoteQueued(userId);
      if (!current) return;
    }

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
        current.completedAt = new Date();
        current.blockedReason = null;
        await this.researchRepo.save(current);
        await this.notifyCompletion(userId, current.id, currentTech);
        current = await this.promoteQueued(userId);
        if (
          current &&
          (this.gameData.getTech(current.techId)?.mappedCommodityId ??
            this.gameData.getTech(current.techId)?.commodityId ??
            null) !== commodityId
        ) {
          break;
        }
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
        current.completedAt = new Date();
        await this.researchRepo.save(current);
        await this.notifyCompletion(userId, current.id, currentTech);
        current = await this.promoteQueued(userId);
        if (
          current &&
          (this.gameData.getTech(current.techId)?.mappedCommodityId ??
            this.gameData.getTech(current.techId)?.commodityId ??
            null) !== commodityId
        ) {
          break;
        }
      } else {
        await this.researchRepo.save(current);
        current = null;
      }
    }
  }

  private async notifyCompletion(
    userId: number,
    researchId: number,
    tech: TechDef,
  ): Promise<void> {
    const message = `Forschung '${tech.name}' wurde abgeschlossen`;
    await this.messagingService.sendSystem(
      userId,
      message,
      message,
      `research-completed:${researchId}`,
      MessageFolder.COLONY,
    );
    this.gameGateway.emitToUser(userId, WsEventType.RESEARCH_COMPLETED, {
      techId: tech.id,
      name: tech.name,
    });
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
