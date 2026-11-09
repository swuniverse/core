import { Injectable, Inject, Optional } from '@nestjs/common';
import type { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import type { SystemField } from '../starmap/entities/system-field.entity';
import type { Spacecraft } from './entities/spacecraft.entity';
import type { TransactionalNotifications } from '../messaging/messaging.service';

export type FlightConsequenceField = GalaxyField | SystemField;
const DESTROYED_STATUS = 'DESTROYED';

export interface FlightConsequence {
  onEnterField(
    ship: Spacecraft,
    field: FlightConsequenceField,
    messages: string[],
    transaction?: TransactionalNotifications,
  ): Promise<void> | void;
  onTick(ship: Spacecraft, field: FlightConsequenceField): Promise<void> | void;
}

export const FLIGHT_CONSEQUENCES = Symbol('FLIGHT_CONSEQUENCES');

@Injectable()
export class FlightConsequencePipeline {
  constructor(
    @Optional()
    @Inject(FLIGHT_CONSEQUENCES)
    private readonly consequences: FlightConsequence[] = [],
  ) {}

  async onEnterField(
    ship: Spacecraft,
    field: FlightConsequenceField,
    transaction?: TransactionalNotifications,
  ): Promise<string[]> {
    const messages: string[] = [];
    for (const consequence of this.consequences) {
      if (ship.status === DESTROYED_STATUS) break;
      await consequence.onEnterField(ship, field, messages, transaction);
    }
    return messages;
  }

  async onTick(ship: Spacecraft, field: FlightConsequenceField): Promise<void> {
    for (const consequence of this.consequences) {
      if (ship.status === DESTROYED_STATUS) break;
      await consequence.onTick(ship, field);
    }
  }
}
