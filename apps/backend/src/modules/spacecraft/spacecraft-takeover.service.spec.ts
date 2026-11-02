jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftKind: { SHIP: 'SHIP' },
  SpacecraftStatus: { IDLE: 'IDLE' },
}));
jest.mock('./entities/spacecraft-takeover.entity', () => ({ SpacecraftTakeover: class SpacecraftTakeover {} }));
jest.mock('../events/game-event.service', () => ({ GameEventService: class GameEventService {} }));

import { SpacecraftTakeoverService } from './spacecraft-takeover.service';
import { SpacecraftKind, SpacecraftStatus } from './entities/spacecraft.entity';

describe('SpacecraftTakeoverService', () => {
  const attacker = { id: 1, userId: 10, name: 'Angreifer', kind: SpacecraftKind.SHIP, status: SpacecraftStatus.IDLE, locationId: 7, crew: 2, crewRequired: 2, modules: [], user: { prestige: 20, isNpc: false }, runtimeSystems: {} };
  const target = { id: 2, userId: 20, name: 'Ziel', kind: SpacecraftKind.SHIP, status: SpacecraftStatus.IDLE, locationId: 7, crew: 0, modules: [{ level: 2 }, { level: 1 }], user: { prestige: 20, isNpc: false }, runtimeSystems: {}, fleetId: 9, tractoredShipId: null };

  function setup() {
    let takeover: any = null;
    const manager: any = {
      find: jest.fn().mockResolvedValue([attacker, target]),
      count: jest.fn().mockResolvedValue(2),
      findOne: jest.fn(async (entity: any, options: any) => {
        if (entity.name === 'SpacecraftTakeover') return takeover;
        return options.where?.id === 2 ? target : attacker;
      }),
      create: jest.fn((_entity, value) => value),
      save: jest.fn(async (value) => { if ('ticksRemaining' in value && 'attackerId' in value) takeover = value; return value; }),
      remove: jest.fn(async () => { takeover = null; }),
      update: jest.fn(),
    };
    const prestige = { change: jest.fn() };
    const messaging = { sendSystem: jest.fn() };
    const service = new SpacecraftTakeoverService(
      { transaction: (fn: any) => fn(manager) } as any,
      prestige as any,
      messaging as any,
      { recordSpacecraft: jest.fn() } as any,
      { enhanceSpacecraft: jest.fn() } as any,
      { initialize: (ship: any) => ship.runtimeSystems } as any,
    );
    return { service, manager, prestige, messaging, setTakeover: (value: any) => { takeover = value; } };
  }

  it('starts for ten ticks and charges base plus three per target module level', async () => {
    const { service, prestige } = setup();
    await expect(service.start(1, 2, 10)).resolves.toMatchObject({ ticksRemaining: 10, totalTicks: 10, prestigeCost: 14 });
    expect(prestige.change).toHaveBeenCalledWith(10, -14, expect.any(String), expect.anything());
  });

  it('refunds the attacker when cancelled', async () => {
    const { service, prestige, setTakeover } = setup();
    setTakeover({ attackerId: 1, targetId: 2, attackerUserId: 10, targetUserId: 20, ticksRemaining: 8, prestigeCost: 14 });
    await service.cancelForShip(2);
    expect(prestige.change).toHaveBeenCalledWith(10, 14, expect.any(String), expect.anything());
  });
});
