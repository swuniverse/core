import { Injectable } from '@nestjs/common';
import { LayerKnowledgeStatus } from '@swuniverse/shared';
import { EntityManager } from 'typeorm';
import type { MaintenanceHandler } from '../tick/maintenance.service';
import { ExplorationState } from './entities/exploration-state.entity';
import { GalaxyField } from './entities/galaxy-field.entity';
import { LayerExploredEvent } from './entities/layer-explored-event.entity';
import { LayerKnowledge } from './entities/layer-knowledge.entity';

@Injectable()
export class LayerMapCycleService implements MaintenanceHandler {
  readonly name = 'layer-map-cycle';

  constructor(private readonly entityManager: EntityManager) {}

  async run(now: Date): Promise<string> {
    const knownLayers = await this.entityManager.getRepository(LayerKnowledge).find({
      where: { status: LayerKnowledgeStatus.KNOWN },
      select: { userId: true, layerId: true },
    });
    let completed = 0;
    for (const knowledge of knownLayers) {
      completed += await this.completeLayer(knowledge.userId, knowledge.layerId, now);
    }
    return `${completed} ${completed === 1 ? 'Ebene' : 'Ebenen'} vollständig erkundet`;
  }

  private async completeLayer(
    userId: number,
    layerId: number,
    completedAt: Date,
  ): Promise<number> {
    return this.entityManager.transaction(async (manager) => {
      const knowledgeRepo = manager.getRepository(LayerKnowledge);
      const knowledge = await knowledgeRepo.findOne({
        where: { userId, layerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!knowledge || knowledge.status !== LayerKnowledgeStatus.KNOWN) return 0;

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
      if (fieldCount === 0 || Number(explored?.count ?? 0) < fieldCount) return 0;

      const transition = await knowledgeRepo.update(
        { userId, layerId, status: LayerKnowledgeStatus.KNOWN },
        { status: LayerKnowledgeStatus.EXPLORED, exploredAt: completedAt },
      );
      if ((transition.affected ?? 0) !== 1) return 0;

      await manager.getRepository(ExplorationState).delete({ userId, layerId });
      const eventRepo = manager.getRepository(LayerExploredEvent);
      await eventRepo.save(eventRepo.create({ userId, layerId, completedAt }));
      return 1;
    });
  }
}
