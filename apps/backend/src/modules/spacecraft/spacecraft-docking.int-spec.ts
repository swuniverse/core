import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { Layer } from '../starmap/entities/layer.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { Spacecraft, SpacecraftKind } from './entities/spacecraft.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { Fleet } from './entities/fleet.entity';
import { SpacecraftDockingService } from './spacecraft-docking.service';

describe('Ship-by-ship fleet docking (PostgreSQL)', () => {
  let db: DataSource;
  let service: SpacecraftDockingService;
  let owner: number;
  let locationId: number;
  let shipClassId: number;

  beforeAll(async () => {
    db = await connectIntegrationDatabase();
    service = new SpacecraftDockingService(
      db,
      { hasEnoughCrew: async () => true } as never,
      {
        cancelTasks: async () => [],
        notifyCancelled: async () => undefined,
      } as never,
      {
        decide: async () => ({ allowed: true }),
        notifyForeignDocking: async () => undefined,
      } as never,
      { sendSystem: async () => undefined } as never,
    );
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => {
    await resetDatabase(db);
    owner = (await createUser(db)).id;
    const layer = await db.manager.save(Layer, { name: 'Dock', width: 3, height: 3 });
    const field = await db.manager.save(GalaxyField, { layerId: layer.id, cx: 1, cy: 1, fieldTypeId: 1 });
    locationId = (await db.manager.findOneByOrFail(SpaceLocation, { galaxyFieldId: field.id })).id;
    shipClassId = (
      await db.manager.save(ShipClassDef, { key: 'DOCK', name: 'Dock hull', category: 'SHIP', role: 'SCOUT', crewMin: 0 })
    ).id;
  });

  const save = (values: Partial<Spacecraft>) =>
    db.manager.save(Spacecraft, { userId: owner, shipClassId, locationId, energy: 5, runtimeSystems: {}, ...values });
  async function fleetOf(count: number, overrides: Array<Partial<Spacecraft>> = []) {
    const ships: Spacecraft[] = [];
    for (let i = 0; i < count; i++) ships.push(await save({ name: `Schiff ${i + 1}`, ...overrides[i] }));
    const fleet = await db.manager.save(Fleet, { name: 'Alpha', userId: owner, leaderId: ships[0].id });
    await db.manager.update(Spacecraft, ships.map((ship) => ship.id), { fleetId: fleet.id });
    return { fleet, ships };
  }
  const reload = (ids: number[]) =>
    db.manager.find(Spacecraft, { where: ids.map((id) => ({ id })), order: { id: 'ASC' } });

  it('persists the ships docked before an EPS abort and leaves the rest untouched', async () => {
    const station = await save({ name: 'Station', kind: SpacecraftKind.STATION, dockCapacity: 5 });
    const { ships } = await fleetOf(3, [{}, { energy: 0 }, {}]);

    const result = await service.dock(ships[0].id, owner, station.id);

    expect(result.ships?.map((entry) => entry.status)).toEqual(['docked', 'aborted']);
    expect((await reload(ships.map((ship) => ship.id))).map((ship) => [ship.dockedAtId, ship.energy])).toEqual([
      [station.id, 4],
      [null, 0],
      [null, 5],
    ]);
  });

  it('lets the station pay 1 EPS per ship when it docks the fleet', async () => {
    const station = await save({ name: 'Station', kind: SpacecraftKind.STATION, dockCapacity: 5, energy: 2 });
    const { fleet, ships } = await fleetOf(3);

    const result = await service.dockFleetAtStation(station.id, owner, fleet.id);

    expect(result.shipIds).toHaveLength(2);
    expect((await reload([station.id])).map((row) => row.energy)).toEqual([0]);
    expect((await reload(ships.map((ship) => ship.id))).filter((ship) => ship.dockedAtId === station.id)).toHaveLength(2);
  });

  it('never overfills the docking slots when a fleet and a single ship dock concurrently', async () => {
    const station = await save({ name: 'Station', kind: SpacecraftKind.STATION, dockCapacity: 3 });
    const { ships } = await fleetOf(3);
    const single = await save({ name: 'Einzel' });

    const outcomes = await Promise.allSettled([
      service.dock(ships[0].id, owner, station.id),
      service.dock(single.id, owner, station.id),
    ]);

    const docked = await db.manager.countBy(Spacecraft, { dockedAtId: station.id });
    expect(docked).toBe(3);
    const reported = outcomes.flatMap((outcome) => (outcome.status === 'fulfilled' ? outcome.value.shipIds : []));
    expect(reported.sort()).toEqual(
      (await db.manager.findBy(Spacecraft, { dockedAtId: station.id })).map((ship) => ship.id).sort(),
    );
  });
});
