import type { EntityManager, Repository } from 'typeorm';
import { ExplorationService } from '../starmap/exploration.service';
import { GameEvent, GameEventType } from './entities/game-event.entity';
import { GameEventService } from './game-event.service';
import {
  Spacecraft,
  SpacecraftKind,
} from '../spacecraft/entities/spacecraft.entity';

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

describe('GameEventService spacecraft events', () => {
  it.each([
    [SpacecraftKind.STATION, GameEventType.STATION],
    [SpacecraftKind.SHIP, GameEventType.SHIP],
  ])('derives the type from kind %s like STU EntryCreator', async (kind, type) => {
    const repo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const manager = { getRepository: () => repo } as unknown as EntityManager;
    const service = new GameEventService(
      { manager } as unknown as Repository<GameEvent>,
      {} as ExplorationService,
    );

    await service.recordSpacecraft('zerstört', {
      kind,
      locationId: 4,
      location: {
        id: 4,
        kind: 'GALAXY_FIELD',
        galaxyField: { layerId: 1, cx: 2, cy: 3 },
      },
    } as unknown as Spacecraft);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ type, scope: 'GALAXY', x: 2, y: 3, locationId: 4 }),
    );
  });
});
