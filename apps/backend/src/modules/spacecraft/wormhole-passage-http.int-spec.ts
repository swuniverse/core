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
import { DataSource, type DataSourceOptions } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../../app.module';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { Spacecraft, SpacecraftKind } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { Wormhole } from '../starmap/entities/wormhole.entity';
import { Message } from '../messaging/entities/message.entity';
import { FlightSignature } from './entities/flight-signature.entity';
import { GameGateway } from '../websocket/game.gateway';
import { WormholeRestriction } from './entities/wormhole-restriction.entity';
import { Alliance } from '../alliance/entities/alliance.entity';
import { AllianceMembership } from '../alliance/entities/alliance-membership.entity';
import {
  AllianceRole,
  Faction,
  type CreateWormholeRestrictionDto,
  type StationWormholeRestrictionsDto,
} from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { Fleet } from './entities/fleet.entity';
import { ShipLogEntry } from './entities/ship-log-entry.entity';
import { LayerKnowledge } from '../starmap/entities/layer-knowledge.entity';
import { ExplorationState } from '../starmap/entities/exploration-state.entity';
import { factionId } from '../../testing/integration/database';
import { AddWormholeRestrictions20261110180000 } from '../../database/migrations/20261110180000-add-wormhole-restrictions';

const JWT_SECRET = 'wormhole-http-integration-secret';

describe('Wormhole entry authenticated production graph (PostgreSQL, HTTP)', () => {
  let source: DataSource;
  let app: INestApplication;
  let ship: Spacecraft;
  let hole: Wormhole;
  let destination: SpaceLocation;
  const gateway = { emitToUser: jest.fn(), emitToAll: jest.fn() };
  const jwt = new JwtService({ secret: JWT_SECRET });

  beforeAll(async () => {
    const migrations = await connectIntegrationDatabase();
    await resetDatabase(migrations);
    await migrations.destroy();
    const imports: DynamicModule[] = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    );
    const databaseModule = imports.find(
      (item) => item.module === TypeOrmModule,
    );
    const core = databaseModule?.imports?.[0] as DynamicModule | undefined;
    const optionsProvider = core?.providers?.find(
      (provider) =>
        typeof provider === 'object' &&
        'provide' in provider &&
        provider.provide === 'TypeOrmModuleOptions',
    );
    if (!optionsProvider)
      throw new Error('Production datasource configuration missing');
    const config = {
      get: (key: string) =>
        ({
          DATABASE_URL: process.env.INTEGRATION_DATABASE_URL,
          JWT_SECRET,
          NODE_ENV: 'production',
          GAME_TIMEZONE: 'UTC',
        })[key],
    };
    const optionsModule = await Test.createTestingModule({
      providers: [
        optionsProvider,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    const options = optionsModule.get<DataSourceOptions>(
      'TypeOrmModuleOptions',
    );
    expect(options.synchronize).toBe(false);
    await optionsModule.close();
    source = await new DataSource(options).initialize();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .overrideProvider(DataSource)
      .useValue(source)
      .overrideProvider(GameGateway)
      .useValue(gateway)
      .compile();
    app = module.createNestApplication({ logger: ['error'] });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) await source.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(source);
    gateway.emitToUser.mockClear();
    const owner = await createUser(source);
    const shipClass = await source.getRepository(ShipClassDef).save({
      key: 'HTTP_WORMHOLE',
      name: 'HTTP passage',
      category: 'SHIP',
      role: 'SCOUT',
    });
    const entryLayer = await source
      .getRepository(Layer)
      .save({ name: 'HTTP entry', width: 5, height: 5 });
    const exitLayer = await source
      .getRepository(Layer)
      .save({ name: 'HTTP exit', width: 5, height: 5 });
    const entry = await source
      .getRepository(GalaxyField)
      .save({ layerId: entryLayer.id, cx: 1, cy: 1, fieldTypeId: 1 });
    const exit = await source
      .getRepository(GalaxyField)
      .save({ layerId: exitLayer.id, cx: 3, cy: 4, fieldTypeId: 1 });
    const origin = await source
      .getRepository(SpaceLocation)
      .findOneByOrFail({ galaxyFieldId: entry.id });
    destination = await source
      .getRepository(SpaceLocation)
      .findOneByOrFail({ galaxyFieldId: exit.id });
    hole = await source.getRepository(Wormhole).save({
      entryLayerId: entryLayer.id,
      entryCx: 1,
      entryCy: 1,
      exitLayerId: exitLayer.id,
      exitCx: 3,
      exitCy: 4,
    });
    ship = await source.getRepository(Spacecraft).save({
      userId: owner.id,
      name: 'Authenticated passage',
      shipClassId: shipClass.id,
      locationId: origin.id,
      energy: 0,
      warpdrive: 7,
    });
    await source.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'SUBLIGHT_DRIVE',
      moduleType: 'Impulse',
      isActive: false,
    });
  });

  async function rules(
    stationId: number,
    userId: number,
    method = 'GET',
    suffix = '',
    body?: unknown,
  ) {
    return fetch(
      `${await app.getUrl()}/api/spacecraft/${stationId}/wormhole-restrictions${suffix}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt.sign({ sub: userId, username: 'operator' })}`,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
  }

  it('only lets the entry-field station operator list wormhole rules through authenticated HTTP', async () => {
    const station = await source.getRepository(Spacecraft).save({
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      name: 'Entry station',
      kind: SpacecraftKind.STATION,
      locationId: ship.locationId,
    });
    const response = await rules(station.id, ship.userId);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      wormholes: [{ id: hole.id, name: null, restrictions: [] }],
    });
    const foreign = await createUser(source);
    expect((await rules(station.id, foreign.id)).status).toBe(403);
    expect((await rules(ship.id, ship.userId)).status).toBe(403);
    station.locationId = destination.id;
    await source.getRepository(Spacecraft).save(station);
    expect((await rules(station.id, ship.userId)).status).toBe(403);
  });

  it('denies a configured real passage without changing durable ship or arrival state', async () => {
    const station = await source.getRepository(Spacecraft).save({
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      name: 'Operator',
      kind: SpacecraftKind.STATION,
      locationId: ship.locationId,
    });
    expect(
      (
        await rules(station.id, ship.userId, 'POST', '', {
          wormholeId: hole.id,
          targetType: 'USER',
          targetId: ship.userId,
          mode: 'DENY',
        })
      ).status,
    ).toBe(201);
    const response = await enter({ wormholeId: hole.id }, ship.userId);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      message: 'Du hast keine Berechtigung, in das Wurmloch einzufliegen.',
    });
    expect(
      await source.getRepository(Spacecraft).findOneByOrFail({ id: ship.id }),
    ).toMatchObject({
      locationId: ship.locationId,
      energy: 0,
      warpdrive: 7,
      runtimeSystems: ship.runtimeSystems,
    });
    expect(await source.getRepository(Message).count()).toBe(0);
    expect(await source.getRepository(FlightSignature).count()).toBe(0);
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });

  async function entryStation() {
    return source
      .getRepository(Spacecraft)
      .save({
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        name: 'Entry operator',
        kind: SpacecraftKind.STATION,
        locationId: ship.locationId,
      });
  }

  async function unchangedArrival() {
    expect(
      await source.getRepository(Spacecraft).findOneByOrFail({ id: ship.id }),
    ).toMatchObject({
      locationId: ship.locationId,
      energy: ship.energy,
      runtimeSystems: ship.runtimeSystems,
    });
    for (const entity of [
      Message,
      FlightSignature,
      ShipLogEntry,
      LayerKnowledge,
      ExplorationState,
    ])
      expect(await source.getRepository(entity).count()).toBe(0);
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  }

  it('enforces owner authorization on all CRUD requests, ignores client principals, and scopes deletion to the managed wormhole', async () => {
    const station = await entryStation();
    const foreign = await createUser(source);
    const dto: CreateWormholeRestrictionDto = {
      wormholeId: hole.id,
      targetType: 'USER',
      targetId: ship.userId,
      mode: 'ALLOW',
    };
    const created = await rules(station.id, ship.userId, 'POST', '', dto);
    expect(created.status).toBe(201);
    const result = (await created.json()) as StationWormholeRestrictionsDto;
    const id = result.wormholes[0].restrictions[0].id;
    expect(
      (
        await rules(station.id, foreign.id, 'POST', '', {
          ...dto,
          userId: ship.userId,
        })
      ).status,
    ).toBe(403);
    expect(
      (await rules(station.id, foreign.id, 'DELETE', `/${id}`)).status,
    ).toBe(403);
    expect((await rules(ship.id, ship.userId, 'POST', '', dto)).status).toBe(
      403,
    );
    expect((await rules(ship.id, ship.userId, 'DELETE', `/${id}`)).status).toBe(
      403,
    );
    const distant = await source
      .getRepository(Wormhole)
      .save(
        source
          .getRepository(Wormhole)
          .create({ ...hole, id: undefined, entryCx: 2 }),
      );
    expect(
      (
        await rules(station.id, ship.userId, 'POST', '', {
          ...dto,
          wormholeId: distant.id,
        })
      ).status,
    ).toBe(403);
    const otherRule = await source
      .getRepository(WormholeRestriction)
      .save({ ...dto, wormholeId: distant.id, targetType: 'USER' });
    expect(
      (await rules(station.id, ship.userId, 'DELETE', `/${otherRule.id}`))
        .status,
    ).toBe(200);
    expect(
      await source
        .getRepository(WormholeRestriction)
        .existsBy({ id: otherRule.id }),
    ).toBe(true);
    const updated = await rules(station.id, ship.userId, 'POST', '', {
      ...dto,
      mode: 'DENY',
    });
    expect(await updated.json()).toMatchObject({
      wormholes: [{ restrictions: [{ id, mode: 'DENY' }] }],
    });
    expect(
      (await rules(station.id, ship.userId, 'DELETE', `/${id}`)).status,
    ).toBe(200);
    expect(await (await rules(station.id, ship.userId)).json()).toEqual({
      wormholes: [{ id: hole.id, name: null, restrictions: [] }],
    });
  });

  it.each([
    ['USER', 0],
    ['USER', -1],
    ['USER', 1.5],
    ['USER', '1'],
    ['UNKNOWN', 1],
  ])('rejects malformed rule target %s %s', async (targetType, targetId) => {
    const station = await entryStation();
    expect(
      (
        await rules(station.id, ship.userId, 'POST', '', {
          wormholeId: hole.id,
          targetType,
          targetId,
          mode: 'ALLOW',
        })
      ).status,
    ).toBe(400);
    expect(await source.getRepository(WormholeRestriction).count()).toBe(0);
  });

  it.each(['USER', 'ALLIANCE', 'FACTION', 'SHIP'] as const)(
    'uses real %s identity matching in passage',
    async (targetType) => {
      const station = await entryStation();
      const rebel = await factionId(source, Faction.REBEL_ALLIANCE);
      await source
        .getRepository(User)
        .update(ship.userId, { factionId: rebel });
      const alliance = await source
        .getRepository(Alliance)
        .save({ name: 'Passage alliance', factionId: rebel });
      await source
        .getRepository(AllianceMembership)
        .save({
          userId: ship.userId,
          allianceId: alliance.id,
          role: AllianceRole.NONE,
        });
      const targetId = {
        USER: ship.userId,
        ALLIANCE: alliance.id,
        FACTION: rebel,
        SHIP: ship.id,
      }[targetType];
      expect(
        (
          await rules(station.id, ship.userId, 'POST', '', {
            wormholeId: hole.id,
            targetType,
            targetId,
            mode: 'ALLOW',
          })
        ).status,
      ).toBe(201);
      expect((await enter({ wormholeId: hole.id }, ship.userId)).status).toBe(
        201,
      );
      expect(
        (
          await source
            .getRepository(Spacecraft)
            .findOneByOrFail({ id: ship.id })
        ).locationId,
      ).toBe(destination.id);
    },
  );

  it('applies current membership and DENY priority instead of granting access from stance or station ownership', async () => {
    const station = await entryStation();
    const rebel = await factionId(source, Faction.REBEL_ALLIANCE);
    await source.getRepository(User).update(ship.userId, { factionId: rebel });
    const alliance = await source
      .getRepository(Alliance)
      .save({ name: 'Current membership', factionId: rebel });
    const member = await source
      .getRepository(AllianceMembership)
      .save({
        userId: ship.userId,
        allianceId: alliance.id,
        role: AllianceRole.NONE,
      });
    await rules(station.id, ship.userId, 'POST', '', {
      wormholeId: hole.id,
      targetType: 'ALLIANCE',
      targetId: alliance.id,
      mode: 'ALLOW',
    });
    await rules(station.id, ship.userId, 'POST', '', {
      wormholeId: hole.id,
      targetType: 'SHIP',
      targetId: ship.id,
      mode: 'DENY',
    });
    expect((await enter({ wormholeId: hole.id }, ship.userId)).status).toBe(
      400,
    );
    await source
      .getRepository(WormholeRestriction)
      .delete({ targetType: 'SHIP' });
    await source.getRepository(AllianceMembership).remove(member);
    expect((await enter({ wormholeId: hole.id }, ship.userId)).status).toBe(
      400,
    );
    await unchangedArrival();
  });

  it('ignores stale rules when the entry has no station', async () => {
    await source
      .getRepository(WormholeRestriction)
      .save({
        wormholeId: hole.id,
        targetType: 'USER',
        targetId: ship.userId,
        mode: 'DENY',
      });
    expect((await enter({ wormholeId: hole.id }, ship.userId)).status).toBe(
      201,
    );
  });

  it('fails closed when production membership resolution fails', async () => {
    const station = await entryStation();
    await rules(station.id, ship.userId, 'POST', '', {
      wormholeId: hole.id,
      targetType: 'SHIP',
      targetId: ship.id,
      mode: 'ALLOW',
    });
    await source.query(
      'ALTER TABLE alliance_memberships RENAME TO k7b_unavailable_memberships',
    );
    try {
      const response = await enter({ wormholeId: hole.id }, ship.userId);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        message: 'Du hast keine Berechtigung, in das Wurmloch einzufliegen.',
      });
      await unchangedArrival();
    } finally {
      await source.query(
        'ALTER TABLE k7b_unavailable_memberships RENAME TO alliance_memberships',
      );
    }
  });

  it.each(['fleet', 'tractor'] as const)(
    'validates every %s participant before changing durable state',
    async (kind) => {
      const station = await entryStation();
      const carried = await source
        .getRepository(Spacecraft)
        .save({
          userId: ship.userId,
          shipClassId: ship.shipClassId,
          name: 'Denied participant',
          locationId: ship.locationId,
        });
      await source
        .getRepository(SpacecraftModule)
        .save({
          spacecraftId: carried.id,
          category: 'SUBLIGHT_DRIVE',
          moduleType: 'Impulse',
        });
      if (kind === 'fleet') {
        const fleet = await source
          .getRepository(Fleet)
          .save({
            userId: ship.userId,
            name: 'Policy fleet',
            leaderId: ship.id,
          });
        await source
          .getRepository(Spacecraft)
          .update([ship.id, carried.id], { fleetId: fleet.id });
      } else
        await source
          .getRepository(Spacecraft)
          .update(ship.id, { tractoredShipId: carried.id });
      await rules(station.id, ship.userId, 'POST', '', {
        wormholeId: hole.id,
        targetType: 'USER',
        targetId: ship.userId,
        mode: 'ALLOW',
      });
      await rules(station.id, ship.userId, 'POST', '', {
        wormholeId: hole.id,
        targetType: 'SHIP',
        targetId: carried.id,
        mode: 'DENY',
      });
      const before = await source
        .getRepository(Spacecraft)
        .find({ order: { id: 'ASC' } });
      expect((await enter({ wormholeId: hole.id }, ship.userId)).status).toBe(
        400,
      );
      expect(
        await source.getRepository(Spacecraft).find({ order: { id: 'ASC' } }),
      ).toEqual(before);
      await unchangedArrival();
    },
  );

  it('registers the new entity once and supports migration rollback, constraints and cascade on PostgreSQL', async () => {
    expect(
      source.entityMetadatas.filter(
        (meta) => meta.tableName === 'wormhole_restrictions',
      ),
    ).toHaveLength(1);
    const runner = source.createQueryRunner();
    const migration = new AddWormholeRestrictions20261110180000();
    try {
      await migration.down(runner);
      expect(await runner.hasTable('wormhole_restrictions')).toBe(false);
      await migration.up(runner);
      await expect(
        source.query(
          `INSERT INTO wormhole_restrictions ("wormholeId", "targetType", "targetId", mode) VALUES ($1, 'UNKNOWN', 1, 'ALLOW')`,
          [hole.id],
        ),
      ).rejects.toThrow();
      await source
        .getRepository(WormholeRestriction)
        .save({
          wormholeId: hole.id,
          targetType: 'SHIP',
          targetId: ship.id,
          mode: 'DENY',
        });
      await source.getRepository(Wormhole).delete(hole.id);
      expect(await source.getRepository(WormholeRestriction).count()).toBe(0);
    } finally {
      await runner.release();
    }
  });

  async function enter(body: unknown, userId?: number) {
    return fetch(
      `${await app.getUrl()}/api/spacecraft/${ship.id}/wormhole/enter`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId == null
            ? {}
            : {
                Authorization: `Bearer ${jwt.sign({ sub: userId, username: 'pilot', faction: 'REBEL_ALLIANCE' })}`,
              }),
        },
        body: JSON.stringify(body),
      },
    );
  }

  async function getFieldContext(userId?: number) {
    return fetch(
      `${await app.getUrl()}/api/spacecraft/${ship.id}/field-context`,
      {
        headers:
          userId == null
            ? {}
            : {
                Authorization: `Bearer ${jwt.sign({ sub: userId, username: 'pilot', faction: 'REBEL_ALLIANCE' })}`,
              },
      },
    );
  }

  it('returns only active passages local to the owned field with reverse target layers', async () => {
    const originLayer = await source
      .getRepository(Layer)
      .save({ name: 'Reverse origin', width: 5, height: 5 });
    hole.name = 'Forward gate';
    await source.getRepository(Wormhole).save(hole);
    await source.getRepository(Wormhole).save([
      {
        entryLayerId: originLayer.id,
        entryCx: 4,
        entryCy: 2,
        exitLayerId: 1,
        exitCx: 1,
        exitCy: 1,
        isBidirectional: true,
        isRandomExit: false,
        name: 'Reverse gate',
        isActive: true,
      },
      {
        entryLayerId: 1,
        entryCx: 1,
        entryCy: 1,
        exitLayerId: originLayer.id,
        exitCx: 4,
        exitCy: 2,
        isBidirectional: false,
        isRandomExit: false,
        name: 'Inactive gate',
        isActive: false,
      },
      {
        entryLayerId: 1,
        entryCx: 2,
        entryCy: 1,
        exitLayerId: originLayer.id,
        exitCx: 4,
        exitCy: 2,
        isBidirectional: false,
        isRandomExit: false,
        name: 'Distant gate',
        isActive: true,
      },
    ]);

    const response = await getFieldContext(ship.userId);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      coordinates: { x: 1, y: 1 },
      wormholePassages: [
        {
          id: hole.id,
          name: 'Forward gate',
          targetLayer: { id: expect.any(Number), name: 'HTTP exit' },
        },
        {
          name: 'Reverse gate',
          targetLayer: { id: originLayer.id, name: 'Reverse origin' },
        },
      ],
    });
    expect((await getFieldContext()).status).toBe(401);
    const other = await createUser(source, { username: 'Different owner' });
    expect((await getFieldContext(other.id)).status).toBe(404);
  });

  it('rolls back production HTTP passage and emits nothing if durable arrival messaging fails', async () => {
    await source.query(
      `CREATE FUNCTION k7a2_fail_http_message() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'HTTP arrival failure'; END $$`,
    );
    await source.query(
      'CREATE TRIGGER k7a2_fail_http_message BEFORE INSERT ON messages FOR EACH ROW EXECUTE FUNCTION k7a2_fail_http_message()',
    );
    try {
      expect((await enter({ wormholeId: hole.id }, ship.userId)).status).toBe(
        500,
      );
      expect(
        await source.getRepository(Spacecraft).findOneByOrFail({ id: ship.id }),
      ).toMatchObject({ locationId: ship.locationId, energy: 0, warpdrive: 7 });
      expect(await source.getRepository(Message).count()).toBe(0);
      expect(await source.getRepository(FlightSignature).count()).toBe(0);
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    } finally {
      await source.query('DROP TRIGGER k7a2_fail_http_message ON messages');
      await source.query('DROP FUNCTION k7a2_fail_http_message()');
    }
  });

  it('requires authentication and refuses another authenticated owner before passage writes', async () => {
    expect((await enter({})).status).toBe(401);
    const other = await createUser(source, {
      username: 'Other authenticated owner',
    });
    expect((await enter({ userId: ship.userId }, other.id)).status).toBe(404);
    expect(
      (await source.getRepository(Spacecraft).findOneByOrFail({ id: ship.id }))
        .locationId,
    ).toBe(ship.locationId);
    expect(await source.getRepository(Message).count()).toBe(0);
    expect(await source.getRepository(FlightSignature).count()).toBe(0);
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, '1', 'invalid'])(
    'rejects invalid wormholeId %s through the production ValidationPipe',
    async (wormholeId) => {
      expect((await enter({ wormholeId }, ship.userId)).status).toBe(400);
      expect(
        (
          await source
            .getRepository(Spacecraft)
            .findOneByOrFail({ id: ship.id })
        ).locationId,
      ).toBe(ship.locationId);
      expect(await source.getRepository(Message).count()).toBe(0);
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    },
  );

  it('accepts an omitted selector for a single authoritative local wormhole', async () => {
    expect((await enter({}, ship.userId)).status).toBe(201);
    expect(
      (await source.getRepository(Spacecraft).findOneByOrFail({ id: ship.id }))
        .locationId,
    ).toBe(destination.id);
  });

  it('executes the authenticated route with production default policy, RNG, repositories and arrival services', async () => {
    const response = await enter(
      {
        wormholeId: hole.id,
        userId: ship.userId + 100,
        destinationId: ship.locationId,
      },
      ship.userId,
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      wormholeId: hole.id,
      direction: 'ENTRY',
      shipIds: [ship.id],
      locationId: destination.id,
    });
    expect(
      await source.getRepository(Spacecraft).findOneByOrFail({ id: ship.id }),
    ).toMatchObject({ locationId: destination.id, energy: 0, warpdrive: 7 });
    expect(await source.getRepository(Message).count()).toBe(1);
    expect(await source.getRepository(FlightSignature).count()).toBe(2);
    expect(gateway.emitToUser).toHaveBeenCalledTimes(1);
  });
});
