import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  WsEventType,
  type DatabaseAwardCategory,
  type DatabaseCategoryProgressDto,
} from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { AwardService } from '../awards/award.service';
import { DatabaseCategoryAward } from '../awards/entities/database-category-award.entity';
import { GameGateway } from '../websocket/game.gateway';
import { DatabaseService } from './database.service';

type Progress = { discovered: number; total: number };

const FLAT_CATEGORIES = ['SHIP_HULLS', 'PLANET_TYPES', 'SYSTEM_TYPES'] as const;

/**
 * STU `checkForCategoryCompletion`, category-neutral: compares a player's
 * discoveries with the database hub's denominators and grants the mapped
 * award once a category (star systems: per layer) is complete.
 */
@Injectable()
export class DatabaseCompletionService {
  constructor(
    @InjectRepository(DatabaseCategoryAward)
    private readonly mappingRepo: Repository<DatabaseCategoryAward>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly database: DatabaseService,
    private readonly awards: AwardService,
    private readonly gateway: GameGateway,
  ) {}

  /** Progress of every award category for the hub; star systems per visible layer. */
  async progress(userId: number): Promise<DatabaseCategoryProgressDto[]> {
    const mappings = await this.mappingRepo.find();
    const awardKey = (category: DatabaseAwardCategory, layerId: number | null) =>
      mappings.find((mapping) => mapping.category === category && mapping.layerId === layerId)
        ?.awardKey ?? null;
    const rows: Array<Omit<DatabaseCategoryProgressDto, 'awarded'>> = [];
    for (const category of FLAT_CATEGORIES) {
      const progress = await this.flatProgress(userId, category);
      rows.push({
        category,
        layerId: null,
        layerName: null,
        ...progress,
        completed: isComplete(progress),
        awardKey: awardKey(category, null),
      });
    }
    for (const layer of (await this.database.getSystems(userId)).layers) {
      const progress = systemsProgress(layer.entries);
      rows.push({
        category: 'SYSTEMS',
        layerId: layer.id,
        layerName: layer.name,
        ...progress,
        completed: isComplete(progress),
        awardKey: awardKey('SYSTEMS', layer.id),
      });
    }
    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        awarded: row.awardKey != null && (await this.awards.hasAward(userId, row.awardKey)),
      })),
    );
  }

  /**
   * Grants the award of a complete category; without a layer, star systems
   * check every mapped layer (STU). Returns the newly granted award keys.
   */
  async checkCompletion(
    userId: number,
    category: DatabaseAwardCategory,
    layerId?: number | null,
  ): Promise<string[]> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user || user.isNpc) return [];
    const mappings = await this.mappingRepo.find({
      where:
        category === 'SYSTEMS' && layerId == null
          ? { category }
          : { category, layerId: layerId ?? IsNull() },
      relations: ['award'],
      order: { layerId: 'ASC' },
    });
    const granted: string[] = [];
    for (const mapping of mappings) {
      const progress =
        mapping.layerId == null
          ? await this.flatProgress(userId, mapping.category as (typeof FLAT_CATEGORIES)[number])
          : await this.layerProgress(userId, mapping.layerId);
      if (!progress || !isComplete(progress)) continue;
      const result = await this.awards.grant(userId, mapping.awardKey);
      if (!result.granted) continue;
      granted.push(mapping.awardKey);
      this.gateway.emitToUser(userId, WsEventType.AWARD_GRANTED, {
        awardKey: mapping.awardKey,
        description: mapping.award.description,
      });
    }
    return granted;
  }

  private async flatProgress(
    userId: number,
    category: (typeof FLAT_CATEGORIES)[number],
  ): Promise<Progress> {
    const view =
      category === 'SHIP_HULLS'
        ? await this.database.getShipClasses(userId)
        : category === 'PLANET_TYPES'
          ? await this.database.getPlanetTypes(userId)
          : await this.database.getSystemTypes(userId);
    // Count listed entries only: discoveries outside the catalog never count.
    const entries = view.entries as Array<{ discovered: boolean }>;
    return { discovered: entries.filter((entry) => entry.discovered).length, total: entries.length };
  }

  private async layerProgress(userId: number, layerId: number): Promise<Progress | null> {
    const layer = (await this.database.getSystems(userId, [layerId])).layers[0];
    return layer ? systemsProgress(layer.entries) : null;
  }
}

function systemsProgress(entries: Array<{ discovered: boolean }>): Progress {
  return { discovered: entries.filter((entry) => entry.discovered).length, total: entries.length };
}

function isComplete(progress: Progress): boolean {
  return progress.total > 0 && progress.discovered >= progress.total;
}
