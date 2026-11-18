import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, MoreThan } from 'typeorm';
import {
  SHIELD_REGENERATION_INTERVAL_MS,
  WsEventType,
} from '@swuniverse/shared';
import { Spacecraft } from './entities/spacecraft.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { Anomaly } from '../anomaly/entities/anomaly.entity';
import { GameGateway } from '../websocket/game.gateway';
import { initializeSpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';
import { spacecraftShieldRegenerationRate } from './spacecraft-shield-regeneration';

/** Minute polling, with a separate persistent 15-minute timer for every ship. */
@Injectable()
export class SpacecraftShieldRegenerationService {
  private readonly logger = new Logger(
    SpacecraftShieldRegenerationService.name,
  );
  constructor(
    private readonly db: DataSource,
    private readonly gateway: GameGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  async handleScheduledRegeneration(): Promise<void> {
    await this.regenerate();
  }

  async regenerate(now = Date.now()): Promise<number> {
    const ids = await this.db
      .getRepository(Spacecraft)
      .createQueryBuilder('ship')
      .select('ship.id', 'id')
      .where('ship.shields < ship.shieldsMax AND ship.shieldsMax > 0')
      .andWhere('ship.status NOT IN (:...excluded)', {
        excluded: ['DESTROYED', 'UNDER_CONSTRUCTION', 'UNDER_SCRAPPING'],
      })
      .andWhere('ship.rpgHidden = false')
      .andWhere(`ship."runtimeSystems" -> 'SHIELDS' ->> 'active' = 'false'`)
      .andWhere(
        `CASE
        WHEN jsonb_typeof(ship."runtimeSystems" -> 'SHIELDS' -> 'regenerationStartedAt') = 'number'
          THEN (ship."runtimeSystems" -> 'SHIELDS' ->> 'regenerationStartedAt')::numeric
        WHEN ship."runtimeSystems" -> 'SHIELDS' ->> 'regenerationStartedAt' IS NULL THEN 0
        ELSE NULL END <= :threshold`,
        { threshold: now - SHIELD_REGENERATION_INTERVAL_MS },
      )
      .orderBy('ship.id', 'ASC')
      .getRawMany<{ id: number }>();
    let changed = 0;
    for (const { id } of ids) {
      // One broken ship must not stop regeneration for every later ship each minute.
      const result = await this.regenerateOne(id, now).catch(
        (error: unknown) => {
          this.logger.error(
            `Shield regeneration failed for spacecraft ${id}`,
            error,
          );
          return null;
        },
      );
      if (!result) continue;
      changed++;
      this.gateway.emitToUser(result.userId, WsEventType.SPACECRAFT_EVENT, {
        shipId: result.shipId,
        type: 'SHIELDS_REGENERATED',
        detail: `Schilde regeneriert: +${result.gain}`,
      });
    }
    if (changed)
      this.logger.debug(`Shields regenerated for ${changed} spacecraft`);
    return changed;
  }

  private regenerateOne(id: number, now: number) {
    return this.db.transaction(async (manager) => {
      // Re-read eligibility under the row lock: repeated/multi-process runs
      // cannot credit the same period twice, and contested ships are skipped.
      const ship = await manager.findOne(Spacecraft, {
        where: { id },
        relations: [
          'modules',
          'location',
          'location.galaxyField',
          'location.galaxyField.fieldType',
          'location.systemField',
          'location.systemField.fieldType',
        ],
        lock: {
          mode: 'pessimistic_write',
          tables: ['spacecraft'],
          onLocked: 'skip_locked',
        },
      });
      if (!ship) return null;
      initializeSpacecraftRuntimeSystems(ship);
      const crew = await manager.count(CrewAssignment, {
        where: { spacecraftId: ship.id },
      });
      const anomalies =
        ship.locationId == null
          ? []
          : await manager.find(Anomaly, {
              where: {
                locationId: ship.locationId,
                remainingTicks: MoreThan(0),
              },
              relations: ['type'],
            });
      const gain = spacecraftShieldRegenerationRate(
        ship,
        crew,
        Math.max(0, ship.crewRequired ?? 0),
        anomalies.map((entry) => entry.type.key),
        now,
      );
      if (gain === 0) return null;
      ship.shields += gain;
      const system = ship.runtimeSystems!.SHIELDS as {
        regenerationStartedAt: number;
        current: number;
      };
      system.regenerationStartedAt = now;
      system.current = ship.shields;
      await manager.update(Spacecraft, ship.id, {
        shields: ship.shields,
        runtimeSystems: ship.runtimeSystems,
      });
      return { userId: ship.userId, shipId: ship.id, gain };
    });
  }
}
