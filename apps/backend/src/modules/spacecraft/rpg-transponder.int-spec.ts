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
import { User } from '../auth/user.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { LayerKnowledge } from '../starmap/entities/layer-knowledge.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { Spacecraft, AlertState } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { RpgPlot } from '../rpg/rpg-plot.entity';
import { RpgTransponderService } from './rpg-transponder.service';
import { FlightSignatureService } from './flight-signature.service';
import { FlightSignature } from './entities/flight-signature.entity';
import { SpacecraftService } from './spacecraft.service';
import { StarmapVisibilityService } from './starmap-visibility.service';
import { AlertReactionService } from '../alert-reaction/alert-reaction.service';
import { BattleResolverService } from '../combat/battle-resolver.service';
import { GameGateway } from '../websocket/game.gateway';
import {
  WsEventType,
  LayerKnowledgeStatus,
  ContactMode,
  Faction,
} from '@swuniverse/shared';
import { Contact } from '../contacts/entities/contact.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyChangeable } from '../colony/entities/colony-changeable.entity';
import { ColonyOrbitService } from '../colony/colony-orbit.service';
import { RpgActionLockService } from './rpg-action-lock.service';
import { ShipDistressSignal } from './entities/ship-distress-signal.entity';
import { SpacecraftCommunicationService } from './spacecraft-communication.service';

const secret = 'rpg-transponder-http-integration';
const jwt = new JwtService({ secret });

describe('RPG transponder (production HTTP/PostgreSQL)', () => {
  let db: DataSource, app: INestApplication;
  let admin: number, viewer: number, stranger: number;
  let scene: Spacecraft, observer: Spacecraft, plot: RpgPlot;
  let locations: SpaceLocation[];
  const gateway = {
    emitToUser: jest.fn(),
    emitToAll: jest.fn(),
    emitVisibilityToUser: jest.fn(),
    onlineUserIds: [] as number[],
  };
  const battle = { resolve: jest.fn() };
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
      .overrideProvider(BattleResolverService)
      .useValue(battle)
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
    jest.clearAllMocks();
    admin = (await createUser(db)).id;
    viewer = (await createUser(db)).id;
    stranger = (await createUser(db)).id;
    await db.manager.update(User, admin, { isAdmin: true });
    const faction = await factionId(db, Faction.REBEL_ALLIANCE);
    for (const id of [admin, viewer, stranger])
      await db.manager.update(User, id, { factionId: faction });
    gateway.onlineUserIds = [admin, viewer, stranger];
    plot = await db.manager.save(RpgPlot, {
      creatorId: admin,
      title: 'Administrative scene',
    });
    const layer = await db.manager.save(Layer, {
      name: 'Scene map',
      width: 5,
      height: 5,
    });
    const fields = await db.manager.save(
      GalaxyField,
      [1, 2].map((cx) => ({ layerId: layer.id, cx, cy: 1, fieldTypeId: 1 })),
    );
    locations = await Promise.all(
      fields.map((field) =>
        db.manager.findOneByOrFail(SpaceLocation, { galaxyFieldId: field.id }),
      ),
    );
    await db.manager.save(
      LayerKnowledge,
      [admin, viewer, stranger].map((userId) => ({
        userId,
        layerId: layer.id,
        status: LayerKnowledgeStatus.KNOWN,
      })),
    );
    const hull = await db.manager.save(ShipClassDef, {
      key: 'SCENE',
      name: 'Scene hull',
      category: 'SHIP',
      role: 'SCOUT',
      crewMin: 0,
      sensorRangeBase: 3,
    });
    const systems = {
      SHORT_RANGE_SENSORS: { active: true, integrity: 100 },
      LONG_RANGE_SENSORS: { active: true, integrity: 100 },
      WARPDRIVE: { active: false, integrity: 100 },
      TACHYON_SCANNER: {
        active: true,
        integrity: 100,
        lastScanAt: Date.now(),
        lastScanLocationId: locations[0].id,
      },
    };
    scene = await db.manager.save(Spacecraft, {
      userId: admin,
      name: 'Secret scene',
      shipClassId: hull.id,
      locationId: locations[0].id,
      energy: 200,
      runtimeSystems: systems,
    });
    observer = await db.manager.save(Spacecraft, {
      userId: viewer,
      name: 'Player observer',
      shipClassId: hull.id,
      locationId: locations[0].id,
      energy: 200,
      runtimeSystems: systems,
    });
    await db.manager.save(
      SpacecraftModule,
      [scene, observer].flatMap((ship) => [
        {
          spacecraftId: ship.id,
          category: 'SENSORS',
          moduleType: 'Scene sensors',
          isActive: true,
          integrity: 100,
        },
        {
          spacecraftId: ship.id,
          category: 'SPECIAL',
          moduleType: 'Gravitationswellenscanner',
          isActive: true,
          integrity: 100,
        },
      ]),
    );
  });
  async function request(
    path: string,
    method = 'GET',
    userId?: number,
    body?: unknown,
  ) {
    return fetch(`${await app.getUrl()}/api/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(userId == null
          ? {}
          : {
              Authorization: `Bearer ${jwt.sign({ sub: userId, username: 'scene operator', isAdmin: userId === admin })}`,
            }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  const scenes = () => app.get(RpgTransponderService);
  async function hide() {
    await scenes().assign(scene.id, admin, plot.id);
    await scenes().setHidden(scene.id, admin, true);
  }

  it('requires the real admin role, own ship and own active plot; public membership grants no control', async () => {
    expect((await request('spacecraft/admin/rpg')).status).toBe(401);
    expect(
      (
        await request(
          `spacecraft/admin/rpg/${scene.id}/transponder`,
          'PUT',
          viewer,
          { plotId: plot.id },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request(
          `spacecraft/admin/rpg/${observer.id}/transponder`,
          'PUT',
          admin,
          { plotId: plot.id },
        )
      ).status,
    ).toBe(404);
    const foreign = await db.manager.save(RpgPlot, {
      creatorId: viewer,
      title: 'Public plot',
    });
    expect(
      (
        await request(
          `spacecraft/admin/rpg/${scene.id}/transponder`,
          'PUT',
          admin,
          { plotId: foreign.id },
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await request(
          `spacecraft/admin/rpg/${scene.id}/transponder`,
          'PUT',
          admin,
          { plotId: 0 },
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await request(
          `spacecraft/admin/rpg/${scene.id}/transponder`,
          'PUT',
          admin,
          { plotId: plot.id },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await request(
          `spacecraft/admin/rpg/${scene.id}/visibility`,
          'PATCH',
          admin,
          { hidden: 'true' },
        )
      ).status,
    ).toBe(400);
    expect(
      (await db.manager.findOneByOrFail(Spacecraft, { id: scene.id })).energy,
    ).toBe(200);
  });
  it('hides from owner lists, direct endpoints, NBS, tachyon detection and LSS counts without permitting source or target actions', async () => {
    const service = app.get(SpacecraftService);
    const before = await service.getLocalMap(observer.id, viewer);
    expect(before.ships.map((ship) => ship.id)).toContain(scene.id);
    expect(before.overlays.signatures).toEqual(
      expect.arrayContaining([expect.objectContaining({ count: 2 })]),
    );
    await hide();
    expect(await (await request('spacecraft', 'GET', admin)).json()).toEqual(
      [],
    );
    for (const suffix of ['', '/details', '/nearby', '/local-map'])
      expect(
        (await request(`spacecraft/${scene.id}${suffix}`, 'GET', admin)).status,
      ).toBe(404);
    expect(
      (
        await request(`spacecraft/${scene.id}/navigate`, 'POST', admin, {
          direction: 'RIGHT',
          steps: 1,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          `spacecraft/${observer.id}/nearby/${scene.id}/scan`,
          'POST',
          viewer,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request('combat/attack', 'POST', viewer, {
          attackerId: observer.id,
          targetId: scene.id,
        })
      ).status,
    ).toBe(404);
    expect(
      (await service.getNearby(observer.id, viewer)).ships.map(
        (ship) => ship.id,
      ),
    ).not.toContain(scene.id);
    const after = await service.getLocalMap(observer.id, viewer);
    expect(after.ships.map((ship) => ship.id)).not.toContain(scene.id);
    expect(after.overlays.signatures).toEqual(
      expect.arrayContaining([expect.objectContaining({ count: 1 })]),
    );
    expect(
      (await db.manager.findOneByOrFail(Spacecraft, { id: observer.id }))
        .energy,
    ).toBe(200);
    const adminList = await (
      await request('spacecraft/admin/rpg', 'GET', admin)
    ).json();
    expect(adminList).toEqual([
      expect.objectContaining({ id: scene.id, hidden: true, plotId: plot.id }),
    ]);
  });
  it('preserves existing signatures and suppresses new emissions using the authoritative locked state, including stale saves', async () => {
    const signatures = app.get(FlightSignatureService);
    await signatures.createMovement(scene, locations[0], locations[1], 'EAST');
    const previous = await db.manager.find(FlightSignature, {
      order: { id: 'ASC' },
    });
    await hide();
    // A stale ordinary entity cannot restore public visibility or detach the transponder.
    scene.name = 'Prepared scene';
    await db.manager.save(Spacecraft, scene);
    expect(
      (await db.manager.findOneByOrFail(Spacecraft, { id: scene.id }))
        .rpgHidden,
    ).toBe(true);
    await signatures.createMovement(scene, locations[0], locations[1], 'EAST');
    expect(
      await db.manager.find(FlightSignature, { order: { id: 'ASC' } }),
    ).toEqual(previous);
    await scenes().setHidden(scene.id, admin, false);
    await signatures.createMovement(scene, locations[0], locations[1], 'EAST');
    expect(await db.manager.count(FlightSignature)).toBe(4);
  });
  it('publishes post-commit removal only to prior viewers and current state when revealed or removed, for zero EPS', async () => {
    await hide();
    expect(gateway.emitVisibilityToUser.mock.calls.map(([id]) => id)).toEqual([
      admin,
      viewer,
    ]);
    expect(gateway.emitVisibilityToUser).toHaveBeenCalledWith(viewer, {
      type: 'REMOVED',
      shipId: scene.id,
    });
    await db.manager.update(Spacecraft, scene.id, {
      name: 'Current scene',
      locationId: locations[1].id,
    });
    gateway.emitVisibilityToUser.mockClear();
    await scenes().remove(scene.id, admin);
    expect(gateway.emitVisibilityToUser).toHaveBeenCalledWith(
      viewer,
      expect.objectContaining({
        type: 'STATE',
        state: expect.objectContaining({
          spacecraftName: 'Current scene',
          location: expect.objectContaining({ x: 2 }),
        }),
      }),
    );
    const current = await db.manager.findOneByOrFail(Spacecraft, {
      id: scene.id,
    });
    expect(current).toMatchObject({
      rpgHidden: false,
      rpgPlotId: null,
      energy: 200,
    });
  });
  it('rolls back visibility and sends no events when the transaction fails', async () => {
    await scenes().assign(scene.id, admin, plot.id);
    await db.query(
      `CREATE FUNCTION reject_scene_visibility() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'scene failure'; END $$`,
    );
    await db.query(
      `CREATE TRIGGER reject_scene_visibility BEFORE UPDATE OF "rpgHidden" ON spacecraft FOR EACH ROW EXECUTE FUNCTION reject_scene_visibility()`,
    );
    try {
      await expect(scenes().setHidden(scene.id, admin, true)).rejects.toThrow(
        'scene failure',
      );
      expect(gateway.emitVisibilityToUser).not.toHaveBeenCalled();
      expect(
        (await db.manager.findOneByOrFail(Spacecraft, { id: scene.id }))
          .rpgHidden,
      ).toBe(false);
    } finally {
      await db.query('DROP TRIGGER reject_scene_visibility ON spacecraft');
      await db.query('DROP FUNCTION reject_scene_visibility()');
    }
  });
  it('excludes hidden incoming and alerted ships from automatic battles and all shared map contacts', async () => {
    await db.manager.save(Contact, {
      userId: admin,
      contactUserId: viewer,
      mode: ContactMode.NEUTRAL,
      shareLivePositions: true,
    });
    expect(
      (
        await app.get(StarmapVisibilityService).listSharedLivePositions(viewer)
      ).map((ship) => ship.spacecraftId),
    ).toContain(scene.id);
    await db.manager.update(Spacecraft, scene.id, {
      alertState: AlertState.RED,
    });
    await hide();
    const reaction = app.get(AlertReactionService);
    await reaction.afterTransition({
      leader: observer,
      participants: [observer],
      coordinate: { x: 1, y: 1 },
    } as any);
    await reaction.afterTransition({
      leader: scene,
      participants: [scene],
      coordinate: { x: 1, y: 1 },
    } as any);
    expect(battle.resolve).not.toHaveBeenCalled();
    const location = await db.manager.findOneOrFail(SpaceLocation, {
      where: { id: scene.locationId },
      relations: ['galaxyField'],
    });
    expect(
      (
        await app
          .get(StarmapVisibilityService)
          .listContacts(admin, location.galaxyField!.layerId)
      ).contacts,
    ).toEqual([]);
    expect(
      (
        await app.get(StarmapVisibilityService).listSharedLivePositions(viewer)
      ).map((ship) => ship.spacecraftId),
    ).not.toContain(scene.id);
  });
  it('filters real gateway events for hidden spacecraft without exposing their IDs', async () => {
    await hide();
    const realGateway = new GameGateway(jwt, db);
    const emit = jest.fn();
    realGateway.server = { to: () => ({ emit }), emit } as any;
    for (const event of [
      WsEventType.SHIP_MOVED,
      WsEventType.SPACECRAFT_EVENT,
      WsEventType.DISTRESS_CHANGED,
    ]) {
      await realGateway.emitToUser(admin, event, { shipId: scene.id });
      await realGateway.emitToAll(event, { shipId: scene.id });
    }
    expect(emit).not.toHaveBeenCalled();
    await realGateway.emitToUser(viewer, WsEventType.SHIP_MOVED, {
      shipId: observer.id,
    });
    expect(emit).toHaveBeenCalledWith(WsEventType.SHIP_MOVED, {
      shipId: observer.id,
    });
  });
  it('rejects stale hidden participants at the real battle resolver before executing combat', async () => {
    await hide();
    const engine = { resolveBattle: jest.fn() };
    const resolver = new BattleResolverService(
      db.getRepository(SpacecraftModule),
      engine as any,
      gateway as any,
      {} as any,
      {} as any,
      {} as any,
      { prepare: jest.fn(async () => []) } as any,
      app.get(RpgActionLockService),
    );
    await expect(
      resolver.resolve({
        attackers: [observer],
        defenders: [scene],
        initiatorShipId: observer.id,
        targetShipId: scene.id,
        attackerUserId: viewer,
        defenderUserId: admin,
      }),
    ).rejects.toThrow('Spacecraft not found');
    expect(engine.resolveBattle).not.toHaveBeenCalled();
    await scenes().setHidden(scene.id, admin, false);
  });
  it('rejects hiding during an admitted HTTP action, releases locks on success and rejection, and admits no hidden actions', async () => {
    await scenes().assign(scene.id, admin, plot.id);
    const service = app.get(SpacecraftService);
    const original = service.getNearby.bind(service);
    let started!: () => void, finish!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const handler = jest
      .spyOn(service, 'getNearby')
      .mockImplementationOnce(async (...args) => {
        started();
        await gate;
        return original(...args);
      });
    const action = request(`spacecraft/${scene.id}/nearby`, 'GET', admin);
    try {
      await entered;
      expect(
        (
          await request(
            `spacecraft/admin/rpg/${scene.id}/visibility`,
            'PATCH',
            admin,
            { hidden: true },
          )
        ).status,
      ).toBe(409);
      expect(
        (await db.manager.findOneByOrFail(Spacecraft, { id: scene.id }))
          .rpgHidden,
      ).toBe(false);
    } finally {
      finish();
    }
    expect((await action).status).toBe(200);
    handler.mockRestore();
    await scenes().setHidden(scene.id, admin, true);
    expect(
      (await request(`spacecraft/${scene.id}/nearby`, 'GET', admin)).status,
    ).toBe(404);
    await scenes().setHidden(scene.id, admin, false);
    expect(
      (await request(`spacecraft/${scene.id}/nearby`, 'GET', admin)).status,
    ).toBe(200);
  });
  it('preserves CLOAK, permits revealing after plot end and rejects revoked DB admin roles despite a valid admin token', async () => {
    const cloak = { active: true, integrity: 83 };
    await db.manager.update(Spacecraft, scene.id, {
      runtimeSystems: { ...scene.runtimeSystems, CLOAK: cloak },
    });
    await hide();
    expect(
      (await db.manager.findOneByOrFail(Spacecraft, { id: scene.id }))
        .runtimeSystems?.CLOAK,
    ).toEqual(cloak);
    await db.manager.update(RpgPlot, plot.id, { endedAt: new Date() });
    await scenes().setHidden(scene.id, admin, false);
    expect(
      (await db.manager.findOneByOrFail(Spacecraft, { id: scene.id }))
        .runtimeSystems?.CLOAK,
    ).toEqual(cloak);
    await expect(scenes().setHidden(scene.id, admin, true)).rejects.toThrow(
      'bereits beendet',
    );
    await scenes().remove(scene.id, admin);
    await db.manager.update(User, admin, { isAdmin: false });
    expect((await request('spacecraft/admin/rpg', 'GET', admin)).status).toBe(
      403,
    );
  });
  it('reserves handler connections while excess player requests wait without holding pool clients', async () => {
    const locks = app.get(RpgActionLockService);
    const size = db.options.poolSize ?? db.options.extra?.max ?? 10;
    const releases: Array<() => Promise<void>> = [];
    try {
      for (let i = 0; i < Math.floor((size - 1) / 2); i++)
        releases.push(await locks.acquirePlayer([scene.id]));
      let admitted = false;
      const waiting = locks.acquirePlayer([scene.id]).then((release) => {
        admitted = true;
        return release;
      });
      await db.query('SELECT 1');
      expect(admitted).toBe(false);
      await releases.pop()!();
      releases.push(await waiting);
    } finally {
      for (const release of releases) await release();
    }
    await scenes().assign(scene.id, admin, plot.id);
  });
  it('removes active tracker target IDs and public distress contacts and informs their prior audience', async () => {
    await db.manager.update(Spacecraft, observer.id, {
      runtimeSystems: {
        ...observer.runtimeSystems,
        TRACKER: {
          active: true,
          integrity: 100,
          targetId: scene.id,
          ticksRemaining: 3,
        },
      },
    });
    await db.manager.save(ShipDistressSignal, {
      spacecraftId: scene.id,
      ownerId: admin,
      message: 'Scene distress',
    });
    const communications = app.get(SpacecraftCommunicationService);
    expect(
      (await communications.listActiveDistress()).map(
        (signal) => signal.spacecraftId,
      ),
    ).toContain(scene.id);
    await hide();
    expect(
      (await communications.listActiveDistress()).map(
        (signal) => signal.spacecraftId,
      ),
    ).not.toContain(scene.id);
    expect(
      (await db.manager.findOneByOrFail(Spacecraft, { id: observer.id }))
        .runtimeSystems?.TRACKER,
    ).toMatchObject({ active: false, ticksRemaining: 0 });
    expect(
      (await db.manager.findOneByOrFail(Spacecraft, { id: observer.id }))
        .runtimeSystems?.TRACKER,
    ).not.toHaveProperty('targetId');
    expect(gateway.emitVisibilityToUser).toHaveBeenCalledWith(stranger, {
      type: 'REMOVED',
      shipId: scene.id,
    });
  });
  it('removes system orbit ships from colony management and system LSS counts', async () => {
    const field = await db.manager.findOneByOrFail(GalaxyField, {
      id: locations[0].galaxyFieldId!,
    });
    const system = await db.manager.save(StarSystem, {
      name: 'Scene system',
      layerId: field.layerId,
      cx: 1,
      cy: 1,
      systemTypeId: 1,
    });
    const orbit = await db.manager.save(SystemField, {
      starSystemId: system.id,
      sx: 1,
      sy: 1,
      fieldTypeId: 1,
    });
    const at = await db.manager.findOneByOrFail(SpaceLocation, {
      systemFieldId: orbit.id,
    });
    await db.manager.update(Spacecraft, scene.id, { locationId: at.id });
    await db.manager.update(Spacecraft, observer.id, { locationId: at.id });
    const colony = await db.manager.save(Colony, {
      name: 'Scene colony',
      userId: admin,
      starSystemId: system.id,
      systemFieldId: orbit.id,
      colonyClassId: 1,
      posX: 1,
      posY: 1,
    });
    await db.manager.save(ColonyChangeable, { colonyId: colony.id });
    const management = app.get(ColonyOrbitService);
    expect(
      JSON.stringify(await management.getManagement(colony.id, admin)),
    ).toContain('Secret scene');
    await hide();
    expect(
      JSON.stringify(await management.getManagement(colony.id, admin)),
    ).not.toContain('Secret scene');
    const map = await app
      .get(SpacecraftService)
      .getLocalMap(observer.id, viewer);
    expect(map.ships.map((ship) => ship.id)).not.toContain(scene.id);
    expect(map.overlays.signatures).toEqual(
      expect.arrayContaining([expect.objectContaining({ count: 1 })]),
    );
  });
});
