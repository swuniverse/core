import type { EntityManager, Repository } from 'typeorm';
import { ExplorationService } from '../starmap/exploration.service';
import { GameEvent, GameEventType } from './entities/game-event.entity';
import { GameEventService } from './game-event.service';

describe('GameEventService alliance events', () => {
  it('records a locationless ALLIANCE event through the supplied transaction', async () => {
    const event = {
      type: GameEventType.ALLIANCE,
      text: 'Rogue und Red schließen Frieden',
    };
    const transactionalEvents = {
      create: jest.fn().mockReturnValue(event),
      save: jest.fn().mockResolvedValue(event),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(transactionalEvents),
    } as unknown as EntityManager;
    const defaultEvents = {
      save: jest.fn(),
    } as unknown as Repository<GameEvent>;
    const service = new GameEventService(
      defaultEvents,
      {} as ExplorationService,
    );

    await expect(service.recordAlliance(event.text, manager)).resolves.toBe(
      event,
    );

    expect(manager.getRepository).toHaveBeenCalledWith(GameEvent);
    expect(transactionalEvents.create).toHaveBeenCalledWith({
      type: GameEventType.ALLIANCE,
      text: event.text,
      scope: null,
      layerId: null,
      systemId: null,
      x: null,
      y: null,
      locationId: null,
      location: null,
    });
    expect(transactionalEvents.save).toHaveBeenCalledWith(event);
    expect(defaultEvents.save).not.toHaveBeenCalled();
  });
});
