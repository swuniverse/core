import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { StarmapInfluenceAreaDto } from '@swuniverse/shared';
import { Alliance } from '../alliance/entities/alliance.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { InfluenceArea, InfluenceSourceType } from './entities/influence-area.entity';

export interface InfluenceSource {
  sourceType: InfluenceSourceType;
  sourceId: number;
  layerId: number;
  cx: number;
  cy: number;
  radius: number;
  strength: number;
}

export interface FieldInfluence {
  cx: number;
  cy: number;
  sourceType: InfluenceSourceType;
  sourceId: number;
  strength: number;
}

@Injectable()
export class InfluenceService {
  constructor(
    @InjectRepository(InfluenceArea)
    private readonly influenceRepo: Repository<InfluenceArea>,
    @InjectRepository(Alliance)
    private readonly allianceRepo: Repository<Alliance>,
    @InjectRepository(FactionEntity)
    private readonly factionRepo: Repository<FactionEntity>,
  ) {}

  async calculateInfluenceForLayer(
    layerId: number,
    sources: InfluenceSource[],
  ): Promise<number> {
    await this.influenceRepo.delete({ layerId });

    const entries: InfluenceArea[] = [];
    for (const source of sources) {
      if (source.layerId !== layerId) continue;

      for (let dy = -source.radius; dy <= source.radius; dy++) {
        for (let dx = -source.radius; dx <= source.radius; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > source.radius) continue;

          const cx = source.cx + dx;
          const cy = source.cy + dy;
          if (cx < 1 || cy < 1) continue;

          const falloff = 1 - dist / (source.radius + 1);
          const strength = source.strength * falloff;

          entries.push(
            this.influenceRepo.create({
              layerId,
              cx,
              cy,
              sourceType: source.sourceType,
              sourceId: source.sourceId,
              radius: source.radius,
              strength,
            }),
          );
        }
      }
    }

    if (entries.length > 0) {
      await this.influenceRepo.save(entries, { chunk: 1000 });
    }
    return entries.length;
  }

  async getInfluenceInSector(
    layerId: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
  ): Promise<StarmapInfluenceAreaDto[]> {
    const areas = await this.influenceRepo
      .createQueryBuilder('ia')
      .where('ia."layerId" = :layerId', { layerId })
      .andWhere('ia.cx BETWEEN :minX AND :maxX', { minX, maxX })
      .andWhere('ia.cy BETWEEN :minY AND :maxY', { minY, maxY })
      .getMany();

    const allianceIds = [
      ...new Set(
        areas
          .filter((area) => area.sourceType === InfluenceSourceType.ALLIANCE)
          .map((area) => area.sourceId),
      ),
    ];
    const factionIds = [
      ...new Set(
        areas
          .filter((area) => area.sourceType === InfluenceSourceType.FACTION)
          .map((area) => area.sourceId),
      ),
    ];
    const [alliances, factions] = await Promise.all([
      allianceIds.length
        ? this.allianceRepo.find({ where: { id: In(allianceIds) }, relations: ['faction'] })
        : [],
      factionIds.length ? this.factionRepo.findBy({ id: In(factionIds) }) : [],
    ]);
    const allianceColors = new Map(
      alliances.map((alliance) => [
        alliance.id,
        alliance.color ?? alliance.faction.colorPrimary,
      ]),
    );
    const factionColors = new Map(
      factions.map((faction) => [faction.id, faction.colorPrimary]),
    );

    return areas.map((area) => ({
      cx: area.cx,
      cy: area.cy,
      sourceType: area.sourceType,
      sourceId: area.sourceId,
      strength: area.strength,
      color:
        area.sourceType === InfluenceSourceType.ALLIANCE
          ? allianceColors.get(area.sourceId) ?? '#64748b'
          : factionColors.get(area.sourceId) ?? '#64748b',
    }));
  }

  async getDominantInfluence(
    layerId: number,
    cx: number,
    cy: number,
  ): Promise<FieldInfluence | null> {
    const areas = await this.influenceRepo.find({
      where: { layerId, cx, cy },
      order: { strength: 'DESC' },
      take: 1,
    });
    if (areas.length === 0) return null;
    const a = areas[0];
    return {
      cx: a.cx,
      cy: a.cy,
      sourceType: a.sourceType,
      sourceId: a.sourceId,
      strength: a.strength,
    };
  }

  async clearLayerInfluence(layerId: number): Promise<number> {
    const result = await this.influenceRepo.delete({ layerId });
    return result.affected ?? 0;
  }
}
