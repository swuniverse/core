import { Injectable, Logger } from '@nestjs/common';
import { LayerKnowledgeStatus } from '@swuniverse/shared';
import { EntityManager } from 'typeorm';
import type { MaintenanceHandler } from '../tick/maintenance.service';
import { ExplorationState } from './entities/exploration-state.entity';
import { GalaxyField } from './entities/galaxy-field.entity';
import { LayerExploredEvent } from './entities/layer-explored-event.entity';
import { AwardService } from '../awards/award.service';
import { Layer } from './entities/layer.entity';
import { LayerKnowledge } from './entities/layer-knowledge.entity';

@Injectable()
export class LayerMapCycleService implements MaintenanceHandler {
  readonly name = 'layer-map-cycle';
  private readonly logger = new Logger(LayerMapCycleService.name);

  constructor(
    private readonly entityManager: EntityManager,
    private readonly awardService: AwardService,
  ) {}

  async run(now: Date): Promise<string> {
    const knownLayers = await this.entityManager.getRepository(LayerKnowledge).find({
      where: { status: LayerKnowledgeStatus.KNOWN },
      select: { userId: true, layerId: true },
    });
    let completed = 0;
    for (const knowledge of knownLayers) {
      const result = await this.completeLayer(
        knowledge.userId,
        knowledge.layerId,
        now,
      );
      if (!result.completed) continue;
      completed++;
      if (result.awardKey) {
        try {
          await this.awardService.grant(knowledge.userId, result.awardKey, {
            incrementExisting: true,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Award ${result.awardKey} for user ${knowledge.userId} on layer ${knowledge.layerId} failed: ${message}`,
          );
        }
      }
    }
    return `${completed} ${completed === 1 ? 'Ebene' : 'Ebenen'} vollständig erkundet`;
  }

  private async completeLayer(
    userId: number,
    layerId: number,
    completedAt: Date,
  ): Promise<{ completed: boolean; awardKey?: string | null }> {
    return this.entityManager.transaction(async (manager) => {
      const knowledgeRepo = manager.getRepository(LayerKnowledge);
      const knowledge = await knowledgeRepo.findOne({
        where: { userId, layerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!knowledge || knowledge.status !== LayerKnowledgeStatus.KNOWN) return { completed: false };

      const fieldCount = await manager.getRepository(GalaxyField).count({
        where: { layerId },
      });
      const explored = await manager
        .getRepository(ExplorationState)
        .createQueryBuilder('exploration')
        .select('COUNT(DISTINCT (exploration.cx, exploration.cy))', 'count')
        .where('exploration.userId = :userId AND exploration.layerId = :layerId', {
          userId,
          layerId,
        })
        .getRawOne<{ count: string }>();
      if (fieldCount === 0 || Number(explored?.count ?? 0) < fieldCount) return { completed: false };

      const transition = await knowledgeRepo.update(
        { userId, layerId, status: LayerKnowledgeStatus.KNOWN },
        { status: LayerKnowledgeStatus.EXPLORED, exploredAt: completedAt },
      );
      if ((transition.affected ?? 0) !== 1) return { completed: false };

      await manager.getRepository(ExplorationState).delete({ userId, layerId });
      const eventRepo = manager.getRepository(LayerExploredEvent);
      await eventRepo.save(eventRepo.create({ userId, layerId, completedAt }));
      const layer = await manager.getRepository(Layer).findOneBy({ id: layerId });
      return { completed: true, awardKey: layer?.awardKey };
    });
  }
}
