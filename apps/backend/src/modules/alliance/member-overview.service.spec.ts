import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AllianceRole } from '@swuniverse/shared';
import { InMemoryAllianceStore } from './testing/in-memory-alliance.store';
import { MemberOverviewService } from './member-overview.service';
import type {
  ColonyStockRecord,
  MemberOperationsReader,
  MemberOperationsRecord,
} from './member-operations.port';

const { NONE, PRESIDENT, VICE, DIPLOMAT } = AllianceRole;

class FakeReader implements MemberOperationsReader {
  calls: number[][] = [];
  data = new Map<number, Partial<MemberOperationsRecord>>();
  stocks = new Map<number, ColonyStockRecord>();

  async colonyStock(colonyId: number) {
    return this.stocks.get(colonyId) ?? null;
  }

  async memberOperations(userIds: number[]) {
    this.calls.push(userIds);
    return userIds.map((userId) => ({
      userId,
      lastActiveAt: null,
      crew: { assigned: 0, limit: 0 },
      colonies: [],
      ships: [],
      ...this.data.get(userId),
    }));
  }
}

function setup() {
  const store = new InMemoryAllianceStore();
  const reader = new FakeReader();
  const service = new MemberOverviewService(store, reader);
  store.addPlayer(1, 'Leia');
  store.addPlayer(2, 'Han');
  store.addPlayer(3, 'Lando');
  store.addPlayer(4, 'Wedge');
  store.addPlayer(5, 'Outsider');
  const alliance = store.seedAlliance({ name: 'Rogue', viceTitle: 'Vize' }, [
    [1, PRESIDENT],
    [2, VICE],
    [3, DIPLOMAT],
    [4, NONE],
  ]);
  const other = store.seedAlliance({ name: 'Other' }, [[5, PRESIDENT]]);
  return { store, reader, service, alliance, other };
}

describe('MemberOverviewService', () => {
  it.each([
    ['president', 1],
    ['vice', 2],
  ])('gives the %s the overview of all current members', async (_n, viewer) => {
    const { service, alliance } = setup();
    const overview = await service.getOverview(viewer, alliance.id);
    expect(overview.allianceId).toBe(alliance.id);
    expect(overview.members.map((m) => [m.userId, m.name, m.role])).toEqual([
      [1, 'Leia', PRESIDENT],
      [2, 'Han', VICE],
      [3, 'Lando', DIPLOMAT],
      [4, 'Wedge', NONE],
    ]);
    expect(overview.members[1]).toMatchObject({
      roleTitle: 'Vize',
      faction: 'REBEL_ALLIANCE',
    });
    expect(overview.members[3].roleTitle).toBeNull();
  });

  it('refuses diplomat and member without office with Forbidden', async () => {
    const { service, alliance } = setup();
    await expect(service.getOverview(3, alliance.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.getOverview(4, alliance.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('hides the alliance from non-members and members of other alliances', async () => {
    const { service, alliance, other, store } = setup();
    store.addPlayer(6, 'Nobody');
    await expect(service.getOverview(6, alliance.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.getOverview(5, alliance.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.getOverview(1, other.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.getOverview(1, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('loads the data of all current members in one bundled read', async () => {
    const { service, alliance, reader, store } = setup();
    await service.getOverview(1, alliance.id);
    expect(reader.calls).toHaveLength(1);
    expect([...reader.calls[0]].sort()).toEqual([1, 2, 3, 4]);

    await store.deleteMembership(alliance.id, 4);
    await service.getOverview(1, alliance.id);
    expect([...reader.calls[1]].sort()).toEqual([1, 2, 3]);
  });

  it('maps operational data and groups ships by class', async () => {
    const { service, alliance, reader } = setup();
    const location = { scope: 'SYSTEM' as const, systemId: 7, x: 3, y: 4 };
    reader.data.set(4, {
      lastActiveAt: new Date('2026-10-08T10:00:00.000Z'),
      crew: { assigned: 12, limit: 40 },
      colonies: [
        {
          id: 9,
          name: 'Hoth Base',
          location,
          energy: 5,
          energyMax: 50,
          storageUsed: 100,
          storageMax: 3000,
          population: 20,
          populationMax: 80,
        },
      ],
      ships: [
        {
          id: 1,
          name: 'Z1',
          shipClassId: 2,
          shipClassName: 'Fregatte',
          location,
        },
        { id: 2, name: 'A1', shipClassId: 1, shipClassName: 'Jäger', location },
        {
          id: 3,
          name: 'A2',
          shipClassId: 1,
          shipClassName: 'Jäger',
          location: null,
        },
      ],
    });
    const wedge = (await service.getOverview(1, alliance.id)).members[3];
    expect(wedge.lastActiveAt).toBe('2026-10-08T10:00:00.000Z');
    expect(wedge.crew).toEqual({ assigned: 12, limit: 40 });
    expect(wedge.colonies).toEqual([
      {
        id: 9,
        name: 'Hoth Base',
        location,
        energy: 5,
        energyMax: 50,
        storageUsed: 100,
        storageMax: 3000,
        population: 20,
        populationMax: 80,
      },
    ]);
    expect(wedge.shipGroups).toEqual([
      {
        shipClassId: 2,
        shipClassName: 'Fregatte',
        ships: [{ id: 1, name: 'Z1', location }],
      },
      {
        shipClassId: 1,
        shipClassName: 'Jäger',
        ships: [
          { id: 2, name: 'A1', location },
          { id: 3, name: 'A2', location: null },
        ],
      },
    ]);
  });

  it('reports no activity as null and never leaks extra reader fields', async () => {
    const { service, alliance, reader } = setup();
    reader.data.set(2, {
      email: 'han@example.test',
      notes: 'secret',
      cargo: [1],
      colonies: [
        {
          id: 1,
          name: 'C',
          location: null,
          energy: 1,
          energyMax: 2,
          storageUsed: 3,
          storageMax: 4,
          population: 5,
          populationMax: 6,
          surface: 'x',
        },
      ],
      ships: [
        {
          id: 1,
          name: 'S',
          shipClassId: 1,
          shipClassName: 'K',
          location: null,
          hull: 5,
          crew: 3,
          logbook: ['x'],
        },
      ],
    } as never);
    const overview = await service.getOverview(1, alliance.id);
    expect(overview.members[0].lastActiveAt).toBeNull();
    expect(Object.keys(overview.members[1]).sort()).toEqual([
      'avatar',
      'colonies',
      'crew',
      'faction',
      'factionName',
      'lastActiveAt',
      'name',
      'role',
      'roleTitle',
      'shipGroups',
      'userId',
    ]);
    const text = JSON.stringify(overview);
    for (const leaked of [
      'han@example',
      'secret',
      'logbook',
      'surface',
      'hull',
    ]) {
      expect(text).not.toContain(leaked);
    }
  });

  describe('colony stock', () => {
    const stock = (userId: number): ColonyStockRecord => ({
      colonyId: 9,
      userId,
      items: [{ commodityId: 1, name: 'Deuterium', amount: 40 }],
    });

    it.each([
      ['president', 1],
      ['vice', 2],
    ])('gives the %s the stock of a member colony', async (_n, viewer) => {
      const { service, alliance, reader } = setup();
      reader.stocks.set(9, stock(4));
      expect(await service.getColonyStock(viewer, alliance.id, 9)).toEqual({
        allianceId: alliance.id,
        colonyId: 9,
        items: [{ commodityId: 1, name: 'Deuterium', amount: 40 }],
      });
    });

    it('refuses diplomat and member without office with Forbidden', async () => {
      const { service, alliance, reader } = setup();
      reader.stocks.set(9, stock(4));
      for (const viewer of [3, 4]) {
        await expect(
          service.getColonyStock(viewer, alliance.id, 9),
        ).rejects.toBeInstanceOf(ForbiddenException);
      }
    });

    it('hides the alliance from outsiders', async () => {
      const { service, alliance, other, reader } = setup();
      reader.stocks.set(9, stock(4));
      await expect(
        service.getColonyStock(5, alliance.id, 9),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.getColonyStock(1, other.id, 9),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('answers Not Found for colonies of outsiders, former members and unknown or abandoned colonies', async () => {
      const { service, alliance, reader, store } = setup();
      store.addPlayer(6, 'Former');
      reader.stocks.set(10, { ...stock(5), colonyId: 10 });
      reader.stocks.set(11, { ...stock(6), colonyId: 11 });
      for (const colonyId of [10, 11, 999]) {
        await expect(
          service.getColonyStock(1, alliance.id, colonyId),
        ).rejects.toBeInstanceOf(NotFoundException);
      }
    });
  });
});
