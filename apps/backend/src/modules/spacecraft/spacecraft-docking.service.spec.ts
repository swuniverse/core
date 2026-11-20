jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftKind: { SHIP: 'SHIP', STATION: 'STATION' },
  AlertState: { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' },
  SpacecraftStatus: { IDLE: 'IDLE', IN_FLIGHT: 'IN_FLIGHT', DESTROYED: 'DESTROYED', UNDER_SCRAPPING: 'UNDER_SCRAPPING' },
}));
jest.mock('./entities/fleet.entity', () => ({ Fleet: class Fleet {} }));
jest.mock('./spacecraft-crew.service', () => ({ SpacecraftCrewService: class SpacecraftCrewService {} }));
jest.mock('./spacecraft-repair.service', () => ({ SpacecraftRepairService: class SpacecraftRepairService {} }));
jest.mock('./spacecraft-runtime-state.service', () => ({
  initializeSpacecraftRuntimeSystems: (ship: { runtimeSystems?: object }) =>
    ship.runtimeSystems ?? {},
}));
jest.mock('./spacecraft-field', () => ({
  sameSpacecraftLocation: (a: { locationId: number }, b: { locationId: number }) =>
    a.locationId === b.locationId,
  resolveSpacecraftLocation: () => ({ scope: 'SYSTEM' }),
}));

import { BadRequestException } from '@nestjs/common';
import { Fleet } from './entities/fleet.entity';
import { SpacecraftDockingService } from './spacecraft-docking.service';

type Row = Record<string, any>;

const ship = (id: number, overrides: Row = {}): Row => ({
  id,
  userId: 1,
  name: `Schiff ${id}`,
  kind: 'SHIP',
  status: 'IDLE',
  locationId: 7,
  energy: 5,
  dockedAtId: null,
  fleetId: null,
  runtimeSystems: { SHIELDS: { active: true }, WARPDRIVE: { active: true } },
  ...overrides,
});
const station = (overrides: Row = {}): Row => ({
  id: 100,
  userId: 1,
  name: 'Station',
  kind: 'STATION',
  status: 'IDLE',
  locationId: 7,
  dockCapacity: 2,
  energy: 0,
  dockedAtId: null,
  runtimeSystems: {},
  ...overrides,
});

function setup(
  rows: Row[],
  fleet: Row | null = null,
  occupied = 0,
  access: { allowed: boolean } = { allowed: false },
) {
  const save = jest.fn(async (value: unknown) => value);
  const spacecraftRepo = {
    find: jest.fn(async (options: { where: Row }) => {
      const where = options.where;
      if (where.id?._value) {
        return rows.filter((row) => where.id._value.includes(row.id));
      }
      if (where.fleetId != null) return rows.filter((row) => row.fleetId === where.fleetId);
      if (where.dockedAtId != null) return rows.filter((row) => row.dockedAtId === where.dockedAtId);
      return [];
    }),
    countBy: jest.fn(async () => occupied),
    findOneBy: jest.fn(async ({ id }: { id: number }) => rows.find((row) => row.id === id)),
  };
  const fleetRepo = { findOne: jest.fn(async () => fleet) };
  const manager = {
    getRepository: (entity: unknown) => (entity === Fleet ? fleetRepo : spacecraftRepo),
    save,
  };
  const dataSource = { transaction: jest.fn(async (work: any) => work(manager)) };
  const crew = { hasEnoughCrew: jest.fn(async () => true) };
  const repair = {
    cancelTasks: jest.fn(async () => []),
    notifyCancelled: jest.fn(async () => undefined),
  };
  const privileges = {
    decide: jest.fn(async (_manager: unknown, st: Row, sh: Row) =>
      st.userId === sh.userId || access.allowed
        ? { allowed: true }
        : { allowed: false, reason: 'Das Andocken wurde verweigert' },
    ),
    notifyForeignDocking: jest.fn(async () => undefined),
  };
  const messaging = { sendSystem: jest.fn(async () => undefined) };
  const service = new SpacecraftDockingService(
    dataSource as any,
    crew as any,
    repair as any,
    privileges as any,
    messaging as any,
  );
  return { service, save, crew, repair, spacecraftRepo, dataSource, privileges, messaging };
}

jest.mock('typeorm', () => ({
  ...jest.requireActual('typeorm'),
  In: (value: number[]) => ({ _value: value }),
}));

describe('SpacecraftDockingService', () => {
  it('allows a workbee to dock while station scrapping is paused', async () => {
    const a = ship(1);
    const { service } = setup([a, station({ status: 'UNDER_SCRAPPING', dockCapacity: 50 })]);
    await service.dock(1, 1, 100);
    expect(a.dockedAtId).toBe(100);
  });
  it('docks a foreign ship when the access rules allow it and notifies the owner', async () => {
    const a = ship(1);
    const { service, privileges } = setup(
      [a, station({ userId: 2, dockPmAutoRead: true })],
      null,
      0,
      { allowed: true },
    );
    await service.dock(1, 1, 100);
    expect(a.dockedAtId).toBe(100);
    expect(privileges.notifyForeignDocking).toHaveBeenCalledWith(
      expect.objectContaining({ id: 100, userId: 2, dockPmAutoRead: true }),
      [a],
    );
  });

  it('docks a ship for 1 EPS, drops shields and warp, and fills a slot', async () => {
    const a = ship(1);
    const { service, save } = setup([a, station()]);
    const result = await service.dock(1, 1, 100);
    expect(result.shipIds).toEqual([1]);
    expect(a.dockedAtId).toBe(100);
    expect(a.energy).toBe(4);
    expect(a.runtimeSystems.SHIELDS.active).toBe(false);
    expect(a.runtimeSystems.WARPDRIVE.active).toBe(false);
    expect(save).toHaveBeenCalled();
  });

  it('rejects docking when all dock slots are taken', async () => {
    const a = ship(1);
    const { service, save } = setup([a, station()], null, 2);
    await expect(service.dock(1, 1, 100)).rejects.toThrow('Dockplätze');
    expect(a.dockedAtId).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it.each([
    ['cloak', { runtimeSystems: { CLOAK: { active: true } } }, 'Tarnung'],
    ['no EPS', { energy: 0 }, 'Energie'],
    ['in flight', { status: 'IN_FLIGHT' }, 'nicht bereit'],
    ['other field', { locationId: 8 }, 'Feld der Station'],
  ])('rejects a ship with %s', async (_name, overrides, message) => {
    const { service } = setup([ship(1, overrides), station()]);
    await expect(service.dock(1, 1, 100)).rejects.toThrow(message as string);
  });

  it('rejects docking while the station shields are up and for foreign owners', async () => {
    const shielded = setup([ship(1), station({ runtimeSystems: { SHIELDS: { active: true } } })]);
    await expect(shielded.service.dock(1, 1, 100)).rejects.toThrow('Schilde');
    const foreign = setup([ship(1), station({ userId: 2 })]);
    await expect(foreign.service.dock(1, 1, 100)).rejects.toThrow('verweigert');
  });

  it('rejects insufficient crew', async () => {
    const { service, crew } = setup([ship(1), station()]);
    crew.hasEnoughCrew.mockResolvedValue(false);
    await expect(service.dock(1, 1, 100)).rejects.toThrow('Crew');
  });

  describe('fleet docking', () => {
    const fleet = { id: 5, leaderId: 1, name: 'Alpha' };

    it('docks every member in one action', async () => {
      const rows = [ship(1, { fleetId: 5 }), ship(2, { fleetId: 5 }), station()];
      const { service } = setup(rows, fleet);
      const result = await service.dock(1, 1, 100);
      expect(result.shipIds.sort()).toEqual([1, 2]);
      expect(rows[0].dockedAtId).toBe(100);
      expect(rows[1].dockedAtId).toBe(100);
    });

    it('is all or nothing when one member fails validation', async () => {
      const rows = [ship(1, { fleetId: 5 }), ship(2, { fleetId: 5, energy: 0 }), station()];
      const { service, save } = setup(rows, fleet);
      await expect(service.dock(1, 1, 100)).rejects.toBeInstanceOf(BadRequestException);
      expect(rows[0].dockedAtId).toBeNull();
      expect(rows[0].energy).toBe(5);
      expect(save).not.toHaveBeenCalled();
    });

    it('rejects when the free slots do not fit the whole fleet', async () => {
      const rows = [ship(1, { fleetId: 5 }), ship(2, { fleetId: 5 }), station()];
      const { service } = setup(rows, fleet, 1);
      await expect(service.dock(1, 1, 100)).rejects.toThrow('Dockplätze');
      expect(rows[0].dockedAtId).toBeNull();
    });

    it('treats members already at this station as fulfilled and rejects another station', async () => {
      const done = [ship(1, { fleetId: 5 }), ship(2, { fleetId: 5, dockedAtId: 100 }), station()];
      const ok = setup(done, fleet, 1);
      const result = await ok.service.dock(1, 1, 100);
      expect(result.shipIds).toEqual([1]);
      const other = [ship(1, { fleetId: 5 }), ship(2, { fleetId: 5, dockedAtId: 200 }), station()];
      await expect(setup(other, fleet).service.dock(1, 1, 100)).rejects.toThrow('anderen Station');
    });

    it('cancels repairs only on success', async () => {
      const rows = [ship(1, { fleetId: 5 }), station()];
      const { service, repair } = setup(rows, fleet);
      await service.dock(1, 1, 100);
      expect(repair.cancelTasks).toHaveBeenCalledWith(expect.anything(), [1]);
    });
  });

  describe('undocking', () => {
    it('costs the ship 1 EPS and needs EPS', async () => {
      const a = ship(1, { dockedAtId: 100 });
      const { service } = setup([a, station()]);
      await service.undock(1, 1);
      expect(a.dockedAtId).toBeNull();
      expect(a.energy).toBe(4);
      const dry = ship(1, { dockedAtId: 100, energy: 0 });
      await expect(setup([dry, station()]).service.undock(1, 1)).rejects.toThrow('Energie');
      expect(dry.dockedAtId).toBe(100);
    });

    it('rejects a ship that is not docked', async () => {
      await expect(setup([ship(1), station()]).service.undock(1, 1)).rejects.toThrow('nicht angedockt');
    });

    it('undocks the fleet together, all or nothing', async () => {
      const fleet = { id: 5, leaderId: 1, name: 'Alpha' };
      const rows = [
        ship(1, { fleetId: 5, dockedAtId: 100 }),
        ship(2, { fleetId: 5, dockedAtId: 100 }),
        station(),
      ];
      await setup(rows, fleet).service.undock(1, 1);
      expect(rows[0].dockedAtId).toBeNull();
      expect(rows[1].dockedAtId).toBeNull();
      const failing = [
        ship(1, { fleetId: 5, dockedAtId: 100 }),
        ship(2, { fleetId: 5, dockedAtId: 100, energy: 0 }),
        station(),
      ];
      await expect(setup(failing, fleet).service.undock(1, 1)).rejects.toThrow('Energie');
      expect(failing[0].dockedAtId).toBe(100);
      expect(failing[0].energy).toBe(5);
    });

    it('lets the station undock one or all ships without EPS cost', async () => {
      const a = ship(1, { dockedAtId: 100, energy: 0 });
      const b = ship(2, { dockedAtId: 100, energy: 0 });
      const single = setup([a, b, station()]);
      await single.service.undockFromStation(100, 1, 1);
      expect(a.dockedAtId).toBeNull();
      expect(a.energy).toBe(0);
      expect(b.dockedAtId).toBe(100);
      const all = await single.service.undockAll(100, 1);
      expect(all.message).toBe('Alle 1 Schiffe wurden erfolgreich abgedockt');
      expect(b.dockedAtId).toBeNull();
    });

    it('rejects forced undocking of ships docked elsewhere or by non-owners', async () => {
      const a = ship(1, { dockedAtId: 200 });
      await expect(setup([a, station()]).service.undockFromStation(100, 1, 1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(setup([ship(1), station({ userId: 2 })]).service.undockAll(100, 1)).rejects.toThrow(
        'Station nicht gefunden',
      );
    });
  });

  describe('docking the tractored ship (STU DockTractoredShip)', () => {
    const held = (overrides: Row = {}) =>
      ship(1, { userId: 2, name: 'Beute', alertState: 'GREEN', ...overrides });
    const holder = (overrides: Row = {}) =>
      station({
        energy: 3,
        tractoredShipId: 1,
        runtimeSystems: { TRACTOR_BEAM: { active: true, integrity: 100 } },
        ...overrides,
      });

    it('docks the held ship for 1 station EPS, releases the beam and informs the owner', async () => {
      const target = held();
      const st = holder();
      const { service, messaging } = setup([target, st]);

      const result = await service.dockTractored(100, 1);

      expect(result).toEqual({ message: 'Andockvorgang abgeschlossen', shipIds: [1] });
      expect(target.dockedAtId).toBe(100);
      expect(target.runtimeSystems.SHIELDS.active).toBe(false);
      expect(st.energy).toBe(2);
      expect(st.tractoredShipId).toBeNull();
      expect(st.runtimeSystems.TRACTOR_BEAM.active).toBe(false);
      expect(messaging.sendSystem).toHaveBeenCalledWith(2, 'Traktorstrahl', 'Die Beute wurde an der Station Station angedockt');
    });

    it.each([
      ['no held ship', [held(), holder({ tractoredShipId: null })], 0, 'Die Station hält kein Schiff im Traktorstrahl'],
      ['no EPS', [held(), holder({ energy: 0 })], 0, 'Zum Andocken wird 1 Energie benötigt'],
      ['no free slot', [held(), holder()], 2, 'Zurzeit sind alle Dockplätze belegt'],
      ['multi-ship fleet', [held({ fleetId: 5 }), ship(2, { fleetId: 5 }), holder()], 0, 'Aktion nicht möglich. Das Ziel befindet sich in einer Flotte.'],
      ['not on green', [held({ alertState: 'YELLOW' }), holder()], 0, 'Aktion nicht möglich. Das Ziel ist nicht auf Alarm Grün.'],
    ])('rejects %s', async (_case, rows, occupied, message) => {
      const { service, messaging } = setup(rows as Row[], null, occupied as number);
      await expect(service.dockTractored(100, 1)).rejects.toThrow(message as string);
      expect(rows[0].dockedAtId).toBeNull();
      expect(messaging.sendSystem).not.toHaveBeenCalled();
    });

    it('allows a held ship that leads a single-ship fleet', async () => {
      const target = held({ fleetId: 5 });
      const { service } = setup([target, holder()]);
      await service.dockTractored(100, 1);
      expect(target.dockedAtId).toBe(100);
    });

    it('rejects without station crew and for foreign stations', async () => {
      const first = setup([held(), holder()]);
      first.crew.hasEnoughCrew.mockResolvedValue(false);
      await expect(first.service.dockTractored(100, 1)).rejects.toThrow('Nicht genügend Crew vorhanden');
      const second = setup([held(), holder({ userId: 3 })]);
      await expect(second.service.dockTractored(100, 1)).rejects.toThrow('Station nicht gefunden');
    });
  });
});
