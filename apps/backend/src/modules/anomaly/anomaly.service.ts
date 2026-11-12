import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AnomalyRegistry } from './anomaly-registry';
import { Anomaly } from './entities/anomaly.entity';

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
        await handler.checkForCreation(manager, { manager, afterCommit });
      }
    });
    for (const notify of afterCommit) notify();
  }
}
