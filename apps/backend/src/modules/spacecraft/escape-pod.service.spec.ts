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
  EscapePodLaunchReason: {
    COMBAT_DESTRUCTION: 'COMBAT_DESTRUCTION',
    SELF_DESTRUCTION: 'SELF_DESTRUCTION',
    LIFE_SUPPORT_FAILURE: 'LIFE_SUPPORT_FAILURE',
  },
}));
jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: { IDLE: 'IDLE', IN_FLIGHT: 'IN_FLIGHT' },
}));

import { EscapePodService } from './escape-pod.service';
import { EscapePodLaunchReason } from './entities/escape-pod.entity';

type Row = Record<string, any>;

function setup(options: {
  field?: Row;
  neighbours?: Record<string, Row | null>;
  colony?: Row | null;
  colonyCrewCount?: number;
  localLimit?: number;
  podCrew?: Row[];
} = {}) {
  const origin = {
    id: 42,
    kind: 'GALAXY_FIELD',
    galaxyField: { id: 1, layerId: 1, cx: 5, cy: 5, damage: 0, ...options.field },
    systemField: null,
  };
  const saved: Row[] = [];
  const removed: Row[] = [];
  const assignments: Row[] = options.podCrew ?? [
    { crewId: 1, userId: 7, spacecraftId: 9, colonyId: null, escapePodId: null, slot: 'COMMAND' },
    { crewId: 2, userId: 7, spacecraftId: 9, colonyId: null, escapePodId: null, slot: 'CREWMAN' },
  ];
  const neighbourKey = (where: Row) => `${where.cx},${where.cy}`;
  const manager: Row = {
    find: jest.fn(async (entity: Row, query: Row) => {
      if (entity.name === 'CrewAssignment') {
        if (query.where.colonyId != null) {
          return Array.from({ length: options.colonyCrewCount ?? 0 }, (_v, i) => ({
            crewId: 100 + i,
          }));
        }
        return assignments.filter(
          (a) =>
            (query.where.spacecraftId == null ||
              a.spacecraftId === query.where.spacecraftId) &&
            (query.where.escapePodId == null ||
              a.escapePodId === query.where.escapePodId),
        );
      }
      return [];
    }),
    findOne: jest.fn(async (entity: Row, query: Row) => {
      switch (entity.name) {
        case 'User':
          return { id: 7, faction: 'REBEL_ALLIANCE' };
        case 'SpaceLocation':
          if (query.where.galaxyFieldId != null) {
            return {
              id: 50 + query.where.galaxyFieldId,
              kind: 'GALAXY_FIELD',
              galaxyField: { id: query.where.galaxyFieldId },
            };
          }
          return origin;
        case 'GalaxyField': {
          const entry = options.neighbours?.[neighbourKey(query.where)];
          return entry ?? null;
        }
        case 'EscapePod':
          return { id: 3, locationId: 42 };
        case 'Colony':
          return options.colony ?? null;
        default:
          return null;
      }
    }),
    create: jest.fn((_entity: Row, value: Row) => value),
    save: jest.fn(async (value: Row | Row[]) => {
      saved.push(value as Row);
      return Array.isArray(value) ? value : { id: 3, ...value };
    }),
    remove: jest.fn(async (value: Row) => {
      removed.push(value);
    }),
    update: jest.fn(async () => undefined),
  };
  const dataSource = {
    transaction: jest.fn(async (work: (m: Row) => unknown) => work(manager)),
    getRepository: jest.fn(() => ({
      find: jest.fn(async () => [{ id: 3 }]),
    })),
  };
  const gameData = {
    getEscapePodPresentationForFaction: jest.fn(() => ({
      key: 'REBEL_ESCAPE_PODS',
    })),
  };
  const colonyCrew = {
    getLocalCrewLimit: jest.fn(() => options.localLimit ?? 10),
  };
  const messaging = { sendSystem: jest.fn(async () => undefined) };
  const service = new EscapePodService(
    dataSource as any,
    gameData as any,
    colonyCrew as any,
    messaging as any,
  );
  return { service, manager, saved, removed, assignments, messaging };
}

const ship = (overrides: Row = {}) =>
  ({
    id: 9,
    userId: 7,
    name: 'Opfer',
    shipClassId: 3,
    locationId: 42,
    crew: 2,
    lastGalaxyFlightDirection: null,
    ...overrides,
  }) as any;

describe('EscapePodService.launchForShip', () => {
  it('moves the individual crew into a pod instead of deleting it', async () => {
    const { service, manager, assignments } = setup();
    const s = ship();

    const result = await service.launchForShip(
      manager as any,
      s,
      EscapePodLaunchReason.COMBAT_DESTRUCTION,
    );

    expect(result).toEqual({ podId: 3, crewCount: 2 });
    expect(assignments.map((a) => a.crewId)).toEqual([1, 2]);
    for (const assignment of assignments) {
      expect(assignment).toMatchObject({
        spacecraftId: null,
        colonyId: null,
        escapePodId: 3,
        slot: null,
      });
    }
    expect(manager.remove).not.toHaveBeenCalled();
    expect(s.crew).toBe(0);
  });

  it.each([
    EscapePodLaunchReason.COMBAT_DESTRUCTION,
    EscapePodLaunchReason.SELF_DESTRUCTION,
    EscapePodLaunchReason.LIFE_SUPPORT_FAILURE,
  ])('records origin metadata and reason %s', async (reason) => {
    const { service, manager } = setup();

    await service.launchForShip(manager as any, ship(), reason);

    expect(manager.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        locationId: 42,
        originSpacecraftId: 9,
        originShipName: 'Opfer',
        originShipClassId: 3,
        originFaction: 'REBEL_ALLIANCE',
        presentationKey: 'REBEL_ESCAPE_PODS',
        launchReason: reason,
      }),
    );
  });

  it('creates no pod for an uncrewed ship', async () => {
    const { service, manager } = setup({ podCrew: [] });

    await expect(
      service.launchForShip(
        manager as any,
        ship(),
        EscapePodLaunchReason.SELF_DESTRUCTION,
      ),
    ).resolves.toBeNull();
    expect(manager.create).not.toHaveBeenCalled();
  });

  describe('special damage fields', () => {
    const open = (cx: number, cy: number) => ({
      id: cx * 100 + cy,
      isPassable: true,
      passableOverride: null,
    });

    it('prefers the neighbour in the last flight direction', async () => {
      const { service, manager } = setup({
        field: { damage: 5 },
        neighbours: { '6,5': open(6, 5), '5,4': open(5, 4) },
      });

      await service.launchForShip(
        manager as any,
        ship({ lastGalaxyFlightDirection: 'RIGHT' }),
        EscapePodLaunchReason.COMBAT_DESTRUCTION,
      );

      expect(manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ locationId: 50 + 605 }),
      );
    });

    it('falls back deterministically to the first passable orthogonal neighbour', async () => {
      const { service, manager } = setup({
        field: { damage: 5 },
        neighbours: {
          '6,5': { ...open(6, 5), isPassable: false },
          '5,6': open(5, 6),
          '4,5': open(4, 5),
        },
      });

      await service.launchForShip(
        manager as any,
        ship({ lastGalaxyFlightDirection: 'RIGHT' }),
        EscapePodLaunchReason.COMBAT_DESTRUCTION,
      );

      // RIGHT blocked, then TOP missing, RIGHT done, BOTTOM (5,6) wins.
      expect(manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ locationId: 50 + 506 }),
      );
    });

    it('stays on the origin field when no neighbour exists', async () => {
      const { service, manager } = setup({ field: { damage: 5 } });

      await service.launchForShip(
        manager as any,
        ship(),
        EscapePodLaunchReason.COMBAT_DESTRUCTION,
      );

      expect(manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ locationId: 42 }),
      );
    });

    it('does not move on a harmless field', async () => {
      const { service, manager } = setup({
        neighbours: { '5,4': open(5, 4) },
      });

      await service.launchForShip(
        manager as any,
        ship({ lastGalaxyFlightDirection: 'TOP' }),
        EscapePodLaunchReason.COMBAT_DESTRUCTION,
      );

      expect(manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ locationId: 42 }),
      );
    });
  });
});

describe('EscapePodService.processTick', () => {
  const podCrew = (owner: number, ids: number[]) =>
    ids.map((crewId) => ({
      crewId,
      userId: owner,
      colonyId: null,
      spacecraftId: null,
      escapePodId: 3,
    }));
  const colony = { id: 11, userId: 7, name: 'Heimat', fields: [], changeable: {} };

  function withSystemLocation(h: ReturnType<typeof setup>) {
    const original = h.manager.findOne.getMockImplementation()!;
    h.manager.findOne.mockImplementation(async (entity: Row, query: Row) =>
      entity.name === 'SpaceLocation'
        ? { id: 42, systemField: { id: 8, starSystemId: 1, sx: 2, sy: 3 } }
        : original(entity, query),
    );
  }

  it('lands only crew owned by the colony owner, up to free capacity', async () => {
    const h = setup({
      colony,
      colonyCrewCount: 8,
      localLimit: 10,
      podCrew: [...podCrew(7, [1, 2, 3]), ...podCrew(8, [4])],
    });
    withSystemLocation(h);

    await h.service.processTick();

    const landed = h.assignments.filter((a) => a.colonyId === 11);
    expect(landed.map((a) => a.crewId)).toEqual([1, 2]);
    // Surplus own crew and foreign crew stay in the pod; pod is kept.
    expect(h.assignments.find((a) => a.crewId === 3)?.escapePodId).toBe(3);
    expect(h.assignments.find((a) => a.crewId === 4)?.escapePodId).toBe(3);
    expect(h.removed).toHaveLength(0);
    expect(h.manager.update).toHaveBeenCalledWith(
      expect.anything(),
      { colonyId: 11 },
      { trainedCrew: 10 },
    );
    expect(h.messaging.sendSystem).toHaveBeenCalledTimes(1);
    expect(h.messaging.sendSystem).toHaveBeenCalledWith(
      7,
      expect.any(String),
      expect.stringContaining('2 deiner Crewmitglieder'),
      undefined,
      expect.anything(),
    );
  });

  it('removes the pod once its last occupant has landed', async () => {
    const h = setup({ colony, podCrew: podCrew(7, [1, 2]) });
    withSystemLocation(h);

    await h.service.processTick();

    expect(h.assignments.every((a) => a.colonyId === 11)).toBe(true);
    expect(h.removed).toHaveLength(1);
  });

  it('keeps pods without a colony on their field', async () => {
    const h = setup({ colony: null, podCrew: podCrew(7, [1]) });
    withSystemLocation(h);

    await h.service.processTick();

    expect(h.assignments[0].escapePodId).toBe(3);
    expect(h.removed).toHaveLength(0);
    expect(h.messaging.sendSystem).not.toHaveBeenCalled();
  });

  it('removes empty pods', async () => {
    const h = setup({ colony: null, podCrew: [] });

    await h.service.processTick();

    expect(h.removed).toHaveLength(1);
  });
});


describe('foreign crew release authorization', () => {
  function releaseSetup(crewOwner = 8) {
    const member = { crewId: 1, userId: crewOwner, spacecraftId: 9, colonyId: null, escapePodId: null, slot: 'COMMAND' };
    const h = setup({ podCrew: [member] });
    const host = ship();
    const original = h.manager.findOne.getMockImplementation();
    h.manager.findOne.mockImplementation(async (entity: Row, query: Row) => {
      if (entity.name === 'Spacecraft') return host;
      if (entity.name === 'CrewAssignment') return query.where.crewId === 1 ? member : null;
      return original(entity, query);
    });
    h.manager.count = jest.fn(async () => 0);
    return { ...h, member, host };
  }

  it.each([7, 8])('allows host or crew owner %s, clears the slot, and notifies the other owner', async (actorId) => {
    const { service, member, host, messaging } = releaseSetup();
    const result = await service.releaseForeignCrew(9, 1, actorId);
    expect(result.podId).toBe(3);
    expect(member).toMatchObject({ spacecraftId: null, escapePodId: 3, slot: null });
    expect(host.crew).toBe(0);
    expect(messaging.sendSystem).toHaveBeenCalledWith(actorId === 7 ? 8 : 7, expect.any(String), expect.stringContaining('Opfer'), undefined, expect.anything(), undefined, false, expect.objectContaining({ manager: expect.anything() }));
  });

  it('rejects outsiders and own-ship own-crew releases without writes', async () => {
    const outsider = releaseSetup();
    await expect(outsider.service.releaseForeignCrew(9, 1, 99)).rejects.toThrow('Crewmitglied nicht gefunden');
    expect(outsider.saved).toEqual([]);
    const own = releaseSetup(7);
    await expect(own.service.releaseForeignCrew(9, 1, 7)).rejects.toThrow('Eigene Crew');
    expect(own.saved).toEqual([]);
  });
});
