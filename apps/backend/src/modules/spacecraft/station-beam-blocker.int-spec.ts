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
import { Faction, type SpacecraftRuntimeSystemsDto } from '@swuniverse/shared';
import { GameGateway } from '../websocket/game.gateway';
import { GameDataService } from '../game-data/game-data.service';
import { User } from '../auth/user.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { Crew, CrewType } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import {
  Spacecraft,
  SpacecraftKind,
  SpacecraftStatus,
  StationRole,
} from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { SpacecraftResourceFlowService } from './spacecraft-resource-flow.service';
import { initializeSpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';
import { StationRepairService } from './station-repair.service';
import { SpacecraftDamage } from './spacecraft-damage';
import { SPARE_PARTS_ID, SYSTEM_COMPONENTS_ID } from './station-repair-plan';
import { CrewSkill } from './entities/crew-skill.entity';
import { CrewEnhancementService } from './crew-enhancement.service';
import { CrewRank } from './crew-rank';
import {
  CREW_ENHANCEMENT_AMOUNTS,
  CrewEnhancementEvent,
} from './crew-expertise';
import { StationBeamBlocker1794880800000 } from '../../database/migrations/20261117020000-station-beam-blocker';

const secret = 'station-beamblocker-http-integration';
const jwt = new JwtService({ secret });

describe('STU built-in station beamblocker (production HTTP/PostgreSQL)', () => {
  let db: DataSource, app: INestApplication;
  let owner: User, station: Spacecraft, ship: Spacecraft;
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
    const faction = await factionId(db, Faction.REBEL_ALLIANCE);
    owner = await createUser(db, {
      faction: Faction.REBEL_ALLIANCE,
      factionId: faction,
    });
    const layer = await db.manager.save(Layer, {
      name: 'Station map',
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
    const [stationHull, shipHull] = await db.manager.save(ShipClassDef, [
      {
        key: 'BEAM_STATION',
        name: 'Station',
        category: 'STATION',
        role: StationRole.DEPOT_SMALL,
        crewMin: 0,
        crewMax: 10,
        cargoCapacity: 100,
        epsBase: 50,
      },
      {
        key: 'BEAM_SHIP',
        name: 'Ship',
        category: 'SHIP',
        role: 'FREIGHTER',
        crewMin: 0,
        crewMax: 10,
        cargoCapacity: 100,
        epsBase: 50,
      },
    ]);
    station = await db.manager.save(Spacecraft, {
      userId: owner.id,
      name: 'Built-in station',
      shipClassId: stationHull.id,
      kind: SpacecraftKind.STATION,
      stationRole: StationRole.DEPOT_SMALL,
      locationId: location.id,
      crew: 0,
      crewRequired: 0,
      crewMax: 10,
      energy: 50,
      energyMax: 50,
      epsMax: 50,
      cargoMax: 100,
      runtimeSystems: {},
    });
    ship = await db.manager.save(Spacecraft, {
      userId: owner.id,
      name: 'Transfer ship',
      shipClassId: shipHull.id,
      kind: SpacecraftKind.SHIP,
      locationId: location.id,
      crew: 2,
      crewRequired: 0,
      crewMax: 10,
      energy: 50,
      energyMax: 50,
      epsMax: 50,
      cargoMax: 100,
      runtimeSystems: {},
    });
    await db.manager.save(
      SpacecraftModule,
      [station, ship].map((item) => ({
        spacecraftId: item.id,
        category: 'EPS',
        moduleType: 'Energieverteiler',
        integrity: 100,
        isActive: true,
      })),
    );
    for (const name of ['Crew one', 'Crew two']) {
      const crew = await db.manager.save(Crew, { userId: owner.id, name });
      await db.manager.save(CrewAssignment, {
        crewId: crew.id,
        userId: owner.id,
        spacecraftId: ship.id,
      });
    }
    // Configured zero-crew fixtures explicitly start their default system,
    // unlike a raw, unstaffed construction created below.
    expect(
      (
        await request(station.id, '/systems/BEAM_BLOCKER', 'PATCH', {
          active: true,
        })
      ).status,
    ).toBe(200);
  });

  async function request(
    id: number,
    suffix = '',
    method = 'GET',
    body?: unknown,
  ) {
    return fetch(`${await app.getUrl()}/api/spacecraft/${id}${suffix}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt.sign({ sub: owner.id, username: owner.username })}`,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  const stored = async (id = station.id) => {
    const current = await db.manager.findOneByOrFail(Spacecraft, { id });
    return current as Spacecraft & {
      runtimeSystems: SpacecraftRuntimeSystemsDto;
    };
  };
  async function beam(state: { active: boolean; integrity: number }) {
    const current = await stored();
    await db.manager.update(Spacecraft, station.id, {
      runtimeSystems: {
        ...current.runtimeSystems,
        BEAM_BLOCKER: { ...state, cooldown: 0 },
      },
    });
  }

  it('persists the free default for every station role and construction, never for ordinary or small ships', async () => {
    expect((await stored()).runtimeSystems?.BEAM_BLOCKER).toEqual({
      active: true,
      cooldown: 0,
      integrity: 100,
    });
    expect(
      (await stored(ship.id)).runtimeSystems?.BEAM_BLOCKER,
    ).toBeUndefined();
    for (const role of Object.values(StationRole)) {
      const created = await db.manager.save(
        Spacecraft,
        db.manager.create(Spacecraft, {
          ...station,
          id: undefined,
          name: role,
          stationRole: role,
          runtimeSystems: {},
        }),
      );
      expect((await stored(created.id)).runtimeSystems?.BEAM_BLOCKER).toEqual({
        active: false,
        cooldown: 0,
        integrity: 100,
      });
    }
    const shuttle = await db.manager.save(
      Spacecraft,
      db.manager.create(Spacecraft, {
        ...ship,
        id: undefined,
        name: 'Small craft',
        shuttleCommodityId: 20061,
        runtimeSystems: {},
      }),
    );
    expect(
      (await stored(shuttle.id)).runtimeSystems?.BEAM_BLOCKER,
    ).toBeUndefined();
  });

  it('backfills existing stations and reverses cleanly without changing energy or modules', async () => {
    const migration = new StationBeamBlocker1794880800000();
    const runner = db.createQueryRunner();
    try {
      await migration.down(runner);
      expect((await stored()).runtimeSystems?.BEAM_BLOCKER).toBeUndefined();
      await migration.up(runner);
      expect(await stored()).toMatchObject({
        energy: 50,
        runtimeSystems: { BEAM_BLOCKER: { active: false, integrity: 100 } },
      });
      expect(
        await db.manager.countBy(SpacecraftModule, {
          spacecraftId: station.id,
        }),
      ).toBe(1);
    } finally {
      await runner.release();
    }
  });

  it('starts only with sufficient crew and an EPS system, preserving an existing state during backfill', async () => {
    await db.manager.update(Spacecraft, station.id, { crewRequired: 2 });
    await beam({ active: false, integrity: 100 });
    await db.manager.update(Spacecraft, station.id, { crew: 1 });
    expect((await stored()).runtimeSystems?.BEAM_BLOCKER?.active).toBe(false);
    await db.manager.delete(SpacecraftModule, { spacecraftId: station.id });
    await db.manager.update(Spacecraft, station.id, {
      runtimeSystems: {
        BEAM_BLOCKER: { active: false, cooldown: 0, integrity: 100 },
      },
      crew: 2,
    });
    expect((await stored()).runtimeSystems?.BEAM_BLOCKER?.active).toBe(false);
    expect(
      (
        await request(station.id, '/systems/BEAM_BLOCKER', 'PATCH', {
          active: true,
        })
      ).status,
    ).toBe(400);
    await db.manager.save(SpacecraftModule, {
      spacecraftId: station.id,
      category: 'EPS',
      moduleType: 'Energieverteiler',
      integrity: 100,
      isActive: true,
    });
    const migration = new StationBeamBlocker1794880800000();
    const runner = db.createQueryRunner();
    try {
      await migration.down(runner);
      await migration.up(runner);
      expect((await stored()).runtimeSystems?.BEAM_BLOCKER?.active).toBe(true);
      await beam({ active: false, integrity: 0 });
      // Recreate only the migration infrastructure to test existing states.
      await runner.query(
        'DROP TRIGGER "TR_station_beam_blocker" ON spacecraft',
      );
      await runner.query('DROP FUNCTION maintain_station_beam_blocker()');
      await migration.up(runner);
      expect((await stored()).runtimeSystems?.BEAM_BLOCKER).toMatchObject({
        active: false,
        integrity: 0,
      });
    } finally {
      await runner.release();
    }
  });

  it('exposes the built-in system through player details and energy flow for zero tick EPS', async () => {
    const response = await request(station.id);
    expect(response.status).toBe(200);
    const details = (await response.json()) as {
      runtimeSystems: SpacecraftRuntimeSystemsDto;
    };
    expect(details.runtimeSystems.BEAM_BLOCKER).toEqual({
      active: true,
      cooldown: 0,
      integrity: 100,
    });
    const current = await db.manager.findOneOrFail(Spacecraft, {
      where: { id: station.id },
      relations: ['modules'],
    });
    expect(
      app.get(SpacecraftResourceFlowService).calculate(current).systems,
    ).toContainEqual({
      systemKey: 'BEAM_BLOCKER',
      label: 'Beamblocker',
      active: true,
      epsPerTick: 0,
    });
    expect((await stored()).energy).toBe(50);
  });

  it('keeps ALWAYS_ON active in standby and rejects manual deactivation', async () => {
    expect(
      (
        await request(station.id, '/operating-mode', 'PATCH', {
          operatingMode: 'STANDBY',
        })
      ).status,
    ).toBe(200);
    expect(await stored()).toMatchObject({
      operatingMode: 'STANDBY',
      runtimeSystems: { BEAM_BLOCKER: { active: true } },
      energy: 50,
    });
    expect(
      (
        await request(station.id, '/systems/BEAM_BLOCKER', 'PATCH', {
          active: false,
        })
      ).status,
    ).toBe(400);
    expect((await stored()).runtimeSystems?.BEAM_BLOCKER?.active).toBe(true);
  });

  it('preserves forced shutdown, checks crew for activation and charges zero activation EPS', async () => {
    await db.manager.update(Spacecraft, station.id, { crewRequired: 1 });
    await beam({ active: false, integrity: 100 });
    expect((await request(station.id)).status).toBe(200);
    expect((await stored()).runtimeSystems?.BEAM_BLOCKER?.active).toBe(false);
    expect(
      (
        await request(station.id, '/systems/BEAM_BLOCKER', 'PATCH', {
          active: true,
        })
      ).status,
    ).toBe(400);
    await db.manager.update(Spacecraft, station.id, { crewRequired: 0 });
    expect(
      (
        await request(station.id, '/systems/BEAM_BLOCKER', 'PATCH', {
          active: true,
        })
      ).status,
    ).toBe(200);
    expect(await stored()).toMatchObject({
      energy: 50,
      runtimeSystems: { BEAM_BLOCKER: { active: true } },
    });
  });

  it('retains destruction on reads and restores the default mode on repair from zero integrity', async () => {
    expect(
      (
        await request(ship.id, '/crew/ship-transfer', 'POST', {
          targetShipId: station.id,
          amount: 1,
          direction: 'TO_TARGET',
        })
      ).status,
    ).toBe(201);
    const technician = await db.manager.findOneByOrFail(CrewAssignment, {
      spacecraftId: station.id,
    });
    await db.manager.update(CrewAssignment, technician.crewId, {
      slot: CrewType.TECHNICAL,
    });
    await db.manager.save(CrewSkill, {
      crewId: technician.crewId,
      position: CrewType.TECHNICAL,
      expertise: 9995,
    });
    await db.manager.update(Spacecraft, station.id, {
      hull: 1000,
      hullMax: 1000,
      stationRole: StationRole.CONSTRUCTION,
    });
    await beam({ active: true, integrity: 1 });
    const hit = await stored();
    new SpacecraftDamage({ integer: (_min, max) => max }).apply(
      hit,
      {
        netDamage: 1,
        isCrit: false,
        hullDamageFactor: 100,
        shieldDamageFactor: 100,
        targetSystems: ['BEAM_BLOCKER'],
      },
      [],
    );
    await db.manager.save(Spacecraft, hit);
    const current = await db.manager.findOneOrFail(Spacecraft, {
      where: { id: station.id },
      relations: ['modules'],
    });
    expect(
      initializeSpacecraftRuntimeSystems(current).BEAM_BLOCKER,
    ).toMatchObject({ active: false, integrity: 0 });
    expect(
      (
        await request(station.id, '/systems/BEAM_BLOCKER', 'PATCH', {
          active: true,
        })
      ).status,
    ).toBe(400);
    await db.manager.save(
      CargoItem,
      [SPARE_PARTS_ID, SYSTEM_COMPONENTS_ID].map((commodityId) => ({
        spacecraftId: station.id,
        commodityId,
        amount: 2,
      })),
    );
    expect(
      (await request(station.id, '/station-repair/self', 'POST')).status,
    ).toBe(201);
    const repair = app.get(StationRepairService);
    await repair.processTick(station.id);
    expect((await stored()).runtimeSystems?.BEAM_BLOCKER?.integrity).toBe(0);
    await db.manager.update(ShipClassDef, ship.shipClassId, {
      role: 'WORKBEE',
    });
    await db.manager.update(Spacecraft, ship.id, { dockedAtId: station.id });
    await repair.processTick(station.id);
    expect((await stored()).runtimeSystems?.BEAM_BLOCKER).toMatchObject({
      active: true,
      integrity: 100,
    });
    expect((await stored()).passiveRepair).toBe(false);
    expect(
      (
        await db.manager.findOneByOrFail(CrewSkill, {
          crewId: technician.crewId,
          position: CrewType.TECHNICAL,
        })
      ).expertise,
    ).toBe(
      9995 +
        (CREW_ENHANCEMENT_AMOUNTS[CrewEnhancementEvent.REPAIR_COMPLETED][
          CrewType.TECHNICAL
        ] ?? 0),
    );
    await app.get(CrewEnhancementService).promote(owner.id, technician.crewId);
    expect(
      (await db.manager.findOneByOrFail(Crew, { id: technician.crewId })).rank,
    ).toBe(CrewRank.COMMANDER);
    for (const commodityId of [SPARE_PARTS_ID, SYSTEM_COMPONENTS_ID]) {
      expect(
        (
          await db.manager.findOneByOrFail(CargoItem, {
            spacecraftId: station.id,
            commodityId,
          })
        ).amount,
      ).toBe(1);
    }
    expect(
      (
        await request(station.id, '/crew/ship-transfer', 'POST', {
          targetShipId: ship.id,
          amount: 1,
          direction: 'TO_TARGET',
        })
      ).status,
    ).toBe(201);
    await beam({ active: false, integrity: 0 });
    expect(
      (await request(station.id, '/station-repair/self', 'POST')).status,
    ).toBe(201);
    await repair.processTick(station.id);
    expect((await stored()).runtimeSystems?.BEAM_BLOCKER).toMatchObject({
      active: false,
      integrity: 100,
    });
  });

  it('allows cargo transfer to and from an active beamblocker station', async () => {
    const commodity = app
      .get(GameDataService)
      .getAllCommodities()
      .find((item) => item.isBeamable && !item.bound)!;
    await db.manager.save(CargoItem, {
      spacecraftId: ship.id,
      commodityId: commodity.id,
      amount: 20,
    });
    expect(
      (
        await request(ship.id, '/cargo/ship-transfer', 'POST', {
          targetShipId: station.id,
          commodityId: commodity.id,
          amount: 5,
          direction: 'TO_TARGET',
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await db.manager.findOneByOrFail(CargoItem, {
          spacecraftId: station.id,
          commodityId: commodity.id,
        })
      ).amount,
    ).toBe(5);
    expect(
      (
        await request(station.id, '/cargo/ship-transfer', 'POST', {
          targetShipId: ship.id,
          commodityId: commodity.id,
          amount: 5,
          direction: 'TO_TARGET',
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await db.manager.findOneByOrFail(CargoItem, {
          spacecraftId: ship.id,
          commodityId: commodity.id,
        })
      ).amount,
    ).toBe(20);
    expect((await stored()).runtimeSystems?.BEAM_BLOCKER?.active).toBe(true);
  });

  it('allows both crew transfer directions and follows startup and forced shutdown on crew changes', async () => {
    await db.manager.update(Spacecraft, station.id, { crewRequired: 1 });
    await beam({ active: false, integrity: 100 });
    expect(
      (
        await request(ship.id, '/crew/ship-transfer', 'POST', {
          targetShipId: station.id,
          amount: 1,
          direction: 'TO_TARGET',
        })
      ).status,
    ).toBe(201);
    expect(await stored()).toMatchObject({
      crew: 1,
      energy: 50,
      runtimeSystems: { BEAM_BLOCKER: { active: true } },
    });
    expect(
      (
        await request(station.id, '/crew/ship-transfer', 'POST', {
          targetShipId: ship.id,
          amount: 1,
          direction: 'TO_TARGET',
        })
      ).status,
    ).toBe(201);
    expect(await stored()).toMatchObject({
      crew: 0,
      runtimeSystems: { BEAM_BLOCKER: { active: false } },
    });
    expect(
      await db.manager.countBy(CrewAssignment, { spacecraftId: ship.id }),
    ).toBe(2);
  });

  it('rolls back crew and system state together, removes the station default on kind changes and never restores scrapping systems', async () => {
    await db.manager.update(Spacecraft, station.id, { crewRequired: 1 });
    await beam({ active: false, integrity: 100 });
    await expect(
      db.transaction(async (manager) => {
        await manager.update(Spacecraft, station.id, { crew: 1 });
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(await stored()).toMatchObject({
      crew: 0,
      runtimeSystems: { BEAM_BLOCKER: { active: false } },
    });
    await db.manager.update(Spacecraft, station.id, {
      kind: SpacecraftKind.SHIP,
    });
    expect((await stored()).runtimeSystems?.BEAM_BLOCKER).toBeUndefined();
    await db.manager.update(Spacecraft, station.id, {
      kind: SpacecraftKind.STATION,
      status: SpacecraftStatus.UNDER_SCRAPPING,
      runtimeSystems: {},
    });
    expect((await stored()).runtimeSystems).toEqual({});
  });
});
