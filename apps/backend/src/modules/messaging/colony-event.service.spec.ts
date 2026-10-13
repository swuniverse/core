import { ColonyEventService } from './colony-event.service';
import { ColonyEventType } from './colony-event.types';
import { Message } from './entities/message.entity';

describe('ColonyEventService', () => {
  it('delivers a durable origin once and preserves its structured metadata', async () => {
    const saved: Partial<Message>[] = [];
    let pendingValues: Partial<Message> | undefined;
    const repository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
      createQueryBuilder: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn((value) => {
          pendingValues = value;
          return repository.createQueryBuilder.mock.results.at(-1)?.value;
        }),
        orIgnore: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn(async () => {
          if (saved.length) return { identifiers: [] };
          saved.push({ ...pendingValues, id: 31 });
          return { identifiers: [{ id: 31 }] };
        }),
      })),
      findOneBy: jest.fn(async (where: Partial<Message>) => {
        if (where.id === 31 || where.deliveryKey === 'colony-event:91') {
          return saved[0] as Message;
        }
        return null;
      }),
    };
    const service = new ColonyEventService(repository as never);
    const input = {
      originEventId: 91,
      colonyId: 7,
      userId: 4,
      type: ColonyEventType.BUILDING_FINISHED,
      title: 'Fabrication complete',
      message: 'The factory completed its work.',
      payload: { buildingId: 12, output: { amount: 3 } },
      tickId: 123456,
    };

    const first = await service.createActionEvent(input);
    const second = await service.createActionEvent(input);

    expect(first).toBe(second);
    expect(saved).toEqual([
      expect.objectContaining({
        deliveryKey: 'colony-event:91',
        originKind: 'COLONY_EVENT',
        originEventId: 91,
        originEventType: ColonyEventType.BUILDING_FINISHED,
        originColonyId: 7,
        originPayload: { buildingId: 12, output: { amount: 3 } },
        originTickId: 123456,
      }),
    ]);
  });
});
