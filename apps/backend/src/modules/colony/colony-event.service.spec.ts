jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));

import { NotFoundException } from '@nestjs/common';
import { ColonyEventService } from './colony-event.service';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from './entities/colony-event.entity';

function createService() {
  const events: any[] = [];
  const eventRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => {
      if (Array.isArray(value)) return value;
      const saved = {
        id: value.id ?? events.length + 1,
        createdAt: new Date(),
        ...value,
      };
      const existingIndex = events.findIndex((event) => event.id === saved.id);
      if (existingIndex >= 0) events[existingIndex] = saved;
      else events.push(saved);
      return saved;
    }),
    find: jest.fn(async ({ where, take }: any = {}) => {
      let result = [...events];
      if (where?.colonyId != null)
        result = result.filter((event) => event.colonyId === where.colonyId);
      if (where?.userId != null)
        result = result.filter((event) => event.userId === where.userId);
      if (where?.readAt?._type === 'isNull')
        result = result.filter((event) => event.readAt == null);
      return result.slice(0, take ?? result.length);
    }),
    findOne: jest.fn(
      async ({ where }: any) =>
        events.find(
          (event) =>
            event.id === where.id &&
            event.colonyId === where.colonyId &&
            event.userId === where.userId,
        ) ?? null,
    ),
    count: jest.fn(
      async ({ where }: any) =>
        events.filter(
          (event) =>
            event.colonyId === where.colonyId &&
            event.userId === where.userId &&
            (where.readAt ? event.readAt == null : true),
        ).length,
    ),
  };
  const service = new ColonyEventService(eventRepo as any);
  return { service, eventRepo, events };
}

describe('ColonyEventService', () => {
  it('creates and lists colony events', async () => {
    const { service } = createService();
    await service.createEvent({
      colonyId: 1,
      userId: 2,
      type: ColonyEventType.SHIELDS_LOADED,
      severity: ColonyEventSeverity.INFO,
      title: 'Schilde geladen',
      message: 'Schilde geladen',
    });

    const events = await service.listForColony(1, 2);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      colonyId: 1,
      userId: 2,
      type: ColonyEventType.SHIELDS_LOADED,
      readAt: null,
    });
  });

  it('formats tick events', async () => {
    const { service } = createService();

    const events = await service.createTickEvents(
      1,
      2,
      [
        {
          type: 'BUILDING_DEACTIVATED',
          fieldIndex: 7,
          reason: 'Energie',
        },
      ],
      123,
    );

    expect(events[0]).toMatchObject({
      type: ColonyEventType.BUILDING_DEACTIVATED,
      severity: ColonyEventSeverity.WARNING,
      tickId: 123,
    });
  });

  it('includes the activation result in building completion messages', async () => {
    const { service } = createService();

    const events = await service.createTickEvents(1, 2, [
      {
        type: 'BUILDING_FINISHED',
        buildingName: 'Kraftwerk',
        activated: true,
      },
      {
        type: 'BUILDING_FINISHED',
        buildingName: 'Kollektor',
        activated: false,
        reason: 'Nicht genug freie Arbeiter',
      },
    ]);

    expect(events.map((event) => event.message)).toEqual([
      'Kraftwerk wurde fertiggestellt und aktiviert.',
      'Kollektor wurde fertiggestellt, aber nicht aktiviert (Nicht genug freie Arbeiter).',
    ]);
  });

  it('marks events read and all read', async () => {
    const { service } = createService();
    const event = await service.createEvent({
      colonyId: 1,
      userId: 2,
      type: ColonyEventType.COLONY_ATTACKED,
      severity: ColonyEventSeverity.CRITICAL,
      title: 'Angriff',
      message: 'Angriff',
    });

    const read = await service.markRead(1, 2, event.id);
    expect(read.readAt).toBeInstanceOf(Date);

    await service.createEvent({
      colonyId: 1,
      userId: 2,
      type: ColonyEventType.SHIELDS_LOADED,
      title: 'Schilde',
      message: 'Schilde',
    });
    const result = await service.markAllRead(1, 2);
    expect(result.updated).toBeGreaterThanOrEqual(1);
  });

  it('rejects reading events from another owner', async () => {
    const { service } = createService();
    await service.createEvent({
      colonyId: 1,
      userId: 2,
      type: ColonyEventType.SHIELDS_LOADED,
      title: 'Schilde',
      message: 'Schilde',
    });

    await expect(service.markRead(1, 3, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
