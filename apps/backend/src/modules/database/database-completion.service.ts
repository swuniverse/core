import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  Faction,
  WsEventType,
  type DatabaseAwardCategory,
  type DatabaseCategoryProgressDto,
} from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { AwardService } from '../awards/award.service';
import { factionAwardKey } from '../awards/faction-awards';
import { DatabaseCategoryAward } from '../awards/entities/database-category-award.entity';
import { LayerAccessService } from '../starmap/layer-access.service';
import { GameGateway } from '../websocket/game.gateway';
import { DatabaseService } from './database.service';

type Progress = { discovered: number; total: number };

const FLAT_CATEGORIES = ['SHIP_HULLS', 'SHIP_HULLS_OLDTIMER', 'PLANET_TYPES', 'SYSTEM_TYPES'] as const;

/** Internal faction key of the wreck hulls; they have their own database award. */
const OLDTIMER_FACTION_KEY = 'OLDTIMER';

/**
 * STU `checkForCategoryCompletion`, category-neutral: compares a player's
 * discoveries with the database hub's denominators and grants the mapped
 * award once a category (star systems: per layer) is complete.
 */
@Injectable()
export class DatabaseCompletionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseCompletionService.name);

  constructor(
    @InjectRepository(DatabaseCategoryAward)
    private readonly mappingRepo: Repository<DatabaseCategoryAward>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly database: DatabaseService,
    private readonly awards: AwardService,
    private readonly gateway: GameGateway,
    private readonly layerAccess: LayerAccessService,
  ) {}

  /** New catalog entries (e.g. hulls) can make a completed category incomplete: re-check all holders. */
  async onApplicationBootstrap(): Promise<void> {
    try {
      const revoked = await this.revokeIncomplete();
      if (revoked > 0) this.logger.log(`Revoked ${revoked} outdated database awards`);
    } catch (error) {
      this.logger.error(
        `Database award re-check failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /** Grants every award of a category the player has completed but not been given yet. */
  async grantComplete(userId: number): Promise<string[]> {
    const granted: string[] = [];
    for (const category of [...FLAT_CATEGORIES, 'SYSTEMS'] as const) {
      granted.push(...(await this.checkCompletion(userId, category)));
    }
    return granted;
  }

  /**
   * Withdraws the awards of holders whose category is no longer complete (the denominator is
   * live). Effects end with the award; prestige stays, a re-grant pays it out again.
   */
  async revokeIncomplete(userIds?: number[]): Promise<number> {
    const mappings = await this.mappingRepo.find();
    let revoked = 0;
    for (const mapping of mappings) {
      const keys = [
        factionAwardKey(mapping.awardKey, Faction.REBEL_ALLIANCE),
        factionAwardKey(mapping.awardKey, Faction.GALACTIC_EMPIRE),
      ];
      for (const holder of await this.awards.findHolders(keys, userIds)) {
        const progress =
          mapping.layerId == null
            ? await this.flatProgress(
                holder.userId,
                mapping.category as (typeof FLAT_CATEGORIES)[number],
              )
            : await this.layerProgress(holder.userId, mapping.layerId);
        // No progress (layer not visible to the player) is not evidence of incompleteness.
        if (!progress || isComplete(progress)) continue;
        if (await this.awards.revoke(holder.userId, holder.awardKey)) revoked++;
      }
    }
    return revoked;
  }

  /**
   * Progress of every award category for the hub; star systems only for the
   * given (known) layers, all visible layers when omitted.
   */
  async progress(userId: number, layerIds?: number[]): Promise<DatabaseCategoryProgressDto[]> {
    await this.revokeIncomplete([userId]);
    await this.grantComplete(userId);
    const mappings = await this.mappingRepo.find();
    const faction = (await this.userRepo.findOneBy({ id: userId }))?.faction;
    const awardKey = (category: DatabaseAwardCategory, layerId: number | null) => {
      const stored = mappings.find(
        (mapping) => mapping.category === category && mapping.layerId === layerId,
      )?.awardKey;
      return stored ? factionAwardKey(stored, faction) : null;
    };
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
    for (const layer of (await this.database.getSystems(userId, layerIds)).layers) {
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
    // A hull discovery may complete either hull award (regular hulls or wrecks).
    if (category === 'SHIP_HULLS') {
      return [
        ...(await this.checkCategory(userId, 'SHIP_HULLS', layerId)),
        ...(await this.checkCategory(userId, 'SHIP_HULLS_OLDTIMER', layerId)),
      ];
    }
    return this.checkCategory(userId, category, layerId);
  }

  private async checkCategory(
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
      const awardKey = factionAwardKey(mapping.awardKey, user.faction);
      const result = await this.awards.grant(userId, awardKey);
      if (!result.granted) continue;
      granted.push(awardKey);
      this.gateway.emitToUser(userId, WsEventType.AWARD_GRANTED, {
        awardKey,
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
      category === 'SHIP_HULLS' || category === 'SHIP_HULLS_OLDTIMER'
        ? await this.hullView(userId, category === 'SHIP_HULLS_OLDTIMER')
        : category === 'PLANET_TYPES'
          ? await this.database.getPlanetTypes(userId, await this.knownLayerIds(userId))
          : await this.database.getSystemTypes(userId, await this.knownLayerIds(userId));
    // Count listed entries only: discoveries outside the catalog never count.
    const entries = view.entries as Array<{ discovered: boolean }>;
    return { discovered: entries.filter((entry) => entry.discovered).length, total: entries.length };
  }

  /**
   * Planet and system types count only on layers the player can reach, like the map catalog
   * (not the whole type list: an unreachable legacy layer must not block the award).
   */
  private async knownLayerIds(userId: number): Promise<number[]> {
    return (await this.layerAccess.getLayers({ sub: userId })).map((layer) => layer.id);
  }

  /** Hull catalog split by the OLDTIMER faction: wrecks vs. all other hulls. */
  private async hullView(userId: number, oldtimer: boolean) {
    const catalog = await this.database.getShipClasses(userId);
    const rows: Array<{ key: string }> = await this.userRepo.manager.query(
      `SELECT sc."key" FROM "ship_class_defs" sc
       JOIN "factions" f ON f."id" = sc."factionId" WHERE f."key" = $1`,
      [OLDTIMER_FACTION_KEY],
    );
    const oldtimerKeys = new Set(rows.map((row) => row.key));
    const entries = (catalog.entries as Array<{ key: string; discovered: boolean }>).filter(
      (entry) => oldtimerKeys.has(entry.key) === oldtimer,
    );
    return { entries };
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
