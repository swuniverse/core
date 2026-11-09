import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LayerKnowledgeStatus,
  type LayerKnowledgeDto,
} from '@swuniverse/shared';
import { EntityManager, Repository } from 'typeorm';
import { LayerKnowledge } from './entities/layer-knowledge.entity';

@Injectable()
export class LayerKnowledgeService {
  constructor(
    @InjectRepository(LayerKnowledge)
    private readonly repository: Repository<LayerKnowledge>,
  ) {}

  async get(userId: number, layerId: number): Promise<LayerKnowledgeDto | null> {
    const knowledge = await this.repository.findOneBy({ userId, layerId });
    return knowledge ? this.toDto(knowledge) : null;
  }

  async markKnown(
    userId: number,
    layerId: number,
    knownAt = new Date(),
    manager?: EntityManager,
  ): Promise<LayerKnowledgeDto> {
    const repository = manager?.getRepository(LayerKnowledge) ?? this.repository;
    const current = await repository.findOneBy({ userId, layerId });
    if (!current) {
      const initial = {
        userId,
        layerId,
        status: LayerKnowledgeStatus.KNOWN,
        knownAt,
        exploredAt: null,
      };
      if (manager) {
        await repository.createQueryBuilder().insert().values(initial).orIgnore().execute();
      } else {
        await repository.upsert(initial, ['userId', 'layerId']);
      }
    }
    const knowledge = await repository.findOneBy({ userId, layerId });
    if (!knowledge) throw new Error('Layer knowledge was not persisted');
    return this.toDto(knowledge);
  }

  async markExplored(
    userId: number,
    layerId: number,
    exploredAt = new Date(),
  ): Promise<LayerKnowledgeDto> {
    const current = await this.repository.findOneBy({ userId, layerId });
    if (!current) {
      await this.repository.upsert(
        {
          userId,
          layerId,
          status: LayerKnowledgeStatus.EXPLORED,
          knownAt: exploredAt,
          exploredAt,
        },
        ['userId', 'layerId'],
      );
    } else if (current.status === LayerKnowledgeStatus.KNOWN) {
      await this.repository.upsert(
        { ...current, status: LayerKnowledgeStatus.EXPLORED, exploredAt },
        ['userId', 'layerId'],
      );
    }
    return (await this.get(userId, layerId))!;
  }

  private toDto(knowledge: LayerKnowledge): LayerKnowledgeDto {
    return {
      userId: knowledge.userId,
      layerId: knowledge.layerId,
      status: knowledge.status,
      knownAt: knowledge.knownAt.toISOString(),
      exploredAt: knowledge.exploredAt?.toISOString() ?? null,
    };
  }
}
