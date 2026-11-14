import 'reflect-metadata';
import { INestApplication, ValidationPipe, type DynamicModule } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { LayerKnowledgeStatus } from '@swuniverse/shared';
import { AppModule } from '../../app.module';
import { connectIntegrationDatabase, createUser, resetDatabase } from '../../testing/integration/database';
import { GameGateway } from '../websocket/game.gateway';
import { Layer } from './entities/layer.entity';
import { LayerKnowledge } from './entities/layer-knowledge.entity';
import { StarSystem } from './entities/star-system.entity';
import { SystemExploration } from './entities/system-exploration.entity';
import { FactionZone, GalaxyField } from './entities/galaxy-field.entity';
import { GalaxyFieldType } from './entities/galaxy-field-type.entity';
import { LayerMapCycleService } from './layer-map-cycle.service';
import { ExplorationState, ExplorationLevel } from './entities/exploration-state.entity';
import { MapRegion } from './entities/map-region.entity';
import { SystemField } from './entities/system-field.entity';
import { CelestialObject, CelestialObjectType } from './entities/celestial-object.entity';
import { Wormhole } from './entities/wormhole.entity';
import { PlanetField, PlanetFieldLayer } from './entities/planet-field.entity';

const JWT_SECRET = 'layer-access-http-test-secret';

describe('Layer access through the authenticated production application (PostgreSQL, HTTP)', () => {
  let app: INestApplication;
  let source: DataSource;
  let userId: number;
  let known: Layer;
  let explored: Layer;
  let unknown: Layer;
  let hidden: Layer;
  const jwt = new JwtService({ secret: JWT_SECRET });

  beforeAll(async () => {
    const migrations = await connectIntegrationDatabase();
    await resetDatabase(migrations);
    await migrations.destroy();
    const imports: DynamicModule[] = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule);
    const databaseModule = imports.find((item) => item.module === TypeOrmModule);
    const core = databaseModule?.imports?.[0] as DynamicModule | undefined;
    const optionsProvider = core?.providers?.find((provider) =>
      typeof provider === 'object' && 'provide' in provider && provider.provide === 'TypeOrmModuleOptions',
    );
    if (!optionsProvider) throw new Error('Production datasource configuration missing');
    const config = {
      get: (key: string) => ({
        DATABASE_URL: process.env.INTEGRATION_DATABASE_URL,
        JWT_SECRET,
        NODE_ENV: 'production',
        EMAIL_BLOCKLIST_PEPPER: 'integration-pepper',
        GAME_TIMEZONE: 'UTC',
      })[key],
    };
    const optionsModule = await Test.createTestingModule({ providers: [
      optionsProvider, { provide: ConfigService, useValue: config },
    ] }).compile();
    const options = optionsModule.get<DataSourceOptions>('TypeOrmModuleOptions');
    expect(options.synchronize).toBe(false);
    await optionsModule.close();
    source = await new DataSource(options).initialize();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService).useValue(config)
      .overrideProvider(DataSource).useValue(source)
      .overrideProvider(GameGateway).useValue({ emitToUser: jest.fn(), emitToAll: jest.fn() })
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
    userId = (await createUser(source)).id;
    [known, explored, unknown, hidden] = await source.getRepository(Layer).save([
      { name: 'Known', width: 5, height: 5, isHidden: false },
      { name: 'Explored', width: 5, height: 5, isHidden: false },
      { name: 'Unknown', width: 5, height: 5, isHidden: false },
      { name: 'Hidden known', width: 5, height: 5, isHidden: true },
    ]);
    await source.getRepository(LayerKnowledge).save([
      { userId, layerId: known.id, status: LayerKnowledgeStatus.KNOWN, knownAt: new Date() },
      { userId, layerId: explored.id, status: LayerKnowledgeStatus.EXPLORED, knownAt: new Date(), exploredAt: new Date() },
      { userId, layerId: hidden.id, status: LayerKnowledgeStatus.KNOWN, knownAt: new Date() },
    ]);
  });

  async function request(path: string, role: 'player' | 'admin' | 'editor' = 'player') {
    return fetch(`${await app.getUrl()}/api/${path}`, {
      headers: { Authorization: `Bearer ${jwt.sign({
        sub: userId, username: 'layer-reader', faction: 'REBEL_ALLIANCE',
        isAdmin: role === 'admin', permissions: role === 'editor' ? ['MAP_EDITOR'] : [],
      })}` },
    });
  }

  const layerEndpoints = [
    'fields', 'sectors', 'sectors/0/0', 'systems', 'hyperspace-routes',
    'wormholes', 'exploration', 'explored-sector/0/0', 'influence/0/0', 'export.json',
  ];

  it.each(layerEndpoints)('rejects unknown layer access with HTTP 403: %s', async (endpoint) => {
    const response = await request(`starmap/layers/${unknown.id}/${endpoint}`);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ message: 'Layer not known' });
  });

  it.each(['starmap/systems', 'starmap/systems-grid', 'database/systems', 'starmap/regions', 'discover-field'])(
    'rejects indirect access to an unknown layer even with personal exploration: %s', async (endpoint) => {
      const system = await source.getRepository(StarSystem).save({ name: 'Indirect secret', layerId: unknown.id, cx: 1, cy: 1, systemTypeId: 1049 });
      await source.getRepository(SystemExploration).save({ userId, starSystemId: system.id, discoveredAt: new Date() });
      const region = await source.getRepository(MapRegion).save({ layerId: unknown.id, name: 'Indirect region' });
      await source.getRepository(GalaxyField).save({ layerId: unknown.id, cx: 1, cy: 1, fieldTypeId: 1, starSystemId: system.id, regionId: region.id });
      await source.getRepository(ExplorationState).save({ userId, layerId: unknown.id, cx: 1, cy: 1, explorationLevel: ExplorationLevel.FULL });
      const response = endpoint === 'discover-field'
        ? await fetch(`${await app.getUrl()}/api/starmap/exploration/discover-field`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ sub: userId, username: 'reader' })}` },
          body: JSON.stringify({ layerId: unknown.id, cx: 2, cy: 2 }),
        })
        : await request(endpoint === 'starmap/regions' ? `${endpoint}/${region.id}`
          : endpoint === 'starmap/systems-grid' ? `starmap/systems/${system.id}/grid` : `${endpoint}/${system.id}`);
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ message: 'Layer not known' });
    },
  );

  async function planetSurfaceFixture(layer: Layer) {
    const system = await source.getRepository(StarSystem).save({ layerId: layer.id, name: 'Surface parent', cx: 1, cy: 1, systemTypeId: 1049 });
    const planet = await source.getRepository(CelestialObject).save({
      systemId: system.id, objectType: CelestialObjectType.PLANET, classId: 90010,
      name: 'Surface planet', description: 'Populated planet details', posX: 1, posY: 1,
      surfaceWidth: 1, surfaceHeight: 1,
    });
    await source.getRepository(PlanetField).save([
      { celestialObjectId: planet.id, fieldLayer: PlanetFieldLayer.ORBIT, px: 1, py: 1, fieldType: 1, terrainTileId: 101 },
      { celestialObjectId: planet.id, fieldLayer: PlanetFieldLayer.SURFACE, px: 1, py: 1, fieldType: 2, terrainTileId: 202 },
      { celestialObjectId: planet.id, fieldLayer: PlanetFieldLayer.UNDERGROUND, px: 1, py: 1, fieldType: 3, terrainTileId: 303 },
    ]);
    return planet;
  }

  it.each(['unknown', 'hidden'] as const)('denies populated planet surface reads in a %s layer', async (visibility) => {
    const planet = await planetSurfaceFixture(visibility === 'unknown' ? unknown : hidden);
    const response = await request(`starmap/planets/${planet.id}/surface`);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ message: 'Layer not known' });
  });

  it.each(['player', 'admin', 'editor'] as const)('retains populated planet surface access for %s', async (role) => {
    for (const layer of role === 'player' ? [known] : [unknown, hidden]) {
      const planet = await planetSurfaceFixture(layer);
      const response = await request(`starmap/planets/${planet.id}/surface`, role);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        celestialObject: { id: planet.id, name: 'Surface planet', description: 'Populated planet details', classId: 90010 },
        orbit: [{ celestialObjectId: planet.id, fieldLayer: 'ORBIT', px: 1, py: 1, terrainTileId: 101 }],
        surface: [{ celestialObjectId: planet.id, fieldLayer: 'SURFACE', px: 1, py: 1, terrainTileId: 202 }],
        underground: [{ celestialObjectId: planet.id, fieldLayer: 'UNDERGROUND', px: 1, py: 1, terrainTileId: 303 }],
      });
    }
  });

  it('retains planet surface authentication, invalid ID and missing object responses', async () => {
    const planet = await planetSurfaceFixture(known);
    expect((await fetch(`${await app.getUrl()}/api/starmap/planets/${planet.id}/surface`)).status).toBe(401);
    expect((await request('starmap/planets/not-an-id/surface')).status).toBe(400);
    const missing = await request('starmap/planets/2147483647/surface');
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ message: 'Celestial object not found' });
  });

  it('rejects the indirect starmap contacts layer query', async () => {
    const response = await request(`spacecraft/starmap-contacts?layerId=${unknown.id}`);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ message: 'Layer not known' });
  });

  it.each(['systems', 'system-types', 'planet-types'])('filters database layer choices and rejects explicit unknown IDs: %s', async (endpoint) => {
    const response = await request(`database/${endpoint}`);
    expect(response.status).toBe(200);
    const data = await response.json() as { layers: Array<{ id: number; name: string }> };
    expect(data.layers.map((layer) => layer.name)).toEqual(['Known', 'Explored']);
    const rejected = await request(`database/${endpoint}?layerId=${unknown.id}`);
    expect(rejected.status).toBe(403);
    expect(await rejected.json()).toMatchObject({ message: 'Layer not known' });
    expect((await request(`database/${endpoint}?layerId=${hidden.id}`)).status).toBe(403);
  });

  it('returns real KNOWN layer data while excluding unknown and hidden database objects', async () => {
    for (const [layer, typeId, classId] of [[known, 1049, 90010], [unknown, 1050, 90020], [hidden, 1051, 90030]] as const) {
      const system = await source.getRepository(StarSystem).save({ name: `${layer.name} system`, layerId: layer.id, cx: 1, cy: 1, systemTypeId: typeId, maxX: 1, maxY: 1 });
      await source.getRepository(SystemExploration).save({ userId, starSystemId: system.id, discoveredAt: new Date() });
      await source.getRepository(CelestialObject).save({ systemId: system.id, objectType: CelestialObjectType.PLANET, classId, posX: 1, posY: 1, swuRotation: 'rotating' });
      if (layer.id === known.id) {
        await source.getRepository(SystemField).save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId: 1 });
        await source.getRepository(GalaxyField).save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: 1, starSystemId: system.id });
        await source.getRepository(ExplorationState).save({ userId, layerId: layer.id, cx: 1, cy: 1, explorationLevel: ExplorationLevel.FULL });
        for (const path of [`starmap/systems/${system.id}`, `starmap/systems/${system.id}/grid`, `database/systems/${system.id}`]) {
          expect((await request(path)).status).toBe(200);
        }
      }
    }
    const fields = await request(`starmap/layers/${known.id}/fields`);
    expect(fields.status).toBe(200);
    expect(await fields.json()).toMatchObject([{ cx: 1, cy: 1, starSystem: { name: 'Known system' } }]);
    const catalog = await request('database/systems');
    expect(await catalog.json()).toMatchObject({ layers: [{ name: 'Known', entries: [{ name: 'Known system' }] }, { name: 'Explored', entries: [] }] });
    const types = await request('database/system-types');
    expect(await types.json()).toMatchObject({ total: 1, entries: [{ systemTypeId: 1049 }] });
    const planets = await request('database/planet-types');
    expect(await planets.json()).toMatchObject({ total: 1, entries: [{ classId: 90010 }] });
    for (const endpoint of ['systems', 'system-types', 'planet-types']) {
      const empty = await request(`database/${endpoint}?layerId=${explored.id}`);
      expect(empty.status).toBe(200);
      expect(await empty.json()).toMatchObject(endpoint === 'systems' ? { layers: [{ id: explored.id, entries: [] }] } : { total: 0, entries: [] });
    }
  });

  it.each(layerEndpoints)('accepts KNOWN without EXPLORED: %s', async (endpoint) => {
    expect((await request(`starmap/layers/${known.id}/${endpoint}`)).status).toBe(200);
  });

  it.each(layerEndpoints)('denies hidden layers even when personally known: %s', async (endpoint) => {
    expect((await request(`starmap/layers/${hidden.id}/${endpoint}`)).status).toBe(403);
  });

  it.each(['admin', 'editor'] as const)('retains %s access without layer knowledge', async (role) => {
    for (const endpoint of layerEndpoints) {
      expect((await request(`starmap/layers/${unknown.id}/${endpoint}`, role)).status).toBe(200);
    }
    for (const endpoint of ['systems', 'system-types', 'planet-types']) {
      const response = await request(`database/${endpoint}?layerId=${unknown.id}`, role);
      expect(response.status).toBe(200);
      const catalog = await request(`database/${endpoint}`, role);
      expect(await catalog.json()).toMatchObject({ layers: [{ name: 'Known' }, { name: 'Explored' }, { name: 'Unknown' }] });
    }
    expect((await request(`spacecraft/starmap-contacts?layerId=${unknown.id}`, role)).status).toBe(200);
    const system = await source.getRepository(StarSystem).save({ layerId: unknown.id, name: 'Role system', cx: 1, cy: 1, systemTypeId: 1049, maxX: 1, maxY: 1 });
    await source.getRepository(SystemField).save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId: 1 });
    for (const path of [`starmap/systems/${system.id}`, `starmap/systems/${system.id}/grid`]) {
      expect((await request(path, role)).status).toBe(200);
    }
    await source.getRepository(SystemExploration).save({ userId, starSystemId: system.id, discoveredAt: new Date() });
    expect((await request(`database/systems/${system.id}`, role)).status).toBe(200);
    const region = await source.getRepository(MapRegion).save({ layerId: unknown.id, name: 'Role region' });
    await source.getRepository(GalaxyField).save({ layerId: unknown.id, cx: 1, cy: 1, fieldTypeId: 1, regionId: region.id });
    await source.getRepository(ExplorationState).save({ userId, layerId: unknown.id, cx: 1, cy: 1, explorationLevel: ExplorationLevel.FULL });
    expect((await request(`starmap/regions/${region.id}`, role)).status).toBe(200);
    const discovered = await fetch(`${await app.getUrl()}/api/starmap/exploration/discover-field`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ sub: userId, username: 'reader', isAdmin: role === 'admin', permissions: role === 'editor' ? ['MAP_EDITOR'] : [] })}` },
      body: JSON.stringify({ layerId: unknown.id, cx: 1, cy: 1 }),
    });
    expect(discovered.status).toBe(201);
    const choices = await request('starmap/layers', role);
    expect(await choices.json()).toMatchObject([{ name: 'Known' }, { name: 'Explored' }, { name: 'Unknown' }]);
    const hole = await source.getRepository(Wormhole).save({ entryLayerId: hidden.id, entryCx: 1, entryCy: 1, exitLayerId: known.id, exitCx: 1, exitCy: 1 });
    const adminRoute = await request(`starmap/admin/layers/${hidden.id}/wormholes`, role);
    expect(adminRoute.status).toBe(200);
    expect(await adminRoute.json()).toMatchObject([{ id: hole.id }]);
  });

  it('reads current personal knowledge on every request and returns no fallback layers', async () => {
    expect((await request(`starmap/layers/${known.id}/fields`)).status).toBe(200);
    const system = await source.getRepository(StarSystem).save({ layerId: known.id, name: 'No fallback', cx: 1, cy: 1, systemTypeId: 1049 });
    await source.getRepository(CelestialObject).save({ systemId: system.id, objectType: CelestialObjectType.PLANET, classId: 90010, posX: 1, posY: 1 });
    await source.getRepository(LayerKnowledge).delete({ userId });
    expect((await request(`starmap/layers/${known.id}/fields`)).status).toBe(403);
    expect(await (await request('starmap/layers')).json()).toEqual([]);
    for (const endpoint of ['systems', 'system-types', 'planet-types']) {
      expect(await (await request(`database/${endpoint}`)).json()).toMatchObject(endpoint === 'systems' ? { layers: [] } : { layers: [], total: 0, entries: [] });
    }
  });

  it('keeps authentication and malformed layer IDs enforced', async () => {
    expect((await fetch(`${await app.getUrl()}/api/starmap/layers/${known.id}/fields`)).status).toBe(401);
    expect((await request('starmap/layers/not-an-id/fields')).status).toBe(400);
    expect((await request('database/systems?layerId=not-an-id')).status).toBe(400);
  });

  it('shows every field of an EXPLORED layer after the real cycle deletes fog, without granting system discovery', async () => {
    const fieldType = await source.getRepository(GalaxyFieldType).findOneByOrFail({
      id: 1,
    });
    const system = await source.getRepository(StarSystem).save({
      layerId: explored.id,
      name: 'Undiscovered system',
      cx: 2,
      cy: 1,
      systemTypeId: 1049,
      maxX: 1,
      maxY: 1,
    });
    await source.getRepository(GalaxyField).save(
      Array.from({ length: 25 }, (_, index) => ({
        layerId: known.id,
        cx: index % 5 + 1,
        cy: Math.floor(index / 5) + 1,
        fieldTypeId: fieldType.id,
      })),
    );
    const fields = await source.getRepository(GalaxyField).save<Partial<GalaxyField>>([
      {
        layerId: explored.id,
        cx: 1,
        cy: 1,
        fieldTypeId: fieldType.id,
        factionZone: FactionZone.NEUTRAL,
        adminRegionKey: 'north-sector',
        effects: ['nebula'],
        passableOverride: false,
      },
      {
        layerId: explored.id,
        cx: 2,
        cy: 1,
        fieldTypeId: fieldType.id,
        factionZone: FactionZone.REBEL,
        systemTypeId: 1049,
        starSystemId: system.id,
        adminRegionKey: 'core-sector',
      },
    ]);
    const remainingFields = Array.from({ length: 23 }, (_, index) => {
      const cell = index < 3
        ? { cx: index + 3, cy: 1 }
        : { cx: (index - 3) % 5 + 1, cy: Math.floor((index - 3) / 5) + 2 };
      return { layerId: explored.id, ...cell, fieldTypeId: fieldType.id };
    });
    await source.getRepository(GalaxyField).save(remainingFields);
    await source.getRepository(ExplorationState).save([
      {
        userId,
        layerId: known.id,
        cx: 1,
        cy: 1,
        explorationLevel: ExplorationLevel.TERRAIN,
      },
    ]);
    await source.getRepository(SystemField).save({
      starSystemId: system.id,
      sx: 1,
      sy: 1,
      fieldTypeId: fieldType.id,
    });
    await source.getRepository(LayerKnowledge).update(
      { userId, layerId: explored.id },
      { status: LayerKnowledgeStatus.KNOWN, exploredAt: null },
    );
    await source.getRepository(ExplorationState).save([
      ...fields.map(({ cx, cy }) => ({
        userId,
        layerId: explored.id,
        cx,
        cy,
        explorationLevel: ExplorationLevel.FULL,
      })),
      ...remainingFields.map(({ cx, cy }) => ({
        userId,
        layerId: explored.id,
        cx,
        cy,
        explorationLevel: ExplorationLevel.FULL,
      })),
    ]);
    const cycle = app.get(LayerMapCycleService);

    await expect(cycle.run(new Date())).resolves.toBe('1 Ebene vollständig erkundet');
    await expect(
      source.getRepository(ExplorationState).countBy({ userId, layerId: explored.id }),
    ).resolves.toBe(0);
    await expect(
      source.getRepository(LayerKnowledge).findOneByOrFail({ userId, layerId: explored.id }),
    ).resolves.toMatchObject({ status: LayerKnowledgeStatus.EXPLORED });
    const refreshedExplorationRows = await request(`starmap/layers/${explored.id}/exploration`);
    expect(refreshedExplorationRows.status).toBe(200);
    expect(await refreshedExplorationRows.json()).toEqual([]);

    const completeFields = await request(`starmap/layers/${explored.id}/fields`);
    expect(completeFields.status).toBe(200);
    const completeFieldData = await completeFields.json() as Array<{
      id: number;
      cx: number;
      cy: number;
      factionZone: string;
      adminRegionKey: string | null;
      effects: string[] | null;
      passableOverride: boolean | null;
      systemTypeId: number | null;
      starSystemId: number | null;
      starSystem: { name: string } | null;
    }>;
    expect(completeFieldData).toHaveLength(25);
    expect(completeFieldData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: fields[0].id,
          cx: 1,
          cy: 1,
          factionZone: 'NEUTRAL',
          adminRegionKey: 'north-sector',
          effects: ['nebula'],
          passableOverride: false,
        }),
        expect.objectContaining({
          id: fields[1].id,
          cx: 2,
          cy: 1,
          systemTypeId: 1049,
          starSystemId: system.id,
          starSystem: expect.objectContaining({ name: 'Undiscovered system' }),
        }),
      ]),
    );

    const knownFields = await request(`starmap/layers/${known.id}/fields`);
    expect(knownFields.status).toBe(200);
    const knownFieldData = await knownFields.json() as Array<{ cx: number; cy: number }>;
    expect(knownFieldData.map(({ cx, cy }) => [cx, cy])).toEqual([[1, 1]]);
    const knownSector = await request(`starmap/layers/${known.id}/explored-sector/0/0`);
    expect(knownSector.status).toBe(200);
    expect(await knownSector.json()).toMatchObject({ hiddenCount: 24 });

    const layerSectors = await request(`starmap/layers/${explored.id}/sectors`);
    expect(layerSectors.status).toBe(200);
    expect(await layerSectors.json()).toMatchObject([
      { exploredCount: 25, totalCount: 25, explorationPercent: 100 },
    ]);
    const exported = await request(`starmap/layers/${explored.id}/export.json`);
    expect(exported.status).toBe(200);
    const exportedData = await exported.json() as {
      fields: Array<{
        cx: number;
        cy: number;
        starSystem: { id: number; name: string } | null;
      }>;
    };
    const exportedFields = exportedData.fields;
    expect(exportedFields).toHaveLength(25);
    expect(exportedFields.find(({ cx, cy }) => cx === 1 && cy === 1)?.starSystem).toBeNull();
    expect(
      exportedFields.find(({ cx, cy }) => cx === 2 && cy === 1)?.starSystem,
    ).toMatchObject({
      id: system.id,
      name: 'Undiscovered system',
    });
    const listedSystems = await request(`starmap/layers/${explored.id}/systems`);
    expect(listedSystems.status).toBe(200);
    expect(await listedSystems.json()).toEqual([]);

    const completeSector = await request(`starmap/layers/${explored.id}/sectors/0/0`);
    expect(completeSector.status).toBe(200);
    const completeSectorData: unknown = await completeSector.json();
    expect(completeSectorData).toEqual(
      Array.from({ length: 25 }, () => expect.objectContaining({ explorationLevel: 'FULL' })),
    );
    const exploredSector = await request(`starmap/layers/${explored.id}/explored-sector/0/0`);
    expect(exploredSector.status).toBe(200);
    const exploredSectorData = await exploredSector.json() as {
      fields: Array<{ id: number; explorationLevel: string }>;
      hiddenCount: number;
    };
    expect(exploredSectorData.fields).toHaveLength(25);
    expect(
      exploredSectorData.fields.find(({ id }) => id === fields[0].id)?.explorationLevel,
    ).toBe('FULL');
    expect(
      exploredSectorData.fields.find(({ id }) => id === fields[1].id)?.explorationLevel,
    ).toBe('FULL');
    expect(exploredSectorData.hiddenCount).toBe(0);

    for (const path of [`starmap/systems/${system.id}`, `starmap/systems/${system.id}/grid`]) {
      expect((await request(path)).status).toBe(404);
    }
  });

  it('offers only known nonhidden layers to players, including KNOWN without EXPLORED', async () => {
    const response = await request('starmap/layers');
    expect(response.status).toBe(200);
    const layers = await response.json() as Array<{ id: number; name: string }>;
    expect(layers.map((layer) => layer.name)).toEqual(['Known', 'Explored']);
    expect(layers.map((layer) => layer.id)).not.toContain(unknown.id);
  });
});
