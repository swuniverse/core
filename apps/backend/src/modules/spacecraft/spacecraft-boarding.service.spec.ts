jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftKind: { SHIP: 'SHIP', STATION: 'STATION' },
  SpacecraftStatus: { IDLE: 'IDLE', DESTROYED: 'DESTROYED' },
}));
jest.mock('./entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));

import { CrewType } from '../colony/entities/crew.entity';
import { SpacecraftKind, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftBoardingService } from './spacecraft-boarding.service';

const shipModule = (overrides = {}) => ({
  moduleType: 'Truppenquartiere',
  level: 1,
  integrity: 100,
  isActive: true,
  ...overrides,
});

const ship = (id: number, userId: number, overrides = {}) => ({
  id,
  userId,
  name: id === 1 ? 'Angreifer' : 'Ziel',
  kind: SpacecraftKind.SHIP,
  status: SpacecraftStatus.IDLE,
  crew: 1,
  modules: [shipModule()],
  locationId: 7,
  location: { id: 7 },
  runtimeSystems: {},
  user: {
    id: userId,
    prestige: 100,
    isNpc: false,
    vacationMode: false,
    vacationUntil: null,
  },
  ...overrides,
});

describe('SpacecraftBoardingService', () => {
  function setup(attacker = ship(1, 10), target = ship(2, 20), roll = 0) {
    const assignments = [
      { spacecraftId: 1, crewId: 101, crew: { id: 101, type: CrewType.SECURITY } },
      { spacecraftId: 2, crewId: 201, crew: { id: 201, type: CrewType.CREWMAN } },
    ];
    const manager = {
      find: jest
        .fn()
        .mockResolvedValueOnce([attacker, target])
        .mockResolvedValueOnce(assignments),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    const prestige = { change: jest.fn().mockResolvedValue(undefined) };
    const enhancement = {
      enhanceSpacecraft: jest.fn().mockResolvedValue(undefined),
    };
    const messaging = { sendSystem: jest.fn().mockResolvedValue(undefined) };
    let randomCall = 0;
    const service = new SpacecraftBoardingService(
      dataSource as never,
      { initialize: (value: { runtimeSystems: object }) => value.runtimeSystems } as never,
      prestige as never,
      enhancement as never,
      messaging as never,
      { integer: () => (randomCall++ % 2 === 0 ? roll : 0) },
    );
    return { service, manager, prestige, enhancement, messaging };
  }

  it('resolves an attacker victory atomically and charges STU prestige', async () => {
    const { service, manager, prestige, enhancement } = setup();

    const result = await service.board(1, 2, 10);

    expect(result).toMatchObject({
      outcome: 'ATTACKER_VICTORY',
      defenderCrewLost: 1,
      defenderCrewAfter: 0,
      prestigeCost: 9,
    });
    expect(manager.delete).toHaveBeenCalled();
    expect(prestige.change).toHaveBeenCalledWith(
      10,
      -9,
      expect.stringContaining('Enterversuch'),
      manager,
    );
    expect(enhancement.enhanceSpacecraft).toHaveBeenCalledWith(
      1,
      'SPACECRAFT_TAKEOVER',
      manager,
    );
  });

  it('allows boarding a different user from the same faction', async () => {
    const attacker = ship(1, 10, { user: { ...ship(1, 10).user, factionId: 4 } });
    const target = ship(2, 20, { user: { ...ship(2, 20).user, factionId: 4 } });
    const { service } = setup(attacker, target);

    await expect(service.board(1, 2, 10)).resolves.toMatchObject({
      outcome: 'ATTACKER_VICTORY',
    });
  });

  it('returns a defender victory with attacker losses', async () => {
    const { service } = setup(ship(1, 10), ship(2, 20), Number.MAX_SAFE_INTEGER);

    await expect(service.board(1, 2, 10)).resolves.toMatchObject({
      outcome: 'DEFENDER_VICTORY',
      attackerCrewLost: 1,
      attackerCrewAfter: 0,
    });
  });
});
