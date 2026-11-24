import { SpacecraftService } from './spacecraft.service';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { ResourceCollectionService } from './resource-collection.service';
import {
  Spacecraft,
  SpacecraftStatus,
  SpacecraftOperatingMode,
} from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { GameDataService } from '../game-data/game-data.service';
import { MessagingService } from '../messaging/messaging.service';
import { SpacecraftResourceFlowService } from './spacecraft-resource-flow.service';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { FlightConsequencePipeline } from './flight-consequence-pipeline';
import { WormholePassageService } from './wormhole-passage.service';
import { Wormhole } from '../starmap/entities/wormhole.entity';
import { FieldTransitionExecutor } from './field-transition-executor';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { FieldMiningRequest } from './resource-collection.controller';
import { LocationMining } from './entities/location-mining.entity';
import { LocationMiningRegenerationService } from './location-mining-regeneration.service';

// Real migrations, ship/module/cargo locks and persisted resource selection.
describe('Resource collection (PostgreSQL)', () => {
  let db: DataSource;
  let service: ResourceCollectionService;
  let ship: Spacecraft;
  let field: GalaxyField;
  let type: GalaxyFieldType;
  let typeCounter = 0;
  let otherLocation: SpaceLocation;
  const delivered = jest.fn();
  const messaging = {
    sendSystem: jest.fn(async (...args: unknown[]) => {
      const transaction = args[6] as
        | { afterCommit: Array<() => void> }
        | undefined;
      if (transaction) transaction.afterCommit.push(() => delivered(args[1]));
      else delivered(args[1]);
    }),
  };
  const sendImplementation = messaging.sendSystem.getMockImplementation()!;
  const commodities = [
    { id: 3, name: 'Tibanna-Gas', isBeamable: true },
    { id: 9, name: 'Phrik-Erz', isBeamable: true },
    { id: 999, name: 'Restricted', isBeamable: false },
  ];
  const gameData = {
    getCommodity: (id: number) => commodities.find((row) => row.id === id),
    getAllCommodities: () => commodities,
    getAllModules: () => moduleDefinitions,
  } as unknown as GameDataService;
  let moduleDefinitions: unknown[] = [];
  beforeAll(async () => {
    db = await connectIntegrationDatabase();
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    messaging.sendSystem.mockImplementation(sendImplementation);
    moduleDefinitions = [];
    // 95 + floor(0.5 * 11) = 100 units per tick without a faction module.
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    await resetDatabase(db);
    const owner = await createUser(db);
    const shipClass = await db.getRepository(ShipClassDef).save({
      key: 'MINING',
      name: 'Mining ship',
      category: 'SHIP',
      role: 'SCOUT',
    });
    const layer = await db
      .getRepository(Layer)
      .save({ name: 'Mining layer', width: 5, height: 5, isHidden: false });
    type = await db.getRepository(GalaxyFieldType).save({
      key: `TEST_MINING_${++typeCounter}`,
      name: 'Mining nebula',
      miningResources: [
        { commodityId: 3, rate: 100 },
        { commodityId: 9, rate: 40 },
      ],
    });
    field = await db
      .getRepository(GalaxyField)
      .save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: type.id });
    const location = await db
      .getRepository(SpaceLocation)
      .findOneByOrFail({ galaxyFieldId: field.id });
    const otherField = await db
      .getRepository(GalaxyField)
      .save({ layerId: layer.id, cx: 2, cy: 1, fieldTypeId: 1 });
    otherLocation = await db
      .getRepository(SpaceLocation)
      .findOneByOrFail({ galaxyFieldId: otherField.id });
    ship = await db.getRepository(Spacecraft).save({
      name: 'Prospector',
      userId: owner.id,
      shipClassId: shipClass.id,
      locationId: location.id,
      energy: 80,
      energyMax: 100,
      epsMax: 100,
      cargoMax: 150,
      // Short-range sensors start OFF like STU (sc-AUD-02); collecting needs them.
      runtimeSystems: {
        SHORT_RANGE_SENSORS: { active: true, integrity: 100, cooldown: 0 },
      },
    });
    await db.getRepository(SpacecraftModule).save([
      {
        spacecraftId: ship.id,
        category: 'SPECIAL',
        moduleType: 'Ressourcen-Kollektor',
        integrity: 100,
        isActive: false,
      },
      {
        spacecraftId: ship.id,
        category: 'SENSORS',
        moduleType: 'Sensoren',
        integrity: 100,
        isActive: true,
      },
      {
        spacecraftId: ship.id,
        category: 'SUBLIGHT_DRIVE',
        moduleType: 'Impuls',
        integrity: 100,
        isActive: true,
      },
    ]);
    service = new ResourceCollectionService(
      db,
      gameData,
      messaging as unknown as MessagingService,
    );
  });
  async function snapshot() {
    return {
      ship: await db.getRepository(Spacecraft).findOneByOrFail({ id: ship.id }),
      cargo: await db
        .getRepository(CargoItem)
        .find({ where: { spacecraftId: ship.id }, order: { id: 'ASC' } }),
    };
  }
  it('persists selection, charges activation once, collects per tick and caps the last tick to actual free cargo', async () => {
    expect((await service.select(ship.id, ship.userId, 3)).state).toBe(
      'GATHER_RESOURCES',
    );
    expect((await snapshot()).ship.energy).toBe(65);
    await service.select(ship.id, ship.userId, 9);
    expect((await snapshot()).ship.energy).toBe(65);
    await service.select(ship.id, ship.userId, 3);
    await service.processTick(ship.id);
    expect((await snapshot()).cargo[0].amount).toBe(100);
    await service.processTick(ship.id);
    const after = await snapshot();
    expect(after.cargo[0].amount).toBe(150);
    expect(after.ship.cargoUsed).toBe(150);
    expect((await service.get(ship.id, ship.userId)).state).toBe('IDLE');
    expect(delivered).toHaveBeenCalledWith(
      expect.stringContaining('Lagerraum'),
    );
    await service.processTick(ship.id);
    expect(await snapshot()).toEqual(after);
  });
  it('uses actual mixed cargo rather than stale cargoUsed and can be stopped explicitly', async () => {
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: ship.id, commodityId: 9, amount: 130 });
    expect((await service.get(ship.id, ship.userId)).freeCargo).toBe(20);
    await service.select(ship.id, ship.userId, 3);
    await service.select(ship.id, ship.userId, null);
    await service.processTick(ship.id);
    expect((await snapshot()).cargo).toHaveLength(1);
    expect(delivered).toHaveBeenCalledWith(
      expect.stringContaining('keine Ressourcen'),
    );
  });
  it('accounts for 10 EPS per active tick and brownout cancels before producing cargo', async () => {
    await service.select(ship.id, ship.userId, 3);
    const loaded = await db
      .getRepository(Spacecraft)
      .findOneOrFail({ where: { id: ship.id }, relations: ['modules'] });
    const flow = new SpacecraftResourceFlowService(
      new SpacecraftRuntimeStateService(),
    );
    expect(
      flow
        .calculate(loaded)
        .systems.find((row) => row.systemKey === 'RESOURCE_COLLECTOR')
        ?.epsPerTick,
    ).toBe(10);
    loaded.energy = 0;
    loaded.reactorFuel = 0;
    loaded.reactorOutput = 0;
    expect(flow.recharge(loaded).deactivatedSystems).toContain(
      'Ressourcen-Kollektor',
    );
    await db.getRepository(Spacecraft).save(loaded);
    await service.processTick(ship.id);
    expect((await snapshot()).cargo).toHaveLength(0);
    expect((await service.get(ship.id, ship.userId)).state).toBe('IDLE');
  });
  it.each([
    'unknown resource',
    'no module',
    'destroyed module',
    'energy',
    'crew',
    'full cargo',
    'combat',
    'standby',
    'docked',
    'held tractor',
  ])('rejects %s without writes', async (reason) => {
    let selected = 3;
    if (reason === 'unknown resource') selected = 999;
    if (reason === 'no module')
      await db
        .getRepository(SpacecraftModule)
        .delete({ spacecraftId: ship.id, category: 'SPECIAL' });
    if (reason === 'destroyed module')
      await db
        .getRepository(SpacecraftModule)
        .update(
          { spacecraftId: ship.id, category: 'SPECIAL' },
          { integrity: 0 },
        );
    if (reason === 'energy')
      await db.getRepository(Spacecraft).update(ship.id, { energy: 14 });
    if (reason === 'crew')
      await db.getRepository(Spacecraft).update(ship.id, { crewRequired: 1 });
    if (reason === 'full cargo')
      await db
        .getRepository(CargoItem)
        .save({ spacecraftId: ship.id, commodityId: 9, amount: 150 });
    if (reason === 'combat')
      await db
        .getRepository(Spacecraft)
        .update(ship.id, { status: SpacecraftStatus.IN_COMBAT });
    if (reason === 'standby')
      await db
        .getRepository(Spacecraft)
        .update(ship.id, { operatingMode: SpacecraftOperatingMode.STANDBY });
    if (reason === 'docked')
      await db
        .getRepository(Spacecraft)
        .update(ship.id, { dockedAtId: ship.id });
    if (reason === 'held tractor')
      await db.getRepository(Spacecraft).save({
        name: 'Holder',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: ship.locationId,
        tractoredShipId: ship.id,
      });
    const before = await snapshot();
    await expect(
      service.select(ship.id, ship.userId, selected),
    ).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
    expect(delivered).not.toHaveBeenCalled();
  });
  it('hides foreign ship data and refuses foreign start/stop', async () => {
    const stranger = await createUser(db);
    await expect(service.get(ship.id, stranger.id)).rejects.toThrow(
      'nicht gefunden',
    );
    await expect(service.select(ship.id, stranger.id, 3)).rejects.toThrow(
      'nicht gefunden',
    );
    await expect(service.select(ship.id, stranger.id, null)).rejects.toThrow(
      'nicht gefunden',
    );
  });
  it('stops stale selections when an external relocation missed field entry', async () => {
    await service.select(ship.id, ship.userId, 3);
    await db
      .getRepository(Spacecraft)
      .update(ship.id, { locationId: otherLocation.id });
    await service.processTick(ship.id);
    expect((await snapshot()).cargo).toHaveLength(0);
    expect(
      (await service.get(ship.id, ship.userId)).selectedCommodityId,
    ).toBeNull();
  });
  it('leaves mining active after a rejected flight and cancels through the normal galaxy-flight pipeline after a committed step', async () => {
    await db.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperantrieb',
      integrity: 100,
      isActive: false,
    });
    await service.select(ship.id, ship.userId, 3);
    const navigation = Object.assign(
      Object.create(SpacecraftService.prototype),
      {
        dataSource: db,
        shipRepo: db.getRepository(Spacecraft),
        moduleRepo: db.getRepository(SpacecraftModule),
        galaxyFieldRepo: db.getRepository(GalaxyField),
        findOne: (id: number, userId: number) =>
          db.getRepository(Spacecraft).findOneOrFail({
            where: { id, userId },
            relations: [
              'modules',
              'fleet',
              'fleet.members',
              'location',
              'location.galaxyField',
            ],
          }),
        spacecraftRuntimeStateService: new SpacecraftRuntimeStateService(),
        spacecraftCrewService: { hasEnoughCrew: async () => true },
        shipClassService: {
          findById: (id: number) =>
            db.getRepository(ShipClassDef).findOneByOrFail({ id }),
        },
        cartographyPlanService: { resetFinishingForSpacecraft: jest.fn() },
        fieldTransitionExecutor: new FieldTransitionExecutor(),
        flightConsequencePipeline: new FlightConsequencePipeline([service]),
        flightSignatureService: { createMovement: jest.fn() },
        layerKnowledgeService: { markKnown: jest.fn() },
        explorationService: { discoverArea: jest.fn() },
        statisticsService: { countEvent: jest.fn() },
        repairService: { cancelForFlight: jest.fn() },
        gameData,
      },
    ) as SpacecraftService;
    const before = await snapshot();
    await expect(
      navigation.flyGalaxy(ship.id, ship.userId, 0, 1),
    ).rejects.toThrow('Next field');
    expect(await snapshot()).toEqual(before);
    const movement = await navigation.flyGalaxy(ship.id, ship.userId, 2, 1);
    expect(movement.movement.completedSteps).toBe(1);
    expect((await snapshot()).ship.locationId).toBe(otherLocation.id);
    expect((await service.get(ship.id, ship.userId)).state).toBe('IDLE');
    expect(delivered).toHaveBeenCalledWith(
      expect.stringContaining('wegen Flug'),
    );
  });

  it('cancels a real wormhole passage in the same position transaction', async () => {
    await service.select(ship.id, ship.userId, 3);
    await db.getRepository(Wormhole).save({
      entryLayerId: field.layerId,
      entryCx: 1,
      entryCy: 1,
      exitLayerId: field.layerId,
      exitCx: 2,
      exitCy: 1,
    });
    const passage = new WormholePassageService(
      db,
      new FlightConsequencePipeline([service]),
      { discoverArea: jest.fn() } as never,
      { markKnown: jest.fn() } as never,
      { createMovement: jest.fn() } as never,
      messaging as never,
      {
        cancelTasks: jest.fn().mockResolvedValue([]),
        notifyCancelled: jest.fn(),
      } as never,
      { resetFinishingForSpacecraft: jest.fn() } as never,
      { cancelForShipsInTransaction: jest.fn() } as never,
      gameData,
      new FieldTransitionExecutor(),
      { allows: () => true },
      () => 0,
    );
    await passage.enter(ship.id, ship.userId);
    expect((await snapshot()).ship.locationId).toBe(otherLocation.id);
    expect((await service.get(ship.id, ship.userId)).state).toBe('IDLE');
    expect(delivered).toHaveBeenCalledWith(
      expect.stringContaining('wegen Flug'),
    );
  });
  it('rolls back cargo and full-storage cancellation when persistence fails without delivering notifications', async () => {
    await service.select(ship.id, ship.userId, 3);
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: ship.id, commodityId: 9, amount: 145 });
    const before = await snapshot();
    const original = sendImplementation;
    jest.spyOn(messaging, 'sendSystem').mockImplementation(async (...args) => {
      await original(...args);
      throw new Error('message storage failed');
    });
    await expect(service.processTick(ship.id)).rejects.toThrow(
      'message storage failed',
    );
    expect(await snapshot()).toEqual(before);
    expect(delivered).not.toHaveBeenCalled();
  });
  it('rejects inverse cargo contention instead of waiting with a ship lock', async () => {
    await service.select(ship.id, ship.userId, 3);
    const row = await db
      .getRepository(CargoItem)
      .save({ spacecraftId: ship.id, commodityId: 9, amount: 10 });
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.manager.findOneOrFail(CargoItem, {
        where: { id: row.id },
        lock: { mode: 'pessimistic_write' },
      });
      const before = await snapshot();
      await expect(service.processTick(ship.id)).rejects.toThrow('gesperrt');
      expect(await snapshot()).toEqual(before);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
  it('revalidates admin changes at the next tick and rejects invalid rates, duplicates and restricted commodities', async () => {
    await service.select(ship.id, ship.userId, 3);
    expect(
      await service.configureFieldType(type.id, [{ commodityId: 9, rate: 75 }]),
    ).toEqual([{ commodityId: 9, rate: 75 }]);
    await service.processTick(ship.id);
    expect((await snapshot()).cargo).toHaveLength(0);
    expect(
      (await service.get(ship.id, ship.userId)).selectedCommodityId,
    ).toBeNull();
    for (const resources of [
      [{ commodityId: 3, rate: 0 }],
      [{ commodityId: 999, rate: 10 }],
      [
        { commodityId: 3, rate: 10 },
        { commodityId: 3, rate: 15 },
      ],
    ])
      await expect(
        service.configureFieldType(type.id, resources),
      ).rejects.toThrow();
    expect(
      await validate(
        plainToInstance(FieldMiningRequest, {
          resources: [{ commodityId: 3, rate: 1.5 }],
        }),
      ),
    ).not.toHaveLength(0);
  });
  async function stock(commodityId = 3) {
    return db
      .getRepository(LocationMining)
      .findOneByOrFail({ locationId: ship.locationId, commodityId });
  }
  it('creates the field stock on first collection, deducts it and shows it per commodity', async () => {
    const before = await service.get(ship.id, ship.userId);
    expect(before.options.map((option) => option.stock)).toEqual([
      10_000, 10_000,
    ]);
    await service.select(ship.id, ship.userId, 3);
    await service.processTick(ship.id);
    expect(await stock()).toMatchObject({
      actualAmount: 9_900,
      maxAmount: 10_000,
      depletedAt: null,
    });
    expect(
      (await service.get(ship.id, ship.userId)).options.find(
        (option) => option.commodityId === 3,
      ),
    ).toMatchObject({ stock: 9_900, maxStock: 10_000 });
  });
  it('gathers 190–220 with a faction collector module', async () => {
    moduleDefinitions = [
      { name: 'Ressourcen-Kollektor', secret: { faction: 'GALACTIC_EMPIRE' } },
    ];
    await db.getRepository(Spacecraft).update(ship.id, { cargoMax: 500 });
    await service.select(ship.id, ship.userId, 3);
    await service.processTick(ship.id);
    // 190 + floor(0.5 * 31)
    expect((await snapshot()).cargo[0].amount).toBe(205);
    expect((await stock()).actualAmount).toBe(9_795);
  });
  it('caps by stock, marks depletion, notifies like STU, stops and refuses until regrown', async () => {
    await db.getRepository(LocationMining).save({
      locationId: ship.locationId,
      commodityId: 3,
      actualAmount: 60,
      maxAmount: 10_000,
      depletedAt: null,
    });
    await service.select(ship.id, ship.userId, 3);
    await service.processTick(ship.id);
    expect((await snapshot()).cargo[0].amount).toBe(60);
    const depleted = await stock();
    expect(depleted.actualAmount).toBe(0);
    expect(depleted.depletedAt).toBeInstanceOf(Date);
    expect(delivered).toHaveBeenCalledWith(
      expect.stringContaining(
        'Es sind keine Tibanna-Gas bei den Koordinaten 1|1 vorhanden!',
      ),
    );
    expect((await service.get(ship.id, ship.userId)).state).toBe('IDLE');
    await expect(service.select(ship.id, ship.userId, 3)).rejects.toThrow(
      'Es sind keine Tibanna-Gas',
    );
    await db
      .getRepository(LocationMining)
      .update(depleted.id, { actualAmount: 500 });
    await service.select(ship.id, ship.userId, 3);
    await service.processTick(ship.id);
    // 60 already in cargo leaves 90 of 150 free.
    expect(await stock()).toMatchObject({
      actualAmount: 410,
      depletedAt: null,
    });
  });
  it('regenerates fields depleted for at least 20 days and clears depletion at max', async () => {
    const now = new Date('2026-11-20T03:00:00Z');
    const days = (count: number) =>
      new Date(now.getTime() - count * 24 * 60 * 60 * 1000);
    const repo = db.getRepository(LocationMining);
    const rows = await repo.save([
      {
        locationId: ship.locationId,
        commodityId: 3,
        actualAmount: 0,
        maxAmount: 10_000,
        depletedAt: days(21),
      },
      {
        locationId: ship.locationId,
        commodityId: 9,
        actualAmount: 100,
        maxAmount: 10_000,
        depletedAt: days(20),
      },
      {
        locationId: otherLocation.id,
        commodityId: 3,
        actualAmount: 9_000,
        maxAmount: 10_000,
        depletedAt: days(30),
      },
      {
        locationId: otherLocation.id,
        commodityId: 9,
        actualAmount: 0,
        maxAmount: 10,
        depletedAt: days(19),
      },
      {
        locationId: otherLocation.id,
        commodityId: 10,
        actualAmount: 0,
        maxAmount: 10,
        depletedAt: days(25),
      },
    ]);
    await new LocationMiningRegenerationService(db).run(now);
    const after = await repo.find({ order: { id: 'ASC' } });
    expect(after.map((row) => row.actualAmount)).toEqual([
      500, 115, 10_000, 0, 1,
    ]);
    expect(after.map((row) => row.depletedAt != null)).toEqual([
      true,
      true,
      false,
      true,
      true,
    ]);
    expect(after[0].depletedAt).toEqual(rows[0].depletedAt);
  });
  it('serializes concurrent collectors on one field without overdrawing the stock', async () => {
    await db.getRepository(LocationMining).save({
      locationId: ship.locationId,
      commodityId: 3,
      actualAmount: 150,
      maxAmount: 10_000,
      depletedAt: null,
    });
    const { id: _id, ...copy } = ship;
    const other = await db
      .getRepository(Spacecraft)
      .save({ ...copy, name: 'Second prospector' });
    const modules = await db
      .getRepository(SpacecraftModule)
      .findBy({ spacecraftId: ship.id });
    await db.getRepository(SpacecraftModule).save(
      modules.map(({ id: _moduleId, ...module }) => ({
        ...module,
        spacecraftId: other.id,
      })),
    );
    await service.select(ship.id, ship.userId, 3);
    await service.select(other.id, other.userId, 3);
    await Promise.all([
      service.processTick(ship.id),
      service.processTick(other.id),
    ]);
    const cargo = await db
      .getRepository(CargoItem)
      .find({ where: { commodityId: 3 } });
    expect(cargo.reduce((sum, row) => sum + row.amount, 0)).toBe(150);
    expect((await stock()).actualAmount).toBe(0);
    expect(
      delivered.mock.calls.filter(([text]) =>
        String(text).includes('Es sind keine'),
      ),
    ).toHaveLength(1);
  });
});
