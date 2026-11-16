import type { EntityManager } from 'typeorm';
import type { AnomalyHandler } from './anomaly-registry';
import type { Anomaly } from './entities/anomaly.entity';
import {
  SEASONAL_TYPES,
  SeasonalAnomalyService,
  type SeasonalKey,
} from './seasonal-anomaly.service';
export class SeasonalAnomalyHandler implements AnomalyHandler {
  readonly name: string;
  constructor(
    readonly key: SeasonalKey,
    private readonly service: SeasonalAnomalyService,
  ) {
    this.name = SEASONAL_TYPES[key].name;
  }
  present(anomaly: Anomaly) {
    return { id: anomaly.id, canOpen: this.service.active(anomaly) };
  }
  checkForCreation(manager: EntityManager) {
    return this.service.checkForCreation(manager, this.key);
  }
  handleTick(anomaly: Anomaly, manager: EntityManager) {
    return this.service.handleTick(anomaly, manager);
  }
  async handleIncomingSpacecraft(): Promise<void> {
    /* Opening is explicit. */
  }
  async onDisappear(): Promise<void> {
    /* Calendar/opening history is durable. */
  }
}
