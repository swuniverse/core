import path from 'node:path';
import { validate } from 'class-validator';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  ShuttleController,
  ShuttleLaunchRequest,
  ShuttleStoreRequest,
  ShuttleLandRequest,
} from './shuttle.controller';
import { ShuttleService } from './shuttle.service';
import { Spacecraft } from './entities/spacecraft.entity';
import { initializeSpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';
import { SpacecraftResourceFlowService } from './spacecraft-resource-flow.service';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { GameDataService } from '../game-data/game-data.service';

describe('Shuttle API and system', () => {
  it.each([0, -1, 1.5, '21401', null, 2147483648])(
    'rejects invalid IDs %j on every action',
    async (id) => {
      for (const [Class, field] of [
        [ShuttleLaunchRequest, 'commodityId'],
        [ShuttleStoreRequest, 'targetId'],
        [ShuttleLandRequest, 'colonyId'],
      ] as const)
        expect(
          await validate(Object.assign(new Class(), { [field]: id })),
        ).not.toHaveLength(0);
    },
  );
  it('authenticates the route and forwards only the authenticated owner', async () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ShuttleController),
    ).toHaveLength(1);
    const service = {
      get: jest.fn(),
      launch: jest.fn(),
      store: jest.fn(),
      land: jest.fn(),
    };
    const controller = new ShuttleController(
      service as unknown as ShuttleService,
    );
    const req = { user: { sub: 7 } };
    controller.get(9, req);
    controller.launch(9, req, { commodityId: 21401 });
    await controller.store(9, req, { targetId: 10 });
    await controller.land(9, req, { colonyId: 11 });
    expect(service.get).toHaveBeenCalledWith(9, 7);
    expect(service.launch).toHaveBeenCalledWith(9, 7, 21401);
    expect(service.store).toHaveBeenCalledWith(9, 7, 10);
    expect(service.land).toHaveBeenCalledWith(9, 7, 11);
  });
  it('creates a passive ramp only from a real module with zero ongoing EPS', () => {
    const ship = {
      runtimeSystems: {},
      modules: [
        {
          category: 'SPECIAL',
          moduleType: 'Shuttlerampe',
          level: 1,
          integrity: 100,
          isActive: true,
        },
      ],
    } as Spacecraft;
    expect(initializeSpacecraftRuntimeSystems(ship).SHUTTLE_RAMP).toMatchObject(
      { active: false, integrity: 100 },
    );
    expect(
      new SpacecraftResourceFlowService(
        new SpacecraftRuntimeStateService(),
      ).getSystemCost('SHUTTLE_RAMP'),
    ).toBe(0);
    ship.modules = [];
    expect(
      initializeSpacecraftRuntimeSystems(ship).SHUTTLE_RAMP,
    ).toBeUndefined();
    expect(
      initializeSpacecraftRuntimeSystems({ runtimeSystems: {} } as Spacecraft)
        .SHUTTLE_RAMP,
    ).toBeUndefined();
  });
  it('keeps life support but removes the ordinary default deflector for small craft', () => {
    for (const identity of [
      { shuttleCommodityId: 21401 },
      { shipClass: { role: 'WORKBEE' } },
    ]) {
      const ship = {
        ...identity,
        modules: [],
        runtimeSystems: {
          DEFLECTOR: { active: true, integrity: 100, cooldown: 0 },
        },
      } as unknown as Spacecraft;
      const systems = initializeSpacecraftRuntimeSystems(ship);
      expect(systems.LIFE_SUPPORT?.active).toBe(true);
      expect(systems.DEFLECTOR).toBeUndefined();
    }
    expect(
      initializeSpacecraftRuntimeSystems({
        modules: [],
        runtimeSystems: {},
      } as unknown as Spacecraft).DEFLECTOR,
    ).toBeDefined();
  });
  it('classifies real shuttle and Workbee hull commodities and excludes freighter hulls', () => {
    const previous = process.env.GAME_DATA_PATH;
    process.env.GAME_DATA_PATH = path.resolve(
      __dirname,
      '../../../../../game-data/data',
    );
    const data = new GameDataService();
    try {
      data.onModuleInit();
    } finally {
      if (previous == null) delete process.env.GAME_DATA_PATH;
      else process.env.GAME_DATA_PATH = previous;
    }
    expect(data.getCommodity(21401)?.isShuttle).toBe(false);
    expect(data.getCommodity(21491)?.isShuttle).toBe(true);
    expect(data.getCommodity(20061)).toMatchObject({
      isShuttle: true,
      isWorkbee: true,
    });
    expect(data.getCommodity(21601)?.isShuttle).toBe(false);
    expect(data.getCommodity(19010)?.isShuttle).toBe(false);
  });
});
