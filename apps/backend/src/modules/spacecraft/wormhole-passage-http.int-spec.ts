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
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { Wormhole } from '../starmap/entities/wormhole.entity';
import { Message } from '../messaging/entities/message.entity';
import { FlightSignature } from './entities/flight-signature.entity';
import { GameGateway } from '../websocket/game.gateway';

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
    const shipClass = await source
      .getRepository(ShipClassDef)
      .save({
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
    hole = await source
      .getRepository(Wormhole)
      .save({
        entryLayerId: entryLayer.id,
        entryCx: 1,
        entryCy: 1,
        exitLayerId: exitLayer.id,
        exitCx: 3,
        exitCy: 4,
      });
    ship = await source
      .getRepository(Spacecraft)
      .save({
        userId: owner.id,
        name: 'Authenticated passage',
        shipClassId: shipClass.id,
        locationId: origin.id,
        energy: 0,
        warpdrive: 7,
      });
    await source
      .getRepository(SpacecraftModule)
      .save({
        spacecraftId: ship.id,
        category: 'SUBLIGHT_DRIVE',
        moduleType: 'Impulse',
        isActive: false,
      });
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
