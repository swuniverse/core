import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { Colony } from '../colony/entities/colony.entity';
import { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { Fleet } from './entities/fleet.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { leaveFleetOnDestruction } from './fleet-leadership';
import { RepairOrphanedFleetLeaders20261114180000 } from '../../database/migrations/20261114180000-repair-orphaned-fleet-leaders';

describe('fleet leadership on destruction (PostgreSQL)', () => {
  let dataSource: DataSource;
  let userId: number;
  let colonyId: number;
  let ships: Spacecraft[];
  let fleet: Fleet;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
  });
  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    userId = (await createUser(dataSource)).id;
    const ownerId = (await createUser(dataSource)).id;
    const layer = await dataSource.getRepository(Layer).save({ name: 'Outer Rim', width: 10, height: 10 });
    const system = await dataSource
      .getRepository(StarSystem)
      .save({ name: 'Kashyyyk', cx: 1, cy: 1, layerId: layer.id, systemTypeId: 1 });
    const fieldTypeId = (await dataSource.getRepository(GalaxyFieldType).findOneByOrFail({})).id;
    const field = await dataSource
      .getRepository(SystemField)
      .save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId });
    const location = await dataSource.getRepository(SpaceLocation).findOneByOrFail({ systemFieldId: field.id });
    colonyId = (
      await dataSource.getRepository(Colony).save({
        name: 'Kolonie',
        userId: ownerId,
        starSystemId: system.id,
        systemFieldId: field.id,
        posX: 1,
        posY: 1,
        colonyClassId: 1,
      })
    ).id;
    const shipClassId = (
      await dataSource
        .getRepository(ShipClassDef)
        .save({ key: 'FLEET_LEADERSHIP', name: 'Fregatte', category: 'FRIGATE', role: 'ESCORT' })
    ).id;
    ships = [];
    for (const name of ['Leader', 'Zweiter', 'Dritter']) {
      ships.push(
        await dataSource
          .getRepository(Spacecraft)
          .save({ name, userId, shipClassId, locationId: location.id, runtimeSystems: {} }),
      );
    }
    fleet = await dataSource.getRepository(Fleet).save({ name: 'Rot', userId, leaderId: ships[0].id });
    await dataSource.getRepository(Spacecraft).update(
      ships.map((ship) => ship.id),
      { fleetId: fleet.id },
    );
  });

  const destroy = (ship: Spacecraft) =>
    dataSource.transaction(async (manager) => {
      await leaveFleetOnDestruction(manager, { id: ship.id, fleetId: fleet.id });
      // As in finalizeInManager: the row disappears after the fleet hand-over.
      await manager.delete(Spacecraft, ship.id);
    });

  const orbitOrder = (spacecraftId: number) =>
    dataSource.query(
      `INSERT INTO "colony_orbit_assignments" ("colonyId", "spacecraftId", "fleetId", "mode") VALUES ($1, $2, $3, 'BLOCKADE')`,
      [colonyId, spacecraftId, fleet.id],
    );

  const orbitOrders = (): Promise<Array<{ spacecraftId: number; fleetId: number }>> =>
    dataSource.query('SELECT "spacecraftId", "fleetId" FROM "colony_orbit_assignments"');

  it('hands a destroyed leader’s fleet and blockade to the remaining member with the lowest id', async () => {
    await orbitOrder(ships[0].id);

    await destroy(ships[0]);

    expect(await dataSource.getRepository(Fleet).findOneByOrFail({ id: fleet.id })).toMatchObject({
      leaderId: ships[1].id,
    });
    expect(await orbitOrders()).toEqual([{ spacecraftId: ships[1].id, fleetId: fleet.id }]);
  });

  it('skips destroyed members when choosing the successor', async () => {
    await dataSource.getRepository(Spacecraft).update(ships[1].id, { status: SpacecraftStatus.DESTROYED });

    await destroy(ships[0]);

    expect(await dataSource.getRepository(Fleet).findOneByOrFail({ id: fleet.id })).toMatchObject({
      leaderId: ships[2].id,
    });
  });

  it('lets a destroyed member only leave and moves its orbit order to the leader', async () => {
    await orbitOrder(ships[2].id);

    await destroy(ships[2]);

    expect(await dataSource.getRepository(Fleet).findOneByOrFail({ id: fleet.id })).toMatchObject({
      leaderId: ships[0].id,
    });
    expect(await orbitOrders()).toEqual([{ spacecraftId: ships[0].id, fleetId: fleet.id }]);
  });

  it('deletes the fleet and its orbit order when the last ship is destroyed', async () => {
    await dataSource.getRepository(Spacecraft).update([ships[1].id, ships[2].id], { fleetId: null });
    await orbitOrder(ships[0].id);

    await destroy(ships[0]);

    expect(await dataSource.getRepository(Fleet).findOneBy({ id: fleet.id })).toBeNull();
    expect(await orbitOrders()).toEqual([]);
  });

  it('ignores ships without a fleet', async () => {
    await dataSource.transaction((manager) => leaveFleetOnDestruction(manager, { id: ships[0].id, fleetId: null }));

    expect(await dataSource.getRepository(Fleet).findOneByOrFail({ id: fleet.id })).toMatchObject({
      leaderId: ships[0].id,
    });
  });

  it('repairs fleets left with a missing leader and deletes empty fleets (migration)', async () => {
    await dataSource.getRepository(Fleet).update(fleet.id, { leaderId: 987654 });
    const empty = await dataSource.getRepository(Fleet).save({ name: 'Leer', userId, leaderId: 987655 });
    const intact = await dataSource.getRepository(Fleet).save({ name: 'Intakt', userId, leaderId: ships[2].id });
    await dataSource.getRepository(Spacecraft).update(ships[2].id, { fleetId: intact.id });
    const runner = dataSource.createQueryRunner();
    try {
      await new RepairOrphanedFleetLeaders20261114180000().up(runner);
    } finally {
      await runner.release();
    }

    expect(await dataSource.getRepository(Fleet).findOneByOrFail({ id: fleet.id })).toMatchObject({
      leaderId: ships[0].id,
    });
    expect(await dataSource.getRepository(Fleet).findOneBy({ id: empty.id })).toBeNull();
    expect(await dataSource.getRepository(Fleet).findOneByOrFail({ id: intact.id })).toMatchObject({
      leaderId: ships[2].id,
    });
  });
});
