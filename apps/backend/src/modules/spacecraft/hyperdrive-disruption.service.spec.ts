jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: { IDLE: 'IDLE', DESTROYED: 'DESTROYED' },
}));
jest.mock('../events/game-event.service', () => ({
  GameEventService: class GameEventService {},
}));
jest.mock('../events/entities/game-event.entity', () => ({
  GameEventType: { HYPERSPACE_INTERCEPTED: 'HYPERSPACE_INTERCEPTED' },
}));
jest.mock('../websocket/game.gateway', () => ({
  GameGateway: class GameGateway {},
}));

import { BadRequestException } from '@nestjs/common';
import { HyperdriveDisruptionService } from './hyperdrive-disruption.service';

const galaxyField = (id: number) => ({
  id,
  userId: id,
  name: `Ship ${id}`,
  status: 'IDLE',
  locationId: 42,
  location: {
    id: 42,
    kind: 'GALAXY_FIELD',
    galaxyField: { layerId: 1, cx: 2, cy: 3 },
  },
  runtimeSystems: {
    WARPDRIVE: { active: true, integrity: 100, cooldown: 0 },
  },
});

function setup(target: any = galaxyField(2)) {
  const shipRepo = {
    findOne: jest.fn().mockResolvedValue(target),
    save: jest.fn(async (ship) => ship),
  };
  const runtimeState = {
    initialize: jest.fn((ship) => ship.runtimeSystems),
  };
  const gateway = { emitToUser: jest.fn() };
  const gameEvents = { recordSpacecraft: jest.fn(async () => undefined) };
  return {
    service: new HyperdriveDisruptionService(
      shipRepo as never,
      runtimeState as never,
      gateway as never,
      gameEvents as never,
    ),
    shipRepo,
  };
}

describe('HyperdriveDisruptionService', () => {
  it('uses canonical galaxy scope and loads target location relations', async () => {
    const target = galaxyField(2);
    const interceptor = galaxyField(1);
    const { service, shipRepo } = setup(target);

    await expect(
      service.intercept(interceptor as never, 2),
    ).resolves.toMatchObject({
      intercepted: true,
      field: { scope: 'GALAXY', layerId: 1, x: 2, y: 3 },
    });
    expect(shipRepo.findOne).toHaveBeenCalledWith({
      where: { id: 2 },
      relations: ['location', 'location.galaxyField', 'location.systemField'],
    });
  });

  it('rejects canonical system scope', async () => {
    const target = {
      ...galaxyField(2),
      location: {
        id: 43,
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 4, sx: 5, sy: 6 },
      },
    };
    const { service } = setup(target);

    await expect(service.intercept(galaxyField(1) as never, 2)).rejects.toThrow(
      'Ziel befindet sich nicht im Hyperraum',
    );
  });

  it('requires the interceptor canonical scope to be galaxy', async () => {
    const interceptor = {
      ...galaxyField(1),
      location: {
        id: 43,
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 4, sx: 5, sy: 6 },
      },
    };
    const { service } = setup();

    await expect(
      service.intercept(interceptor as never, 2),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
