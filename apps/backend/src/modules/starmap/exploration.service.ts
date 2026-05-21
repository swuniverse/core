import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ExplorationState,
  ExplorationLevel,
} from './entities/exploration-state.entity';
import { SystemExploration } from './entities/system-exploration.entity';

export interface DiscoverFieldsInput {
  userId: number;
  layerId: number;
  cx: number;
  cy: number;
  radius?: number;
  level?: ExplorationLevel;
  source?: string;
}

export interface DiscoverSystemInput {
  userId: number;
  starSystemId: number;
  source?: string;
}

@Injectable()
export class ExplorationService {
  constructor(
    @InjectRepository(ExplorationState)
    private readonly explorationRepo: Repository<ExplorationState>,
    @InjectRepository(SystemExploration)
    private readonly systemExplorationRepo: Repository<SystemExploration>,
  ) {}

  async discoverArea(input: DiscoverFieldsInput): Promise<number> {
    return this.discoverField(input);
  }

  async discoverField(input: DiscoverFieldsInput): Promise<number> {
    const radius = input.radius ?? 0;
    const level = input.level ?? ExplorationLevel.TERRAIN;
    let discovered = 0;
    const now = new Date();

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;

        const cx = input.cx + dx;
        const cy = input.cy + dy;
        if (cx < 1 || cy < 1) continue;

        const existing = await this.explorationRepo.findOne({
          where: { userId: input.userId, layerId: input.layerId, cx, cy },
        });

        if (existing) {
          if (
            level === ExplorationLevel.FULL &&
            existing.explorationLevel === ExplorationLevel.TERRAIN
          ) {
            existing.explorationLevel = ExplorationLevel.FULL;
            existing.discoverySource = input.source ?? existing.discoverySource;
            existing.lastSeenAt = now;
            await this.explorationRepo.save(existing);
            discovered++;
          } else {
            existing.lastSeenAt = now;
            await this.explorationRepo.save(existing);
          }
          continue;
        }

        await this.explorationRepo.save(
          this.explorationRepo.create({
            userId: input.userId,
            layerId: input.layerId,
            cx,
            cy,
            explorationLevel: level,
            discoverySource: input.source ?? null,
          }),
        );
        discovered++;
      }
    }

    return discovered;
  }

  async discoverSystem(input: DiscoverSystemInput): Promise<void> {
    const existing = await this.systemExplorationRepo.findOne({
      where: { userId: input.userId, starSystemId: input.starSystemId },
    });
    if (existing) return;

    await this.systemExplorationRepo.save(
      this.systemExplorationRepo.create({
        userId: input.userId,
        starSystemId: input.starSystemId,
        discoverySource: input.source ?? null,
      }),
    );
  }

  async getExploredFields(
    userId: number,
    layerId: number,
  ): Promise<ExplorationState[]> {
    return this.explorationRepo.find({ where: { userId, layerId } });
  }

  async getExploredFieldsInSector(
    userId: number,
    layerId: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
  ): Promise<ExplorationState[]> {
    return this.explorationRepo
      .createQueryBuilder('e')
      .where('e."userId" = :userId', { userId })
      .andWhere('e."layerId" = :layerId', { layerId })
      .andWhere('e.cx BETWEEN :minX AND :maxX', { minX, maxX })
      .andWhere('e.cy BETWEEN :minY AND :maxY', { minY, maxY })
      .getMany();
  }

  async isSystemExplored(
    userId: number,
    starSystemId: number,
  ): Promise<boolean> {
    const count = await this.systemExplorationRepo.count({
      where: { userId, starSystemId },
    });
    return count > 0;
  }

  async getExploredSystems(userId: number): Promise<SystemExploration[]> {
    return this.systemExplorationRepo.find({ where: { userId } });
  }

  async shareWithAlliance(
    fromUserId: number,
    toUserIds: number[],
    layerId: number,
  ): Promise<number> {
    const explored = await this.explorationRepo.find({
      where: { userId: fromUserId, layerId },
    });

    let shared = 0;
    for (const targetUserId of toUserIds) {
      for (const state of explored) {
        const existing = await this.explorationRepo.findOne({
          where: {
            userId: targetUserId,
            layerId: state.layerId,
            cx: state.cx,
            cy: state.cy,
          },
        });
        if (!existing) {
          await this.explorationRepo.save(
            this.explorationRepo.create({
              userId: targetUserId,
              layerId: state.layerId,
              cx: state.cx,
              cy: state.cy,
              explorationLevel: state.explorationLevel,
              discoverySource: 'alliance_share',
            }),
          );
          shared++;
        }
      }
    }
    return shared;
  }

  async discoverAllForAdmin(
    userId: number,
    layerId: number,
    width: number,
    height: number,
  ): Promise<number> {
    const existing = await this.explorationRepo.count({
      where: { userId, layerId },
    });
    if (existing > 0) return 0;

    const rows: ExplorationState[] = [];
    for (let cy = 1; cy <= height; cy++) {
      for (let cx = 1; cx <= width; cx++) {
        rows.push(
          this.explorationRepo.create({
            userId,
            layerId,
            cx,
            cy,
            explorationLevel: ExplorationLevel.FULL,
            discoverySource: 'admin',
          }),
        );
      }
    }
    await this.explorationRepo.save(rows, { chunk: 1000 });
    return rows.length;
  }
}
