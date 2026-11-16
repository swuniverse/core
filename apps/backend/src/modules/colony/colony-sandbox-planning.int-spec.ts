import 'reflect-metadata';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import type {
  ColonySandboxDto,
  ColonySandboxOptionsDto,
} from '@swuniverse/shared';
import { ColonySandboxController } from './colony-sandbox.controller';
import { ColonySandboxPlanningService } from './colony-sandbox-planning.service';
import { ColonySandboxService } from './colony-sandbox.service';
import { ColonyConstructionService } from './colony-construction.service';
import { ColonyBuildingManagementService } from './colony-building-management.service';
import { ColonyStatsService } from './colony-stats.service';
import { ColonyBuildingEffectsService } from './colony-building-effects.service';
import { ColonyFunctionManagerService } from './colony-function-manager.service';
import { ColonySandbox } from './entities/colony-sandbox.entity';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { Message } from '../messaging/entities/message.entity';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';

/** Real migration-built PostgreSQL and HTTP validation; test guard supplies a player identity. */
describe('sandbox planning HTTP (PostgreSQL)', () => {
  let source: DataSource;
  let app: INestApplication;
  let baseUrl: string;
  let ownerId: number;
  let otherId: number;
  let colonyId: number;
  let sandboxId: number;
  const definition = {
    id: 10,
    name: 'Generator',
    category: 'energy',
    isUnique: false,
    allowedFieldTypes: [101],
    costs: { buildTime: 999 },
    resourceCosts: [{ commodityId: 1, amount: 999 }],
    epsCost: 999,
    epsProc: 20,
    production: [],
    bonuses: { energy: 0, population: 0, storage: 0 },
    integrity: 100,
  };

  const http = async (
    method: 'GET' | 'POST',
    path: string,
    userId: number | undefined,
    body: unknown,
    status: number,
  ) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'x-test-user': String(userId) } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const result = (await response.json()) as ColonySandboxDto &
      ColonySandboxOptionsDto & {
        skipped: Array<{ fieldIndex: number; reason: string }>;
      };
    expect({
      status: response.status,
      ...(response.status !== status ? { body: result } : {}),
    }).toEqual({ status });
    return { body: result };
  };

  beforeAll(async () => {
    source = await connectIntegrationDatabase();
    const gameData = {
      getBuilding: (id: number) => (id === 10 ? definition : undefined),
      getAllBuildings: () => [definition],
      getFieldBuildRuleForFieldTypes: () => undefined,
      getBuildingFunctions: () => [],
      getCategoriesForTerrainTile: () => [],
      getColonyClass: () => ({ baseProduction: [] }),
      getCommodity: () => undefined,
      getBuildingUpgradesForBuilding: () => [],
      getAllTerraforming: () => [],
    };
    const unlocks = {
      hasTechByName: async () => true,
      isBuildingUnlocked: async () => true,
      hasTech: async () => true,
    };
    const stats = new ColonyStatsService(gameData as never);
    const effects = new ColonyBuildingEffectsService(
      gameData as never,
      new ColonyFunctionManagerService(gameData as never),
      stats,
    );
    const lifecycle = new Proxy(
      {},
      {
        get: () => () => {
          throw new Error('Live lifecycle must never run');
        },
      },
    );
    const rules = new ColonyConstructionService(
      source.getRepository(Colony),
      source.getRepository(ColonyField),
      {} as never,
      gameData as never,
      unlocks as never,
      stats,
      {} as never,
      lifecycle as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      effects,
    );
    const management = new ColonyBuildingManagementService(
      source.getRepository(ColonyField),
      gameData as never,
      lifecycle as never,
      stats,
      {} as never,
      effects,
    );
    const sandboxes = new ColonySandboxService(
      source.getRepository(ColonySandbox),
      source,
      { get: () => 3 } as never,
      unlocks as never,
    );
    const planning = new ColonySandboxPlanningService(
      source,
      sandboxes,
      rules,
      gameData as never,
      management,
      unlocks as never,
    );
    const module = await Test.createTestingModule({
      controllers: [ColonySandboxController],
      providers: [
        { provide: ColonySandboxService, useValue: sandboxes },
        { provide: ColonySandboxPlanningService, useValue: planning },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          const id = Number(req.headers['x-test-user']);
          if (!id) throw new UnauthorizedException();
          req.user = { sub: id };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    await source?.destroy();
  });
  beforeEach(async () => {
    await resetDatabase(source);
    ownerId = (await createUser(source)).id;
    otherId = (await createUser(source)).id;
    colonyId = (
      await source.getRepository(Colony).save({
        userId: ownerId,
        name: 'Naboo',
        colonyClassId: 1,
        energy: 0,
        population: 10,
      })
    ).id;
    await source.getRepository(ColonyField).save(
      [20, 21, 22, 23].map((fieldIndex) => ({
        colonyId,
        fieldIndex,
        fieldType: 101,
        layer: 'SURFACE',
        buildingId: null,
        isActive: false,
      })),
    );
    const result = await http(
      'POST',
      `/colonies/${colonyId}/sandboxes`,
      ownerId,
      { name: 'Plan' },
      201,
    );
    sandboxId = result.body.id;
  });

  const actionUrl = () => `/colonies/sandboxes/${sandboxId}/actions`;

  it('validates payloads and rejects anonymous/foreign owners before changing snapshots', async () => {
    await http(
      'POST',
      actionUrl(),
      undefined,
      { action: 'build', fieldIndex: 20, buildingId: 10 },
      401,
    );
    await http(
      'POST',
      actionUrl(),
      otherId,
      { action: 'build', fieldIndex: 20, buildingId: 10 },
      404,
    );
    for (const body of [
      { action: 'build', fieldIndex: 20 },
      { action: 'unknown' },
      { action: 'toggle', fieldIndex: -1 },
      { action: 'mass-toggle', mode: 2 },
      { action: 'mass-toggle', mode: 2, activate: 'false' },
      { action: 'build', fieldIndex: 20, buildingId: 10, activate: null },
    ]) {
      await http('POST', actionUrl(), ownerId, body, 400);
    }
    const sandbox = await source
      .getRepository(ColonySandbox)
      .findOneByOrFail({ id: sandboxId });
    expect(
      sandbox.snapshot.fields.every((field) => field.buildingId === null),
    ).toBe(true);
  });

  it('serializes parallel edits without lost fields and keeps live resources/fields/messages untouched', async () => {
    const colony = await source
      .getRepository(Colony)
      .findOneByOrFail({ id: colonyId });
    const fields = await source
      .getRepository(ColonyField)
      .find({ where: { colonyId }, order: { fieldIndex: 'ASC' } });
    await Promise.all(
      [20, 21, 22, 23].map((fieldIndex) =>
        http(
          'POST',
          actionUrl(),
          ownerId,
          { action: 'build', fieldIndex, buildingId: 10 },
          201,
        ),
      ),
    );
    const sandbox = await source
      .getRepository(ColonySandbox)
      .findOneByOrFail({ id: sandboxId });
    expect(
      sandbox.snapshot.fields.every(
        (field) =>
          field.buildingId === 10 &&
          !field.isBuilding &&
          field.isActive &&
          field.buildFinishesAt === null,
      ),
    ).toBe(true);
    expect(sandbox.snapshot.energy).toBe(0);
    expect(
      await source.getRepository(Colony).findOneByOrFail({ id: colonyId }),
    ).toEqual(colony);
    expect(
      await source
        .getRepository(ColonyField)
        .find({ where: { colonyId }, order: { fieldIndex: 'ASC' } }),
    ).toEqual(fields);
    expect(await source.getRepository(Message).count()).toBe(0);
  });

  it('returns eligible field options and persists mass switches only in the copy', async () => {
    const options = await http(
      'GET',
      `/colonies/sandboxes/${sandboxId}/fields/20/options`,
      ownerId,
      undefined,
      200,
    );
    expect(options.body).toEqual({
      buildingIds: [10],
      upgrades: [],
      terraformingIds: [],
    });
    await http(
      'POST',
      actionUrl(),
      ownerId,
      { action: 'build', fieldIndex: 20, buildingId: 10 },
      201,
    );
    const result = await http(
      'POST',
      actionUrl(),
      ownerId,
      {
        action: 'mass-toggle',
        mode: 2,
        fieldIndexes: [20],
        activate: false,
      },
      201,
    );
    expect(result.body.snapshot.fields[0].isActive).toBe(false);
    expect(result.body.skipped).toEqual([]);
    expect(
      (
        await source
          .getRepository(ColonyField)
          .findOneByOrFail({ colonyId, fieldIndex: 20 })
      ).buildingId,
    ).toBeNull();
  });
});
