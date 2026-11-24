import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AllianceRole, Faction } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { AllianceDepotService } from './alliance-depot.service';
import { AllianceDepot } from './entities/alliance-depot.entity';
import { AllianceContextCleanup } from './alliance-context-cleanup';
import { AllianceService } from './alliance.service';
import { TypeOrmAllianceStore } from './typeorm-alliance.store';
import { Alliance } from './entities/alliance.entity';
import { AllianceMembership } from './entities/alliance-membership.entity';
import { User } from '../auth/user.entity';
import {
  Spacecraft,
  SpacecraftKind,
  SpacecraftStatus,
  StationRole,
} from '../spacecraft/entities/spacecraft.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { GameDataService } from '../game-data/game-data.service';
import { StationScrappingService } from '../spacecraft/station-scrapping.service';
import { scrappingCode } from '../spacecraft/station-scrapping-rules';
import { MessagingService } from '../messaging/messaging.service';
import { PlayerTradePostService } from '../trade/player-trade-post.service';

describe('Alliance depots (PostgreSQL)', () => {
  let db: DataSource;
  let service: AllianceDepotService;
  let cleanup: AllianceContextCleanup;
  let lifecycle: AllianceService;
  let alliance: Alliance;
  let owner: User;
  let president: User;
  let vice: User;
  let diplomat: User;
  let outsider: User;
  let station: Spacecraft;
  beforeAll(async () => {
    db = await connectIntegrationDatabase();
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => {
    await resetDatabase(db);
    const rebels = await factionId(db, Faction.REBEL_ALLIANCE);
    owner = await createUser(db, {
      displayName: 'Depotbesitzer',
      factionId: rebels,
    });
    president = await createUser(db, { factionId: rebels });
    vice = await createUser(db, { factionId: rebels });
    diplomat = await createUser(db, { factionId: rebels });
    outsider = await createUser(db, { factionId: rebels });
    const store = new TypeOrmAllianceStore(db);
    const created = await store.insertAlliance({
      name: 'Logistik',
      description: '',
      factionId: rebels,
    });
    alliance = await db
      .getRepository(Alliance)
      .findOneByOrFail({ id: created.id });
    for (const [user, role] of [
      [president, AllianceRole.PRESIDENT],
      [owner, AllianceRole.NONE],
      [vice, AllianceRole.VICE],
      [diplomat, AllianceRole.DIPLOMAT],
    ] as const) {
      await store.insertMembership({
        allianceId: alliance.id,
        userId: user.id,
        role,
      });
    }
    const hull = await db.getRepository(ShipClassDef).save({
      key: 'DEPOT',
      name: 'Depot',
      role: 'DEPOT_SMALL',
      category: 'STATION',
      buildTimeTicks: 2,
    });
    const layer = await db
      .getRepository(Layer)
      .save({ name: 'Test', width: 3, height: 3 });
    const system = await db.getRepository(StarSystem).save({
      name: 'Basis',
      layerId: layer.id,
      cx: 1,
      cy: 1,
      systemTypeId: 1,
    });
    const field = await db
      .getRepository(SystemField)
      .save({ starSystemId: system.id, sx: 2, sy: 3, fieldTypeId: 1 });
    const location = await db
      .getRepository(SpaceLocation)
      .findOneByOrFail({ systemFieldId: field.id });
    station = await db.getRepository(Spacecraft).save({
      name: 'Versorgungsdepot',
      shipClassId: hull.id,
      userId: owner.id,
      locationId: location.id,
      kind: SpacecraftKind.STATION,
      stationRole: StationRole.DEPOT_SMALL,
      cargoMax: 100,
    });
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: station.id, commodityId: 5, amount: 9 });
    cleanup = new AllianceContextCleanup();
    service = new AllianceDepotService(db, cleanup, {
      getCommodity: () => ({ name: 'Tibanna-Gas' }),
    } as unknown as GameDataService);
    service.onModuleInit();
    lifecycle = new AllianceService(
      new TypeOrmAllianceStore(db),
      { sendSystem: jest.fn(async () => undefined) } as never,
      undefined,
      undefined,
      cleanup,
    );
  });
  const assign = () => service.assign(station.id, owner.id);

  it('assigns and removes only as the owner, retaining stock, ownership and docking rules', async () => {
    await expect(service.assign(station.id, president.id)).rejects.toThrow(
      'Station nicht gefunden',
    );
    await assign();
    await assign();
    expect(await db.getRepository(AllianceDepot).count()).toBe(1);
    expect((await service.get(station.id, owner.id)).alliance?.id).toBe(
      alliance.id,
    );
    await expect(service.unassign(station.id, vice.id)).rejects.toThrow(
      'Station nicht gefunden',
    );
    await service.unassign(station.id, owner.id);
    expect(await db.getRepository(AllianceDepot).count()).toBe(0);
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: station.id }))
        .userId,
    ).toBe(owner.id);
    expect(
      (
        await db
          .getRepository(CargoItem)
          .findOneByOrFail({ spacecraftId: station.id })
      ).amount,
    ).toBe(9);
  });
  it.each([
    'SHIP',
    'SHIPYARD',
    'CONSTRUCTION',
    'UNDER_SCRAPPING',
    'UNDER_CONSTRUCTION',
    'DESTROYED',
  ])('rejects unsuitable station state or role %s', async (mode) => {
    if (mode === 'SHIP')
      await db
        .getRepository(Spacecraft)
        .update(station.id, { kind: SpacecraftKind.SHIP });
    else if (['SHIPYARD', 'CONSTRUCTION'].includes(mode))
      await db
        .getRepository(Spacecraft)
        .update(station.id, { stationRole: mode as StationRole });
    else
      await db
        .getRepository(Spacecraft)
        .update(station.id, { status: mode as SpacecraftStatus });
    await expect(assign()).rejects.toThrow();
    expect(await db.getRepository(AllianceDepot).count()).toBe(0);
  });
  it('requires current membership and supports both depot roles', async () => {
    await db
      .getRepository(Spacecraft)
      .update(station.id, { stationRole: StationRole.DEPOT_LARGE });
    await assign();
    await service.unassign(station.id, owner.id);
    await lifecycle.leave(owner.id);
    await expect(assign()).rejects.toThrow('keiner Allianz');
  });
  it('only lets the president and vice read live owner, location and stock', async () => {
    await assign();
    for (const actor of [president, vice]) {
      const rows = await service.list(alliance.id, actor.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        stationId: station.id,
        name: station.name,
        owner: { id: owner.id, name: 'Depotbesitzer' },
        cargoUsed: 9,
        cargoMax: 100,
      });
      expect(rows[0].locationLabel).toContain('Basis');
      expect(rows[0].locationLabel).toContain('2|3');
      expect(rows[0].cargo).toEqual([
        { commodityId: 5, name: 'Tibanna-Gas', amount: 9 },
      ]);
    }
    for (const actor of [owner, diplomat, outsider])
      await expect(service.list(alliance.id, actor.id)).rejects.toThrow(
        ForbiddenException,
      );
    const store = new TypeOrmAllianceStore(db);
    const viceMembership = (await store.findMembership(vice.id))!;
    for (const role of viceMembership.roles)
      await store.unassignRole(viceMembership.id, role.id);
    await expect(service.list(alliance.id, vice.id)).rejects.toThrow(
      ForbiddenException,
    );
  });
  it.each(['leave', 'kick', 'dissolve'])(
    'cleans assignments inside the real alliance lifecycle: %s',
    async (action) => {
      await assign();
      if (action === 'leave') await lifecycle.leave(owner.id);
      if (action === 'kick')
        await lifecycle.kick(president.id, alliance.id, owner.id);
      if (action === 'dissolve')
        await lifecycle.dissolve(president.id, alliance.id);
      expect(await db.getRepository(AllianceDepot).count()).toBe(0);
      expect(
        await db.getRepository(Spacecraft).findOneBy({ id: station.id }),
      ).not.toBeNull();
    },
  );
  it('rolls membership and assignment back together if a later cleanup consumer fails', async () => {
    await assign();
    cleanup.register({
      memberRemoved: async () => {
        throw new Error('cleanup failed');
      },
    });
    await expect(lifecycle.leave(owner.id)).rejects.toThrow('cleanup failed');
    expect(await db.getRepository(AllianceDepot).count()).toBe(1);
    expect(
      await db
        .getRepository(AllianceMembership)
        .findOneBy({ userId: owner.id }),
    ).not.toBeNull();
  });
  it('cannot leave an assignment behind when assigning races with departure', async () => {
    await Promise.allSettled([assign(), lifecycle.leave(owner.id)]);
    expect(
      await db
        .getRepository(AllianceMembership)
        .findOneBy({ userId: owner.id }),
    ).toBeNull();
    expect(await db.getRepository(AllianceDepot).count()).toBe(0);
  });
  it('hides stations whose owner no longer matches the recorded alliance member', async () => {
    await assign();
    await db
      .getRepository(Spacecraft)
      .update(station.id, { userId: outsider.id });
    expect(await service.list(alliance.id, president.id)).toEqual([]);
  });
  it('deletes the association through the station foreign key on scrapping or destruction', async () => {
    await assign();
    await db.getRepository(Spacecraft).delete(station.id);
    expect(await db.getRepository(AllianceDepot).count()).toBe(0);
  });
  it('joins actual demontage completion and rolls back the cascade when its notification fails', async () => {
    await assign();
    const workerClass = await db
      .getRepository(ShipClassDef)
      .save({ key: 'BEE', name: 'Workbee', category: 'SHIP', role: 'WORKBEE' });
    await db.getRepository(Spacecraft).save({
      name: 'Workbee',
      shipClassId: workerClass.id,
      userId: owner.id,
      locationId: station.locationId,
      dockedAtId: station.id,
      hull: 1,
      crewRequired: 0,
    });
    const send = jest.fn(async () => undefined);
    const scrapping = new StationScrappingService(
      db,
      {
        getAllFabricationItems: () => [],
        getShipClassDefByKey: () => ({ station: { requiredWorkbees: 2 } }),
      } as unknown as GameDataService,
      { sendSystem: send } as unknown as MessagingService,
      {
        destroyForStation: async () => [],
      } as unknown as PlayerTradePostService,
    );
    await scrapping.start(station.id, owner.id, scrappingCode(station.name));
    expect(await db.getRepository(AllianceDepot).count()).toBe(1);
    send.mockRejectedValueOnce(new Error('message failed'));
    await expect(scrapping.processTick(station.id)).rejects.toThrow(
      'message failed',
    );
    expect(await db.getRepository(AllianceDepot).count()).toBe(1);
    await scrapping.processTick(station.id);
    expect(await db.getRepository(AllianceDepot).count()).toBe(0);
    expect(
      await db.getRepository(Spacecraft).findOneBy({ id: station.id }),
    ).toBeNull();
  });
  it('cleans all depot assignments on context reset without removing stations', async () => {
    await assign();
    await db.transaction((transaction) => cleanup.reset({ transaction }));
    expect(await db.getRepository(AllianceDepot).count()).toBe(0);
    expect(
      await db.getRepository(Spacecraft).findOneBy({ id: station.id }),
    ).not.toBeNull();
  });
});
