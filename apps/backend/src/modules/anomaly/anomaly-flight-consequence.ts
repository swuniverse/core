import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AnomalyRegistry } from './anomaly-registry';
import { Anomaly } from './entities/anomaly.entity';
import { Spacecraft as SpacecraftEntity } from '../spacecraft/entities/spacecraft.entity';
import type { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import type { FlightConsequence, FlightConsequenceField } from '../spacecraft/flight-consequence-pipeline';
import type { TransactionalNotifications } from '../messaging/messaging.service';

@Injectable()
export class AnomalyFlightConsequence implements FlightConsequence {
  constructor(private readonly dataSource: DataSource, private readonly registry: AnomalyRegistry) {}

  async onEnterField(ship: Spacecraft, _field: FlightConsequenceField, _messages: string[], transaction?: TransactionalNotifications): Promise<void> {
    if (transaction) {
      await this.apply(ship, transaction.manager, transaction);
      return;
    }
    if (!(await this.dataSource.getRepository(Anomaly).exists({ where: { locationId: ship.locationId } }))) return;
    const afterCommit: Array<() => void> = [];
    await this.dataSource.transaction(async (manager) => {
      const stored = await manager.getRepository(SpacecraftEntity).findOneOrFail({
        where: { id: ship.id }, lock: { mode: 'pessimistic_write' },
      });
      if (stored.locationId !== ship.locationId) return;
      await this.apply(stored, manager, { manager, afterCommit });
      ship.shields = stored.shields;
      ship.runtimeSystems = stored.runtimeSystems;
    });
    for (const notify of afterCommit) notify();
  }

  async onTick(): Promise<void> {
    // Ellipse tick effects are processed by the anomaly lifecycle.
  }

  private async apply(ship: Spacecraft, manager: EntityManager, transaction: TransactionalNotifications): Promise<void> {
    const anomalies = await manager.getRepository(Anomaly).find({
      where: { locationId: ship.locationId }, relations: ['type'], order: { id: 'ASC' },
    });
    for (const anomaly of anomalies) {
      await this.registry.get(anomaly.type.key).handleIncomingSpacecraft(anomaly, ship, manager, transaction);
    }
  }
}
