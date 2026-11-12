import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import type { TransactionalNotifications } from '../messaging/messaging.service';
import type { Anomaly } from './entities/anomaly.entity';

export interface AnomalyHandler {
  readonly key: string;
  checkForCreation(manager: EntityManager, transaction?: TransactionalNotifications): Promise<void>;
  handleTick(anomaly: Anomaly, manager: EntityManager, transaction?: TransactionalNotifications): Promise<void>;
  handleIncomingSpacecraft(
    anomaly: Anomaly,
    spacecraft: Spacecraft,
    manager: EntityManager,
    transaction?: TransactionalNotifications,
  ): Promise<void>;
  onDisappear(anomaly: Anomaly, manager: EntityManager): Promise<void>;
}

@Injectable()
export class AnomalyRegistry {
  private readonly handlers = new Map<string, AnomalyHandler>();

  register(handler: AnomalyHandler): void {
    if (this.handlers.has(handler.key)) {
      throw new Error(`Anomaly handler already registered: ${handler.key}`);
    }
    this.handlers.set(handler.key, handler);
  }

  get(key: string): AnomalyHandler {
    const handler = this.handlers.get(key);
    if (!handler) throw new Error(`No anomaly handler registered: ${key}`);
    return handler;
  }

  all(): readonly AnomalyHandler[] {
    return [...this.handlers.values()];
  }
}
