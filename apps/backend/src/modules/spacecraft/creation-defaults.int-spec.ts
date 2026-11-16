import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { Spacecraft, SpacecraftKind } from './entities/spacecraft.entity';
import { Fleet } from './entities/fleet.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { UserSetting } from '../settings/entities/user-setting.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';

describe('Player creation defaults (PostgreSQL)', () => {
  let db: DataSource,
    owner: number,
    other: number,
    hullId: number,
    locationId: number;
  beforeAll(async () => {
    db = await connectIntegrationDatabase();
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => {
    await resetDatabase(db);
    owner = (await createUser(db)).id;
    other = (await createUser(db)).id;
    hullId = (
      await db
        .getRepository(ShipClassDef)
        .save({
          key: 'DEFAULT',
          name: 'Falke',
          category: 'SHIP',
          role: 'FREIGHTER',
        })
    ).id;
    const layer = await db
      .getRepository(Layer)
      .save({ name: 'Test', width: 2, height: 2 });
    const system = await db
      .getRepository(StarSystem)
      .save({ name: 'Test', layerId: layer.id, cx: 1, cy: 1, systemTypeId: 1 });
    const field = await db
      .getRepository(SystemField)
      .save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId: 1 });
    locationId = (
      await db
        .getRepository(SpaceLocation)
        .findOneByOrFail({ systemFieldId: field.id })
    ).id;
  });
  const preferences = (userId: number, value: string) =>
    db.getRepository(UserSetting).upsert(
      [
        { userId, key: 'fleet_fixed_default', value },
        { userId, key: 'reactor_auto_carryover_default', value },
      ],
      ['userId', 'key'],
    );
  const ship = (userId: number, kind = SpacecraftKind.SHIP) => {
    const repo = db.getRepository(Spacecraft);
    return repo.save(
      repo.create({
        userId,
        name: 'Falke',
        shipClassId: hullId,
        locationId,
        kind,
      }),
    );
  };
  it('returns the owner defaults on inserts and never changes existing ships or fleets', async () => {
    const existing = await ship(owner);
    const fleets = db.getRepository(Fleet);
    const oldFleet = await fleets.save(
      fleets.create({ userId: owner, name: 'Old', leaderId: existing.id }),
    );
    expect(existing.reactorAutoCarryOver).toBe(false);
    expect(oldFleet.isFixed).toBe(false);
    await preferences(owner, '1');
    const created = await ship(owner);
    const newFleet = await fleets.save(
      fleets.create({ userId: owner, name: 'New', leaderId: created.id }),
    );
    expect(created.reactorAutoCarryOver).toBe(true);
    expect(newFleet.isFixed).toBe(true);
    await db.getRepository(Spacecraft).update(existing.id, { name: 'Renamed' });
    await fleets.update(oldFleet.id, { name: 'Renamed' });
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: existing.id }))
        .reactorAutoCarryOver,
    ).toBe(false);
    expect((await fleets.findOneByOrFail({ id: oldFleet.id })).isFixed).toBe(
      false,
    );
    await preferences(owner, '0');
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: created.id }))
        .reactorAutoCarryOver,
    ).toBe(true);
    expect((await fleets.findOneByOrFail({ id: newFleet.id })).isFixed).toBe(
      true,
    );
    expect((await ship(owner)).reactorAutoCarryOver).toBe(false);
  });
  it('covers stations and bulk/admin inserts while isolating different owners', async () => {
    await preferences(owner, '1');
    expect(
      (await ship(owner, SpacecraftKind.STATION)).reactorAutoCarryOver,
    ).toBe(true);
    const repo = db.getRepository(Spacecraft);
    const result = await repo.insert([
      { userId: owner, name: 'Reward', shipClassId: hullId, locationId },
      { userId: other, name: 'Other', shipClassId: hullId, locationId },
    ]);
    const inserted = await Promise.all(
      result.identifiers.map(({ id }) => repo.findOneByOrFail({ id })),
    );
    expect(inserted.map((s) => s.reactorAutoCarryOver)).toEqual([true, false]);
  });
});
