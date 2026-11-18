import { ResourceCollectionService } from './resource-collection.service';
import { SeedConversionMiningResources20261116150000 } from '../../database/migrations/20261116150000-seed-conversion-mining-resources';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import {
  ResourceConversionService,
  RESOURCE_CONVERSIONS,
} from './resource-conversion.service';
import { Spacecraft, SpacecraftKind } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { GameDataService } from '../game-data/game-data.service';
import { MessagingService } from '../messaging/messaging.service';
import { Research, ResearchStatus } from '../research/entities/research.entity';
import { SpacecraftResourceFlowService } from './spacecraft-resource-flow.service';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
// Real migrations, ship/module/cargo locks and persisted resource selection.
describe('Resource conversion (PostgreSQL)', () => {
  let db: DataSource;
  let service: ResourceConversionService;
  let ship: Spacecraft;
  let field: GalaxyField;
  let type: GalaxyFieldType;
  let typeCounter = 0;
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
  const gameData = {
    getCommodity: (id: number) => ({
      id,
      name: `Ware ${id}`,
      isBeamable: true,
    }),
    getAllBuildings: () =>
      RESOURCE_CONVERSIONS.map((row) => ({
        researchId: 77,
        production: [{ commodityId: row[1], amount: 1 }],
      })),
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
      key: `TEST_CONVERSION_${++typeCounter}`,
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
    ship = await db.getRepository(Spacecraft).save({
      name: 'Prospector',
      userId: owner.id,
      shipClassId: shipClass.id,
      locationId: location.id,
      energy: 80,
      energyMax: 100,
      epsMax: 100,
      cargoMax: 2000,
      // Short-range sensors start OFF like STU (sc-AUD-02); collecting needs them.
      runtimeSystems: { SHORT_RANGE_SENSORS: { active: true, integrity: 100, cooldown: 0 } },
    });
    await db.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'SPECIAL',
      moduleType: 'Molekular-Raffinerie',
      integrity: 100,
      isActive: false,
    });
    await db
      .getRepository(Research)
      .save({ userId: owner.id, techId: 77, status: ResearchStatus.COMPLETED });
    service = new ResourceConversionService(
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
  it('seeds collectible refinery sources and preserves custom field resources on up/down', async () => {
    const nebula = await db.getRepository(GalaxyFieldType).save({
      key: `CONVERSION_NEBULA_${++typeCounter}`,
      name: 'Conversion nebula',
      category: 'nebula',
      miningResources: [{ commodityId: 3, rate: 100 }],
    });
    const custom = await db.getRepository(GalaxyFieldType).save({
      key: `CONVERSION_CUSTOM_${++typeCounter}`,
      name: 'Custom nebula',
      category: 'nebula',
      miningResources: [{ commodityId: 63, rate: 20 }],
    });
    const asteroid = await db.getRepository(GalaxyFieldType).save({
      key: `CONVERSION_ASTEROID_${++typeCounter}`,
      name: 'Conversion asteroid',
      category: 'asteroid',
      miningResources: [
        { commodityId: 9, rate: 100 },
        { commodityId: 10, rate: 100 },
      ],
    });
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      const migration = new SeedConversionMiningResources20261116150000();
      await migration.up(runner);
      const gas = await db
        .getRepository(GalaxyFieldType)
        .findOneByOrFail({ id: nebula.id });
      const minerals = await db
        .getRepository(GalaxyFieldType)
        .findOneByOrFail({ id: asteroid.id });
      const sources = [...gas.miningResources, ...minerals.miningResources].map(
        (row) => row.commodityId,
      );
      expect(
        RESOURCE_CONVERSIONS.every((row) => sources.includes(row[0])),
      ).toBe(true);
      expect(
        (
          await db
            .getRepository(GalaxyFieldType)
            .findOneByOrFail({ id: custom.id })
        ).miningResources,
      ).toEqual(custom.miningResources);
      await migration.down(runner);
      expect(
        (
          await db
            .getRepository(GalaxyFieldType)
            .findOneByOrFail({ id: nebula.id })
        ).miningResources,
      ).toEqual(nebula.miningResources);
      expect(
        (
          await db
            .getRepository(GalaxyFieldType)
            .findOneByOrFail({ id: asteroid.id })
        ).miningResources,
      ).toEqual(asteroid.miningResources);
      expect(
        (
          await db
            .getRepository(GalaxyFieldType)
            .findOneByOrFail({ id: custom.id })
        ).miningResources,
      ).toEqual(custom.miningResources);
    } finally {
      await runner.release();
    }
  });
  it('collects refinery feedstock and converts freshly collected cargo in the same tick', async () => {
    await db
      .getRepository(GalaxyFieldType)
      .update(type.id, { miningResources: [{ commodityId: 63, rate: 100 }] });
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
    ]);
    const collection = new ResourceCollectionService(
      db,
      gameData,
      messaging as unknown as MessagingService,
    );
    await collection.select(ship.id, ship.userId, 63);
    await service.select(ship.id, ship.userId, 63);
    await collection.processTick(ship.id);
    await service.processTick(ship.id);
    const after = await snapshot();
    expect(after.cargo.find((row) => row.commodityId === 63)?.amount).toBe(0);
    expect(after.cargo.find((row) => row.commodityId === 5)?.amount).toBe(10);
    expect(after.ship.cargoUsed).toBe(10);
  });
  it.each(RESOURCE_CONVERSIONS)(
    'converts %i to %i with complete STU batch %i/%i (mode %i)',
    async (source, target, input, output) => {
      await db.getRepository(CargoItem).save([
        { spacecraftId: ship.id, commodityId: source, amount: input * 2 },
        { spacecraftId: ship.id, commodityId: target, amount: 5 },
      ]);
      const selected = await service.select(ship.id, ship.userId, source);
      expect(selected.active).toBe(true);
      expect(selected.options).toHaveLength(10);
      await service.select(ship.id, ship.userId, source);
      expect((await snapshot()).ship.energy).toBe(65);
      await service.processTick(ship.id);
      const after = await snapshot();
      expect(
        after.cargo.find((row) => row.commodityId === source)?.amount,
      ).toBe(input);
      expect(
        after.cargo.find((row) => row.commodityId === target)?.amount,
      ).toBe(output + 5);
      expect(after.ship.cargoUsed).toBe(input + output + 5);
      await service.select(ship.id, ship.userId, null);
      await service.processTick(ship.id);
      expect((await snapshot()).cargo).toEqual(after.cargo);
    },
  );
  it('uses the same selection and conversion for stations', async () => {
    await db
      .getRepository(Spacecraft)
      .update(ship.id, { kind: SpacecraftKind.STATION });
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: ship.id, commodityId: 68, amount: 100 });
    await service.select(ship.id, ship.userId, 68);
    await service.processTick(ship.id);
    expect(
      (await snapshot()).cargo.find((row) => row.commodityId === 16)?.amount,
    ).toBe(8);
  });
  it('requires completed own building research before charging EPS and checks it again at tick', async () => {
    await db
      .getRepository(Research)
      .update({ userId: ship.userId }, { status: ResearchStatus.IN_PROGRESS });
    const before = await snapshot();
    expect(
      (await service.get(ship.id, ship.userId)).options.every(
        (row) => !row.producible,
      ),
    ).toBe(true);
    await expect(service.select(ship.id, ship.userId, 63)).rejects.toThrow(
      'freigeschaltet',
    );
    expect(await snapshot()).toEqual(before);
    await db
      .getRepository(Research)
      .update({ userId: ship.userId }, { status: ResearchStatus.COMPLETED });
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: ship.id, commodityId: 63, amount: 100 });
    await service.select(ship.id, ship.userId, 63);
    await db.getRepository(Research).delete({ userId: ship.userId });
    await service.processTick(ship.id);
    expect((await snapshot()).cargo[0].amount).toBe(100);
    expect((await service.get(ship.id, ship.userId)).active).toBe(false);
    expect(delivered).toHaveBeenCalledWith(
      expect.stringContaining('freigeschaltet'),
    );
  });
  it('permits research-free positive building output, but never input or zero output', async () => {
    jest.spyOn(gameData, 'getAllBuildings').mockReturnValue([
      {
        researchId: null,
        production: [
          { commodityId: 5, amount: 1 },
          { commodityId: 6, amount: -1 },
          { commodityId: 7, amount: 0 },
        ],
      },
    ] as never);
    await db.getRepository(Research).delete({ userId: ship.userId });
    const options = (await service.get(ship.id, ship.userId)).options;
    expect(
      options
        .filter((row) => row.producible)
        .map((row) => row.targetCommodityId),
    ).toEqual([5]);
    await service.select(ship.id, ship.userId, 63);
  });
  it('does not consume a partial batch and delivers a message only after commit', async () => {
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: ship.id, commodityId: 63, amount: 99 });
    await service.select(ship.id, ship.userId, 63);
    const before = await snapshot();
    await service.processTick(ship.id);
    expect(await snapshot()).toEqual(before);
    expect(delivered).toHaveBeenCalledWith(
      expect.stringContaining('vollständige Charge'),
    );
  });
  it('allows full cargo because conversion frees space, using actual cargo instead of cargoUsed', async () => {
    await db
      .getRepository(Spacecraft)
      .update(ship.id, { cargoMax: 100, cargoUsed: 999 });
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: ship.id, commodityId: 63, amount: 100 });
    await service.select(ship.id, ship.userId, 63);
    await service.processTick(ship.id);
    expect((await snapshot()).ship.cargoUsed).toBe(10);
  });
  it('rejects conversion if final cargo would still exceed capacity', async () => {
    await db.getRepository(Spacecraft).update(ship.id, { cargoMax: 5 });
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: ship.id, commodityId: 63, amount: 100 });
    await service.select(ship.id, ship.userId, 63);
    const before = await snapshot();
    await service.processTick(ship.id);
    expect(await snapshot()).toEqual(before);
    expect(delivered).toHaveBeenCalledWith(
      expect.stringContaining('Lagerraum'),
    );
  });
  it('honors energy flow consumption and brownout before converting', async () => {
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: ship.id, commodityId: 63, amount: 100 });
    await service.select(ship.id, ship.userId, 63);
    const loaded = await db
      .getRepository(Spacecraft)
      .findOneOrFail({ where: { id: ship.id }, relations: ['modules'] });
    const flow = new SpacecraftResourceFlowService(
      new SpacecraftRuntimeStateService(),
    );
    expect(
      flow
        .calculate(loaded)
        .systems.find((row) => row.systemKey === 'RESOURCE_CONVERTER')
        ?.epsPerTick,
    ).toBe(10);
    loaded.energy = 0;
    loaded.reactorFuel = 0;
    loaded.reactorOutput = 0;
    expect(flow.recharge(loaded).deactivatedSystems).toContain(
      'Molekular-Raffinerie',
    );
    await db.getRepository(Spacecraft).save(loaded);
    await service.processTick(ship.id);
    expect((await snapshot()).cargo[0].amount).toBe(100);
    expect((await service.get(ship.id, ship.userId)).active).toBe(false);
  });
  it.each(['unknown', 'missing', 'destroyed', 'cooldown', 'energy', 'crew'])(
    'rejects %s without writes',
    async (reason) => {
      let source = 63;
      if (reason === 'unknown') source = 999;
      if (reason === 'missing')
        await db
          .getRepository(SpacecraftModule)
          .delete({ spacecraftId: ship.id });
      if (reason === 'destroyed')
        await db
          .getRepository(SpacecraftModule)
          .update({ spacecraftId: ship.id }, { integrity: 0 });
      if (reason === 'cooldown')
        await db
          .getRepository(SpacecraftModule)
          .update({ spacecraftId: ship.id }, { cooldown: 3 });
      if (reason === 'crew')
        await db.getRepository(Spacecraft).update(ship.id, { crewRequired: 1 });
      if (reason === 'energy')
        await db.getRepository(Spacecraft).update(ship.id, { energy: 14 });
      const before = await snapshot();
      await expect(
        service.select(ship.id, ship.userId, source),
      ).rejects.toThrow();
      expect(await snapshot()).toEqual(before);
    },
  );
  it('protects read, start and stop from other owners', async () => {
    const other = await createUser(db);
    await expect(service.get(ship.id, other.id)).rejects.toThrow(
      'nicht gefunden',
    );
    await expect(service.select(ship.id, other.id, 63)).rejects.toThrow(
      'nicht gefunden',
    );
    await expect(service.select(ship.id, other.id, null)).rejects.toThrow(
      'nicht gefunden',
    );
  });
  it('rolls back state and does not deliver notifications when messaging fails', async () => {
    await service.select(ship.id, ship.userId, 63);
    await db.getRepository(Research).delete({ userId: ship.userId });
    const before = await snapshot();
    messaging.sendSystem.mockRejectedValueOnce(new Error('mail failed'));
    await expect(service.processTick(ship.id)).rejects.toThrow('mail failed');
    expect(await snapshot()).toEqual(before);
    expect(delivered).not.toHaveBeenCalled();
  });
  it('fails fast on locked cargo without partial writes', async () => {
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: ship.id, commodityId: 63, amount: 100 });
    await service.select(ship.id, ship.userId, 63);
    const before = await snapshot();
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.manager.findOne(CargoItem, {
        where: { spacecraftId: ship.id },
        lock: { mode: 'pessimistic_write' },
      });
      await expect(service.processTick(ship.id)).rejects.toThrow('gesperrt');
      expect(await snapshot()).toEqual(before);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
