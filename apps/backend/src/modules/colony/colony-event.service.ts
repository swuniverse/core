import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { ColonyTickEvent } from './colony.service';
import {
  ColonyEvent,
  ColonyEventSeverity,
  ColonyEventType,
} from './entities/colony-event.entity';

export interface CreateColonyEventInput {
  colonyId: number;
  userId: number;
  type: ColonyEventType;
  severity?: ColonyEventSeverity;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  tickId?: number | null;
}

@Injectable()
export class ColonyEventService {
  constructor(
    @InjectRepository(ColonyEvent)
    private readonly eventRepo: Repository<ColonyEvent>,
  ) {}

  createEvent(input: CreateColonyEventInput): Promise<ColonyEvent> {
    return this.eventRepo.save(
      this.eventRepo.create({
        ...input,
        severity: input.severity ?? ColonyEventSeverity.INFO,
        payload: input.payload ?? {},
        tickId: input.tickId ?? null,
        readAt: null,
      }),
    );
  }

  async createTickEvents(
    colonyId: number,
    userId: number,
    events: ColonyTickEvent[],
    tickId?: number | null,
  ): Promise<ColonyEvent[]> {
    const created: ColonyEvent[] = [];
    for (const event of events) {
      created.push(
        await this.createEvent({
          colonyId,
          userId,
          tickId: tickId ?? null,
          ...this.formatTickEvent(event),
        }),
      );
    }
    return created;
  }

  createActionEvent(input: CreateColonyEventInput): Promise<ColonyEvent> {
    return this.createEvent(input);
  }

  async listForColony(
    colonyId: number,
    userId: number,
    options: { limit?: number; unreadOnly?: boolean } = {},
  ): Promise<ColonyEvent[]> {
    return this.eventRepo.find({
      where: {
        colonyId,
        userId,
        ...(options.unreadOnly ? { readAt: IsNull() } : {}),
      },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(options.limit ?? 50, 1), 100),
    });
  }

  async markRead(
    colonyId: number,
    userId: number,
    eventId: number,
  ): Promise<ColonyEvent> {
    const event = await this.eventRepo.findOne({
      where: { id: eventId, colonyId, userId },
    });
    if (!event) throw new NotFoundException('Colony event not found');
    event.readAt = event.readAt ?? new Date();
    return this.eventRepo.save(event);
  }

  async markAllRead(
    colonyId: number,
    userId: number,
  ): Promise<{ updated: number }> {
    const events = await this.eventRepo.find({
      where: { colonyId, userId, readAt: IsNull() },
    });
    const now = new Date();
    for (const event of events) {
      event.readAt = now;
    }
    if (events.length > 0) await this.eventRepo.save(events);
    return { updated: events.length };
  }

  getUnreadCountForColony(colonyId: number, userId: number): Promise<number> {
    return this.eventRepo.count({
      where: { colonyId, userId, readAt: IsNull() },
    });
  }

  async getLatestForColony(
    colonyId: number,
    userId: number,
    limit = 3,
  ): Promise<ColonyEvent[]> {
    return this.eventRepo.find({
      where: { colonyId, userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
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
          message: `${event.buildingName ?? 'Gebäude'} wurde fertiggestellt.`,
          payload: { ...event },
        };
      case 'TERRAFORMING_FINISHED':
        return {
          type: ColonyEventType.TERRAFORMING_FINISHED,
          severity: ColonyEventSeverity.INFO,
          title: 'Terraforming abgeschlossen',
          message: `Terraforming auf Feld ${event.fieldIndex ?? '?'} wurde abgeschlossen.`,
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
