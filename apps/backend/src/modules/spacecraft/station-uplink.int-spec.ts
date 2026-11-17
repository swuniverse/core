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
import { DataSource, In, type DataSourceOptions } from 'typeorm';
import { AppModule } from '../../app.module';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { Faction, type SpacecraftRuntimeSystemsDto } from '@swuniverse/shared';
import { GameGateway } from '../websocket/game.gateway';
import { User } from '../auth/user.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { Crew } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import {
  Spacecraft,
  SpacecraftKind,
  SpacecraftStatus,
  StationRole,
} from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { GameStatusService } from '../game-status/game-status.service';
import { StationUplinkService } from './station-uplink.service';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';
import { StationScrappingService } from './station-scrapping.service';
import { EscapePod } from './entities/escape-pod.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { SpacecraftResourceFlowService } from './spacecraft-resource-flow.service';
import { StationRepairService } from './station-repair.service';
import { SpacecraftDamage } from './spacecraft-damage';
import { SPARE_PARTS_ID, SYSTEM_COMPONENTS_ID } from './station-repair-plan';
import { StationUplink1794884400000 } from '../../database/migrations/20261117030000-station-uplink';
import {
  DockingPrivilege,
  DockingPrivilegeType,
  DockingPrivilegeMode,
} from './entities/docking-privilege.entity';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import { EscapePodService } from './escape-pod.service';
import type { StationUplinkDto } from '@swuniverse/shared';

const secret = 'station-uplink-http-integration';
const jwt = new JwtService({ secret });

describe('STU station cooperation uplink (production HTTP/PostgreSQL)', () => {
  let db: DataSource, app: INestApplication;
  let owner: User, guest: User, station: Spacecraft, ship: Spacecraft;
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
        role: StationRole.SENSOR,
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
      stationRole: StationRole.SENSOR,
      locationId: location.id,
      crew: 0,
      crewRequired: 2,
      crewMax: 10,
      energy: 50,
      energyMax: 50,
      epsMax: 50,
      cargoMax: 100,
      runtimeSystems: {},
    });
    guest = await createUser(db, {
      faction: Faction.REBEL_ALLIANCE,
      factionId: faction,
      displayName: 'Uplink-Gast',
    });
    ship = await db.manager.save(Spacecraft, {
      userId: guest.id,
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
      const crew = await db.manager.save(Crew, { userId: guest.id, name });
      await db.manager.save(CrewAssignment, {
        crewId: crew.id,
        userId: guest.id,
        spacecraftId: ship.id,
      });
    }
    for (const name of ['Owner one', 'Owner two']) {
      const crew = await db.manager.save(Crew, { userId: owner.id, name });
      await db.manager.save(CrewAssignment, {
        crewId: crew.id,
        userId: owner.id,
        spacecraftId: station.id,
      });
    }
    await db.manager.save(DockingPrivilege, {
      stationId: station.id,
      targetType: DockingPrivilegeType.USER,
      targetId: guest.id,
      mode: DockingPrivilegeMode.ALLOW,
    });
    await app.get(GameStatusService).getPublicStatus();
  });

  async function request(
    id: number,
    suffix = '',
    method = 'GET',
    body?: unknown,
    actor = guest,
  ) {
    return fetch(`${await app.getUrl()}/api/spacecraft/${id}${suffix}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt.sign({ sub: actor.id, username: actor.username })}`,
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

  async function transfer(
    actor = guest,
    craft = ship,
    direction = 'TO_TARGET',
    amount = 1,
  ) {
    return request(
      craft.id,
      '/crew/ship-transfer',
      'POST',
      { targetShipId: station.id, amount, direction },
      actor,
    );
  }
  async function overview() {
    const response = await request(
      station.id,
      '/uplink',
      'GET',
      undefined,
      owner,
    );
    expect(response.status).toBe(200);
    return (await response.json()) as StationUplinkDto;
  }
  async function anotherGuest() {
    const user = await createUser(db, {
      faction: owner.faction,
      factionId: owner.factionId,
    });
    const craft = await db.manager.save(
      Spacecraft,
      db.manager.create(Spacecraft, {
        ...ship,
        id: undefined,
        userId: user.id,
        name: user.username,
        runtimeSystems: {},
      }),
    );
    for (let i = 0; i < 2; i++) {
      const crew = await db.manager.save(Crew, {
        userId: user.id,
        name: `Guest ${i}`,
      });
      await db.manager.save(CrewAssignment, {
        crewId: crew.id,
        userId: user.id,
        spacecraftId: craft.id,
      });
    }
    await db.manager.save(DockingPrivilege, {
      stationId: station.id,
      targetType: DockingPrivilegeType.USER,
      targetId: user.id,
      mode: DockingPrivilegeMode.ALLOW,
    });
    return { user, craft };
  }

  it('provides an initially inactive built-in only on sensor stations and backfills without losing state', async () => {
    expect((await stored()).runtimeSystems.UPLINK).toMatchObject({
      active: false,
      integrity: 100,
      current: 0,
      max: 3,
    });
    expect((await stored(ship.id)).runtimeSystems.UPLINK).toBeUndefined();
    for (const role of Object.values(StationRole).filter(
      (role) => role !== StationRole.SENSOR,
    )) {
      const created = await db.manager.save(
        Spacecraft,
        db.manager.create(Spacecraft, {
          ...station,
          id: undefined,
          stationRole: role,
          runtimeSystems: {},
        }),
      );
      expect((await stored(created.id)).runtimeSystems.UPLINK).toBeUndefined();
    }
    const migration = new StationUplink1794884400000(),
      runner = db.createQueryRunner();
    try {
      await migration.down(runner);
      expect((await stored()).runtimeSystems.UPLINK).toBeUndefined();
      await migration.up(runner);
      expect((await stored()).runtimeSystems.UPLINK?.active).toBe(false);
      expect((await stored()).energy).toBe(50);
    } finally {
      await runner.release();
    }
  });

  it('admits own crew to a foreign station by docking rights without granting cargo permissions', async () => {
    const quote = await request(
      ship.id,
      `/cargo/ship-transfer-quote?targetShipId=${station.id}&direction=TO_TARGET`,
    );
    expect(quote.status).toBe(200);
    expect(await quote.json()).toMatchObject({
      available: false,
      crewTransferAvailable: true,
      crewTransferMaximum: 1,
    });
    expect((await transfer()).status).toBe(201);
    const data = await overview();
    expect(data.system).toMatchObject({ active: true, current: 1 });
    expect(data).toMatchObject({
      ownCrew: 2,
      crewRequired: 2,
      capacity: 3,
      epsPerTick: 5,
      activationEps: 0,
    });
    expect(data.guests).toHaveLength(1);
    expect(data.guests[0]).toMatchObject({
      ownerId: guest.id,
      ownerName: 'Uplink-Gast',
    });
    expect((await stored()).energy).toBe(50);
    expect((await transfer()).status).toBe(400);
    expect((await transfer(guest, ship, 'TO_TARGET', 2)).status).toBe(400);
    expect(
      (
        await request(ship.id, '/cargo/ship-transfer', 'POST', {
          targetShipId: station.id,
          amount: 1,
          commodityId: 5,
          direction: 'TO_TARGET',
        })
      ).status,
    ).toBe(400);
  });

  it('serializes duplicate admission and the third/fourth foreign player slot', async () => {
    const duplicate = await Promise.all([transfer(), transfer()]);
    expect(duplicate.map((res) => res.status).sort()).toEqual([201, 400]);
    const second = await anotherGuest();
    expect((await transfer(second.user, second.craft)).status).toBe(201);
    const third = await anotherGuest(),
      fourth = await anotherGuest();
    const race = await Promise.all([
      transfer(third.user, third.craft),
      transfer(fourth.user, fourth.craft),
    ]);
    expect(race.map((res) => res.status).sort()).toEqual([201, 400]);
    expect((await overview()).guests).toHaveLength(3);
  });

  it('rejects admission after a matching deny, destroyed uplink or exhausted quarters', async () => {
    await db.manager.save(DockingPrivilege, {
      stationId: station.id,
      targetType: DockingPrivilegeType.FACTION,
      targetId: guest.factionId!,
      mode: DockingPrivilegeMode.DENY,
    });
    expect((await transfer()).status).toBe(400);
    await db.manager.delete(DockingPrivilege, {
      stationId: station.id,
      mode: DockingPrivilegeMode.DENY,
    });
    const current = await stored();
    await db.manager.update(Spacecraft, station.id, {
      runtimeSystems: {
        ...current.runtimeSystems,
        UPLINK: { active: false, cooldown: 0, integrity: 0 },
      },
    });
    expect((await transfer()).status).toBe(400);
    await db.manager.update(Spacecraft, station.id, {
      runtimeSystems: {
        ...current.runtimeSystems,
        UPLINK: { active: false, cooldown: 0, integrity: 100 },
      },
      crewMax: 2,
    });
    expect((await transfer()).status).toBe(400);
    expect((await overview()).guests).toHaveLength(0);
  });

  it('admits before sufficient owner crew without starting and requires owner crew for manual activation', async () => {
    await db.manager.update(Spacecraft, station.id, { crewRequired: 3 });
    expect((await transfer()).status).toBe(201);
    expect((await overview()).system.active).toBe(false);
    expect(
      (
        await request(
          station.id,
          '/systems/UPLINK',
          'PATCH',
          { active: true },
          owner,
        )
      ).status,
    ).toBe(400);
    expect(
      await app.get(SpacecraftCrewService).hasEnoughCrew(await stored()),
    ).toBe(false);
    await db.manager.update(Spacecraft, station.id, { crewRequired: 2 });
    expect(
      (
        await request(
          station.id,
          '/systems/UPLINK',
          'PATCH',
          { active: true },
          owner,
        )
      ).status,
    ).toBe(200);
    expect((await stored()).energy).toBe(50);
    expect(
      (
        await request(
          station.id,
          '/systems/UPLINK',
          'PATCH',
          { active: false },
          owner,
        )
      ).status,
    ).toBe(200);
    expect((await overview()).system.active).toBe(false);
    expect(
      (
        await request(
          station.id,
          '/systems/UPLINK',
          'PATCH',
          { active: true },
          guest,
        )
      ).status,
    ).toBe(404);
  });

  it('withdraws only the acting owner crew despite revoked docking, a destroyed uplink and hostile stance', async () => {
    expect((await transfer()).status).toBe(201);
    await db.manager.delete(DockingPrivilege, { stationId: station.id });
    const current = await stored();
    await db.manager.update(Spacecraft, station.id, {
      runtimeSystems: {
        ...current.runtimeSystems,
        UPLINK: { active: false, cooldown: 0, integrity: 0 },
      },
    });
    const others = await anotherGuest();
    await db.manager.delete(DockingPrivilege, { stationId: station.id });
    expect(
      (await transfer(others.user, others.craft, 'FROM_TARGET')).status,
    ).toBe(400);
    expect((await transfer(guest, ship, 'FROM_TARGET')).status).toBe(201);
    expect((await overview()).guests).toHaveLength(0);
    expect(
      await db.manager.count(CrewAssignment, {
        where: { spacecraftId: station.id, userId: owner.id },
      }),
    ).toBe(2);
    expect(
      await db.manager.count(CrewAssignment, {
        where: { spacecraftId: ship.id, userId: guest.id },
      }),
    ).toBe(2);
  });

  it('retains crew after rights revocation and system shutdown, and applies regular shield/position/vacation safety to withdrawal', async () => {
    expect((await transfer()).status).toBe(201);
    await db.manager.delete(DockingPrivilege, { stationId: station.id });
    expect((await overview()).guests).toHaveLength(1);
    await db.manager.update(Spacecraft, station.id, {
      status: SpacecraftStatus.UNDER_CONSTRUCTION,
    });
    expect((await transfer(guest, ship, 'FROM_TARGET')).status).toBe(400);
    await db.manager.update(Spacecraft, station.id, {
      status: SpacecraftStatus.IDLE,
    });
    const current = await stored();
    await db.manager.update(Spacecraft, station.id, {
      runtimeSystems: {
        ...current.runtimeSystems,
        SHIELDS: { active: true, cooldown: 0, integrity: 100 },
      },
    });
    expect((await transfer(guest, ship, 'FROM_TARGET')).status).toBe(400);
    await db.manager.save(Spacecraft, {
      ...current,
      runtimeSystems: current.runtimeSystems,
    });
    await db.manager.update(User, owner.id, {
      vacationMode: true,
      vacationStartedAt: new Date(Date.now() - 3 * 86400000),
      vacationRequestedAt: new Date(Date.now() - 3 * 86400000),
    });
    expect((await transfer(guest, ship, 'FROM_TARGET')).status).toBe(400);
    await db.manager.update(User, owner.id, {
      vacationMode: false,
      vacationStartedAt: null,
      vacationRequestedAt: null,
    });
    expect((await transfer(guest, ship, 'FROM_TARGET')).status).toBe(201);
  });

  it('charges five tick EPS, shuts down on brownout, keeps guests and does not restart on reads', async () => {
    expect((await transfer()).status).toBe(201);
    const current = await db.manager.findOneOrFail(Spacecraft, {
      where: { id: station.id },
      relations: ['modules'],
    });
    current.runtimeSystems = {
      ...current.runtimeSystems,
      LIFE_SUPPORT: { active: false, cooldown: 0, integrity: 100 },
    };
    current.reactorOutput = 0;
    current.reactorFuel = 0;
    current.battery = 0;
    const flow = app.get(SpacecraftResourceFlowService);
    expect(flow.calculate(current).systems).toContainEqual({
      systemKey: 'UPLINK',
      label: 'Kooperationsuplink',
      active: true,
      epsPerTick: 5,
    });
    flow.recharge(current);
    expect(current.energy).toBe(45);
    current.energy = 4;
    expect(flow.recharge(current).deactivatedSystems).toContain(
      'Kooperationsuplink',
    );
    await db.manager.save(current);
    expect((await overview()).system.active).toBe(false);
    expect((await overview()).guests).toHaveLength(1);
    current.energy = 50;
    await db.manager.save(current);
    expect((await overview()).system.active).toBe(false);
  });

  it('standby shuts down uplink but retains the guest and beamblocker', async () => {
    expect((await transfer()).status).toBe(201);
    expect(
      (
        await request(
          station.id,
          '/operating-mode',
          'PATCH',
          { operatingMode: 'STANDBY' },
          owner,
        )
      ).status,
    ).toBe(200);
    expect((await overview()).system.active).toBe(false);
    expect((await overview()).guests).toHaveLength(1);
    expect((await stored()).runtimeSystems.BEAM_BLOCKER?.active).toBe(true);
  });

  it('keeps host dismissal through an escape pod, disallows scrapping with any crew and rolls changes back together', async () => {
    await expect(
      db.transaction(async (manager) => {
        const assignment = await manager.findOneByOrFail(CrewAssignment, {
          spacecraftId: ship.id,
        });
        assignment.spacecraftId = station.id;
        await manager.save(assignment);
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect((await overview()).guests).toHaveLength(0);
    expect((await transfer()).status).toBe(201);
    const guestCrew = (await overview()).guests[0];
    expect(
      (await app.get(StationScrappingService).get(station.id, owner.id))
        .blockReason,
    ).toBe('Zum Demontieren muss die Station unbemannt sein');
    await app
      .get(EscapePodService)
      .releaseForeignCrew(station.id, guestCrew.id, owner.id);
    expect((await overview()).guests).toHaveLength(0);
    expect(
      (
        await db.manager.findOneByOrFail(CrewAssignment, {
          crewId: guestCrew.id,
        })
      ).escapePodId,
    ).not.toBeNull();
    expect((await stored()).runtimeSystems.UPLINK?.active).toBe(false);
  });
  it('repairs a destroyed uplink through passive station repair, keeping its OFF default and foreign crew', async () => {
    expect((await transfer()).status).toBe(201);
    const current = await stored();
    current.hull = 1000;
    current.hullMax = 1000;
    current.runtimeSystems.UPLINK!.integrity = 1;
    new SpacecraftDamage({ integer: (_min, max) => max }).apply(
      current,
      {
        netDamage: 1,
        isCrit: false,
        hullDamageFactor: 100,
        shieldDamageFactor: 100,
        targetSystems: ['UPLINK'],
      },
      [],
    );
    await db.manager.save(Spacecraft, current);
    expect((await overview()).system).toMatchObject({
      active: false,
      integrity: 0,
    });
    await db.manager.update(ShipClassDef, ship.shipClassId, {
      role: 'WORKBEE',
    });
    await db.manager.update(Spacecraft, ship.id, { dockedAtId: station.id });
    await db.manager.save(
      CargoItem,
      [SPARE_PARTS_ID, SYSTEM_COMPONENTS_ID].map((commodityId) => ({
        spacecraftId: station.id,
        commodityId,
        amount: 2,
      })),
    );
    expect(
      (
        await request(
          station.id,
          '/station-repair/self',
          'POST',
          undefined,
          owner,
        )
      ).status,
    ).toBe(201);
    await app.get(StationRepairService).processTick(station.id);
    expect((await overview()).system).toMatchObject({
      active: false,
      integrity: 100,
    });
    expect((await overview()).guests).toHaveLength(1);
    expect(
      (
        await request(
          station.id,
          '/systems/UPLINK',
          'PATCH',
          { active: true },
          owner,
        )
      ).status,
    ).toBe(200);
  });

  it('persists host crew loss without treating guests as the owner crew and removes Uplink on a role change', async () => {
    expect((await transfer()).status).toBe(201);
    const ownerCrew = await db.manager.find(CrewAssignment, {
      where: { spacecraftId: station.id, userId: owner.id },
    });
    for (const member of ownerCrew)
      await db.manager.update(CrewAssignment, member.crewId, {
        spacecraftId: ship.id,
      });
    expect((await overview()).system.active).toBe(false);
    const stationRow = await stored();
    await new StationUplinkService(db).prepareTick(stationRow);
    expect(stationRow.runtimeSystems.UPLINK?.active).toBe(false);
    expect((await overview()).guests).toHaveLength(1);
    await db.manager.update(Spacecraft, station.id, {
      stationRole: StationRole.BASE,
    });
    expect((await stored()).runtimeSystems.UPLINK).toBeUndefined();
    expect(
      await db.manager.count(CrewAssignment, {
        where: { spacecraftId: station.id, userId: guest.id },
      }),
    ).toBe(1);
  });

  it('evacuates every crew owner on actual station destruction without deleting or reassigning ownership', async () => {
    expect((await transfer()).status).toBe(201);
    const before = await db.manager.find(CrewAssignment, {
      where: { spacecraftId: station.id },
    });
    expect(before).toHaveLength(3);
    await app.get(SpacecraftDestructionService).destroyFromCombat(station.id);
    const members = await db.manager.find(CrewAssignment, {
      where: { crewId: In(before.map((member) => member.crewId)) },
    });
    expect(members).toHaveLength(3);
    for (const member of members) {
      expect(member.userId).toBe(
        before.find((entry) => entry.crewId === member.crewId)!.userId,
      );
      expect(member.spacecraftId).toBeNull();
      expect(member.escapePodId).not.toBeNull();
      expect(
        await db.manager.findOneBy(EscapePod, { id: member.escapePodId! }),
      ).not.toBeNull();
    }
  });
});
