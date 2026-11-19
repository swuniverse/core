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
import type {
  AnomalyViewDto,
  ColonyEnvironmentScanDto,
  SpacecraftFieldContextDto,
} from '@swuniverse/shared';
import { AppModule } from '../../app.module';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { GameGateway } from '../websocket/game.gateway';
import { ALLIANCE_ASSET_STORAGE } from '../alliance/alliance-asset.port';
import { InMemoryAssetStorage } from '../alliance/testing/in-memory-asset-storage';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation, SpaceLocationKind } from '../starmap/entities/space-location.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { Colony } from '../colony/entities/colony.entity';
import { Anomaly } from './entities/anomaly.entity';
import { AnomalyType } from './entities/anomaly-type.entity';

const JWT_SECRET = 'anomaly-scan-http-integration-secret';
const ELLIPSE: AnomalyViewDto = {
  type: 'SUBSPACE_ELLIPSE',
  name: 'Subraumellipse',
  remainingTicks: 1,
};

describe('anomaly scan contracts (PostgreSQL, HTTP)', () => {
  let source: DataSource;
  let app: INestApplication;
  let ownerId: number;
  let shipClassId: number;
  let ellipseTypeId: number;
  const jwt = new JwtService({ secret: JWT_SECRET });

  beforeAll(async () => {
    const migrations = await connectIntegrationDatabase();
    await resetDatabase(migrations);
    await migrations.destroy();
    const imports: DynamicModule[] = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    );
    const core = imports.find((item) => item.module === TypeOrmModule)
      ?.imports?.[0] as DynamicModule | undefined;
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
      providers: [optionsProvider, { provide: ConfigService, useValue: config }],
    }).compile();
    const options = optionsModule.get<DataSourceOptions>('TypeOrmModuleOptions');
    await optionsModule.close();
    source = await new DataSource(options).initialize();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .overrideProvider(DataSource)
      .useValue(source)
      .overrideProvider(GameGateway)
      .useValue({ emitToUser: jest.fn(), emitToAll: jest.fn() })
      .overrideProvider(ALLIANCE_ASSET_STORAGE)
      .useValue(new InMemoryAssetStorage())
      .compile();
    app = module.createNestApplication({ logger: ['error'] });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) await source.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(source);
    ownerId = (await createUser(source)).id;
    shipClassId = (
      await source.getRepository(ShipClassDef).save({
        key: 'ANOMALY_SCOUT',
        name: 'Anomaly scout',
        category: 'SHIP',
        role: 'SCOUT',
        anomalyMass: 1,
      })
    ).id;
    ellipseTypeId = (
      await source.getRepository(AnomalyType).save({ key: 'SUBSPACE_ELLIPSE' })
    ).id;
  });

  async function get<T>(path: string): Promise<T> {
    const response = await fetch(`${await app.getUrl()}/api/${path}`, {
      headers: {
        Authorization: `Bearer ${jwt.sign({ sub: ownerId, username: 'pilot' })}`,
      },
    });
    expect(response.status).toBe(200);
    return (await response.json()) as T;
  }

  async function placeAnomaly(locationId: number, remainingTicks = 1) {
    await source
      .getRepository(Anomaly)
      .save({ typeId: ellipseTypeId, locationId, remainingTicks });
  }

  async function scoutAt(locationId: number) {
    const ship = await source.getRepository(Spacecraft).save({
      userId: ownerId,
      name: 'Scout',
      shipClassId,
      locationId,
      // Sensors start OFF like STU (sc-AUD-02); the local scan needs them running.
      runtimeSystems: {
        LONG_RANGE_SENSORS: { active: true, integrity: 100, cooldown: 0 },
        SHORT_RANGE_SENSORS: { active: true, integrity: 100, cooldown: 0 },
      },
    });
    await source.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'SENSORS',
      moduleType: 'Sensorphalanx',
    });
    return ship;
  }

  it('reports active anomalies in the galaxy local scan and the field context', async () => {
    const layer = await source
      .getRepository(Layer)
      .save({ name: 'Anomaly layer', width: 5, height: 5 });
    const fields = source.getRepository(GalaxyField);
    const here = await fields.save({ layerId: layer.id, cx: 2, cy: 2, fieldTypeId: 1 });
    const east = await fields.save({ layerId: layer.id, cx: 3, cy: 2, fieldTypeId: 1 });
    const west = await fields.save({ layerId: layer.id, cx: 1, cy: 2, fieldTypeId: 1 });
    const locations = source.getRepository(SpaceLocation);
    const hereLocation = await locations.findOneByOrFail({ galaxyFieldId: here.id });
    await placeAnomaly(hereLocation.id);
    await placeAnomaly((await locations.findOneByOrFail({ galaxyFieldId: east.id })).id);
    // An expired anomaly awaiting cleanup is not shown.
    await placeAnomaly((await locations.findOneByOrFail({ galaxyFieldId: west.id })).id, 0);
    const ship = await scoutAt(hereLocation.id);

    const map = await get<{ mode: string; fields: Array<{ cx: number; anomalies?: AnomalyViewDto[] }> }>(
      `spacecraft/${ship.id}/local-map`,
    );
    expect(map.mode).toBe('galaxy');
    expect(Object.fromEntries(map.fields.map((field) => [field.cx, field.anomalies]))).toEqual({
      1: [],
      2: [ELLIPSE],
      3: [ELLIPSE],
    });

    const context = await get<SpacecraftFieldContextDto>(`spacecraft/${ship.id}/field-context`);
    expect(context.anomalies).toEqual([ELLIPSE]);
  });

  it('reports active anomalies in the system local scan and the colony environment scan', async () => {
    const layer = await source
      .getRepository(Layer)
      .save({ name: 'System layer', width: 5, height: 5 });
    const system = await source.getRepository(StarSystem).save({
      name: 'Anomaly system',
      cx: 1,
      cy: 1,
      layerId: layer.id,
      systemTypeId: 1,
      maxX: 5,
      maxY: 5,
    });
    const fieldType = await source.getRepository(GalaxyFieldType).findOneByOrFail({});
    const locations = source.getRepository(SpaceLocation);
    const systemLocation = async (sx: number, sy: number) => {
      const field = await source
        .getRepository(SystemField)
        .save({ starSystemId: system.id, sx, sy, fieldTypeId: fieldType.id });
      const location =
        (await locations.findOneBy({ systemFieldId: field.id })) ??
        (await locations.save({ kind: SpaceLocationKind.SYSTEM_FIELD, systemFieldId: field.id }));
      return { field, location };
    };
    const colonyField = await systemLocation(2, 2);
    const anomalyField = await systemLocation(3, 3);
    await systemLocation(2, 3);
    await placeAnomaly(anomalyField.location.id);
    const ship = await scoutAt(colonyField.location.id);
    const colony = await source.getRepository(Colony).save({
      name: 'Anomaly colony',
      userId: ownerId,
      starSystemId: system.id,
      systemFieldId: colonyField.field.id,
      posX: 2,
      posY: 2,
      colonyClassId: 1,
    });

    const map = await get<{ mode: string; fields: Array<{ sx: number; sy: number; anomalies?: AnomalyViewDto[] }> }>(
      `spacecraft/${ship.id}/local-map`,
    );
    expect(map.mode).toBe('system');
    expect(map.fields.find((field) => field.sx === 3 && field.sy === 3)?.anomalies).toEqual([ELLIPSE]);
    expect(map.fields.find((field) => field.sx === 2 && field.sy === 2)?.anomalies).toEqual([]);

    const scan = await get<ColonyEnvironmentScanDto>(`colonies/${colony.id}/environment-scan`);
    expect(scan.anomalies).toEqual([{ ...ELLIPSE, x: 3, y: 3 }]);
  });
});
