jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftKind: { SHIP: 'SHIP', STATION: 'STATION' },
  SpacecraftStatus: { IDLE: 'IDLE', DESTROYED: 'DESTROYED' },
}));
jest.mock('./entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));

import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CrewType } from '../colony/entities/crew.entity';
import { MessagingService } from '../messaging/messaging.service';
import { PrestigeService } from '../prestige/prestige.service';
import { CrewEnhancementService } from './crew-enhancement.service';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { SpacecraftKind, SpacecraftStatus } from './entities/spacecraft.entity';
import {
  BOARDING_RANDOM_TOKEN,
  SpacecraftBoardingService,
} from './spacecraft-boarding.service';
import { THREAT_REACTIONS } from './threat-reaction.port';

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
  it('can be initialized by Nest with its default random dependency', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          SpacecraftBoardingService,
          { provide: DataSource, useValue: {} },
          { provide: SpacecraftRuntimeStateService, useValue: {} },
          { provide: PrestigeService, useValue: {} },
          { provide: CrewEnhancementService, useValue: {} },
          { provide: MessagingService, useValue: {} },
          { provide: THREAT_REACTIONS, useValue: [] },
          {
            provide: BOARDING_RANDOM_TOKEN,
            useValue: { integer: () => 0 },
          },
        ],
      }).compile(),
    ).resolves.toBeDefined();
  });

  function setup(attacker = ship(1, 10), target = ship(2, 20), roll = 0) {
    const assignments = [
      { spacecraftId: 1, crewId: 101, crew: { id: 101, type: CrewType.SECURITY } },
      { spacecraftId: 2, crewId: 201, crew: { id: 201, type: CrewType.CREWMAN } },
    ];
    const ships = [attacker, target];
    const manager = {
      find: jest.fn(async (_entity, options: { relations?: { crew?: boolean } }) =>
        options.relations?.crew ? assignments : ships,
      ),
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
    const reaction = { reactToThreat: jest.fn(async (): Promise<unknown> => null) };
    let randomCall = 0;
    const service = new SpacecraftBoardingService(
      dataSource as never,
      { initialize: (value: { runtimeSystems: object }) => value.runtimeSystems } as never,
      prestige as never,
      enhancement as never,
      messaging as never,
      { integer: () => (randomCall++ % 2 === 0 ? roll : 0) },
      [reaction as never],
    );
    return { service, manager, prestige, enhancement, messaging, reaction, ships };
  }

  describe('threat reaction (STU ThreatReaction)', () => {
    const report = { rounds: [{ round: 1, lines: [{ text: 'Ziel feuert' }] }] };

    it('lets the alerted target fire before boarding and returns its report', async () => {
      const { service, reaction, manager } = setup();
      reaction.reactToThreat.mockImplementation(async () => {
        expect(manager.delete).not.toHaveBeenCalled();
        return report;
      });

      const result = await service.board(1, 2, 10);

      expect(reaction.reactToThreat).toHaveBeenCalledWith(1, 2, 'BOARD_SHIP');
      expect(result).toMatchObject({ outcome: 'ATTACKER_VICTORY', threatReport: report });
    });

    it('does not react to an invalid boarding attempt', async () => {
      const { service, reaction } = setup(ship(1, 10, { modules: [] }));

      await expect(service.board(1, 2, 10)).rejects.toThrow('Truppenquartiere');
      expect(reaction.reactToThreat).not.toHaveBeenCalled();
    });

    it('aborts without prestige cost when the boarding ship was destroyed', async () => {
      const { service, reaction, ships, prestige, messaging } = setup();
      reaction.reactToThreat.mockImplementation(async () => {
        ships.shift();
        return report;
      });

      const result = await service.board(1, 2, 10);

      expect(result).toMatchObject({
        outcome: 'ABORTED',
        message: 'Das Schiff wurde bei dem Angriff zerstört',
        threatReport: report,
      });
      expect(prestige.change).not.toHaveBeenCalled();
      expect(messaging.sendSystem).not.toHaveBeenCalled();
    });
  });

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
