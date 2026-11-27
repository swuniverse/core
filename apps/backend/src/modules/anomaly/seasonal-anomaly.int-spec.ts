import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { PrestigeHistoryEntry } from '../prestige/entities/prestige-history-entry.entity';
import { PrestigeService } from '../prestige/prestige.service';
import { AnomalyQueryService } from './anomaly-query.service';
import { SeasonalAnomalyService } from './seasonal-anomaly.service';
import { SeasonalAnomalyHandler } from './seasonal-anomaly.handler';
import { Anomaly } from './entities/anomaly.entity';

describe('Seasonal anomalies (PostgreSQL, fixed Berlin clock)', () => {
  let db: DataSource,
    service: SeasonalAnomalyService,
    now: Date,
    owner: number,
    other: number,
    hullId: number,
    locations: SpaceLocation[],
    enabled: string;
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
      await db.getRepository(ShipClassDef).save({
        key: 'SEASONAL',
        name: 'Falke',
        category: 'SHIP',
        role: 'FREIGHTER',
      })
    ).id;
    const layer = await db
      .getRepository(Layer)
      .save({ name: 'Season', width: 20, height: 1, isDefault: true });
    const typeRepo = db.getRepository(GalaxyFieldType);
    const type =
      (await typeRepo.findOneBy({ key: 'SEASONAL_TEST' })) ??
      (await typeRepo.save({
        key: 'SEASONAL_TEST',
        name: 'Space',
        passable: true,
        isSystem: false,
      }));
    await db.getRepository(GalaxyField).save(
      Array.from({ length: 12 }, (_, i) => ({
        layerId: layer.id,
        cx: i + 1,
        cy: 1,
        fieldTypeId: type.id,
      })),
    );
    locations = await db
      .getRepository(SpaceLocation)
      .find({ order: { id: 'ASC' } });
    enabled = 'true';
    now = new Date('2026-11-30T23:00:00Z');
    service = new SeasonalAnomalyService(
      db,
      { get: () => enabled } as unknown as ConfigService,
      new PrestigeService(db.getRepository(PrestigeHistoryEntry)),
      () => now,
      () => 0,
    );
  });
  const anomalies = () =>
    db
      .getRepository(Anomaly)
      .find({ relations: ['type'], order: { id: 'ASC' } });
  const ship = (userId: number, locationId: number, cargoMax = 10) =>
    db.getRepository(Spacecraft).save({
      userId,
      locationId,
      shipClassId: hullId,
      name: 'Falke',
      cargoMax,
    });

  it('generates three bounty hunters at Berlin midnight exactly once, including concurrent jobs', async () => {
    now = new Date('2026-11-30T22:59:59Z');
    await service.generate();
    expect(await anomalies()).toHaveLength(0);
    now = new Date('2026-11-30T23:00:00Z');
    await Promise.all([service.generate(), service.generate()]);
    const gifts = await anomalies();
    expect(gifts).toHaveLength(3);
    expect(new Set(gifts.map((a) => a.locationId)).size).toBe(3);
    expect(gifts.every((a) => a.type.key === 'LIFE_DAY_GIFT')).toBe(true);
    expect(
      new SeasonalAnomalyHandler('LIFE_DAY_GIFT', service).present(gifts[0]),
    ).toEqual({ id: gifts[0].id, canOpen: true });
  });
  it('clears prior collectible cargo without losing other goods or corrupting cargo capacity', async () => {
    const old = await ship(owner, locations.at(-1)!.id);
    await db.getRepository(CargoItem).save([
      { spacecraftId: old.id, commodityId: 60, amount: 2 },
      { spacecraftId: old.id, commodityId: 1, amount: 3 },
    ]);
    await db.getRepository(Spacecraft).update(old.id, { cargoUsed: 5 });
    await service.generate();
    expect(
      await db.getRepository(CargoItem).findBy({ spacecraftId: old.id }),
    ).toEqual([expect.objectContaining({ commodityId: 1, amount: 3 })]);
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: old.id }))
        .cargoUsed,
    ).toBe(3);
  });
  it('pays 100 prestige per day, 100 and 500 on December 6, and no goods before December 24', async () => {
    await service.generate();
    const gifts = await anomalies();
    const a = await ship(owner, gifts[0].locationId!),
      b = await ship(owner, gifts[1].locationId!);
    now = new Date('2026-12-01T12:00:00Z');
    expect(await service.open(owner, a.id, gifts[0].id)).toMatchObject({
      commodityId: null,
      amount: 0,
      prestigeAwarded: 100,
    });
    await expect(service.open(owner, b.id, gifts[1].id)).rejects.toThrow(
      'heute bereits',
    );
    now = new Date('2026-12-05T23:00:00Z');
    expect((await service.open(owner, a.id, gifts[0].id)).prestigeAwarded).toBe(
      100,
    );
    expect((await service.open(owner, b.id, gifts[1].id)).prestigeAwarded).toBe(
      500,
    );
    await expect(service.open(owner, a.id, gifts[0].id)).rejects.toThrow(
      'heute bereits',
    );
    expect(
      (await db.getRepository(User).findOneByOrFail({ id: owner })).prestige,
    ).toBe(700);
    expect(await db.getRepository(CargoItem).count()).toBe(0);
  });
  it('hands out the prisoner on December 24 and fails a full cargo hold atomically', async () => {
    await service.generate();
    const gift = (await anomalies())[0];
    const a = await ship(owner, gift.locationId!, 1);
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: a.id, commodityId: 1, amount: 1 });
    now = new Date('2026-12-23T23:00:00Z');
    await expect(service.open(owner, a.id, gift.id)).rejects.toThrow(
      'Frachtraum ist voll',
    );
    expect(
      await db.query('SELECT * FROM seasonal_anomaly_openings'),
    ).toHaveLength(0);
    expect(await db.getRepository(PrestigeHistoryEntry).count()).toBe(0);
    await db.getRepository(CargoItem).delete({ spacecraftId: a.id });
    expect(await service.open(owner, a.id, gift.id)).toMatchObject({
      commodityId: 60,
      amount: 1,
      prestigeAwarded: 100,
    });
  });
  it('sends the faction orders and grants the awards on December 25 exactly once', async () => {
    const send = jest.fn(),
      grant = jest.fn();
    const winter = new SeasonalAnomalyService(
      db,
      { get: () => enabled } as unknown as ConfigService,
      new PrestigeService(db.getRepository(PrestigeHistoryEntry)),
      () => now,
      () => 0,
      { grant } as never,
      { send } as never,
    );
    await winter.generate();
    const gift = (await anomalies())[0];
    const a = await ship(owner, gift.locationId!);
    now = new Date('2026-12-01T12:00:00Z');
    await winter.open(owner, a.id, gift.id);
    await db.query(
      `UPDATE users SET faction = 'GALACTIC_EMPIRE' WHERE id = $1`,
      [owner],
    );
    now = new Date('2026-11-30T23:00:00Z');
    await winter.generate();
    await winter.generate();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(
      expect.stringContaining('Dreckige Rebellen'),
      null,
      'GALACTIC_EMPIRE',
    );
    send.mockClear();
    now = new Date('2026-12-01T23:00:00Z');
    await winter.generate();
    expect(send).toHaveBeenCalledWith(
      'Haben Sie Neuigkeiten vom Kopfgeldjäger?',
      null,
      'REBEL_ALLIANCE',
    );
    expect(grant).not.toHaveBeenCalled();
    send.mockClear();
    now = new Date('2026-12-24T23:00:00Z');
    await winter.generate();
    await winter.generate();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0]).toContain('Er wurde gefasst');
    expect(grant).toHaveBeenCalledTimes(1);
    expect(grant).toHaveBeenCalledWith(owner, 'BOUNTY_HUNTER_CAUGHT_EMPIRE');
  });
  it('colours the sensors by the distance of the nearest bounty hunter', async () => {
    await service.generate();
    const hunters = await db.getRepository(Anomaly).find({
      relations: ['location', 'location.galaxyField'],
      order: { id: 'ASC' },
    });
    const field = hunters[0].location!.galaxyField!;
    const query = new AnomalyQueryService(db, {} as never);
    // Every hunter sits on row 1 of the 12-field test layer; distance = |cx - x|.
    const at = (x: number, range: number) =>
      query.hunterSignal(field.layerId, x, 1, range);
    const nearest = Math.max(...hunters.map((h) => h.location!.galaxyField!.cx));
    expect(await at(nearest, 1)).toBe('RED');
    expect(await at(nearest + 2, 1)).toBe('ORANGE');
    expect(await at(nearest + 3, 1)).toBe('YELLOW');
    expect(await at(nearest + 4, 1)).toBeNull();
    expect(await at(nearest, 0)).toBeNull();
  });
  it('protects ownership, field position, crew and the operator flag', async () => {
    await service.generate();
    const gift = (await anomalies())[0];
    const a = await ship(owner, gift.locationId!);
    await expect(service.open(other, a.id, gift.id)).rejects.toThrow(
      'Schiff nicht gefunden',
    );
    const remote = await ship(owner, locations.at(-1)!.id);
    await expect(service.open(owner, remote.id, gift.id)).rejects.toThrow(
      'nicht auf deinem Feld',
    );
    await db
      .getRepository(Spacecraft)
      .update(a.id, { crew: 0, crewRequired: 1 });
    await expect(service.open(owner, a.id, gift.id)).rejects.toThrow(
      'Nicht genügend Crew',
    );
    enabled = 'false';
    await expect(service.open(owner, a.id, gift.id)).rejects.toThrow(
      'deaktiviert',
    );
    expect(
      new SeasonalAnomalyHandler('LIFE_DAY_GIFT', service).present(gift)
        .canOpen,
    ).toBe(false);
  });
  it('creates spring capsules on computed Easter Sunday and awards only the last claimed capsule', async () => {
    now = new Date('2026-04-04T21:59:59Z');
    await service.generate();
    expect(await anomalies()).toHaveLength(0);
    now = new Date('2026-04-04T22:00:00Z');
    await service.generate();
    const eggs = await anomalies();
    expect(eggs).toHaveLength(5);
    expect(eggs.every((a) => a.type.key === 'SPRING_CAPSULE')).toBe(true);
    const a = await ship(owner, eggs[0].locationId!);
    for (let i = 0; i < eggs.length; i++) {
      await db
        .getRepository(Spacecraft)
        .update(a.id, { locationId: eggs[i].locationId! });
      expect(
        (await service.open(owner, a.id, eggs[i].id)).prestigeAwarded,
      ).toBe(i === 4 ? 500 : 0);
    }
    await expect(service.open(owner, a.id, eggs[4].id)).rejects.toThrow(
      'nicht gefunden',
    );
    expect(
      (
        await db
          .getRepository(CargoItem)
          .findOneByOrFail({ spacecraftId: a.id, commodityId: 73 })
      ).amount,
    ).toBe(5);
    expect(await db.getRepository(PrestigeHistoryEntry).count()).toBe(1);
    await service.generate();
    expect(await anomalies()).toHaveLength(0);
  });
  it('serializes rival openings of the last spring capsule', async () => {
    now = new Date('2026-04-04T22:00:00Z');
    await service.generate();
    const eggs = await anomalies();
    await db.getRepository(Anomaly).delete(eggs.slice(0, 4).map((a) => a.id));
    const last = eggs[4],
      a = await ship(owner, last.locationId!),
      b = await ship(other, last.locationId!);
    const results = await Promise.allSettled([
      service.open(owner, a.id, last.id),
      service.open(other, b.id, last.id),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.getRepository(PrestigeHistoryEntry).count()).toBe(1);
    expect(
      await db.getRepository(CargoItem).sum('amount', { commodityId: 73 }),
    ).toBe(1);
  });
  it('does not create when disabled, and expires gifts outside Advent', async () => {
    enabled = 'false';
    await service.generate();
    expect(await anomalies()).toHaveLength(0);
    enabled = 'true';
    await service.generate();
    const gift = (await anomalies())[0];
    now = new Date('2026-12-24T23:00:00Z');
    expect(service.active(gift)).toBe(false);
    await service.handleTick(gift, db.manager);
    expect(gift.remainingTicks).toBe(1);
  });
});
