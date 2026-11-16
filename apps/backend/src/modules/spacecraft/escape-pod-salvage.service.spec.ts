jest.mock('./crew-trade-post', () => ({ closestCrewTradePost: jest.fn(), CREW_LOCATION_RELATIONS: [] }));
jest.mock('../colony/colony-crew.service', () => ({
  ColonyCrewService: class ColonyCrewService {},
}));
jest.mock('../messaging/messaging.service', () => ({
  MessagingService: class MessagingService {},
}));
jest.mock('../game-data/game-data.service', () => ({
  GameDataService: class GameDataService {},
}));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../colony/entities/colony-changeable.entity', () => ({
  ColonyChangeable: class ColonyChangeable {},
}));
jest.mock('../colony/entities/crew-assignment.entity', () => ({
  CrewAssignment: class CrewAssignment {},
}));
jest.mock('../starmap/entities/galaxy-field.entity', () => ({
  GalaxyField: class GalaxyField {},
}));
jest.mock('../starmap/entities/system-field.entity', () => ({
  SystemField: class SystemField {},
}));
jest.mock('../starmap/entities/space-location.entity', () => ({
  SpaceLocation: class SpaceLocation {},
}));
jest.mock('./entities/escape-pod.entity', () => ({
  EscapePod: class EscapePod {},
  EscapePodLaunchReason: {},
}));
jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: { IDLE: 'IDLE', IN_FLIGHT: 'IN_FLIGHT' },
}));

import { closestCrewTradePost } from './crew-trade-post';
import { BadRequestException } from '@nestjs/common';
import { EscapePodService } from './escape-pod.service';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { EscapePod } from './entities/escape-pod.entity';
import { Spacecraft } from './entities/spacecraft.entity';

type Row = Record<string, any>;

function setup(
  options: {
    ship?: Row;
    pod?: Row | null;
    podCrew?: Row[];
    aboard?: number;
    systems?: Row;
  } = {},
) {
  const ship: Row = {
    id: 1,
    userId: 7,
    status: 'IDLE',
    locationId: 42,
    energy: 5,
    crew: 1,
    crewMax: 5,
    crewRequired: 0,
    ...options.ship,
  };
  const pod =
    options.pod === null ? null : { id: 9, locationId: 42, ...options.pod };
  const podCrew = options.podCrew ?? [
    { crewId: 1, userId: 7, escapePodId: 9, spacecraftId: null, slot: null },
    { crewId: 2, userId: 7, escapePodId: 9, spacecraftId: null, slot: null },
  ];
  const removed: Row[] = [];
  const saved: Row[] = [];
  const manager = {
    findOne: jest.fn(async (entity: unknown) =>
      entity === Spacecraft ? ship : entity === EscapePod ? pod : null,
    ),
    find: jest.fn(async (entity: unknown) =>
      entity === CrewAssignment ? podCrew : [],
    ),
    count: jest.fn(async () => options.aboard ?? 1),
    save: jest.fn(async (value: Row | Row[]) => {
      saved.push(...(Array.isArray(value) ? value : [value]));
      return value;
    }),
    remove: jest.fn(async (value: Row) => {
      removed.push(value);
    }),
  };
  const dataSource = { transaction: jest.fn(async (work) => work(manager)) };
  const runtimeState = { initialize: jest.fn(() => options.systems ?? {}) };
  const service = new EscapePodService(
    dataSource as any,
    {} as any,
    {} as any,
    { sendSystem: jest.fn() } as any,
    runtimeState as any,
  );
  return { service, ship, pod, podCrew, removed, saved };
}

describe('EscapePodService.salvage', () => {
  beforeEach(() => jest.mocked(closestCrewTradePost).mockResolvedValue({ post: { id: 10, name: 'Naboo' }, point: { x: 4, y: 5, layerId: 1 } } as never));
  it('boards own crew, charges 1 EPS and removes the emptied pod', async () => {
    const { service, ship, podCrew, removed, pod } = setup();

    const result = await service.salvage(1, 7, 9);

    expect(result.salvaged).toBe(2);
    expect(result.remaining).toBe(0);
    expect(ship.energy).toBe(4);
    expect(ship.crew).toBe(3);
    expect(
      podCrew.every((m) => m.spacecraftId === 1 && m.escapePodId === null),
    ).toBe(true);
    expect(removed).toEqual([pod]);
  });

  it('stops at free crew capacity and keeps the rest in the pod', async () => {
    const { service, removed, podCrew } = setup({
      ship: { crewMax: 2 },
      aboard: 1,
    });

    const result = await service.salvage(1, 7, 9);

    expect(result.salvaged).toBe(1);
    expect(result.remaining).toBe(1);
    expect(podCrew[1].escapePodId).toBe(9);
    expect(removed).toEqual([]);
  });

  it('rejects when the ship has no free crew capacity', async () => {
    const { service, ship } = setup({ ship: { crewMax: 1 }, aboard: 1 });

    await expect(service.salvage(1, 7, 9)).rejects.toThrow(
      'Nicht genug Crewkapazität',
    );
    expect(ship.energy).toBe(5);
  });

  it('rejects without EPS', async () => {
    const { service } = setup({ ship: { energy: 0 } });

    await expect(service.salvage(1, 7, 9)).rejects.toThrow(BadRequestException);
  });

  it('transfers foreign crew and also salvages foreign-only pods', async () => {
    const { service, ship, podCrew, removed } = setup({ podCrew: [{ crewId: 3, userId: 8, escapePodId: 9, spacecraftId: null, slot: null }] });
    const result = await service.salvage(1, 7, 9);
    expect(result).toMatchObject({ salvaged: 0, foreign: 1, remaining: 0, energy: 4 });
    expect(podCrew[0]).toMatchObject({ spacecraftId: null, escapePodId: null, tradePostId: 10 });
    expect(ship.crew).toBe(1);
    expect(removed).toHaveLength(1);
  });

  it('does not modify mixed pods if even one crew owner has no reachable post', async () => {
    jest.mocked(closestCrewTradePost).mockResolvedValueOnce(null);
    const { service, ship, podCrew, removed, saved } = setup({ podCrew: [
      { crewId: 1, userId: 7, escapePodId: 9, spacecraftId: null, slot: null },
      { crewId: 3, userId: 8, escapePodId: 9, spacecraftId: null, slot: null },
    ] });
    await expect(service.salvage(1, 7, 9)).rejects.toThrow('Kein erreichbarer Handelsposten');
    expect(podCrew.every((member) => member.escapePodId === 9)).toBe(true);
    expect(ship.energy).toBe(5);
    expect(saved).toEqual([]);
    expect(removed).toEqual([]);
  });

  it('rejects pods at another location, active shields and warpdrive', async () => {
    await expect(
      setup({ pod: { locationId: 99 } }).service.salvage(1, 7, 9),
    ).rejects.toThrow('Rettungskapseln nicht gefunden');
    await expect(
      setup({ systems: { SHIELDS: { active: true } } }).service.salvage(
        1,
        7,
        9,
      ),
    ).rejects.toThrow('Schilde');
    await expect(
      setup({ systems: { WARPDRIVE: { active: true } } }).service.salvage(
        1,
        7,
        9,
      ),
    ).rejects.toThrow('Warpantrieb');
  });
});
