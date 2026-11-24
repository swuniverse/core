import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { StationScrappingService } from './station-scrapping.service';
import { scrappingCode } from './station-scrapping-rules';
import {
  Spacecraft,
  SpacecraftKind,
  SpacecraftStatus,
  StationRole,
} from './entities/spacecraft.entity';
import { StationScrapping } from './entities/station-scrapping.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { Crew } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { GameDataService } from '../game-data/game-data.service';
import {
  MessagingService,
  type TransactionalNotifications,
} from '../messaging/messaging.service';
import { PlayerTradePostService } from '../trade/player-trade-post.service';
import { SpacecraftService } from './spacecraft.service';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';
import { initializeSpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';

describe('Station scrapping (PostgreSQL)', () => {
  let db: DataSource;
  let service: StationScrappingService;
  let station: Spacecraft;
  let carrier: Spacecraft;
  let worker: Spacecraft;
  const delivered = jest.fn();
  const send = jest.fn(async (...args: unknown[]) => {
    (args[6] as TransactionalNotifications).afterCommit.push(() =>
      delivered(args[1]),
    );
  });
  const trade = { destroyForStation: jest.fn(async () => []) };
  const gameData = {
    getShipClassDefByKey: () => ({ station: { requiredWorkbees: 2 } }),
    getAllFabricationItems: () => [
      {
        moduleType: 'Sensoren',
        moduleCategory: 'SENSORS',
        moduleLevel: 1,
        outputCommodityId: 10101,
      },
    ],
    getCommodity: () => ({ name: 'Sensormodul' }),
  } as unknown as GameDataService;
  beforeAll(async () => {
    db = await connectIntegrationDatabase();
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    send.mockImplementation(async (...args: unknown[]) => {
      (args[6] as TransactionalNotifications).afterCommit.push(() =>
        delivered(args[1]),
      );
    });
    await resetDatabase(db);
    const user = await createUser(db);
    const hull = await db
      .getRepository(ShipClassDef)
      .save({
        key: 'DEPOT',
        name: 'Depot',
        category: 'STATION',
        role: 'DEPOT_SMALL',
        buildTimeTicks: 3,
      });
    const bee = await db
      .getRepository(ShipClassDef)
      .save({ key: 'BEE', name: 'Workbee', category: 'SHIP', role: 'WORKBEE' });
    const layer = await db
      .getRepository(Layer)
      .save({ name: 'Test', width: 3, height: 3 });
    const system = await db
      .getRepository(StarSystem)
      .save({ name: 'Test', layerId: layer.id, cx: 1, cy: 1, systemTypeId: 1 });
    const field = await db
      .getRepository(SystemField)
      .save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId: 1 });
    const location = await db
      .getRepository(SpaceLocation)
      .findOneByOrFail({ systemFieldId: field.id });
    station = await db
      .getRepository(Spacecraft)
      .save({
        name: 'Depot',
        userId: user.id,
        shipClassId: hull.id,
        locationId: location.id,
        kind: SpacecraftKind.STATION,
        stationRole: StationRole.DEPOT_SMALL,
        hull: 100,
        hullMax: 100,
        shields: 20,
        shieldsMax: 20,
        dockCapacity: 15,
      });
    carrier = await db
      .getRepository(Spacecraft)
      .save({
        name: 'Transporter',
        userId: user.id,
        shipClassId: bee.id,
        locationId: location.id,
        dockedAtId: station.id,
        cargoMax: 10,
        hull: 100,
        crewRequired: 0,
      });
    worker = await db
      .getRepository(Spacecraft)
      .save({
        name: 'Arbeitsdroide',
        userId: user.id,
        shipClassId: bee.id,
        locationId: location.id,
        dockedAtId: station.id,
        cargoMax: 0,
        hull: 100,
        crewRequired: 1,
      });
    await db
      .getRepository(SpacecraftModule)
      .save({
        spacecraftId: station.id,
        moduleType: 'Sensoren',
        category: 'SENSORS',
        level: 1,
        integrity: 100,
      });
    service = new StationScrappingService(
      db,
      gameData,
      { sendSystem: send } as unknown as MessagingService,
      trade as unknown as PlayerTradePostService,
    );
  });
  const start = () =>
    service.start(station.id, station.userId, scrappingCode(station.name));
  async function finalTick() {
    await db
      .getRepository(StationScrapping)
      .update(station.id, {
        remainingTicks: 1,
        modules: [{ commodityId: 10101, count: 1, guaranteed: true }],
      });
    return service.processTick(station.id);
  }
  async function addCrew(id: number) {
    const crew = await db
      .getRepository(Crew)
      .save({ userId: station.userId, name: 'Crew' });
    await db
      .getRepository(CrewAssignment)
      .save({ crewId: crew.id, userId: station.userId, spacecraftId: id });
  }

  it('requires ownership and exact current-name confirmation without changing modules', async () => {
    const other = await createUser(db);
    await expect(service.get(station.id, other.id)).rejects.toThrow(
      'Station nicht gefunden',
    );
    await expect(
      service.start(station.id, other.id, scrappingCode(station.name)),
    ).rejects.toThrow('Station nicht gefunden');
    await expect(
      service.start(station.id, station.userId, 'wrong'),
    ).rejects.toThrow('Bestätigungscode');
    await db
      .getRepository(Spacecraft)
      .update(station.id, { name: 'Neuer Name' });
    await expect(start()).rejects.toThrow('Bestätigungscode');
    expect(
      await db
        .getRepository(SpacecraftModule)
        .countBy({ spacecraftId: station.id }),
    ).toBe(1);
    expect(await db.getRepository(StationScrapping).count()).toBe(0);
  });
  it('rejects assigned crew even when the cached crew count is zero', async () => {
    await addCrew(station.id);
    expect(
      (await service.get(station.id, station.userId)).blockReason,
    ).toContain('unbemannt');
    await expect(start()).rejects.toThrow('unbemannt');
    expect(await db.getRepository(StationScrapping).count()).toBe(0);
  });
  it('starts once, removes systems and persists half-buildtime progress across reloads', async () => {
    expect(await start()).toEqual({ removed: false });
    const progress = await db
      .getRepository(StationScrapping)
      .findOneByOrFail({ stationId: station.id });
    expect(progress.remainingTicks).toBe(2);
    await start();
    expect(
      await db
        .getRepository(StationScrapping)
        .findOneByOrFail({ stationId: station.id }),
    ).toEqual(progress);
    const saved = await db
      .getRepository(Spacecraft)
      .findOneByOrFail({ id: station.id });
    expect(saved.status).toBe(SpacecraftStatus.UNDER_SCRAPPING);
    expect(saved.dockCapacity).toBe(50);
    expect(saved.shieldsMax).toBe(0);
    expect(initializeSpacecraftRuntimeSystems(saved)).toEqual({});
    expect(
      await db
        .getRepository(SpacecraftModule)
        .countBy({ spacecraftId: station.id }),
    ).toBe(0);
    expect((await service.get(station.id, station.userId)).active).toBe(true);
    expect(delivered).toHaveBeenCalledTimes(1);
  });
  it('pauses for insufficient operational workbees and resumes when crew returns', async () => {
    await start();
    await db.getRepository(Spacecraft).update(carrier.id, { dockedAtId: null });
    await service.processTick(station.id);
    expect((await service.get(station.id, station.userId)).remainingTicks).toBe(
      2,
    );
    await addCrew(worker.id);
    await service.processTick(station.id);
    expect((await service.get(station.id, station.userId)).remainingTicks).toBe(
      1,
    );
  });
  it('returns modules within capacity, deletes station-bound data and undocks every owner', async () => {
    const other = await createUser(db);
    await db.getRepository(Spacecraft).update(worker.id, { userId: other.id });
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: station.id, commodityId: 5, amount: 20 });
    await start();
    expect(await finalTick()).toBe(true);
    expect(
      await db.getRepository(Spacecraft).findOneBy({ id: station.id }),
    ).toBeNull();
    expect(await db.getRepository(StationScrapping).count()).toBe(0);
    expect(
      await db.getRepository(CargoItem).countBy({ spacecraftId: station.id }),
    ).toBe(0);
    const cargo = await db
      .getRepository(CargoItem)
      .findOneByOrFail({ spacecraftId: carrier.id, commodityId: 10101 });
    expect(cargo.amount).toBe(1);
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: carrier.id }))
        .cargoUsed,
    ).toBe(1);
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: worker.id }))
        .dockedAtId,
    ).toBeNull();
    expect(await service.processTick(station.id)).toBe(false);
  });
  it.each(['full', 'foreign', 'none'])(
    'does not overflow or return modules to an unsuitable recipient: %s',
    async (mode) => {
      await start();
      if (mode === 'full') {
        await db
          .getRepository(CargoItem)
          .save({ spacecraftId: carrier.id, commodityId: 5, amount: 10 });
      } else if (mode === 'foreign') {
        const other = await createUser(db);
        await db
          .getRepository(Spacecraft)
          .update(carrier.id, { userId: other.id });
      } else {
        await db
          .getRepository(Spacecraft)
          .update(carrier.id, { dockedAtId: null });
        await addCrew(worker.id);
      }
      await finalTick();
      expect(
        await db.getRepository(Spacecraft).findOneBy({ id: station.id }),
      ).toBeNull();
      expect(
        await db.getRepository(CargoItem).countBy({ commodityId: 10101 }),
      ).toBe(0);
    },
  );
  it('removes an uncrewed construct immediately and undocks its ships', async () => {
    await db
      .getRepository(Spacecraft)
      .update(station.id, {
        stationRole: StationRole.CONSTRUCTION,
        status: SpacecraftStatus.UNDER_CONSTRUCTION,
      });
    expect(await start()).toEqual({ removed: true });
    expect(await db.getRepository(StationScrapping).count()).toBe(0);
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: carrier.id }))
        .dockedAtId,
    ).toBeNull();
  });
  it('caps a partial module return against actual cargo instead of its cached total', async () => {
    await start();
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: carrier.id, commodityId: 5, amount: 9 });
    await db.getRepository(StationScrapping).update(station.id, {
      remainingTicks: 1,
      modules: [
        { commodityId: 10101, count: 1, guaranteed: true },
        { commodityId: 10102, count: 1, guaranteed: true },
      ],
    });
    await service.processTick(station.id);
    const cargo = await db
      .getRepository(CargoItem)
      .findBy({ spacecraftId: carrier.id });
    expect(cargo.reduce((sum, row) => sum + row.amount, 0)).toBe(10);
    expect(cargo.find((row) => row.commodityId === 10101)?.amount).toBe(1);
    expect(cargo.some((row) => row.commodityId === 10102)).toBe(false);
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: carrier.id }))
        .cargoUsed,
    ).toBe(10);
  });
  it('rolls back module removal on a failed start notification', async () => {
    send.mockRejectedValueOnce(new Error('message failed'));
    await expect(start()).rejects.toThrow('message failed');
    expect(await db.getRepository(StationScrapping).count()).toBe(0);
    expect(
      await db
        .getRepository(SpacecraftModule)
        .countBy({ spacecraftId: station.id }),
    ).toBe(1);
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: station.id }))
        .status,
    ).toBe(SpacecraftStatus.IDLE);
    expect(delivered).not.toHaveBeenCalled();
  });
  it('rolls back recycling and station removal on a failed completion notification', async () => {
    await start();
    delivered.mockClear();
    send.mockRejectedValueOnce(new Error('message failed'));
    await expect(finalTick()).rejects.toThrow('message failed');
    expect(
      await db.getRepository(Spacecraft).findOneBy({ id: station.id }),
    ).not.toBeNull();
    expect(
      await db.getRepository(CargoItem).countBy({ commodityId: 10101 }),
    ).toBe(0);
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: carrier.id }))
        .dockedAtId,
    ).toBe(station.id);
    expect(delivered).not.toHaveBeenCalled();
  });
  it('serializes two simultaneous starts without rerolling modules', async () => {
    await Promise.all([start(), start()]);
    expect(await db.getRepository(StationScrapping).count()).toBe(1);
    expect(delivered).toHaveBeenCalledTimes(1);
  });
  it('uses the spacecraft tick entry point and skips normal recharge after completion', async () => {
    await start();
    await db
      .getRepository(StationScrapping)
      .update(station.id, { remainingTicks: 1, modules: [] });
    await SpacecraftService.prototype.processTick.call(
      { stationScrapping: service } as unknown as SpacecraftService,
      station,
    );
    expect(
      await db.getRepository(Spacecraft).findOneBy({ id: station.id }),
    ).toBeNull();
  });
  it('keeps the scrapping lifecycle when combat saves a surviving station as idle', async () => {
    await start();
    const survivor = await db
      .getRepository(Spacecraft)
      .findOneByOrFail({ id: station.id });
    survivor.status = SpacecraftStatus.IDLE;
    const destruction = Object.assign(
      Object.create(SpacecraftDestructionService.prototype),
      { dataSource: db },
    ) as SpacecraftDestructionService;
    await destruction.saveCombatSurvivor(survivor);
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: station.id }))
        .status,
    ).toBe(SpacecraftStatus.UNDER_SCRAPPING);
    expect((await service.get(station.id, station.userId)).remainingTicks).toBe(
      2,
    );
  });
});
