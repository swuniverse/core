import type { StarmapExportDto } from '@swuniverse/shared';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { StarmapController } from './starmap.controller';
import { StarmapService } from './starmap.service';
import { StarmapAdminService } from './starmap-admin.service';
import { StarmapQueryService } from './starmap-query.service';
import { ExplorationService } from './exploration.service';
import { InfluenceService } from './influence.service';
import { WormholeService } from './wormhole.service';
import { LayerAccessService } from './layer-access.service';
import { DataSource } from 'typeorm';
import { AddStarmapExportLimits20261104120000 } from '../../database/migrations/20261104120000-add-starmap-export-limits';

const fieldType = {
  id: 1, key: 'EMPTY_SPACE', name: 'Weltraum', colorKey: null,
  passable: true, energyCost: 1, damage: 0, isSystem: false,
};
const fields = [
  { id: 10, layerId: 3, cx: 2, cy: 4, fieldTypeId: 1, fieldType,
    starSystemId: 7, starSystem: { id: 7, name: 'Kessel', maxX: 20, maxY: 20 } },
  { id: 11, layerId: 3, cx: 5, cy: 8, fieldTypeId: 1, fieldType,
    starSystemId: 8, starSystem: { id: 8, name: 'Secret terrain system' } },
  { id: 12, layerId: 3, cx: 9, cy: 9, fieldTypeId: 1, fieldType,
    starSystemId: 9, starSystem: { id: 9, name: 'Unexplored secret' } },
  { id: 13, layerId: 4, cx: 2, cy: 4, fieldTypeId: 1, fieldType,
    starSystemId: 10, starSystem: { id: 10, name: 'Other layer secret' } },
];
const states = [
  { userId: 42, layerId: 3, cx: 2, cy: 4, explorationLevel: 'FULL' },
  { userId: 42, layerId: 3, cx: 5, cy: 8, explorationLevel: 'TERRAIN' },
  { userId: 99, layerId: 3, cx: 9, cy: 9, explorationLevel: 'FULL' },
];
// Only persistence is substituted; the HTTP controller and fog projection are real.
const repository = (rows: Record<string, unknown>[] = []) => ({
  find: async ({ where = {} } = {}) => rows.filter((row) =>
    Object.entries(where).every(([key, value]) => row[key] === value)),
  findOneBy: async (where: Record<string, unknown>) => rows.find((row) =>
    Object.entries(where).every(([key, value]) => row[key] === value)),
});

describe('Personal starmap export HTTP API', () => {
  let app: INestApplication;
  let baseUrl: string;
  let db: DataSource;
  const schema = `starmap_export_${process.pid}`;

  beforeAll(async () => {
    db = await new DataSource({ type: 'postgres', url: process.env.INTEGRATION_DATABASE_URL, extra: { options: `-c search_path=${schema}` } }).initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.query('CREATE TABLE users (id integer PRIMARY KEY)');
    await db.query('CREATE TABLE layers (id integer PRIMARY KEY)');
    await db.query('INSERT INTO users (id) VALUES (42), (55), (56), (99)');
    await db.query('INSERT INTO layers (id) VALUES (3), (4)');
    const runner = db.createQueryRunner();
    await new AddStarmapExportLimits20261104120000().up(runner);
    await runner.release();
    const exploration = new ExplorationService(repository(states) as never, repository() as never);
    const query = new StarmapQueryService(
      repository([
        { id: 3, name: 'Galaxis', width: 100, height: 100, sectorSize: 20 },
        { id: 4, name: 'Other layer', width: 50, height: 50, sectorSize: 10 },
      ]) as never,
      repository(fields) as never, repository() as never, repository() as never,
      repository() as never, repository() as never,
      repository([
        { id: 70, userId: 99, name: 'Outpost', starSystemId: 9, starSystem: { id: 9, layerId: 3, cx: 9, cy: 9 } },
        { id: 71, userId: 42, name: 'Foreign colony', starSystemId: 9, starSystem: { id: 9, layerId: 3, cx: 9, cy: 9 } },
        { id: 72, userId: 99, name: 'Other layer colony', starSystemId: 10, starSystem: { id: 10, layerId: 4, cx: 9, cy: 9 } },
        { id: 73, userId: 99, name: 'Outside explored extent', starSystemId: 7, starSystem: { id: 7, layerId: 3, cx: 2, cy: 4 } },
        { id: 74, userId: 99, name: 'Ruins', starSystemId: null, starSystem: null },
      ]) as never, db, undefined, { load: async () => new Map() } as never,
    );
    const module = await Test.createTestingModule({
      controllers: [StarmapController],
      providers: [
        { provide: StarmapService, useValue: {} },
        { provide: StarmapAdminService, useValue: {} },
        { provide: StarmapQueryService, useValue: query },
        { provide: ExplorationService, useValue: exploration },
        { provide: InfluenceService, useValue: {} },
        { provide: WormholeService, useValue: {} },
        { provide: LayerAccessService, useValue: new LayerAccessService({} as never, {} as never, {} as never, {} as never, {} as never) },
      ],
    }).overrideGuard(AuthGuard('jwt')).useValue({
      canActivate: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        if (!req.headers['x-test-user']) return false;
        req.user = { sub: Number(req.headers['x-test-user']), isAdmin: true, permissions: ['MAP_EDITOR'] };
        return true;
      },
    }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  beforeEach(async () => { await db.query('DELETE FROM starmap_export_limits'); });

  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });

  it('requires authentication and validates the layer parameter', async () => {
    expect((await fetch(`${baseUrl}/starmap/layers/3/export.json`)).status).toBe(403);
    expect((await fetch(`${baseUrl}/starmap/layers/not-a-number/export.json`, {
      headers: { 'x-test-user': '42' },
    })).status).toBe(400);
    expect((await fetch(`${baseUrl}/starmap/layers/999/export.json`, {
      headers: { 'x-test-user': '42' },
    })).status).toBe(404);
  });

  it('includes only own colonies on explored fields of this layer', async () => {
    const response = await fetch(`${baseUrl}/starmap/layers/3/export.json`, {
      headers: { 'x-test-user': '99' },
    });
    expect(response.status).toBe(200);
    const data = await response.json() as StarmapExportDto;
    expect(data.colonies).toEqual([{ id: 70, name: 'Outpost', cx: 9, cy: 9 }]);
    expect(data.fields).toHaveLength(1);
  });

  it('allows one export per minute per user and layer, including concurrent requests', async () => {
    const request = (userId: number, layerId = 3) => fetch(`${baseUrl}/starmap/layers/${layerId}/export.json`, {
      headers: { 'x-test-user': String(userId) },
    });
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    try {
      const responses = await Promise.all([request(55), request(55)]);
      expect(responses.map((response) => response.status).sort()).toEqual([200, 429]);
      // A separately constructed query service shares the same durable budget.
      const otherInstance = new StarmapQueryService(
        repository([{ id: 3 }]) as never,
        repository() as never, repository() as never, repository() as never,
        repository() as never, repository() as never, repository() as never,
        db,
      );
      await expect(otherInstance.exportExploredLayer(55, 3,
        new ExplorationService(repository() as never, repository() as never),
      )).rejects.toMatchObject({ status: 429 });
      expect((await request(56)).status).toBe(200);
      expect((await request(55, 4)).status).toBe(200);
      now.mockReturnValue(1_800_000_060_000);
      expect((await request(55)).status).toBe(200);
    } finally {
      now.mockRestore();
    }
  });

  it('exports only personal explored coordinates and FULL-only system identity, even for map editors', async () => {
    const response = await fetch(`${baseUrl}/starmap/layers/3/export.json`, {
      headers: { 'x-test-user': '42' },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      version: 1,
      exportedAt: expect.any(String),
      layer: { id: 3, name: 'Galaxis', width: 100, height: 100, sectorSize: 20 },
      fields: [
        { cx: 2, cy: 4, fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Weltraum' }, starSystem: { id: 7, name: 'Kessel' } },
        { cx: 5, cy: 8, fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Weltraum' }, starSystem: null },
      ],
      colonies: [],
    });
  });
});
