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
import {
  DataSource,
  type DataSourceOptions,
  type EntityManager,
} from 'typeorm';
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
import { AllianceDepot } from '../alliance/entities/alliance-depot.entity';
import { AllianceMembership } from '../alliance/entities/alliance-membership.entity';
import { TypeOrmAllianceStore } from '../alliance/typeorm-alliance.store';
import { AllianceService } from '../alliance/alliance.service';
import { AllianceResetService } from '../alliance/alliance-reset.service';
import {
  ALLIANCE_CONTEXT_CLEANUP,
  AllianceContextCleanup,
} from '../alliance/alliance-context-cleanup';
import { ALLIANCE_ASSET_STORAGE } from '../alliance/alliance-asset.port';
import { InMemoryAssetStorage } from '../alliance/testing/in-memory-asset-storage';
import {
  AllianceRole,
  Faction,
  type AdminWormholeRestrictionsDto,
  type CreateWormholeRestrictionDto,
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
  let failLifecycle: 'dissolution' | 'reset' | null = null;

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
          EMAIL_BLOCKLIST_PEPPER: 'integration-pepper',
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
    expect(source.hasMetadata(AllianceDepot)).toBe(true);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .overrideProvider(DataSource)
      .useValue(source)
      .overrideProvider(GameGateway)
      .useValue(gateway)
      .overrideProvider(ALLIANCE_ASSET_STORAGE)
      .useValue(new InMemoryAssetStorage())
      .compile();
    app = module.createNestApplication({ logger: ['error'] });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    const abortLifecycle = async (
      lifecycle: 'dissolution' | 'reset',
      transaction: unknown,
    ) => {
      if (failLifecycle !== lifecycle) return;
      // This later consumer observes the deletion in the caller's transaction.
      expect(
        await (transaction as EntityManager).count(WormholeRestriction, {
          where: { targetType: 'ALLIANCE' },
        }),
      ).toBe(0);
      throw new Error('later lifecycle consumer failed');
    };
    app.get<AllianceContextCleanup>(ALLIANCE_CONTEXT_CLEANUP).register({
      allianceDissolved: async (_, { transaction }) =>
        abortLifecycle('dissolution', transaction),
      reset: async ({ transaction }) => abortLifecycle('reset', transaction),
    });
  });

  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) await source.destroy();
  });

  beforeEach(async () => {
    failLifecycle = null;
    await resetDatabase(source);
    gateway.emitToUser.mockClear();
    const owner = await createUser(source);
    admin = await createUser(source);
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

  let admin: User;

  async function rules(
    method = 'GET',
    path = 'wormhole-restrictions',
    body?: unknown,
    token: object = { sub: admin.id, username: 'admin', isAdmin: true },
  ) {
    return fetch(`${await app.getUrl()}/api/starmap/admin/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt.sign(token)}`,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  async function addRule(body: CreateWormholeRestrictionDto) {
    return rules('POST', `wormholes/${hole.id}/restrictions`, body);
  }

  async function listedRules() {
    const listed = (await (
      await rules()
    ).json()) as AdminWormholeRestrictionsDto;
    return listed.wormholes.find((entry) => entry.id === hole.id)
      ?.restrictions;
  }

  async function allowShip() {
    // Identity resolution fails closed for players without a faction.
    await source.getRepository(User).update(ship.userId, {
      factionId: await factionId(source, Faction.REBEL_ALLIANCE),
    });
    await source.getRepository(WormholeRestriction).save({
      wormholeId: hole.id,
      targetType: 'SHIP',
      targetId: ship.id,
      mode: 'ALLOW',
    });
  }

  it('protects signature masking endpoints and validates hull IDs in the production HTTP graph', async () => {
    const path = `${await app.getUrl()}/api/spacecraft/${ship.id}/signature-mask`;
    const requestMask = (method: string, userId?: number, body?: unknown) =>
      fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(userId == null
            ? {}
            : {
                Authorization: `Bearer ${jwt.sign({ sub: userId, username: 'operator' })}`,
              }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    expect((await requestMask('GET')).status).toBe(401);
    const stranger = await createUser(source);
    expect((await requestMask('GET', stranger.id)).status).toBe(404);
    expect((await requestMask('DELETE', stranger.id)).status).toBe(404);
    const menu = await requestMask('GET', ship.userId);
    expect(menu.status).toBe(200);
    expect(await menu.json()).toMatchObject({
      energy: 0,
      active: null,
      choices: [],
    });
    for (const shipClassId of [0, -1, 1.5, 2147483648, 'invalid']) {
      expect(
        (await requestMask('POST', ship.userId, { shipClassId })).status,
      ).toBe(400);
    }
    expect((await requestMask('DELETE', ship.userId)).status).toBe(200);
    expect(
      (await source.getRepository(Spacecraft).findOneByOrFail({ id: ship.id }))
        .energy,
    ).toBe(0);
  });

  it('only lets admins and map editors manage wormhole rules; players get 403', async () => {
    const player = { sub: ship.userId, username: 'pilot' };
    const dto = { targetType: 'USER', targetId: ship.userId, mode: 'ALLOW' };
    const path = `wormholes/${hole.id}/restrictions`;
    expect((await rules('GET', undefined, undefined, player)).status).toBe(403);
    expect((await rules('POST', path, dto, player)).status).toBe(403);
    const created = await addRule(dto as CreateWormholeRestrictionDto);
    expect(created.status).toBe(201);
    const id = (await listedRules())![0].id;
    expect(
      (await rules('DELETE', `${path}/${id}`, undefined, player)).status,
    ).toBe(403);
    expect(await source.getRepository(WormholeRestriction).count()).toBe(1);
    const response = await rules();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      wormholes: [
        {
          id: hole.id,
          name: null,
          isActive: true,
          isBidirectional: false,
          entry: { layerId: hole.entryLayerId, x: 1, y: 1 },
          exit: { layerId: hole.exitLayerId, x: 3, y: 4 },
          restrictions: [{ id, ...dto }],
        },
      ],
    });
    const editor = await createUser(source, { permissions: ['MAP_EDITOR'] });
    const editorToken = { sub: editor.id, username: 'editor' };
    expect(
      (await rules('DELETE', `${path}/${id}`, undefined, editorToken)).status,
    ).toBe(200);
    expect(await source.getRepository(WormholeRestriction).count()).toBe(0);
    expect(
      (await rules('GET', undefined, undefined, editorToken)).status,
    ).toBe(200);
  });

  it('denies a configured real passage without changing durable ship or arrival state', async () => {
    expect(
      (
        await addRule({
          targetType: 'USER',
          targetId: ship.userId,
          mode: 'DENY',
        })
      ).status,
    ).toBe(201);
    const response = await enter({ wormholeId: hole.id }, ship.userId);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      message: 'Du hast keine Berechtigung um in das Wurmloch einzufliegen',
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

  it('rejects duplicates and unknown wormholes like STU and scopes deletion to the addressed wormhole', async () => {
    const dto: CreateWormholeRestrictionDto = {
      targetType: 'USER',
      targetId: ship.userId,
      mode: 'ALLOW',
    };
    expect((await addRule(dto)).status).toBe(201);
    const duplicate = await addRule({ ...dto, mode: 'DENY' });
    expect(duplicate.status).toBe(400);
    expect(await duplicate.json()).toMatchObject({
      message: 'Für dieses Ziel existiert bereits eine Regel',
    });
    expect(await listedRules()).toEqual([
      { id: expect.any(Number), ...dto },
    ]);
    expect(
      (await rules('POST', `wormholes/${hole.id + 1000}/restrictions`, dto))
        .status,
    ).toBe(404);
    expect(
      (
        await addRule({ targetType: 'USER', targetId: 999999, mode: 'ALLOW' })
      ).status,
    ).toBe(400);
    const distant = await source
      .getRepository(Wormhole)
      .save(
        source
          .getRepository(Wormhole)
          .create({ ...hole, id: undefined, entryCx: 2 }),
      );
    const otherRule = await source
      .getRepository(WormholeRestriction)
      .save({ ...dto, wormholeId: distant.id });
    expect(
      (
        await rules(
          'DELETE',
          `wormholes/${hole.id}/restrictions/${otherRule.id}`,
        )
      ).status,
    ).toBe(200);
    expect(
      await source
        .getRepository(WormholeRestriction)
        .existsBy({ id: otherRule.id }),
    ).toBe(true);
    const id = (await listedRules())![0].id;
    expect(
      (await rules('DELETE', `wormholes/${hole.id}/restrictions/${id}`))
        .status,
    ).toBe(200);
    expect(await listedRules()).toEqual([]);
  });

  it.each([
    ['USER', 0],
    ['USER', -1],
    ['USER', 1.5],
    ['USER', '1'],
    ['UNKNOWN', 1],
  ])('rejects malformed rule target %s %s', async (targetType, targetId) => {
    expect(
      (
        await rules('POST', `wormholes/${hole.id}/restrictions`, {
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
      const rebel = await factionId(source, Faction.REBEL_ALLIANCE);
      await source
        .getRepository(User)
        .update(ship.userId, { factionId: rebel });
      const alliance = await source
        .getRepository(Alliance)
        .save({ name: 'Passage alliance', factionId: rebel });
      await source.getRepository(AllianceMembership).save({
        userId: ship.userId,
        allianceId: alliance.id,
      });
      const targetId = {
        USER: ship.userId,
        ALLIANCE: alliance.id,
        FACTION: rebel,
        SHIP: ship.id,
      }[targetType];
      expect(
        (
          await addRule({
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

  async function lifecycleAlliance(name: string) {
    const rebel = await factionId(source, Faction.REBEL_ALLIANCE);
    const president = await createUser(source, {
      faction: Faction.REBEL_ALLIANCE,
      factionId: rebel,
    });
    const store = new TypeOrmAllianceStore(source);
    const alliance = await store.insertAlliance({ name, description: '', factionId: rebel });
    await store.insertMembership({
      userId: president.id,
      allianceId: alliance.id,
      role: AllianceRole.PRESIDENT,
    });
    return { alliance, president };
  }

  async function endAlliance(
    lifecycle: 'dissolution' | 'reset',
    allianceId: number,
    presidentId: number,
  ) {
    if (lifecycle === 'dissolution')
      await app.get(AllianceService).dissolve(presidentId, allianceId);
    else await app.get(AllianceResetService).resetAllianceData();
  }

  it.each(['dissolution', 'reset'] as const)(
    'alliance %s removes the sole rule from the admin list and keeps the wormhole closed',
    async (lifecycle) => {
      const { alliance, president } = await lifecycleAlliance('Sole target');
      expect(
        (
          await addRule({
            targetType: 'ALLIANCE',
            targetId: alliance.id,
            mode: 'ALLOW',
          })
        ).status,
      ).toBe(201);
      expect((await enter({ wormholeId: hole.id }, ship.userId)).status).toBe(
        400,
      );
      await unchangedArrival();

      await endAlliance(lifecycle, alliance.id, president.id);

      expect(
        await source.getRepository(Alliance).existsBy({ id: alliance.id }),
      ).toBe(false);
      expect(await listedRules()).toEqual([]);
      expect(await source.getRepository(WormholeRestriction).count()).toBe(0);
      expect((await enter({ wormholeId: hole.id }, ship.userId)).status).toBe(
        400,
      );
      await unchangedArrival();
    },
  );

  it.each(['dissolution', 'reset'] as const)(
    'alliance %s preserves other target types and only removes the applicable alliance rules',
    async (lifecycle) => {
      const { alliance, president } = await lifecycleAlliance('Removed target');
      const { alliance: other } = await lifecycleAlliance('Other target');
      const rebel = await factionId(source, Faction.REBEL_ALLIANCE);
      const configured = await source.getRepository(WormholeRestriction).save([
        {
          wormholeId: hole.id,
          targetType: 'ALLIANCE',
          targetId: alliance.id,
          mode: 'ALLOW',
        },
        {
          wormholeId: hole.id,
          targetType: 'ALLIANCE',
          targetId: other.id,
          mode: 'DENY',
        },
        {
          wormholeId: hole.id,
          targetType: 'USER',
          targetId: ship.userId,
          mode: 'ALLOW',
        },
        {
          wormholeId: hole.id,
          targetType: 'FACTION',
          targetId: rebel,
          mode: 'DENY',
        },
        {
          wormholeId: hole.id,
          targetType: 'SHIP',
          targetId: ship.id,
          mode: 'ALLOW',
        },
      ]);

      await endAlliance(lifecycle, alliance.id, president.id);

      const retained = configured.filter(
        (rule) =>
          rule.targetType !== 'ALLIANCE' ||
          (lifecycle === 'dissolution' && rule.targetId === other.id),
      );
      expect(
        await source
          .getRepository(WormholeRestriction)
          .find({ order: { id: 'ASC' } }),
      ).toEqual(retained);
      expect(await listedRules()).toEqual(
        retained.map(({ id, targetType, targetId, mode }) => ({
          id,
          targetType,
          targetId,
          mode,
        })),
      );
    },
  );

  it.each(['dissolution', 'reset'] as const)(
    'alliance %s rolls back rule deletion when a later lifecycle consumer fails',
    async (lifecycle) => {
      const { alliance, president } =
        await lifecycleAlliance('Rollback target');
      const configured = await source.getRepository(WormholeRestriction).save([
        {
          wormholeId: hole.id,
          targetType: 'ALLIANCE',
          targetId: alliance.id,
          mode: 'ALLOW',
        },
        {
          wormholeId: hole.id,
          targetType: 'SHIP',
          targetId: ship.id,
          mode: 'DENY',
        },
      ]);
      const before = await listedRules();
      failLifecycle = lifecycle;
      try {
        await expect(
          endAlliance(lifecycle, alliance.id, president.id),
        ).rejects.toThrow('later lifecycle consumer failed');
      } finally {
        failLifecycle = null;
      }

      expect(
        await source.getRepository(Alliance).existsBy({ id: alliance.id }),
      ).toBe(true);
      expect(
        await source
          .getRepository(AllianceMembership)
          .existsBy({ userId: president.id, allianceId: alliance.id }),
      ).toBe(true);
      expect(
        await source
          .getRepository(WormholeRestriction)
          .find({ order: { id: 'ASC' } }),
      ).toEqual(configured);
      expect(await listedRules()).toEqual(before);
      expect((await enter({ wormholeId: hole.id }, ship.userId)).status).toBe(
        400,
      );
      await unchangedArrival();
    },
  );

  it('applies current membership and DENY priority instead of granting access from stance or station ownership', async () => {
    await source.getRepository(Spacecraft).save({
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      name: 'Entry station',
      kind: SpacecraftKind.STATION,
      locationId: ship.locationId,
    });
    const rebel = await factionId(source, Faction.REBEL_ALLIANCE);
    await source.getRepository(User).update(ship.userId, { factionId: rebel });
    const alliance = await source
      .getRepository(Alliance)
      .save({ name: 'Current membership', factionId: rebel });
    const member = await source.getRepository(AllianceMembership).save({
      userId: ship.userId,
      allianceId: alliance.id,
    });
    await addRule({
      targetType: 'ALLIANCE',
      targetId: alliance.id,
      mode: 'ALLOW',
    });
    await addRule({
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

  it('closes a wormhole without rules and applies rules without a station like STU', async () => {
    const closed = await enter({ wormholeId: hole.id }, ship.userId);
    expect(closed.status).toBe(400);
    expect(await closed.json()).toMatchObject({
      message: 'Du hast keine Berechtigung um in das Wurmloch einzufliegen',
    });
    await unchangedArrival();
    await allowShip();
    expect((await enter({ wormholeId: hole.id }, ship.userId)).status).toBe(
      201,
    );
  });

  it('checks the rules when leaving through a bidirectional exit', async () => {
    await source
      .getRepository(Wormhole)
      .update(hole.id, { isBidirectional: true });
    await source
      .getRepository(Spacecraft)
      .update(ship.id, { locationId: destination.id });
    const response = await enter({ wormholeId: hole.id }, ship.userId);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      message: 'Du hast keine Berechtigung um das Wurmloch zu verlassen',
    });
    expect(
      (await source.getRepository(Spacecraft).findOneByOrFail({ id: ship.id }))
        .locationId,
    ).toBe(destination.id);
    await allowShip();
    expect((await enter({ wormholeId: hole.id }, ship.userId)).status).toBe(
      201,
    );
    expect(
      (await source.getRepository(Spacecraft).findOneByOrFail({ id: ship.id }))
        .locationId,
    ).toBe(ship.locationId);
  });

  it('fails closed when production membership resolution fails', async () => {
    await allowShip();
    await source.query(
      'ALTER TABLE alliance_memberships RENAME TO k7b_unavailable_memberships',
    );
    try {
      const response = await enter({ wormholeId: hole.id }, ship.userId);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        message: 'Du hast keine Berechtigung um in das Wurmloch einzufliegen',
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
      const carried = await source.getRepository(Spacecraft).save({
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        name: 'Denied participant',
        locationId: ship.locationId,
      });
      await source.getRepository(SpacecraftModule).save({
        spacecraftId: carried.id,
        category: 'SUBLIGHT_DRIVE',
        moduleType: 'Impulse',
      });
      if (kind === 'fleet') {
        const fleet = await source.getRepository(Fleet).save({
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
      await addRule({
        targetType: 'USER',
        targetId: ship.userId,
        mode: 'ALLOW',
      });
      await addRule({
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
      await source.getRepository(WormholeRestriction).save({
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
    await allowShip();
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
    await allowShip();
    expect((await enter({}, ship.userId)).status).toBe(201);
    expect(
      (await source.getRepository(Spacecraft).findOneByOrFail({ id: ship.id }))
        .locationId,
    ).toBe(destination.id);
  });

  it('executes the authenticated route with production default policy, RNG, repositories and arrival services', async () => {
    await allowShip();
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
