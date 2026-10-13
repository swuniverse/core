import { Injectable } from '@nestjs/common';
import type { ColonyTickEvent } from '@swuniverse/shared';
import { EntityManager, QueryDeepPartialEntity, Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { MessageFolder } from './message-folder';
import {
  ColonyEventSeverity,
  ColonyEventType,
  CreateColonyEventInput,
} from './colony-event.types';

@Injectable()
export class ColonyEventService {
  constructor(private readonly messageRepo: Repository<Message>) {}

  async createTickEvents(
    colonyId: number,
    userId: number,
    events: ColonyTickEvent[],
    tickId?: number | null,
  ): Promise<Message[]> {
    const created: Message[] = [];
    for (const event of events) {
      created.push(
        await this.createActionEvent({
          colonyId,
          userId,
          tickId: tickId ?? null,
          ...this.formatTickEvent(event),
        }),
      );
    }
    return created;
  }

  async createActionEvent(
    input: CreateColonyEventInput,
    manager?: EntityManager,
  ): Promise<Message> {
    const repository = manager?.getRepository(Message) ?? this.messageRepo;
    const deliveryKey =
      input.originEventId == null
        ? null
        : `colony-event:${input.originEventId}`;
    const values = {
      senderId: input.userId,
      recipientId: input.userId,
      subject: input.title,
      body: input.message,
      isSystem: true,
      folder: MessageFolder.COLONY,
      deliveryKey,
      originKind: 'COLONY_EVENT',
      originEventId: input.originEventId ?? null,
      originEventType: input.type,
      originSeverity: input.severity ?? ColonyEventSeverity.INFO,
      originColonyId: input.colonyId,
      originPayload: input.payload ?? {},
      originTickId: input.tickId ?? null,
    };
    if (!deliveryKey) return repository.save(repository.create(values));

    const inserted = await repository
      .createQueryBuilder()
      .insert()
      .into(Message)
      .values(values as QueryDeepPartialEntity<Message>)
      .orIgnore()
      .returning('*')
      .execute();
    const insertedId = inserted.identifiers[0]?.id as number | undefined;
    if (insertedId !== undefined) {
      const message = await repository.findOneBy({ id: insertedId });
      if (message) return message;
    }
    const existing = await repository.findOneBy({ deliveryKey });
    if (!existing) {
      throw new Error('Colony event delivery key was not persisted');
    }
    return existing;
  }

  private formatTickEvent(
    event: ColonyTickEvent,
  ): Omit<CreateColonyEventInput, 'colonyId' | 'userId'> {
    switch (event.type) {
      case 'BUILDING_DEACTIVATED':
        return {
          type: ColonyEventType.BUILDING_DEACTIVATED,
          severity: ColonyEventSeverity.WARNING,
          title: 'Gebäude deaktiviert',
          message: `${event.buildingName ?? 'Gebäude'} wurde deaktiviert (${event.reason ?? 'Mangel'}).`,
          payload: { ...event },
        };
      case 'STORAGE_FULL':
        return {
          type: ColonyEventType.STORAGE_FULL,
          severity: ColonyEventSeverity.WARNING,
          title: 'Lager voll',
          message: 'Das Lager der Kolonie ist voll.',
          payload: { ...event },
        };
      case 'BUILDING_FINISHED':
        return {
          type: ColonyEventType.BUILDING_FINISHED,
          severity: ColonyEventSeverity.INFO,
          title: 'Gebäude fertiggestellt',
          message: event.activated
            ? `${event.buildingName ?? 'Gebäude'} wurde fertiggestellt und aktiviert.`
            : `${event.buildingName ?? 'Gebäude'} wurde fertiggestellt, aber nicht aktiviert (${event.reason ?? 'Grund unbekannt'}).`,
          payload: { ...event },
        };
      case 'TERRAFORMING_FINISHED':
        return {
          type: ColonyEventType.TERRAFORMING_FINISHED,
          severity: ColonyEventSeverity.INFO,
          title: 'Geoengineering abgeschlossen',
          message: `Geoengineering auf Feld ${event.fieldIndex ?? '?'} wurde abgeschlossen.`,
          payload: { ...event },
        };
      case 'CREW_LIMIT_EXCEEDED':
        return {
          type: ColonyEventType.CREW_LIMIT_EXCEEDED,
          severity: ColonyEventSeverity.WARNING,
          title: 'Crewlimit überschritten',
          message: `${event.amount ?? 0} Crew hat die Kolonie wegen Limitüberschreitung verlassen.`,
          payload: { ...event },
        };
      default:
        return {
          type: event.type as ColonyEventType,
          severity: ColonyEventSeverity.INFO,
          title: event.type,
          message: event.reason ?? event.type,
          payload: { ...event },
        };
    }
  }
}
