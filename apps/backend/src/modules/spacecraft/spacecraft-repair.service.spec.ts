import { BadRequestException } from '@nestjs/common';

jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  AlertState: { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' },
  SpacecraftStatus: { IDLE: 'IDLE' },
}));
jest.mock('./entities/spacecraft-repair-task.entity', () => ({
  SpacecraftRepairTask: class SpacecraftRepairTask {},
  RepairPartsType: {
    SPARE_PARTS: 'SPARE_PARTS',
    SYSTEM_COMPONENTS: 'SYSTEM_COMPONENTS',
    BOTH: 'BOTH',
  },
  RepairTargetType: { HULL: 'HULL', MODULE: 'MODULE' },
}));

import { RepairPartsType, RepairTargetType } from './entities/spacecraft-repair-task.entity';
import { AlertState, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftRepairService } from './spacecraft-repair.service';

function setup() {
  const state = {
    ship: {
      id: 1,
      userId: 7,
      name: 'Falke',
      hull: 10,
      hullMax: 300,
      alertState: AlertState.GREEN,
      status: SpacecraftStatus.IDLE,
    },
    task: null as any,
    cargo: new Map([
      [10001, { spacecraftId: 1, commodityId: 10001, amount: 20 }],
      [10002, { spacecraftId: 1, commodityId: 10002, amount: 20 }],
    ]),
    module: { id: 4, spacecraftId: 1, moduleType: 'SENSOR', integrity: 10 },
    finalizing: false,
    engineers: 2,
  };
  const manager = {
    findOne: jest.fn(async (entity: any, options: any) => {
      const name = entity.name;
      if (name === 'Spacecraft') return state.ship;
      if (name === 'SpacecraftRepairTask') return state.task;
      if (name === 'CargoItem') return state.cargo.get(options.where.commodityId) ?? null;
      if (name === 'SpacecraftModule') return state.module;
      return null;
    }),
    findOneByOrFail: jest.fn(async () => state.module),
    existsBy: jest.fn(async (entity: any) =>
      entity.name === 'SpacecraftRepairTask' ? Boolean(state.task) : state.finalizing,
    ),
    count: jest.fn(async () => state.engineers),
    create: jest.fn((_entity: any, value: any) => value),
    save: jest.fn(async (...args: any[]) => {
      const value = args.at(-1);
      if (value.targetType) state.task = value;
      return value;
    }),
    remove: jest.fn(async (value: any) => {
      if (value === state.task) state.task = null;
      return value;
    }),
  };
  const dataSource = {
    transaction: jest.fn(async (work: (manager: any) => unknown) => work(manager)),
  };
  const crewService = { hasEnoughCrew: jest.fn(async () => true) };
  const messaging = { sendSystem: jest.fn(async () => ({})) };
  const service = new SpacecraftRepairService(
    { findOneBy: jest.fn(async () => state.ship) } as any,
    { find: jest.fn(async () => [state.module]) } as any,
    { findOneBy: jest.fn(async () => state.task) } as any,
    {} as any,
    { count: jest.fn(async () => state.engineers) } as any,
    {} as any,
    dataSource as any,
    crewService as any,
    messaging as any,
  );
  return { service, state, manager, dataSource, crewService, messaging };
}

const normal = {
  targetType: RepairTargetType.MODULE,
  moduleId: 4,
  partsType: RepairPartsType.BOTH,
  instant: false,
};

describe('SpacecraftRepairService', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['alarm state', (ctx: ReturnType<typeof setup>) => (ctx.state.ship.alertState = AlertState.YELLOW), 'Alarmstufe'],
    ['crew', (ctx: ReturnType<typeof setup>) => ctx.crewService.hasEnoughCrew.mockResolvedValue(false), 'Crew'],
    ['active repair', (ctx: ReturnType<typeof setup>) => (ctx.state.task = { id: 2 }), 'läuft bereits'],
    ['cartography', (ctx: ReturnType<typeof setup>) => (ctx.state.finalizing = true), 'Kartographie'],
  ])('rejects unmet prerequisite: %s', async (_name, arrange, message) => {
    const ctx = setup();
    arrange(ctx);
    await expect(ctx.service.start(1, 7, normal)).rejects.toThrow(message);
  });

  it('atomically consumes both part types and creates a timed repair', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const ctx = setup();
    const result = await ctx.service.start(1, 7, normal);
    expect(result).toEqual({ completed: false, targetIntegrity: 35 });
    expect(ctx.state.cargo.get(10001)?.amount).toBe(18);
    expect(ctx.state.cargo.get(10002)?.amount).toBe(18);
    expect(ctx.state.task).toMatchObject({ spacecraftId: 1, targetIntegrity: 35 });
    expect(ctx.dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('rolls back through the transaction when a selected cargo type is missing', async () => {
    const ctx = setup();
    ctx.state.cargo.delete(10002);
    await expect(ctx.service.start(1, 7, normal)).rejects.toBeInstanceOf(BadRequestException);
    expect(ctx.dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('completes a due repair once and sends a message', async () => {
    const ctx = setup();
    ctx.state.task = {
      spacecraftId: 1,
      targetType: RepairTargetType.MODULE,
      moduleId: 4,
      partsType: RepairPartsType.BOTH,
      targetIntegrity: 35,
      completesAt: new Date(0),
    };
    await ctx.service.processTick(ctx.state.ship as any);
    expect(ctx.state.module.integrity).toBe(35);
    expect(ctx.state.task).toBeNull();
    expect(ctx.messaging.sendSystem).toHaveBeenCalledWith(7, 'Schiffsreparatur abgeschlossen', expect.stringContaining('35'));
  });

  it('aborts a due repair without enough crew (STU RepairTaskJobs)', async () => {
    const ctx = setup();
    ctx.state.task = {
      spacecraftId: 1,
      targetType: RepairTargetType.MODULE,
      moduleId: 4,
      partsType: RepairPartsType.BOTH,
      targetIntegrity: 35,
      completesAt: new Date(0),
    };
    const before = ctx.state.module.integrity;
    ctx.crewService.hasEnoughCrew.mockResolvedValue(false);
    await ctx.service.processTick(ctx.state.ship as any);
    expect(ctx.state.module.integrity).toBe(before);
    expect(ctx.state.task).toBeNull();
    expect(ctx.messaging.sendSystem).toHaveBeenCalledWith(7, 'Schiffsreparatur abgebrochen', expect.stringContaining('Crew'));
  });

  it('cancels all moving fleet members, refunds them transactionally and notifies', async () => {
    const ctx = setup();
    const tasks = new Map([
      [1, { spacecraftId: 1, spacecraft: ctx.state.ship, spareParts: 2, systemComponents: 2 }],
      [2, { spacecraftId: 2, spacecraft: { ...ctx.state.ship, id: 2, name: 'Möwe' }, spareParts: 1, systemComponents: 0 }],
    ]);
    ctx.manager.findOne.mockImplementation(async (entity: any, options: any) => {
      if (entity.name === 'SpacecraftRepairTask') return tasks.get(options.where.spacecraftId) ?? null;
      if (entity.name === 'CargoItem') return ctx.state.cargo.get(options.where.commodityId) ?? null;
      return null;
    });
    ctx.manager.remove.mockImplementation(async (task: any) => {
      tasks.delete(task.spacecraftId);
      return task;
    });
    await ctx.service.cancelForFlight([1, 2]);
    expect(tasks.size).toBe(0);
    expect(ctx.messaging.sendSystem).toHaveBeenCalledTimes(2);
    expect(ctx.dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('drops the station repair queue entry when the ship flies or undocks', async () => {
    const ctx = setup();
    const job = { shipId: 1, ship: { ...ctx.state.ship } };
    ctx.manager.findOne.mockImplementation(async (entity: any) =>
      entity.name === 'StationShipRepair' ? job : null,
    );
    await ctx.service.cancelForFlight(1);
    expect(ctx.manager.remove).toHaveBeenCalledWith(job);
    expect(ctx.messaging.sendSystem).toHaveBeenCalledWith(7, 'Schiffsreparatur abgebrochen', expect.any(String));
  });
});
