import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { GameDataService } from '../game-data/game-data.service';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import {
  Spacecraft,
  SpacecraftKind,
  SpacecraftOperatingMode,
  SpacecraftStatus,
} from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { ShipClassDiscovery } from './entities/ship-class-discovery.entity';
import { FlightSignature } from './entities/flight-signature.entity';
import { FlightSignatureService } from './flight-signature.service';
import { ShipClassService } from './ship-class.service';
import { SignatureMaskService } from './signature-mask.service';

describe('signature masking (PostgreSQL)', () => {
  let db: DataSource,
    service: SignatureMaskService,
    signatures: FlightSignatureService;
  let owner: number,
    other: number,
    ship: Spacecraft,
    target: ShipClassDef,
    unlisted: ShipClassDef;
  let locations: SpaceLocation[], now: number;
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
    const hulls = await db.getRepository(ShipClassDef).save([
      { key: 'MASK_SOURCE', name: 'Falke', category: 'SHIP', role: 'SHIP' },
      { key: 'MASK_TARGET', name: 'Korvette', category: 'SHIP', role: 'SHIP' },
      {
        key: 'MASK_UNLISTED',
        name: 'Unbekannt',
        category: 'SHIP',
        role: 'SHIP',
      },
    ]);
    target = hulls[1];
    unlisted = hulls[2];
    const layer = await db
      .getRepository(Layer)
      .save({ name: 'Mask', width: 2, height: 1 });
    const fields = await db
      .getRepository(GalaxyField)
      .save(
        [1, 2].map((cx) => ({ layerId: layer.id, cx, cy: 1, fieldTypeId: 1 })),
      );
    locations = await Promise.all(
      fields.map((field) =>
        db
          .getRepository(SpaceLocation)
          .findOneByOrFail({ galaxyFieldId: field.id }),
      ),
    );
    ship = await db.getRepository(Spacecraft).save({
      name: 'Nova',
      userId: owner,
      shipClassId: hulls[0].id,
      locationId: locations[0].id,
      energy: 200,
      runtimeSystems: {
        WARPDRIVE: { active: true, integrity: 100, cooldown: 0 },
      },
    });
    await db.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperdrive',
      level: 1,
      isActive: true,
    });
    await db.getRepository(ShipClassDiscovery).save({
      userId: owner,
      shipClassId: target.id,
      source: 'TARGET_SCAN',
      sourceSpacecraftId: ship.id,
      targetSpacecraftId: ship.id,
    });
    const data = {
      getShipClassDefByKey: (key: string) =>
        key === 'MASK_UNLISTED'
          ? undefined
          : { stuRumpId: key === 'MASK_TARGET' ? 2 : 1 },
      getShipyardRumpModuleRules: (id: number) => ({
        moduleRules: { HYPERDRIVE: { level: id === 2 ? 3 : 1 } },
      }),
    } as unknown as GameDataService;
    now = Date.UTC(2030, 0, 1);
    service = new SignatureMaskService(db, data, () => now);
    signatures = new FlightSignatureService(
      db.getRepository(FlightSignature),
      {
        findById: (id: number) =>
          db.getRepository(ShipClassDef).findOneBy({ id }),
      } as ShipClassService,
      service,
    );
  });
  const emit = async () => {
    const current = await db
      .getRepository(Spacecraft)
      .findOneByOrFail({ id: ship.id });
    await signatures.createMovement(
      current,
      locations[0],
      locations[1],
      'EAST',
    );
  };
  it('quotes only discovered mobile hulls and charges the target level, replacing the five-minute window', async () => {
    expect((await service.get(ship.id, owner)).choices).toEqual([
      { shipClassId: target.id, name: 'Korvette', driveLevel: 3, epsCost: 75 },
    ]);
    const state = await service.activate(ship.id, owner, target.id);
    expect(state.energy).toBe(125);
    expect(state.active).toMatchObject({
      shipClassId: target.id,
      expiresAt: new Date(now + 300000).toISOString(),
    });
    now += 60000;
    expect((await service.activate(ship.id, owner, target.id)).energy).toBe(50);
    expect((await service.get(ship.id, owner)).active?.expiresAt).toBe(
      new Date(now + 300000).toISOString(),
    );
  });
  it('protects ownership and rejects unknown, own, station and unmapped hulls without mutation', async () => {
    await expect(service.activate(ship.id, other, target.id)).rejects.toThrow(
      'Schiff',
    );
    await expect(
      service.activate(ship.id, owner, ship.shipClassId),
    ).rejects.toThrow('Rumpf');
    await expect(service.activate(ship.id, owner, unlisted.id)).rejects.toThrow(
      'Rumpf',
    );
    await db.getRepository(ShipClassDiscovery).save({
      userId: owner,
      shipClassId: unlisted.id,
      source: 'TARGET_SCAN',
      sourceSpacecraftId: ship.id,
      targetSpacecraftId: ship.id,
    });
    await expect(service.activate(ship.id, owner, unlisted.id)).rejects.toThrow(
      'Rumpf',
    );
    await db
      .getRepository(ShipClassDef)
      .update(target.id, { category: 'STATION' });
    await expect(service.activate(ship.id, owner, target.id)).rejects.toThrow(
      'Rumpf',
    );
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: ship.id }))
        .energy,
    ).toBe(200);
    expect((await service.get(ship.id, owner)).active).toBeNull();
  });
  it('serializes competing activations and rolls back insufficient EPS with the existing mask intact', async () => {
    await db.getRepository(Spacecraft).update(ship.id, { energy: 100 });
    const attempts = await Promise.allSettled([
      service.activate(ship.id, owner, target.id),
      service.activate(ship.id, owner, target.id),
    ]);
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const state = await service.get(ship.id, owner);
    expect(state.energy).toBe(25);
    expect(state.active).not.toBeNull();
    await expect(service.activate(ship.id, owner, target.id)).rejects.toThrow(
      'EPS',
    );
    expect((await service.get(ship.id, owner)).active).toEqual(state.active);
  });
  it('changes only newly created snapshots, expires exactly at the boundary and deactivates for free', async () => {
    await emit();
    await service.activate(ship.id, owner, target.id);
    await emit();
    now += 300000;
    await emit();
    const rows = await db
      .getRepository(FlightSignature)
      .find({ order: { id: 'ASC' } });
    expect(rows.map((row) => row.shipClassId)).toEqual([
      ship.shipClassId,
      ship.shipClassId,
      target.id,
      target.id,
      ship.shipClassId,
      ship.shipClassId,
    ]);
    expect(
      rows.every(
        (row) => row.userId === owner && row.spacecraftName === 'Nova',
      ),
    ).toBe(true);
    expect(rows.map((row) => [row.toDirection, row.fromDirection])).toEqual(
      Array.from({ length: 3 }, () => [
        ['EAST', null],
        [null, 'WEST'],
      ]).flat(),
    );
    await service.activate(ship.id, owner, target.id);
    const energy = (await service.get(ship.id, owner)).energy;
    expect((await service.deactivate(ship.id, owner)).energy).toBe(energy);
    await emit();
    expect(
      (
        await db.getRepository(FlightSignature).find({ order: { id: 'ASC' } })
      )[2].shipClassName,
    ).toBe('Korvette');
  });
  it.each([
    'shutdown',
    'runtime damage',
    'offline module',
    'damage',
    'remove',
  ] as const)(
    'ends masking permanently on %s, including repair before another signature',
    async (reason) => {
      await service.activate(ship.id, owner, target.id);
      const modules = db.getRepository(SpacecraftModule);
      if (reason === 'shutdown') {
        await db.getRepository(Spacecraft).update(ship.id, {
          runtimeSystems: { WARPDRIVE: { active: false, integrity: 100 } },
        });
        await db.getRepository(Spacecraft).update(ship.id, {
          runtimeSystems: { WARPDRIVE: { active: true, integrity: 100 } },
        });
      } else if (reason === 'runtime damage') {
        await db.getRepository(Spacecraft).update(ship.id, {
          runtimeSystems: { WARPDRIVE: { active: true, integrity: 0 } },
        });
        await db.getRepository(Spacecraft).update(ship.id, {
          runtimeSystems: { WARPDRIVE: { active: true, integrity: 100 } },
        });
      } else if (reason === 'offline module') {
        await modules.update({ spacecraftId: ship.id }, { isActive: false });
        await modules.update({ spacecraftId: ship.id }, { isActive: true });
      } else if (reason === 'damage') {
        await modules.update({ spacecraftId: ship.id }, { integrity: 0 });
        await modules.update({ spacecraftId: ship.id }, { integrity: 100 });
      } else {
        await modules.delete({ spacecraftId: ship.id });
        await modules.save({
          spacecraftId: ship.id,
          category: 'HYPERDRIVE',
          moduleType: 'Hyperdrive',
          level: 1,
        });
      }
      await emit();
      expect((await service.get(ship.id, owner)).active).toBeNull();
      expect(
        (await db.getRepository(FlightSignature).find())[0].shipClassId,
      ).toBe(ship.shipClassId);
    },
  );
  it.each([
    'station',
    'combat',
    'standby',
    'system location',
    'offline',
    'defective',
    'missing module',
  ])('rejects activation on %s without charging EPS', async (reason) => {
    const ships = db.getRepository(Spacecraft);
    if (reason === 'station')
      await ships.update(ship.id, { kind: SpacecraftKind.STATION });
    if (reason === 'combat')
      await ships.update(ship.id, { status: SpacecraftStatus.IN_COMBAT });
    if (reason === 'standby')
      await ships.update(ship.id, {
        operatingMode: SpacecraftOperatingMode.STANDBY,
      });
    if (reason === 'system location') {
      const field = await db
        .getRepository(GalaxyField)
        .findOneByOrFail({ id: locations[0].galaxyFieldId ?? 0 });
      const system = await db
        .getRepository(StarSystem)
        .save({
          name: 'Mask system',
          layerId: field.layerId,
          cx: 1,
          cy: 1,
          systemTypeId: 1,
        });
      const systemField = await db
        .getRepository(SystemField)
        .save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId: 1 });
      const location = await db
        .getRepository(SpaceLocation)
        .findOneByOrFail({ systemFieldId: systemField.id });
      await ships.update(ship.id, { locationId: location.id });
    }
    if (reason === 'offline' || reason === 'defective')
      await ships.update(ship.id, {
        runtimeSystems: {
          WARPDRIVE: {
            active: reason !== 'offline',
            integrity: reason === 'defective' ? 0 : 100,
          },
        },
      });
    if (reason === 'missing module')
      await db
        .getRepository(SpacecraftModule)
        .delete({ spacecraftId: ship.id });
    await expect(service.activate(ship.id, owner, target.id)).rejects.toThrow();
    const state = await service.get(ship.id, owner);
    expect(state.energy).toBe(200);
    expect(state.active).toBeNull();
    expect(state.blockReason).not.toBeNull();
  });
  it('rolls back module invalidation and signature emission with the movement transaction', async () => {
    const before = await service.activate(ship.id, owner, target.id);
    await expect(
      db.transaction(async (manager) => {
        await signatures.createMovement(
          ship,
          locations[0],
          locations[1],
          null,
          manager,
        );
        await manager.update(
          SpacecraftModule,
          { spacecraftId: ship.id },
          { integrity: 0 },
        );
        throw new Error('movement aborted');
      }),
    ).rejects.toThrow('movement aborted');
    expect(await db.getRepository(FlightSignature).count()).toBe(0);
    expect((await service.get(ship.id, owner)).active).toEqual(before.active);
    await emit();
    expect(
      (await db.getRepository(FlightSignature).find())[0].shipClassId,
    ).toBe(target.id);
  });
  it('emits the masked snapshot through a caller-supplied movement transaction', async () => {
    await service.activate(ship.id, owner, target.id);
    await db.transaction((manager) =>
      signatures.createMovement(
        ship,
        locations[0],
        locations[1],
        null,
        manager,
      ),
    );
    expect(await db.getRepository(FlightSignature).find()).toMatchObject([
      { shipClassId: target.id },
      { shipClassId: target.id },
    ]);
  });
});
