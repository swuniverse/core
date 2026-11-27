import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AnomalyRegistry } from './anomaly-registry';
import { Anomaly } from './entities/anomaly.entity';
import { berlinDay } from './seasonal-calendar';
import { SEASONAL_TYPES } from './seasonal-anomaly.service';

/** Winter event (1–24 Dec): ion storms and subspace ellipses rest while the bounty hunter is hunted. */
export function winterEventActive(now: Date = new Date()): boolean {
  const today = berlinDay(now),
    year = today.slice(0, 4);
  return today >= `${year}-12-01` && today < `${year}-12-25`;
}

@Injectable()
export class AnomalyService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly registry: AnomalyRegistry,
  ) {}

  async processTick(tickNumber: number): Promise<void> {
    const afterCommit: Array<() => void> = [];
    await this.dataSource.transaction(async (manager) => {
      // Serialize the complete anomaly phase, including creation on an empty map.
      await manager.query(
        "SELECT pg_advisory_xact_lock(hashtext('swu_anomaly_tick'))",
      );
      const inserted = await manager.query(
        'INSERT INTO "anomaly_tick_runs" ("tickNumber") VALUES ($1) ON CONFLICT DO NOTHING RETURNING "tickNumber"',
        [tickNumber],
      );
      if (inserted.length === 0) return;

      const repository = manager.getRepository(Anomaly);
      const winter = winterEventActive();
      const seasonal = new Set<string>(Object.keys(SEASONAL_TYPES));
      const anomalies = await repository.find({
        select: { id: true },
        order: { id: 'ASC' },
      });
      for (const { id } of anomalies) {
        const anomaly = await repository.findOne({
          where: { id },
          relations: ['type'],
        });
        if (!anomaly) continue;
        if (winter && !seasonal.has(anomaly.type.key)) {
          await repository.remove(anomaly);
          continue;
        }
        const handler = this.registry.get(anomaly.type.key);
        await handler.handleTick(anomaly, manager, { manager, afterCommit });
        anomaly.remainingTicks -= 1;
        if (anomaly.remainingTicks <= 0) {
          await handler.onDisappear(anomaly, manager);
          await repository.remove(anomaly);
        } else {
          await repository.save(anomaly);
        }
      }
      for (const handler of this.registry.all()) {
        if (winter && !seasonal.has(handler.key)) continue;
        await handler.checkForCreation(manager, { manager, afterCommit });
      }
    });
    for (const notify of afterCommit) notify();
  }
}
