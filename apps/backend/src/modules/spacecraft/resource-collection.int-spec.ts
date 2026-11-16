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
      const transaction = args[7] as
        | { afterCommit: Array<() => void> }
        | undefined;
      if (transaction) transaction.afterCommit.push(() => delivered(args[2]));
      else delivered(args[2]);
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
    getAllModules: () => [],
  } as unknown as GameDataService;
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
    await db
      .getRepository(SpacecraftModule)
      .save({
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
          db
            .getRepository(Spacecraft)
            .findOneOrFail({
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
});
