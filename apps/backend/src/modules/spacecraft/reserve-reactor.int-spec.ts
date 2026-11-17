import 'reflect-metadata';
import {
  INestApplication,
  ValidationPipe,
  type DynamicModule,
} from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { AppModule } from '../../app.module';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import {
  Faction,
  type SpacecraftRuntimeSystemsDto,
  type SpacecraftEnergyFlowDto,
} from '@swuniverse/shared';
import { GameGateway } from '../websocket/game.gateway';
import { User } from '../auth/user.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import {
  Spacecraft,
  SpacecraftKind,
  StationRole,
} from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { GameStatusService } from '../game-status/game-status.service';
import { CargoItem } from './entities/cargo-item.entity';
import { SpacecraftResourceFlowService } from './spacecraft-resource-flow.service';
import { SpacecraftStatsService } from './spacecraft-stats.service';
import { SpacecraftService } from './spacecraft.service';
import { StationShipManagementService } from './station-ship-management.service';
import { SpacecraftRepairService } from './spacecraft-repair.service';
import { SpacecraftDamage } from './spacecraft-damage';
import { GameDataService } from '../game-data/game-data.service';
import {
  reactorFuelProfile,
  recoverableReactorFuel,
} from './reactor-fuel-profile';
import {
  RepairPartsType,
  RepairTargetType,
} from './entities/spacecraft-repair-task.entity';
import { StationShipyardService } from './station-shipyard.service';
import { ColonyShipyardService } from '../colony/colony-shipyard.service';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyFabricationService } from '../colony/colony-fabrication.service';
import { ColonyFabricationQueueType } from '../colony/entities/colony-fabrication-queue.entity';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
  ShipBuildSource,
} from '../colony/entities/colony-ship-build-queue.entity';
const secret = 'reserve-core-http-integration';
const jwt = new JwtService({ secret });
describe('STU reserve core (production HTTP/PostgreSQL)', () => {
  let db: DataSource,
    app: INestApplication,
    owner: User,
    ship: Spacecraft,
    hull: ShipClassDef,
    core: SpacecraftModule;
  const gateway = {
    emitToUser: jest.fn(),
    emitToAll: jest.fn(),
    onlineUserIds: [],
  };
  beforeAll(async () => {
    const migrations = await connectIntegrationDatabase();
    await resetDatabase(migrations);
    await migrations.destroy();
    const imports: DynamicModule[] = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    );
    const core = imports.find((item) => item.module === TypeOrmModule)
      ?.imports?.[0] as DynamicModule;
    const provider = core.providers?.find(
      (item) =>
        typeof item === 'object' &&
        'provide' in item &&
        item.provide === 'TypeOrmModuleOptions',
    );
    if (!provider) throw new Error('Production datasource missing');
    const config = {
      get: (key: string) =>
        ({
          DATABASE_URL: process.env.INTEGRATION_DATABASE_URL,
          JWT_SECRET: secret,
          NODE_ENV: 'production',
          EMAIL_BLOCKLIST_PEPPER: 'integration',
          GAME_TIMEZONE: 'UTC',
        })[key],
    };
    const optionsModule = await Test.createTestingModule({
      providers: [provider, { provide: ConfigService, useValue: config }],
    }).compile();
    db = await new DataSource(
      optionsModule.get<DataSourceOptions>('TypeOrmModuleOptions'),
    ).initialize();
    await optionsModule.close();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .overrideProvider(DataSource)
      .useValue(db)
      .overrideProvider(GameGateway)
      .useValue(gateway)
      .compile();
    app = module.createNestApplication({ logger: ['error'] });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
  }, 120000);
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) await db.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(db);
    owner = await createUser(db, {
      faction: Faction.REBEL_ALLIANCE,
      factionId: await factionId(db, Faction.REBEL_ALLIANCE),
    });
    const layer = await db.manager.save(Layer, {
      name: 'Reserve map',
      width: 1,
      height: 1,
    });
    const field = await db.manager.save(GalaxyField, {
      layerId: layer.id,
      cx: 1,
      cy: 1,
      fieldTypeId: 1,
    });
    const location = await db.manager.findOneByOrFail(SpaceLocation, {
      galaxyFieldId: field.id,
    });
    hull = await db.manager.save(ShipClassDef, {
      key: 'RESERVE_TEST',
      name: 'Reserve test',
      category: 'FRIGATE',
      role: 'FREIGHTER',
      crewMax: 10,
      cargoCapacity: 1000,
      hullBase: 1000,
      shieldBase: 0,
      epsBase: 100,
      reactorBase: 20,
      warpdriveBase: 20,
    });
    ship = await db.manager.save(Spacecraft, {
      userId: owner.id,
      name: 'Reserve ship',
      shipClassId: hull.id,
      kind: SpacecraftKind.SHIP,
      locationId: location.id,
      hull: 1000,
      hullMax: 1000,
      shields: 0,
      shieldsMax: 0,
      crewRequired: 0,
      crewMax: 10,
      energy: 0,
      energyMax: 100,
      epsMax: 100,
      warpdrive: 0,
      warpdriveMax: 20,
      cargoMax: 1000,
      reactorFuel: 0,
      reactorFuelMax: 0,
      runtimeSystems: {},
    });
    const modules = await db.manager.save(SpacecraftModule, [
      {
        spacecraftId: ship.id,
        slotId: 'REACTOR',
        category: 'REACTOR',
        moduleType: 'Hypermaterie-Reservekern',
        level: 1,
      },
      {
        spacecraftId: ship.id,
        slotId: 'EPS',
        category: 'EPS',
        moduleType: 'Energieverteiler',
        level: 1,
      },
      {
        spacecraftId: ship.id,
        slotId: 'HYPERDRIVE',
        category: 'HYPERDRIVE',
        moduleType: 'Standard-Hyperantrieb',
        level: 1,
      },
    ]);
    core = modules[0];
    ship = await hydrated();
    app.get(SpacecraftStatsService).applyStats(ship, hull, modules);
    app.get(SpacecraftResourceFlowService).calculate(ship);
    await db.manager.save(ship);
    await app.get(GameStatusService).getPublicStatus();
  });
  const hydrated = async () =>
    (await db.manager.findOneOrFail(Spacecraft, {
      where: { id: ship.id },
      relations: ['modules', 'location', 'location.galaxyField'],
    })) as Spacecraft & { runtimeSystems: SpacecraftRuntimeSystemsDto };
  async function request(
    path: string,
    body?: unknown,
    method = body === undefined ? 'GET' : 'POST',
    actor = owner,
  ) {
    return fetch(`${await app.getUrl()}/api/spacecraft/${ship.id}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt.sign({ sub: actor.id, username: actor.username })}`,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  async function stock(loads = 1, id = ship.id) {
    await db.manager.save(CargoItem, [
      { spacecraftId: id, commodityId: 8, amount: 2 * loads },
      { spacecraftId: id, commodityId: 6, amount: 3 * loads },
      { spacecraftId: id, commodityId: 7, amount: 2 * loads },
    ]);
    await db.manager.update(Spacecraft, id, { cargoUsed: 7 * loads });
  }
  it('uses six STU module classes, exact fabrication data and 20x theoretical capacity', async () => {
    const data = app.get(GameDataService);
    for (let level = 1; level <= 6; level++) {
      const item = data.getFabricationItemByOutputCommodity(10520 + level)!;
      expect(item).toMatchObject({
        moduleType: 'Hypermaterie-Reservekern',
        shipyardType: 'REACTOR',
        moduleLevel: level,
        energyCost: 10 + 20 * level,
      });
      expect(item.faction).toBe(Faction.GALACTIC_EMPIRE);
      expect(item.shipyardModuleStats).toMatchObject({
        upgradeFactor: 30,
        downgradeFactor: 6,
        defaultFactor: 5,
        systemType: 30,
      });
      expect(data.getCommodity(10520 + level)?.name).toBe(
        `Hypermaterie-Reservekern (Klasse ${level})`,
      );
    }
    expect(data.getFabricationItemByOutputCommodity(10521)?.costs).toEqual([
      { commodityId: 5, amount: 30 },
      { commodityId: 4, amount: 45 },
      { commodityId: 21, amount: 40 },
      { commodityId: 2, amount: 35 },
    ]);
    expect(await hydrated()).toMatchObject({
      reactorOutput: 21,
      reactorFuelMax: 420,
      reactorFuel: 0,
    });
  });
  it('loads exactly 85 using the real HTTP action and exposes recipe, output and capacity', async () => {
    await stock();
    const response = await request('/reactor/load', { amount: 1 });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ transferred: 85 });
    expect(await hydrated()).toMatchObject({ reactorFuel: 85, cargoUsed: 0 });
    expect(
      await db.manager.count(CargoItem, { where: { spacecraftId: ship.id } }),
    ).toBe(0);
    const flowResponse = await request('/energy-flow');
    expect(flowResponse.status).toBe(200);
    const flow = (await flowResponse.json()) as SpacecraftEnergyFlowDto;
    expect(flow).toMatchObject({
      reactorOutput: 21,
      reactorTheoreticalOutput: 21,
      reactorProfile: {
        key: 'RESERVE_HYPERMATTER',
        loadUnits: 85,
        capacityMultiplier: 20,
      },
    });
    expect(flow.reactorFuel).toMatchObject({ current: 85, max: 420 });
  });
  it('enforces the mapped imperial fabrication restriction without restricting an installed core', async () => {
    await expect(app.get(ColonyFabricationService).queueFabrication(
      0, owner.id, ColonyFabricationQueueType.MODULE, 'module.drive.hypermaterie-reservekern-k1', 1, 13,
    )).rejects.toThrow('faction-locked');
    await stock();
    expect((await request('/reactor/load', { amount: 85 })).status).toBe(201);
  });
  it('uses STU hull-level factors without losing theoretical capacity on damage', () => {
    const data = app.get(GameDataService);
    for (const key of ['REBEL_FRIGATE_CONSULAR', 'EMPIRE_FRIGATE_MUNIFICENT']) {
      const definition = data.getShipClassDefByKey(key)!;
      const hullLevel = data.getShipyardRumpStats(definition.stuRumpId)!.moduleLevel;
      for (let level = 1; level <= 6; level++) {
        const installed = Object.assign(new SpacecraftModule(), { moduleType: 'Hypermaterie-Reservekern', category: 'REACTOR', level, integrity: 0, isActive: false });
        const stats = app.get(SpacecraftStatsService).calculateStats({ ...hull, key, reactorBase: 100 }, [installed]);
        expect(stats.reactorOutput).toBe(level < hullLevel ? 94 : level > hullLevel ? 130 : 105);
      }
    }
  });
  it('serializes concurrent loads without negative stock or capacity overflow', async () => {
    await stock(3);
    await db.manager.update(Spacecraft, ship.id, { reactorFuel: 250 });
    const replies = await Promise.all(
      Array.from({ length: 3 }, () => request('/reactor/load', { amount: 85 })),
    );
    expect(replies.map((r) => r.status).sort()).toEqual([201, 201, 400]);
    expect((await hydrated()).reactorFuel).toBe(420);
    const cargo = await db.manager.find(CargoItem, {
      where: { spacecraftId: ship.id },
      order: { commodityId: 'ASC' },
    });
    expect(cargo.map((i) => i.amount)).toEqual([3, 2, 2]);
  });
  it('rejects partial recipe/capacity and foreign ownership without spending resources', async () => {
    await stock();
    await db.manager.update(
      CargoItem,
      { spacecraftId: ship.id, commodityId: 7 },
      { amount: 1 },
    );
    expect((await request('/reactor/load', { amount: 'MAX' })).status).toBe(
      400,
    );
    await db.manager.update(
      CargoItem,
      { spacecraftId: ship.id, commodityId: 7 },
      { amount: 2 },
    );
    await db.manager.update(Spacecraft, ship.id, { reactorFuel: 400 });
    expect((await request('/reactor/load', { amount: 'MAX' })).status).toBe(
      400,
    );
    const outsider = await createUser(db, { faction: owner.faction });
    expect(
      (await request('/reactor/load', { amount: 'MAX' }, 'POST', outsider))
        .status,
    ).toBe(404);
    expect((await hydrated()).reactorFuel).toBe(400);
    expect((await hydrated()).cargoUsed).toBe(7);
  });
  it('rolls cargo and charge back if final persistence fails', async () => {
    await stock();
    await db.query(
      `CREATE FUNCTION reject_reserve_load() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."reactorFuel" > OLD."reactorFuel" THEN RAISE EXCEPTION 'load rollback proof'; END IF; RETURN NEW; END $$`,
    );
    await db.query(
      `CREATE TRIGGER "ZZ_reject_reserve_load" BEFORE UPDATE ON spacecraft FOR EACH ROW EXECUTE FUNCTION reject_reserve_load()`,
    );
    try {
      expect((await request('/reactor/load', { amount: 85 })).status).toBe(500);
      expect(await hydrated()).toMatchObject({ reactorFuel: 0, cargoUsed: 7 });
      expect(
        await db.manager.count(CargoItem, { where: { spacecraftId: ship.id } }),
      ).toBe(3);
    } finally {
      await db.query('DROP TRIGGER "ZZ_reject_reserve_load" ON spacecraft');
      await db.query('DROP FUNCTION reject_reserve_load()');
    }
  });
  it('uses the real station-management source with the same recipe', async () => {
    const station = await db.manager.save(Spacecraft, {
      userId: owner.id,
      name: 'Supply station',
      shipClassId: hull.id,
      kind: SpacecraftKind.STATION,
      stationRole: StationRole.OUTPOST,
      locationId: ship.locationId,
      crewRequired: 0,
      crew: 0,
      cargoMax: 1000,
    });
    await db.manager.update(Spacecraft, ship.id, { dockedAtId: station.id });
    await stock(1, station.id);
    const manager = app.get(StationShipManagementService);
    expect(
      (await manager.getManagement(station.id, owner.id)).ships[0].reactor
        .profile.key,
    ).toBe('RESERVE_HYPERMATTER');
    const result = await manager.execute(station.id, owner.id, [
      { shipId: ship.id, reactorLoad: 1 },
    ]);
    expect(result.results[0].rejected).toEqual([]);
    expect((await hydrated()).reactorFuel).toBe(85);
    expect(
      (await db.manager.findOneByOrFail(Spacecraft, { id: station.id }))
        .cargoUsed,
    ).toBe(0);
  });
  it('produces and spends actual tick charge, proportionally to core integrity', async () => {
    await db.manager.update(Spacecraft, ship.id, { reactorFuel: 85 });
    let current = await hydrated();
    await app.get(SpacecraftService).processTick(current, { skipRepair: true });
    current = await hydrated();
    expect(current.energy).toBe(20);
    expect(current.reactorFuel).toBe(64);
    await db.manager.update(SpacecraftModule, core.id, { integrity: 50 });
    current = await hydrated();
    expect(
      app.get(SpacecraftResourceFlowService).calculate(current).reactorOutput,
    ).toBe(11);
    expect(current.reactorFuelMax).toBe(420);
  });
  it('keeps the core active in standby and rejects manual deactivation', async () => {
    expect(
      (await request('/operating-mode', { operatingMode: 'STANDBY' }, 'PATCH'))
        .status,
    ).toBe(200);
    expect((await hydrated()).runtimeSystems.REACTOR?.active).toBe(true);
    expect(
      (await request('/systems/REACTOR', { active: false }, 'PATCH')).status,
    ).toBe(400);
  });
  it('synchronizes real runtime damage to the module, stops the drive and repairs only the core', async () => {
    let current = await hydrated();
    current.runtimeSystems.REACTOR!.integrity = 1;
    new SpacecraftDamage({ integer: (min) => min }).apply(
      current,
      {
        netDamage: 1,
        isCrit: true,
        hullDamageFactor: 100,
        shieldDamageFactor: 100,
        targetSystems: ['REACTOR'],
      },
      [],
    );
    expect(current.runtimeSystems.WARPDRIVE?.active).toBe(false);
    await db.manager.save(current);
    expect(
      (await db.manager.findOneByOrFail(SpacecraftModule, { id: core.id }))
        .integrity,
    ).toBe(0);
    current = await hydrated();
    expect(
      app.get(SpacecraftResourceFlowService).calculate(current).reactorOutput,
    ).toBe(0);
    expect(
      (await request('/systems/WARPDRIVE', { active: true }, 'PATCH')).status,
    ).toBe(400);
    // Real instant self-repair uses triple parts costs.
    await db.manager.save(CargoItem, {
      spacecraftId: ship.id,
      commodityId: 10002,
      amount: 20,
    });
    const repaired = await app
      .get(SpacecraftRepairService)
      .start(ship.id, owner.id, {
        targetType: RepairTargetType.MODULE,
        moduleId: core.id,
        partsType: RepairPartsType.SYSTEM_COMPONENTS,
        instant: true,
      });
    expect(repaired.completed).toBe(true);
    current = await hydrated();
    expect(current.runtimeSystems.REACTOR?.active).toBe(true);
    expect(current.runtimeSystems.WARPDRIVE?.active).toBe(false);
    expect(current.reactorFuelMax).toBe(420);
  });
  it('handles module destruction directly and retains profile/recycling while broken', async () => {
    await db.manager.update(Spacecraft, ship.id, { reactorFuel: 171 });
    await db.manager.update(SpacecraftModule, core.id, {
      integrity: 0,
      isActive: false,
    });
    const current = await hydrated();
    expect(current.runtimeSystems.WARPDRIVE?.active).toBe(false);
    expect(reactorFuelProfile(current.modules).key).toBe('RESERVE_HYPERMATTER');
    expect(
      recoverableReactorFuel(current.reactorFuel, current.modules),
    ).toEqual([
      { commodityId: 8, amount: 4 },
      { commodityId: 6, amount: 6 },
      { commodityId: 7, amount: 4 },
    ]);
    await db.manager.update(SpacecraftModule, core.id, {
      integrity: 100,
      isActive: true,
    });
    expect((await hydrated()).runtimeSystems.WARPDRIVE?.active).toBe(false);
  });
  it('clamps capacity on a reactor switch and does not create charge when switching back', async () => {
    const current = await hydrated();
    current.reactorFuel = 420;
    current.modules = current.modules.filter((m) => m.id !== core.id);
    const light = await db.manager.save(SpacecraftModule, {
      spacecraftId: ship.id,
      moduleType: 'Leichter Hypermaterie-Reaktor',
      category: 'REACTOR',
      level: 1,
    });
    await db.manager.delete(SpacecraftModule, core.id);
    current.modules.push(light);
    app.get(SpacecraftStatsService).applyStats(current, hull, current.modules);
    expect(current.reactorFuelMax).toBe(300);
    expect(current.reactorFuel).toBe(300);
    await db.manager.delete(SpacecraftModule, light.id);
    const restored = await db.manager.save(SpacecraftModule, {
      spacecraftId: ship.id,
      moduleType: 'Hypermaterie-Reservekern',
      category: 'REACTOR',
      level: 1,
    });
    current.modules = [
      ...current.modules.filter((m) => m.id !== light.id),
      restored,
    ];
    app.get(SpacecraftStatsService).applyStats(current, hull, current.modules);
    expect(current.reactorFuelMax).toBe(420);
    expect(current.reactorFuel).toBe(300);
  });
  it('completes a real station build with an empty reserve core and persistent defaults', async () => {
    const station = await db.manager.save(Spacecraft, {
      userId: owner.id,
      name: 'Yard',
      shipClassId: hull.id,
      kind: SpacecraftKind.STATION,
      stationRole: StationRole.SHIPYARD,
      locationId: ship.locationId,
      dockCapacity: 2,
    });
    const job = await db.manager.save(ColonyShipBuildQueue, {
      userId: owner.id,
      shipClassId: hull.id,
      stationId: station.id,
      source: ShipBuildSource.STATION,
      name: 'Built reserve ship',
      finishesAt: new Date(0),
      buildSnapshot: {
        version: 1,
        crewRequired: 0,
        modules: [
          {
            slotId: 'REACTOR',
            commodityId: 10521,
            moduleType: 'Hypermaterie-Reservekern',
            category: 'REACTOR',
            level: 1,
          },
        ],
      },
    });
    await app.get(StationShipyardService).processTick(station.id);
    expect(
      (await db.manager.findOneByOrFail(ColonyShipBuildQueue, { id: job.id }))
        .status,
    ).toBe(ColonyShipBuildQueueStatus.COMPLETED);
    const built = await db.manager.findOneOrFail(Spacecraft, {
      where: { name: 'Built reserve ship' },
      relations: ['modules'],
    });
    expect(built).toMatchObject({
      reactorOutput: 21,
      reactorFuelMax: 420,
      reactorFuel: 0,
      dockedAtId: station.id,
      runtimeSystems: { REACTOR: { active: true } },
    });
    expect(built.modules).toHaveLength(1);
  });
  it('uses real retrofit completion to shrink capacity, retaining charge and a single core', async () => {
    const colony = await db.manager.save(Colony, {
      name: 'Retrofit yard',
      userId: owner.id,
      colonyClassId: 1,
      storageMax: 5000,
    });
    colony.fields = [];
    colony.storage = [];
    const data = app.get(GameDataService);
    const layout = data.getShipClassSlotRuleForShipClass(hull)!;
    const modules = (await hydrated()).modules;
    const selections = modules.map((m) => {
      const slotId = layout.slots.find(
        (slot) => slot.moduleCategory === m.category,
      )!.slotId;
      const commodityId = data
        .getAllFabricationItems()
        .find(
          (item) =>
            item.moduleType === m.moduleType && item.moduleLevel === m.level,
        )!.outputCommodityId;
      return { slotId, commodityId };
    });
    for (let n = 0; n < modules.length; n++)
      await db.manager.update(SpacecraftModule, modules[n].id, {
        slotId: selections[n].slotId,
      });
    await db.manager.update(Spacecraft, ship.id, { reactorFuel: 420 });
    const desired = selections.map((selection) =>
      selection.commodityId === 10521
        ? { ...selection, commodityId: 10501 }
        : selection,
    );
    const job = await db.manager.save(ColonyShipBuildQueue, {
      userId: owner.id,
      shipClassId: hull.id,
      colonyId: colony.id,
      spacecraftId: ship.id,
      source: ShipBuildSource.COLONY,
      mode: ColonyShipBuildQueueMode.RETROFIT,
      name: ship.name,
      finishesAt: new Date(0),
      moduleSelections: desired,
    });
    await app.get(ColonyShipyardService).processShipBuildQueue(colony);
    expect(
      (await db.manager.findOneByOrFail(ColonyShipBuildQueue, { id: job.id }))
        .status,
    ).toBe(ColonyShipBuildQueueStatus.COMPLETED);
    const current = await hydrated();
    // Standard reactor uses the established SWU output calculation (20 base + 20 module).
    expect(current).toMatchObject({
      reactorOutput: 40,
      reactorFuelMax: 600,
      reactorFuel: 420,
    });
    expect(
      current.modules.filter((m) => m.category === 'REACTOR'),
    ).toHaveLength(1);
    expect(reactorFuelProfile(current.modules).key).toBe('HYPERMATTER');
    await db.manager.update(Spacecraft, ship.id, { reactorFuel: 600 });
    const returnJob = await db.manager.save(ColonyShipBuildQueue, {
      userId: owner.id,
      shipClassId: hull.id,
      colonyId: colony.id,
      spacecraftId: ship.id,
      source: ShipBuildSource.COLONY,
      mode: ColonyShipBuildQueueMode.RETROFIT,
      name: ship.name,
      finishesAt: new Date(0),
      moduleSelections: selections,
    });
    await app.get(ColonyShipyardService).processShipBuildQueue(colony);
    expect(
      (
        await db.manager.findOneByOrFail(ColonyShipBuildQueue, {
          id: returnJob.id,
        })
      ).status,
    ).toBe(ColonyShipBuildQueueStatus.COMPLETED);
    expect(await hydrated()).toMatchObject({
      reactorOutput: 21,
      reactorFuelMax: 420,
      reactorFuel: 420,
    });
  });
  it('transfers charge between different core profiles without inventing a conversion', async () => {
    await db.manager.update(Spacecraft, ship.id, { reactorFuel: 85 });
    await db.manager.save(SpacecraftModule, {
      spacecraftId: ship.id,
      moduleType: 'Hypermaterie-Transferkoppler',
      category: 'SPECIAL',
    });
    const target = await db.manager.save(Spacecraft, {
      userId: owner.id,
      name: 'Light target',
      shipClassId: hull.id,
      locationId: ship.locationId,
      reactorFuel: 0,
      reactorFuelMax: 60,
      runtimeSystems: {},
    });
    await db.manager.save(SpacecraftModule, {
      spacecraftId: target.id,
      moduleType: 'Leichter Hypermaterie-Reaktor',
      category: 'REACTOR',
    });
    expect((await request('/systems/WARPDRIVE', { active: false }, 'PATCH')).status).toBe(200);
    const response = await request('/reactor-charge/transfer', {
      transfers: [{ targetShipId: target.id, amount: 85 }],
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ transferred: 60 });
    expect((await hydrated()).reactorFuel).toBe(25);
    expect(
      (await db.manager.findOneByOrFail(Spacecraft, { id: target.id }))
        .reactorFuel,
    ).toBe(60);
  });
});
