import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LayerKnowledgeStatus,
  type LayerKnowledgeDto,
} from '@swuniverse/shared';
import { Repository } from 'typeorm';
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
  ): Promise<LayerKnowledgeDto> {
    const current = await this.repository.findOneBy({ userId, layerId });
    if (!current) {
      await this.repository.upsert(
        {
          userId,
          layerId,
          status: LayerKnowledgeStatus.KNOWN,
          knownAt,
          exploredAt: null,
        },
        ['userId', 'layerId'],
      );
    }
    return (await this.get(userId, layerId))!;
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
