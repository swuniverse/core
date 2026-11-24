import { Inject, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  ExplorationState,
  ExplorationLevel,
} from './entities/exploration-state.entity';
import { SystemExploration } from './entities/system-exploration.entity';
import { StarSystem } from './entities/star-system.entity';
import { isNpcUser } from '../auth/non-npc-users';
import {
  DATABASE_DISCOVERY,
  type DatabaseDiscoveryPort,
} from '../database/database-discovery.port';
import { STU_PRESTIGE } from '../prestige/prestige.constants';
import { PrestigeService } from '../prestige/prestige.service';

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
    @Optional() private readonly prestigeService?: PrestigeService,
    @Optional()
    @Inject(DATABASE_DISCOVERY)
    private readonly databaseDiscovery?: DatabaseDiscoveryPort,
  ) {}

  /**
   * STU `checkDatabaseItem` for a star system outside cartography (e.g.
   * airfield start): a catalog system becomes a database entry with the
   * cartography prestige, once per player.
   */
  async discoverCatalogSystem(
    userId: number,
    system: Pick<StarSystem, 'id' | 'name' | 'layerId' | 'inDatabaseCatalog'>,
    source: string,
  ): Promise<boolean> {
    if (!system.inDatabaseCatalog) return false;
    const prestige = STU_PRESTIGE.CARTOGRAPHY_STARMAP;
    const awarded = await this.systemExplorationRepo.manager.transaction(
      async (manager) => {
        const result = await manager
          .createQueryBuilder()
          .insert()
          .into(SystemExploration)
          .values({ userId, starSystemId: system.id, discoverySource: source })
          .orIgnore()
          .returning('id')
          .execute();
        if (!result.raw.length || (await isNpcUser(manager, userId)))
          return false;
        await this.prestigeService?.change(
          userId,
          prestige,
          `${prestige} Prestige erhalten für den Datenbankeintrag des Sternensystems „${system.name}“`,
          manager,
        );
        return true;
      },
    );
    if (awarded) {
      await this.databaseDiscovery?.notify?.({
        userId,
        category: 'SYSTEMS',
        layerId: system.layerId,
        name: system.name,
        prestige,
      });
    }
    return awarded;
  }

  async discoverArea(input: DiscoverFieldsInput, manager?: EntityManager): Promise<number> {
    return this.discoverField(input, manager);
  }

  async discoverField(input: DiscoverFieldsInput, manager?: EntityManager): Promise<number> {
    const repository = manager?.getRepository(ExplorationState) ?? this.explorationRepo;
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

        const existing = await repository.findOne({
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
            await repository.save(existing);
            discovered++;
          } else {
            existing.lastSeenAt = now;
            await repository.save(existing);
          }
          continue;
        }

        await repository.save(
          repository.create({
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
