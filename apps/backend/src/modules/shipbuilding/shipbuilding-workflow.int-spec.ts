import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Faction } from '@swuniverse/shared';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import type {
  EntitySubscriberInterface,
  InsertEvent,
  TransactionStartEvent,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { ColonyOwnershipService } from '../colony/colony-ownership.service';
import { ColonyShipyardService } from '../colony/colony-shipyard.service';
import { ColonyStatsService } from '../colony/colony-stats.service';
import { ColonyStorageService } from '../colony/colony-storage.service';
import { ColonyTimingService } from '../colony/colony-timing.service';
import { ColonyChangeable } from '../colony/entities/colony-changeable.entity';
import { ColonyField } from '../colony/entities/colony-field.entity';
import { ColonyFabricationQueue } from '../colony/entities/colony-fabrication-queue.entity';
import { ColonyCrewTrainingQueue } from '../colony/entities/colony-crew-training-queue.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyEventService } from '../messaging/colony-event.service';
import { Message } from '../messaging/entities/message.entity';
import { SpacecraftStatsService } from '../spacecraft/spacecraft-stats.service';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import { ColonyShipBuildplan } from '../colony/entities/colony-ship-buildplan.entity';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
  ShipBuildSource,
} from '../colony/entities/colony-ship-build-queue.entity';
import {
  FabricationItemDef,
  GameDataService,
  ShipClassSlotRuleDef,
} from '../game-data/game-data.service';
import { Research, ResearchStatus } from '../research/entities/research.entity';
import { ResearchModule } from '../research/research.module';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import {
  Spacecraft,
  SpacecraftKind,
  SpacecraftStatus,
  StationRole,
} from '../spacecraft/entities/spacecraft.entity';
import { ShipbuildingCoreService } from '../spacecraft/shipbuilding-core.service';
import { TickService } from '../tick/tick.service';
import { ShipyardCompletionService } from '../tick/shipyard-completion.service';
import { GameTickState, GameTickStatus, GameTickType } from '../tick/entities/game-tick-state.entity';
import { MessagingService } from '../messaging/messaging.service';
import { StationShipyardService } from '../spacecraft/station-shipyard.service';
import { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import { Layer } from '../starmap/entities/layer.entity';
import {
  SpaceLocation,
  SpaceLocationKind,
} from '../starmap/entities/space-location.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { INTEGRATION_ENTITIES } from '../../testing/integration/data-source';
import { ShipbuildingModule } from './shipbuilding.module';

// Keep the real unlock resolver and database queries, without importing the
// unrelated research controller, websocket gateway, awards and reward workflow.
@Module({
  imports: [TypeOrmModule.forFeature([Research, ShipClassDef])],
  providers: [UnlockResolverService],
  exports: [UnlockResolverService],
})
class ShipbuildingResearchFixturesModule {}

const selections = [
  { slotId: 'a', commodityId: 101 },
  { slotId: 'b', commodityId: 102 },
];
// Independently known SHA256 for hull 42 and the two selections above.
const signature =
  '15389678c8ff0fe6bb7da0d330451a841be3a1bcc7b05188800b84f03ccc654f';

function gameDataFixtures() {
  const layout: ShipClassSlotRuleDef = {
    category: 'FRIGATE',
    allowedBuildingFunctionIds: [6],
    moduleSlots: {
      HULL: 1,
      EPS: 1,
      SPECIAL: 0,
    } as ShipClassSlotRuleDef['moduleSlots'],
    layoutKey: 'integration-frigate',
    imageKey: 'integration-frigate',
    slots: [
      {
        slotId: 'a',
        moduleCategory: 'HULL',
        label: 'Hull',
        anchorX: 10,
        anchorY: 20,
        calloutSide: 'left',
        order: 0,
      },
      {
        slotId: 'b',
        moduleCategory: 'EPS',
        label: 'EPS',
        anchorX: 90,
        anchorY: 20,
        calloutSide: 'right',
        order: 1,
      },
    ],
  };
  const modules: FabricationItemDef[] = [
    {
      itemKey: 'integration-hull',
      queueType: 'MODULE',
      displayName: 'Hull module',
      outputCommodityId: 101,
      outputAmount: 1,
      moduleType: 'Durasteel hull',
      shipyardType: 'HULL',
      moduleLevel: 2,
      researchId: 900,
      faction: Faction.REBEL_ALLIANCE,
      buildingFunctionIds: [6],
      durationSeconds: 60,
      costs: [],
      shipyardModuleStats: {
        crew: 2,
      } as FabricationItemDef['shipyardModuleStats'],
    },
    {
      itemKey: 'integration-eps',
      queueType: 'MODULE',
      displayName: 'EPS module',
      outputCommodityId: 102,
      outputAmount: 1,
      moduleType: 'Energieverteiler',
      shipyardType: 'EPS',
      moduleLevel: 1,
      researchId: 900,
      buildingFunctionIds: [6],
      durationSeconds: 60,
      costs: [],
      shipyardModuleStats: {
        crew: 1,
      } as FabricationItemDef['shipyardModuleStats'],
    },
  ];
  return {
    modules,
    getShipClassSlotRuleForShipClass: () => layout,
    getShipClassSlotRule: () => layout,
    getHangarShipDef: () => undefined,
    getShipClassDefByKey: () => ({
      stuRumpId: 42,
      allowedBuildingFunctionIds: [6],
      buildCosts: [
        { commodityId: 1, amount: 10 },
        { commodityId: 2, amount: 5 },
      ],
    }),
    getShipyardRumpStats: () => ({ epsCost: 8, moduleLevel: 2 }),
    getFabricationItemByOutputCommodity: (id: number) =>
      modules.find((item) => item.outputCommodityId === id),
    getAllFabricationItems: () => modules,
    isShipyardModuleAllowedForShipClass: () => true,
    getBuildingFunctions: (id: number) => (id === 11 ? [6] : []),
    getBuilding: () => undefined,
    getColonyClass: () => undefined,
    getBuildingFunction: () => undefined,
    getCommodity: (id: number) => ({ id, name: `Commodity ${id}` }),
    getAllModules: () => [
      {
        name: 'Durasteel hull',
        category: 'HULL',
        public: { baseHullPoints: 25 },
        secret: {},
      },
      {
        name: 'Energieverteiler',
        category: 'SPECIAL',
        public: { baseEpsCapacity: 10 },
        secret: {},
      },
    ],
  };
}

// Approved seams: public station/colony build and tick adapters, real shared
// core, Nest leaf-module construction and TypeORM persistence. Only external
// game-data/configuration fixtures are substituted. No core/entity mocks.
// Synchronize current real entity metadata in a private schema: historical
// migration compatibility is covered by the separate migration suite.
describe('shipbuilding workflow (Nest + PostgreSQL)', () => {
  let database: DataSource;
  let admin: DataSource;
  let module: TestingModule;
  let schema: string;
  let stationShipyard: StationShipyardService;
  let colonyShipyard: ColonyShipyardService;
  let gameData: ReturnType<typeof gameDataFixtures>;
  let user: User;
  let hull: ShipClassDef;
  let location: SpaceLocation;
  let station: Spacecraft;

  beforeAll(async () => {
    const url = process.env.INTEGRATION_DATABASE_URL;
    if (!url)
      throw new Error(
        'Run with jest.integration.config.cts (Testcontainers PostgreSQL)',
      );
    schema = `shipbuilding_workflow_${randomUUID().replace(/-/g, '')}`;
    admin = await new DataSource({ type: 'postgres', url }).initialize();
    await admin.query(`CREATE SCHEMA "${schema}"`);
    database = await new DataSource({
      type: 'postgres',
      url,
      schema,
      entities: [
        ...INTEGRATION_ENTITIES,
        ColonyShipBuildplan,
        ColonyShipBuildQueue,
        Research,
        ColonyFabricationQueue,
        ColonyCrewTrainingQueue,
      ],
      synchronize: true,
    }).initialize();
    gameData = gameDataFixtures();
    module = await Test.createTestingModule({
      imports: [
        ConfigModule,
        TypeOrmModule.forRootAsync({
          useFactory: () => ({ type: 'postgres' as const, url, schema }),
          dataSourceFactory: async () => database,
        }),
        TypeOrmModule.forFeature([
          User,
          ShipClassDef,
          ColonyShipBuildQueue,
          ColonyShipBuildplan,
          Colony,
          ColonyStorage,
          Spacecraft,
          SpacecraftModule,
          Message,
        ]),
        ResearchModule,
        ShipbuildingModule,
      ],
      providers: [
        StationShipyardService,
        ColonyOwnershipService,
        ColonyStorageService,
        ColonyStatsService,
        ColonyTimingService,
        SpacecraftStatsService,
        ColonyEventService,
        {
          provide: ColonyShipyardService,
          inject: [
            DataSource,
            GameDataService,
            ColonyOwnershipService,
            ColonyStorageService,
            ColonyStatsService,
            ColonyEventService,
            SpacecraftStatsService,
            UnlockResolverService,
            ColonyTimingService,
            ShipbuildingCoreService,
          ],
          useFactory: (
            source: DataSource,
            data: GameDataService,
            ownership: ColonyOwnershipService,
            storage: ColonyStorageService,
            colonyStats: ColonyStatsService,
            events: ColonyEventService,
            spacecraftStats: SpacecraftStatsService,
            unlocks: UnlockResolverService,
            timing: ColonyTimingService,
            core: ShipbuildingCoreService,
          ) =>
            new ColonyShipyardService(
              source.getRepository(ColonyStorage),
              source.getRepository(Spacecraft),
              source.getRepository(ColonyShipBuildQueue),
              source.getRepository(ColonyShipBuildplan),
              source.getRepository(SpacecraftModule),
              source.getRepository(ShipClassDef),
              data,
              ownership,
              storage,
              colonyStats,
              // User-approved seam: orbit management and messaging belong only
              // to repair/retrofit, never BUILD. Leave them absent, not mocked.
              undefined as never,
              events,
              undefined as never,
              spacecraftStats,
              unlocks,
              timing,
              source.getRepository(User),
              source,
              core,
            ),
        },
      ],
    })
      .overrideModule(ResearchModule)
      .useModule(ShipbuildingResearchFixturesModule)
      .overrideProvider(GameDataService)
      .useValue(gameData)
      .overrideProvider(ConfigService)
      .useValue(new ConfigService({ GAME_BUILD_TIME_MULTIPLIER: 1 }))
      .compile();
    await module.init();
    stationShipyard = module.get(StationShipyardService);
    colonyShipyard = module.get(ColonyShipyardService);
  });

  beforeEach(async () => {
    const tables = database.entityMetadatas.map(
      (metadata) => `"${schema}"."${metadata.tableName}"`,
    );
    await database.query(
      `TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE`,
    );
    gameData.modules.splice(
      0,
      gameData.modules.length,
      ...gameDataFixtures().modules,
    );
    user = await database.getRepository(User).save({
      username: 'shipbuilder',
      email: 'shipbuilder@example.test',
      passwordHash: 'x',
      faction: Faction.REBEL_ALLIANCE,
    });
    await database.query(
      `ALTER SEQUENCE "${schema}"."ship_class_defs_id_seq" RESTART WITH 42`,
    );
    hull = await database.getRepository(ShipClassDef).save({
      key: 'integration-frigate',
      name: 'Integration frigate',
      category: 'FRIGATE',
      role: 'FRIGATE',
      unlockTechId: 900,
      buildTimeTicks: 2,
      crewMin: 4,
      crewMax: 10,
      hullBase: 100,
      shieldBase: 50,
      epsBase: 100,
      batteryBase: 20,
      reactorBase: 15,
      warpdriveBase: 8,
      evadeBase: 5,
      cargoCapacity: 100,
    });
    await database.getRepository(Research).save({
      userId: user.id,
      techId: 900,
      status: ResearchStatus.COMPLETED,
    });
    const layer = await database.getRepository(Layer).save({
      name: 'Test galaxy',
      width: 10,
      height: 10,
    });
    const system = await database.getRepository(StarSystem).save({
      name: 'Test system',
      cx: 1,
      cy: 1,
      layerId: layer.id,
      systemTypeId: 1,
    });
    const fieldType = await database.getRepository(GalaxyFieldType).save({
      key: 'integration-space',
      name: 'Empty space',
    });
    const field = await database.getRepository(SystemField).save({
      starSystemId: system.id,
      sx: 2,
      sy: 3,
      fieldTypeId: fieldType.id,
    });
    location = await database.getRepository(SpaceLocation).save({
      kind: SpaceLocationKind.SYSTEM_FIELD,
      systemFieldId: field.id,
    });
    station = await database.getRepository(Spacecraft).save({
      name: 'Raumwerft',
      userId: user.id,
      shipClassId: hull.id,
      locationId: location.id,
      kind: SpacecraftKind.STATION,
      stationRole: StationRole.SHIPYARD,
      dockCapacity: 1,
      cargoUsed: 38,
      cargoMax: 100,
    });
    await database.getRepository(CargoItem).save(
      initialInventory().map((item) => ({
        ...item,
        spacecraftId: station.id,
      })),
    );
  });

  afterAll(async () => {
    try {
      if (module) await module.close();
      else if (database?.isInitialized) await database.destroy();
    } finally {
      if (admin?.isInitialized) {
        try {
          await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        } finally {
          await admin.destroy();
        }
      }
    }
  });

  it('constructs the real leaf module and builds an owned docked ship exactly once after a full dock is freed', async () => {
    expect(module.get(ShipbuildingCoreService)).toBeInstanceOf(
      ShipbuildingCoreService,
    );
    expect(module.get(DataSource)).toBe(database);
    const job = await stationShipyard.build(station.id, user.id, {
      shipClassId: hull.id,
      name: '  First frigate  ',
      buildPlanName: 'Shared frigate blueprint',
      moduleSelections: selections,
    });
    const overview = await stationShipyard.overview(station.id, user.id);
    expect(overview.buildplans).toEqual([
      expect.objectContaining({
        id: job.buildPlanId,
        userId: user.id,
        shipClassId: 42,
        name: 'Shared frigate blueprint',
        signature,
        moduleSelections: selections,
        moduleCommodityIds: [101, 102],
        moduleTypes: ['Durasteel hull', 'Energieverteiler'],
      }),
    ]);
    expect(overview.queues).toEqual([
      expect.objectContaining({
        id: job.id,
        source: ShipBuildSource.STATION,
        colonyId: null,
        stationId: station.id,
        name: 'First frigate',
        buildPlanId: overview.buildplans[0].id,
        buildPlanSignature: signature,
        mode: ColonyShipBuildQueueMode.BUILD,
        status: ColonyShipBuildQueueStatus.QUEUED,
        buildSnapshot: {
          version: 1,
          crewRequired: 7,
          modules: [
            {
              slotId: 'a',
              commodityId: 101,
              moduleType: 'Durasteel hull',
              category: 'HULL',
              level: 2,
            },
            {
              slotId: 'b',
              commodityId: 102,
              moduleType: 'Energieverteiler',
              category: 'EPS',
              level: 1,
            },
          ],
        },
      }),
    ]);
    expect(await cargoAmounts()).toEqual([
      [1, 10],
      [2, 5],
      [101, 2],
      [102, 2],
      [999, 2],
    ]);
    expect((await loadStation()).cargoUsed).toBe(21);

    // A normal early tick cannot finish a paid build before its due date.
    await stationShipyard.processTick(station.id);
    expect(await builtShips()).toHaveLength(0);
    const blocker = await database.getRepository(Spacecraft).save({
      name: 'Occupied dock',
      shipClassId: hull.id,
      userId: user.id,
      locationId: location.id,
      dockedAtId: station.id,
    });
    await makeDue(job.id);
    await stationShipyard.processTick(station.id);
    expect(
      (await stationShipyard.overview(station.id, user.id)).queues,
    ).toHaveLength(1);
    expect(await builtShips()).toHaveLength(0);
    expect(await cargoAmounts()).toEqual([
      [1, 10],
      [2, 5],
      [101, 2],
      [102, 2],
      [999, 2],
    ]);

    await database
      .getRepository(Spacecraft)
      .update(blocker.id, { dockedAtId: null });
    await Promise.all([
      stationShipyard.processTick(station.id),
      stationShipyard.processTick(station.id),
      stationShipyard.processTick(station.id),
    ]);
    await stationShipyard.processTick(station.id);
    expect(await builtShips()).toEqual([
      expect.objectContaining({
        name: 'First frigate',
        userId: user.id,
        shipClassId: 42,
        locationId: location.id,
        dockedAtId: station.id,
        kind: SpacecraftKind.SHIP,
        status: SpacecraftStatus.IDLE,
        buildPlanId: job.buildPlanId,
        crew: 0,
        crewRequired: 7,
        crewMax: 10,
        hullMax: 130,
        energyMax: 110,
        cargoMax: 100,
        modules: [
          expect.objectContaining({
            slotId: 'a',
            moduleType: 'Durasteel hull',
            category: 'HULL',
            level: 2,
            integrity: 100,
            isActive: true,
          }),
          expect.objectContaining({
            slotId: 'b',
            moduleType: 'Energieverteiler',
            category: 'EPS',
            level: 1,
            integrity: 100,
            isActive: true,
          }),
        ],
        runtimeSystems: expect.objectContaining({
          EPS: expect.objectContaining({
            active: true,
            cooldown: 0,
            integrity: 100,
            current: 100,
            max: 110,
          }),
        }),
      }),
    ]);
    expect(
      (await stationShipyard.overview(station.id, user.id)).queues,
    ).toEqual([]);
    expect(
      (
        await database
          .getRepository(ColonyShipBuildQueue)
          .findOneByOrFail({ id: job.id })
      ).status,
    ).toBe(ColonyShipBuildQueueStatus.COMPLETED);
    expect(await cargoAmounts()).toEqual([
      [1, 10],
      [2, 5],
      [101, 2],
      [102, 2],
      [999, 2],
    ]);
  });

  it.each([
    ['insufficient hull material', 1, 9],
    ['missing selected module', 102, null],
  ])(
    'reserves nothing when station inventory has %s',
    async (_description, commodityId, amount) => {
      const cargoRepo = database.getRepository(CargoItem);
      if (amount == null)
        await cargoRepo.delete({ spacecraftId: station.id, commodityId });
      else
        await cargoRepo.update(
          { spacecraftId: station.id, commodityId },
          { amount },
        );
      const before = await cargoAmounts();
      const cargoUsed = (await loadStation()).cargoUsed;

      await expect(
        stationShipyard.build(station.id, user.id, {
          shipClassId: hull.id,
          name: 'Cannot build',
          buildPlanName: 'Must not survive',
          moduleSelections: selections,
        }),
      ).rejects.toThrow(`Not enough resources for commodity #${commodityId}`);

      const overview = await stationShipyard.overview(station.id, user.id);
      expect(overview.buildplans).toEqual([]);
      expect(overview.queues).toEqual([]);
      expect(await cargoAmounts()).toEqual(before);
      expect((await loadStation()).cargoUsed).toBe(cargoUsed);
      expect(await database.getRepository(Spacecraft).count()).toBe(1);
    },
  );

  it('rolls back a new blueprint, inventory deductions and cargo accounting when saving the queue fails late', async () => {
    // PostgreSQL rejects this varchar(255) after blueprint creation and cargo
    // consumption. The real transaction must undo all preceding writes.
    await expect(
      stationShipyard.build(station.id, user.id, {
        shipClassId: hull.id,
        name: 'x'.repeat(256),
        buildPlanName: 'Must roll back',
        moduleSelections: selections,
      }),
    ).rejects.toMatchObject({ driverError: { code: '22001' } });

    const overview = await stationShipyard.overview(station.id, user.id);
    expect(overview.buildplans).toEqual([]);
    expect(overview.queues).toEqual([]);
    expect(await cargoAmounts()).toEqual([
      [1, 20],
      [2, 10],
      [101, 3],
      [102, 3],
      [999, 2],
    ]);
    expect((await loadStation()).cargoUsed).toBe(38);

    const retry = await stationShipyard.build(station.id, user.id, {
      shipClassId: hull.id,
      name: 'Valid retry',
      buildPlanName: 'Must roll back',
      moduleSelections: selections,
    });
    expect(retry.status).toBe(ColonyShipBuildQueueStatus.QUEUED);
    expect(
      (await stationShipyard.overview(station.id, user.id)).buildplans,
    ).toHaveLength(1);
    expect(await cargoAmounts()).toEqual([
      [1, 10],
      [2, 5],
      [101, 2],
      [102, 2],
      [999, 2],
    ]);
  });

  it('serializes colonizer admission across different shipyards for the same player', async () => {
    await database
      .getRepository(ShipClassDef)
      .update(hull.id, { isColonizer: true });
    // The station has its own, non-colonizer class; only built hulls count.
    const stationHull = await database.getRepository(ShipClassDef).save(
      database.getRepository(ShipClassDef).create({
        ...hull,
        id: undefined,
        key: 'integration-station',
        isColonizer: false,
      }),
    );
    await database
      .getRepository(Spacecraft)
      .update(station.id, { shipClassId: stationHull.id });
    const other = await database.getRepository(Spacecraft).save(
      database.getRepository(Spacecraft).create({
        ...station,
        id: undefined,
        shipClassId: stationHull.id,
        name: 'Other Raumwerft',
      }),
    );
    await database.getRepository(CargoItem).save([
      { spacecraftId: other.id, commodityId: 1, amount: 20 },
      { spacecraftId: other.id, commodityId: 2, amount: 10 },
    ]);
    const results = await Promise.allSettled([
      stationShipyard.build(station.id, user.id, {
        shipClassId: hull.id,
        name: 'One',
      }),
      stationShipyard.build(other.id, user.id, {
        shipClassId: hull.id,
        name: 'Two',
      }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find(
      (result) => result.status === 'rejected',
    ) as PromiseRejectedResult;
    expect(rejected.reason.message).toBe(
      'A colonization ship is already under construction',
    );
    expect(await database.getRepository(ColonyShipBuildQueue).count()).toBe(1);
    expect(await database.getRepository(ColonyShipBuildplan).count()).toBe(1);
    const paidJob = await database
      .getRepository(ColonyShipBuildQueue)
      .findOneByOrFail({ userId: user.id });
    await makeDue(paidJob.id);
    await stationShipyard.processTick(requiredId(paidJob.stationId));
    await expect(
      stationShipyard.build(
        paidJob.stationId === station.id ? other.id : station.id,
        user.id,
        { shipClassId: hull.id, name: 'Third' },
      ),
    ).rejects.toThrow('Es kann nur ein Schiff mit Kolonisierungsfunktion');
  });

  it('finishes an existing station build while admitting the next one without a player/source foreign-key deadlock', async () => {
    const existing = await stationShipyard.build(station.id, user.id, {
      shipClassId: hull.id,
      name: 'Finishing frigate',
      moduleSelections: selections,
    });
    await makeDue(existing.id);

    // Only schedule the real transactions: the completion reaches INSERT with
    // its actual placement and queue locks held. Admission then waits on a real
    // PostgreSQL row lock. No sleep-based race, core mock or adapter replacement.
    const barrier = pauseInsert(Spacecraft, 'Finishing frigate');
    let outcomes: Promise<PromiseSettledResult<unknown>[]> | undefined;
    const tick = stationShipyard.processTick(station.id);
    // Attach rejection handlers immediately so a DB failure never becomes an
    // unhandled rejection while the lock probe is establishing the interleave.
    outcomes = Promise.allSettled([tick]);
    try {
      await Promise.race([
        barrier.atInsert,
        tick.then(() => {
          throw new Error('Completion ended before the insert barrier');
        }),
      ]);
      const build = stationShipyard.build(station.id, user.id, {
        shipClassId: hull.id,
        name: 'Next frigate',
        moduleSelections: selections,
      });
      outcomes = Promise.allSettled([tick, build]);
      const pid = await Promise.race([
        barrier.nextTransactionPid,
        build.then(() => {
          throw new Error('Admission ended before transaction observation');
        }),
      ]);
      const deadline = Date.now() + 5000;
      let blocked = false;
      while (Date.now() < deadline) {
        if (await isBackendBlocked(pid)) {
          blocked = true;
          break;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
      }
      expect(blocked).toBe(true);
      barrier.release();
      const results = await outcomes;
      // Assert actual errors, rather than retrying and concealing a 40P01.
      expect(
        results.map((result) =>
          result.status === 'fulfilled'
            ? 'fulfilled'
            : {
                code: result.reason.driverError?.code,
                message: result.reason.message,
              },
        ),
      ).toEqual(['fulfilled', 'fulfilled']);
    } finally {
      barrier.release();
      if (outcomes) await outcomes;
      barrier.remove();
    }

    expect(await builtShips()).toEqual([
      expect.objectContaining({
        name: 'Finishing frigate',
        userId: user.id,
        dockedAtId: station.id,
      }),
    ]);
    expect(
      (await stationShipyard.overview(station.id, user.id)).queues,
    ).toEqual([
      expect.objectContaining({
        name: 'Next frigate',
        status: ColonyShipBuildQueueStatus.QUEUED,
      }),
    ]);
    expect(await cargoAmounts()).toEqual([
      [1, 0],
      [2, 0],
      [101, 1],
      [102, 1],
      [999, 2],
    ]);
    expect((await loadStation()).cargoUsed).toBe(4);
    expect(await database.getRepository(ColonyShipBuildplan).count()).toBe(1);
  });

  it('shares an explicitly created colony blueprint with overlapping station admission without a unique-signature race', async () => {
    const barrier = pauseInsert(ColonyShipBuildplan, 'Explicit colony design');
    const create = colonyShipyard.createAdminBuildplan(
      user.id,
      hull.id,
      'Explicit colony design',
      selections,
    );
    let outcomes: Promise<PromiseSettledResult<unknown>[]> = Promise.allSettled(
      [create],
    );
    try {
      await Promise.race([
        barrier.atInsert,
        create.then(() => {
          throw new Error(
            'Explicit creation ended before the blueprint barrier',
          );
        }),
      ]);
      const build = stationShipyard.build(station.id, user.id, {
        shipClassId: hull.id,
        name: 'Shared-design frigate',
        moduleSelections: selections,
      });
      outcomes = Promise.allSettled([create, build]);
      let admissionSettled = false;
      void build.then(
        () => {
          admissionSettled = true;
        },
        () => {
          admissionSettled = true;
        },
      );
      const pid = await barrier.nextTransactionPid;
      const deadline = Date.now() + 5000;
      let blocked = false;
      // Broken behavior admits the station outright, stealing the signature.
      // Correct shared persistence holds the player lock, so station admission
      // waits until explicit creation commits and then reuses that blueprint.
      while (!admissionSettled && Date.now() < deadline) {
        if (await isBackendBlocked(pid)) {
          blocked = true;
          break;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
      }
      expect(blocked || admissionSettled).toBe(true);
      barrier.release();
      const results = await outcomes;
      expect(
        results.map((result) =>
          result.status === 'fulfilled'
            ? 'fulfilled'
            : {
                code: result.reason.driverError?.code,
                message: result.reason.message,
              },
        ),
      ).toEqual(['fulfilled', 'fulfilled']);
    } finally {
      barrier.release();
      await outcomes;
      barrier.remove();
    }

    const overview = await stationShipyard.overview(station.id, user.id);
    expect(overview.buildplans).toEqual([
      expect.objectContaining({
        name: 'Explicit colony design',
        signature,
        moduleSelections: selections,
      }),
    ]);
    expect(overview.queues).toEqual([
      expect.objectContaining({
        name: 'Shared-design frigate',
        buildPlanId: overview.buildplans[0].id,
        buildPlanName: 'Explicit colony design',
        buildPlanSignature: signature,
        status: ColonyShipBuildQueueStatus.QUEUED,
      }),
    ]);
    expect(await colonyShipyard.listUserBuildplans(user.id)).toEqual([
      expect.objectContaining({
        id: overview.buildplans[0].id,
        name: 'Explicit colony design',
        canDelete: false,
      }),
    ]);
    expect(await cargoAmounts()).toEqual([
      [1, 10],
      [2, 5],
      [101, 2],
      [102, 2],
      [999, 2],
    ]);
    expect((await loadStation()).cargoUsed).toBe(21);
  });

  it('serializes concurrent station builds into one queue and one paid reservation', async () => {
    const results = await Promise.allSettled([
      stationShipyard.build(station.id, user.id, {
        shipClassId: hull.id,
        name: 'One',
        moduleSelections: selections,
      }),
      stationShipyard.build(station.id, user.id, {
        shipClassId: hull.id,
        name: 'Two',
        moduleSelections: selections,
      }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find(
      (result) => result.status === 'rejected',
    ) as PromiseRejectedResult;
    expect(rejected.reason.message).toMatch(/bereits ein Schiff gebaut/);
    const overview = await stationShipyard.overview(station.id, user.id);
    expect(overview.buildplans).toHaveLength(1);
    expect(overview.queues).toHaveLength(1);
    expect(await cargoAmounts()).toEqual([
      [1, 10],
      [2, 5],
      [101, 2],
      [102, 2],
      [999, 2],
    ]);
    expect((await loadStation()).cargoUsed).toBe(21);
  });

  it.each([
    ['foreign owner', { userId: -1 }],
    ['ordinary ship', { kind: SpacecraftKind.SHIP }],
    ['depot role', { stationRole: StationRole.DEPOT_SMALL }],
    ['destroyed shipyard', { status: SpacecraftStatus.DESTROYED }],
  ])(
    'rejects station build admission for a %s without charging inventory',
    async (_description, change) => {
      // A real foreign owner is needed because the metadata enforces ownership FK.
      if ('userId' in change) {
        const foreign = await database.getRepository(User).save({
          username: 'foreign',
          email: 'foreign@example.test',
          passwordHash: 'x',
        });
        await database
          .getRepository(Spacecraft)
          .update(station.id, { userId: foreign.id });
      } else
        await database.getRepository(Spacecraft).update(station.id, change);

      await expect(
        stationShipyard.build(station.id, user.id, {
          shipClassId: hull.id,
          name: 'Forbidden ship',
          moduleSelections: selections,
        }),
      ).rejects.toThrow();

      expect(await database.getRepository(ColonyShipBuildplan).count()).toBe(0);
      expect(await database.getRepository(ColonyShipBuildQueue).count()).toBe(
        0,
      );
      expect(await cargoAmounts()).toEqual([
        [1, 20],
        [2, 10],
        [101, 3],
        [102, 3],
        [999, 2],
      ]);
    },
  );

  it('completes from the paid snapshot after research, faction, blueprint and module catalog mutate', async () => {
    const job = await stationShipyard.build(station.id, user.id, {
      shipClassId: hull.id,
      name: 'Snapshot frigate',
      moduleSelections: selections,
    });
    await database.getRepository(Research).delete({ userId: user.id });
    await database
      .getRepository(User)
      .update(user.id, { faction: Faction.GALACTIC_EMPIRE });
    await database
      .getRepository(ColonyShipBuildplan)
      .update(requiredId(job.buildPlanId), {
        name: 'Renamed after enqueue',
        moduleSelections: [],
        moduleTypes: [],
        moduleCommodityIds: [],
      });
    gameData.modules.splice(0);
    expect(
      await module
        .get(UnlockResolverService)
        .isShipClassUnlocked(user.id, hull.id),
    ).toBe(false);
    await makeDue(job.id);

    await stationShipyard.processTick(station.id);

    expect(await builtShips()).toEqual([
      expect.objectContaining({
        name: 'Snapshot frigate',
        userId: user.id,
        buildPlanId: job.buildPlanId,
        crewRequired: 7,
        hullMax: 130,
        energyMax: 110,
        modules: [
          expect.objectContaining({
            slotId: 'a',
            moduleType: 'Durasteel hull',
            category: 'HULL',
            level: 2,
          }),
          expect.objectContaining({
            slotId: 'b',
            moduleType: 'Energieverteiler',
            category: 'EPS',
            level: 1,
          }),
        ],
      }),
    ]);
    const completed = await database
      .getRepository(ColonyShipBuildQueue)
      .findOneByOrFail({ id: job.id });
    expect(completed).toMatchObject({
      status: ColonyShipBuildQueueStatus.COMPLETED,
      buildPlanName: 'Integration frigate Buildplan',
      buildPlanSignature: signature,
      buildSnapshot: { version: 1, crewRequired: 7 },
    });
    expect(await cargoAmounts()).toEqual([
      [1, 10],
      [2, 5],
      [101, 2],
      [102, 2],
      [999, 2],
    ]);
  });

  it('reuses a real station blueprint at a colony, charges only colony resources/EPS and completes once in colony orbit', async () => {
    const stationJob = await stationShipyard.build(station.id, user.id, {
      shipClassId: hull.id,
      name: 'Station frigate',
      moduleSelections: selections,
      buildPlanName: 'Shared blueprint',
    });
    const colony = await createColony();
    const stationCargo = await cargoAmounts();
    const colonyJob = await colonyShipyard.buildShipFromBuildplan(
      colony.id,
      user.id,
      requiredId(stationJob.buildPlanId),
      'Colony frigate',
      6,
    );
    expect(colonyJob).toMatchObject({
      source: ShipBuildSource.COLONY,
      colonyId: colony.id,
      stationId: null,
      buildingFunctionId: 6,
      buildPlanId: stationJob.buildPlanId,
      buildPlanName: 'Shared blueprint',
      buildPlanSignature: signature,
      moduleSelections: selections,
      crewRequired: 7,
    });
    expect(await colonyShipyard.listUserBuildplans(user.id)).toEqual([
      expect.objectContaining({
        id: stationJob.buildPlanId,
        name: 'Shared blueprint',
        canDelete: false,
      }),
    ]);
    expect(await storageAmounts(colony.id)).toEqual([
      [1, 10],
      [2, 5],
      [101, 2],
      [102, 2],
      [999, 2],
    ]);
    expect((await colonyShipyard.findOne(colony.id, user.id)).storageUsed).toBe(
      21,
    );
    expect(
      (await colonyShipyard.findOne(colony.id, user.id)).changeable.energy,
    ).toBe(42);
    expect(await cargoAmounts()).toEqual(stationCargo);

    await makeDue(colonyJob.id);
    await Promise.all([
      colonyShipyard.processShipBuildQueue(
        await colonyShipyard.findOne(colony.id, user.id),
      ),
      colonyShipyard.processShipBuildQueue(
        await colonyShipyard.findOne(colony.id, user.id),
      ),
    ]);
    await colonyShipyard.processShipBuildQueue(
      await colonyShipyard.findOne(colony.id, user.id),
    );
    expect(await builtShips()).toEqual([
      expect.objectContaining({
        name: 'Colony frigate',
        locationId: location.id,
        dockedAtId: null,
        userId: user.id,
        buildPlanId: stationJob.buildPlanId,
        crewRequired: 7,
        modules: [
          expect.objectContaining({ slotId: 'a', level: 2 }),
          expect.objectContaining({ slotId: 'b', level: 1 }),
        ],
      }),
    ]);
    expect(
      (await stationShipyard.overview(station.id, user.id)).queues,
    ).toEqual([
      expect.objectContaining({
        id: stationJob.id,
        status: ColonyShipBuildQueueStatus.QUEUED,
      }),
    ]);
    expect(
      (
        await database
          .getRepository(ColonyShipBuildQueue)
          .findOneByOrFail({ id: colonyJob.id })
      ).status,
    ).toBe(ColonyShipBuildQueueStatus.COMPLETED);
    expect(await storageAmounts(colony.id)).toEqual([
      [1, 10],
      [2, 5],
      [101, 2],
      [102, 2],
      [999, 2],
    ]);
    expect(
      (await colonyShipyard.findOne(colony.id, user.id)).changeable.energy,
    ).toBe(42);
  });

  function pauseInsert<T extends { name: string }>(
    entity: new () => T,
    name: string,
  ) {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reached: () => void = () => undefined;
    const atInsert = new Promise<void>((resolve) => {
      reached = resolve;
    });
    let capturePid: (pid: number) => void = () => undefined;
    const nextTransactionPid = new Promise<number>((resolve) => {
      capturePid = resolve;
    });
    let paused = false;
    let captureNext = true;
    const subscriber: EntitySubscriberInterface<T> = {
      listenTo: () => entity,
      beforeInsert: async (event: InsertEvent<T>) => {
        if (event.entity?.name !== name) return;
        paused = true;
        reached();
        await gate;
      },
      afterTransactionStart: async (event: TransactionStartEvent) => {
        if (!paused || !captureNext) return;
        captureNext = false;
        const [{ pid }] = await event.queryRunner.query(
          'SELECT pg_backend_pid() AS pid',
        );
        capturePid(pid);
      },
    };
    database.subscribers.push(subscriber);
    return {
      atInsert,
      nextTransactionPid,
      release,
      remove: () => {
        database.subscribers.splice(
          database.subscribers.indexOf(subscriber),
          1,
        );
      },
    };
  }

  async function isBackendBlocked(pid: number): Promise<boolean> {
    const rows: Array<{ blocked: boolean }> = await admin.query(
      `SELECT cardinality(pg_blocking_pids(pid)) > 0 AS blocked
       FROM pg_stat_activity WHERE pid = $1 AND wait_event_type = 'Lock'`,
      [pid],
    );
    return rows.some((row) => row.blocked);
  }

  function initialInventory() {
    return [
      { commodityId: 1, amount: 20 },
      { commodityId: 2, amount: 10 },
      { commodityId: 101, amount: 3 },
      { commodityId: 102, amount: 3 },
      { commodityId: 999, amount: 2 },
    ];
  }

  function requiredId(id: number | null): number {
    if (id == null)
      throw new Error('Expected a persisted fixture/entity reference');
    return id;
  }

  function minuteRunner() {
    const gateway = { emitToUser: jest.fn() };
    const messaging = new MessagingService(
      database.getRepository(Message), database.getRepository(User), undefined as never,
      gateway as never, undefined as never,
    );
    const shipyards = new ShipyardCompletionService(
      database.getRepository(ColonyShipBuildQueue), colonyShipyard, stationShipyard, messaging, gateway as never,
    );
    const runner = Object.create(TickService.prototype) as TickService;
    Object.assign(runner, {
      fieldRepo: database.getRepository(ColonyField), colonyRepo: database.getRepository(Colony),
      tickStateRepo: database.getRepository(GameTickState), shipyardCompletions: shipyards,
      gateway,
    });
    return { runner, shipyards, gateway };
  }

  it('minute shipyard: finishes due colony and station builds on vacation without a main tick, only once', async () => {
    const stationJob = await stationShipyard.build(station.id, user.id, {
      shipClassId: hull.id, name: 'Minute station', moduleSelections: selections,
    });
    const colony = await createColony();
    const colonyJob = await colonyShipyard.buildShipFromBuildplan(
      colony.id, user.id, requiredId(stationJob.buildPlanId), 'Minute colony', 6,
    );
    await database.getRepository(User).update(user.id, {
      vacationMode: true, vacationStartedAt: new Date(Date.now() - 49 * 3600000),
    });
    await makeDue(stationJob.id);
    await makeDue(colonyJob.id);
    const { runner, gateway } = minuteRunner();
    await Promise.all([runner.checkBuildingCompletions(), runner.checkBuildingCompletions()]);
    await runner.checkBuildingCompletions();
    expect((await builtShips()).map(ship => ship.name).sort()).toEqual(['Minute colony', 'Minute station']);
    expect(await database.getRepository(Message).count()).toBe(2);
    expect(await database.getRepository(ColonyShipBuildQueue).countBy({ status: ColonyShipBuildQueueStatus.COMPLETED })).toBe(2);
    const runs = await database.getRepository(GameTickState).find();
    expect(runs.length).toBeGreaterThanOrEqual(1);
    expect(runs.every(run => run.tickType === GameTickType.BUILDING_COMPLETION && run.status === GameTickStatus.COMPLETED && run.startedAt && run.completedAt)).toBe(true);
    expect(gateway.emitToUser.mock.calls.filter(([, event]) => event === 'SPACECRAFT_EVENT')).toHaveLength(2);
  });

  it('minute shipyard: future jobs and empty runs leave queues and history unchanged', async () => {
    const job = await stationShipyard.build(station.id, user.id, {
      shipClassId: hull.id, name: 'Later', moduleSelections: selections,
    });
    await minuteRunner().runner.checkBuildingCompletions();
    expect(await builtShips()).toHaveLength(0);
    expect(await database.getRepository(GameTickState).count()).toBe(0);
    expect(await database.getRepository(ColonyShipBuildQueue).findOneByOrFail({ id: job.id })).toMatchObject({ status: ColonyShipBuildQueueStatus.QUEUED });
  });

  it('minute shipyard: overlapping retrofit completions replace and return modules once', async () => {
    const build = await stationShipyard.build(station.id, user.id, {
      shipClassId: hull.id, name: 'Retrofit minute', moduleSelections: selections,
    });
    await makeDue(build.id);
    await stationShipyard.processTick(station.id);
    const ship = (await builtShips())[0];
    const colony = await createColony();
    const upgraded = { ...gameData.modules[1], outputCommodityId: 103, moduleType: 'Energieverteiler II', moduleLevel: 2 };
    gameData.modules.push(upgraded);
    const desired = [selections[0], { slotId: 'b', commodityId: 103 }];
    const retrofit = await database.getRepository(ColonyShipBuildQueue).save({
      source: ShipBuildSource.COLONY, colonyId: colony.id, userId: user.id,
      shipClassId: hull.id, spacecraftId: ship.id, name: 'Umrüstung', mode: ColonyShipBuildQueueMode.RETROFIT,
      moduleSelections: desired, finishesAt: new Date(Date.now() - 1000),
      retrofitSnapshot: { oldModuleSelections: selections, newModuleSelections: desired, newModuleTypes: [upgraded.moduleType], returnedModuleCommodityIds: [], consumedModuleCommodityIds: [103] },
    });
    const { runner } = minuteRunner();
    await Promise.all([runner.checkBuildingCompletions(), runner.checkBuildingCompletions()]);
    await runner.checkBuildingCompletions();
    expect(await database.getRepository(SpacecraftModule).find({ where: { spacecraftId: ship.id } })).toEqual(expect.arrayContaining([
      expect.objectContaining({ slotId: 'a', moduleType: 'Durasteel hull' }),
      expect.objectContaining({ slotId: 'b', moduleType: upgraded.moduleType, level: 2 }),
    ]));
    expect(await database.getRepository(SpacecraftModule).countBy({ spacecraftId: ship.id })).toBe(2);
    expect(await database.getRepository(ColonyStorage).findOneByOrFail({ colonyId: colony.id, commodityId: 102 })).toMatchObject({ amount: 4 });
    expect(await database.getRepository(ColonyShipBuildQueue).findOneByOrFail({ id: retrofit.id })).toMatchObject({ status: ColonyShipBuildQueueStatus.COMPLETED, retrofitSnapshot: { returnedModuleCommodityIds: [102] } });
    expect(await database.getRepository(Message).count()).toBe(1);
  });

  it('minute shipyard: a cancellation after discovery prevents completion', async () => {
    const stationJob = await stationShipyard.build(station.id, user.id, {
      shipClassId: hull.id, name: 'Blueprint', moduleSelections: selections,
    });
    const colony = await createColony();
    const job = await colonyShipyard.buildShipFromBuildplan(colony.id, user.id, requiredId(stationJob.buildPlanId), 'Cancelled', 6);
    await makeDue(job.id);
    const { shipyards, gateway } = minuteRunner();
    const discovered = await shipyards.findDueJobs(new Date());
    await colonyShipyard.cancelShipBuildQueue(colony.id, user.id, job.id);
    await shipyards.completeJobs(discovered);
    expect(await builtShips()).toHaveLength(0);
    expect(await database.getRepository(Message).count()).toBe(0);
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('minute shipyard: notification failure rolls back build, modules and queue together', async () => {
    const job = await stationShipyard.build(station.id, user.id, {
      shipClassId: hull.id, name: 'Rollback', moduleSelections: selections,
    });
    await makeDue(job.id);
    const shipyards = new ShipyardCompletionService(
      database.getRepository(ColonyShipBuildQueue), colonyShipyard, stationShipyard,
      { sendSystem: async () => { throw new Error('message unavailable'); } } as never,
      { emitToUser: jest.fn() } as never,
    );
    await expect(shipyards.completeJobs(await shipyards.findDueJobs(new Date()))).rejects.toThrow('message unavailable');
    expect(await builtShips()).toHaveLength(0);
    expect(await database.getRepository(SpacecraftModule).count()).toBe(0);
    expect(await database.getRepository(ColonyShipBuildQueue).findOneByOrFail({ id: job.id })).toMatchObject({ status: ColonyShipBuildQueueStatus.QUEUED });
    await minuteRunner().runner.checkBuildingCompletions();
    expect(await builtShips()).toHaveLength(1);
    expect(await database.getRepository(Message).count()).toBe(1);
  });

  it('minute shipyard: concurrent retrofit cancellations refund paid modules only once', async () => {
    const colony = await createColony();
    const job = await database.getRepository(ColonyShipBuildQueue).save({
      source: ShipBuildSource.COLONY, colonyId: colony.id, userId: user.id,
      shipClassId: hull.id, name: 'Cancel retrofit', mode: ColonyShipBuildQueueMode.RETROFIT,
      finishesAt: new Date(), retrofitSnapshot: {
        oldModuleSelections: [], newModuleSelections: [], newModuleTypes: [],
        returnedModuleCommodityIds: [], consumedModuleCommodityIds: [102],
      },
    });
    const before = await database.getRepository(ColonyStorage).findOneByOrFail({ colonyId: colony.id, commodityId: 102 });
    const results = await Promise.allSettled([
      colonyShipyard.cancelShipBuildQueue(colony.id, user.id, job.id),
      colonyShipyard.cancelShipBuildQueue(colony.id, user.id, job.id),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(await database.getRepository(ColonyStorage).findOneByOrFail({ colonyId: colony.id, commodityId: 102 })).toMatchObject({ amount: before.amount + 1 });
    expect(await database.getRepository(ColonyShipBuildQueue).findOneByOrFail({ id: job.id })).toMatchObject({ status: ColonyShipBuildQueueStatus.CANCELLED });
  });

  it('minute shipyard: admin complete-all and the minute runner finish a build once', async () => {
    await stationShipyard.build(station.id, user.id, {
      shipClassId: hull.id, name: 'Admin completion', moduleSelections: selections,
    });
    const { runner } = minuteRunner();
    // Isolate the admin completion operation from the unrelated economy tick.
    jest.spyOn(runner, 'triggerManualTick').mockResolvedValue({ tickNumber: 1, status: 'COMPLETED' });
    Object.assign(runner, { logger: { log: jest.fn() } });
    // The admin's raw SQL uses the default schema in production. Point its
    // dedicated connection at this test's private schema without a transaction.
    const connection = database.createQueryRunner();
    await connection.connect();
    await connection.query(`SET search_path TO "${schema}"`);
    const fields = database.getRepository(ColonyField);
    Object.assign(runner, { fieldRepo: { find: fields.find.bind(fields), manager: connection.manager } });
    try {
      await Promise.all([runner.completeAllBuilds(), runner.checkBuildingCompletions()]);
      await runner.checkBuildingCompletions();
    } finally {
      await connection.release();
    }
    expect(await builtShips()).toHaveLength(1);
    expect(await database.getRepository(Message).count()).toBe(1);
  });

  async function createColony() {
    const field = await database
      .getRepository(SystemField)
      .findOneByOrFail({ id: requiredId(location.systemFieldId) });
    const colony = await database.getRepository(Colony).save({
      name: 'Shipbuilding colony',
      userId: user.id,
      starSystemId: field.starSystemId,
      systemFieldId: field.id,
      posX: field.sx,
      posY: field.sy,
      colonyClassId: 1,
      storageUsed: 38,
    });
    await database.getRepository(ColonyChangeable).save({
      colonyId: colony.id,
      energy: 50,
      maxEnergy: 100,
      maxStorage: 1000,
    });
    await database.getRepository(ColonyField).save({
      colonyId: colony.id,
      fieldIndex: 0,
      fieldType: 1,
      buildingId: 11,
      isBuilding: false,
      isActive: true,
    });
    await database
      .getRepository(ColonyStorage)
      .save(
        initialInventory().map((item) => ({ ...item, colonyId: colony.id })),
      );
    return colony;
  }

  async function storageAmounts(colonyId: number) {
    const storage = await database.getRepository(ColonyStorage).find({
      where: { colonyId },
      order: { commodityId: 'ASC' },
    });
    return storage.map(({ commodityId, amount }) => [commodityId, amount]);
  }

  function loadStation() {
    return database
      .getRepository(Spacecraft)
      .findOneByOrFail({ id: station.id });
  }

  async function cargoAmounts() {
    const cargo = await database.getRepository(CargoItem).find({
      where: { spacecraftId: station.id },
      order: { commodityId: 'ASC' },
    });
    return cargo.map(({ commodityId, amount }) => [commodityId, amount]);
  }

  async function builtShips() {
    return database.getRepository(Spacecraft).find({
      where: {
        buildPlanId: (
          await database
            .getRepository(ColonyShipBuildplan)
            .findOneByOrFail({ userId: user.id })
        ).id,
      },
      relations: ['modules'],
      order: { id: 'ASC', modules: { id: 'ASC' } },
    });
  }

  async function makeDue(id: number) {
    await database.getRepository(ColonyShipBuildQueue).update(id, {
      finishesAt: new Date(Date.now() - 1000),
    });
  }
});
