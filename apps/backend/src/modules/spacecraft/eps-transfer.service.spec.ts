jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../faction/entities/faction.entity', () => ({
  FactionEntity: class FactionEntity {},
}));
jest.mock('../starmap/entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('../starmap/entities/celestial-object.entity', () => ({
  CelestialObject: class CelestialObject {},
}));
jest.mock('../starmap/entities/layer.entity', () => ({
  Layer: class Layer {},
}));
jest.mock('./entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('./entities/fleet.entity', () => ({ Fleet: class Fleet {} }));
jest.mock('./interaction-context.service', () => ({
  InteractionContextService: class InteractionContextService {},
}));
jest.mock('../messaging/messaging.service', () => ({
  MessagingService: class MessagingService {},
}));

import { BadRequestException } from '@nestjs/common';
import { EpsTransferService } from './eps-transfer.service';

const context = (overrides = {}) => ({
  samePosition: true,
  sourceHasSufficientCrew: true,
  sourceCombatCapable: true,
  sourceInHyperspace: false,
  targetInHyperspace: false,
  sourceCloaked: false,
  targetCloaked: false,
  sourceShieldsActive: false,
  targetShieldsActive: false,
  targetOnVacation: false,
  sourceDestroyed: false,
  targetDestroyed: false,
  sourceBlocked: false,
  targetBlocked: false,
  stanceAllowed: true,
  ...overrides,
});

function setup(
  contextOverrides = {},
  targetOverrides = {},
  sourceOverrides = {},
) {
  const source = {
    id: 1,
    userId: 10,
    name: 'Alpha',
    energy: 30,
    battery: 0,
    batteryMax: 0,
    location: { id: 5, kind: 'GALAXY_FIELD', galaxyField: { cx: 4, cy: 7 } },
    ...sourceOverrides,
  };
  const target = {
    id: 2,
    userId: 11,
    name: 'Beta',
    energy: 0,
    battery: 5,
    batteryMax: 20,
    ...targetOverrides,
  };
  const manager = {
    getRepository: jest.fn(() => ({
      find: jest.fn().mockResolvedValue([source, target]),
    })),
    save: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(async (work) => work(manager)),
  };
  const interactions = {
    load: jest.fn().mockResolvedValue(context(contextOverrides)),
  };
  const messaging = { sendSystem: jest.fn() };
  return {
    service: new EpsTransferService(
      dataSource as never,
      interactions as never,
      messaging as never,
    ),
    source,
    target,
    manager,
    messaging,
  };
}

describe('EpsTransferService', () => {
  it('moves energy into the target battery at triple cost and notifies foreign owners', async () => {
    const { service, source, target, manager, messaging } = setup();

    const result = await service.transfer(1, 10, 2, 4);

    expect(result.transferred).toBe(4);
    expect(source.energy).toBe(18);
    expect(target.battery).toBe(9);
    expect(manager.save).toHaveBeenCalledWith([source, target]);
    expect(messaging.sendSystem).toHaveBeenCalledWith(
      11,
      'Energietransfer',
      expect.stringContaining('4 Energie in die Batterie der Beta'),
      undefined,
      'TRADE',
    );
  });

  it('does not message the owner of an own target', async () => {
    const { service, messaging } = setup({}, { userId: 10 });

    await service.transfer(1, 10, 2, 2);

    expect(messaging.sendSystem).not.toHaveBeenCalled();
  });

  it('truncates to source energy and battery capacity with an X of Y message', async () => {
    const { service, source, target } = setup({}, { battery: 18 });

    const result = await service.transfer(1, 10, 2, 9);

    expect(result.transferred).toBe(2);
    expect(source.energy).toBe(24);
    expect(target.battery).toBe(20);
    expect(result.message).toBe(
      'Es wurden 2 von 9 Energie zur Beta transferiert',
    );
  });

  it('truncates to what the source can afford', async () => {
    const { service, source } = setup({}, {}, { energy: 7 });

    const result = await service.transfer(1, 10, 2, 10);

    expect(result.transferred).toBe(2);
    expect(source.energy).toBe(1);
  });

  it('rejects a full battery and an empty source', async () => {
    await expect(
      setup({}, { battery: 20 }).service.transfer(1, 10, 2, 1),
    ).rejects.toThrow('bereits voll');
    await expect(
      setup({}, {}, { energy: 0 }).service.transfer(1, 10, 2, 1),
    ).rejects.toThrow('Keine Energie vorhanden');
  });

  it('rejects foreign non-friends and shielded targets without changing state', async () => {
    const stance = setup({ stanceAllowed: false });
    await expect(stance.service.transfer(1, 10, 2, 1)).rejects.toThrow(
      BadRequestException,
    );
    expect(stance.manager.save).not.toHaveBeenCalled();

    const shielded = setup({ targetShieldsActive: true });
    await expect(shielded.service.transfer(1, 10, 2, 1)).rejects.toThrow(
      'Das Ziel hat die Schilde aktiviert',
    );
    expect(shielded.messaging.sendSystem).not.toHaveBeenCalled();
  });

  it('ignores stance for own targets', async () => {
    const { service } = setup({ stanceAllowed: false }, { userId: 10 });

    await expect(service.transfer(1, 10, 2, 1)).resolves.toMatchObject({
      transferred: 1,
    });
  });
});
