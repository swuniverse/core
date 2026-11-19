jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftKind: { SHIP: 'SHIP', STATION: 'STATION' },
  StationRole: {
    CONSTRUCTION: 'CONSTRUCTION',
    DEPOT_SMALL: 'DEPOT_SMALL',
    DEPOT_LARGE: 'DEPOT_LARGE',
    SHIPYARD: 'SHIPYARD',
    SENSOR: 'SENSOR',
    OUTPOST: 'OUTPOST',
    BASE: 'BASE',
  },
}));
jest.mock('./entities/station-ship-repair.entity', () => ({ StationShipRepair: class StationShipRepair {} }));
jest.mock('./entities/spacecraft-module.entity', () => ({ SpacecraftModule: class SpacecraftModule {} }));
jest.mock('./entities/spacecraft-repair-task.entity', () => ({ SpacecraftRepairTask: class SpacecraftRepairTask {} }));
jest.mock('./entities/cargo-item.entity', () => ({ CargoItem: class CargoItem {} }));
jest.mock('./entities/cartography-plan.entity', () => ({
  CartographyPlan: class CartographyPlan {},
  CartographyPlanStatus: { FINISHING: 'FINISHING' },
}));
jest.mock('../colony/colony-timing.service', () => ({ ColonyTimingService: class ColonyTimingService {} }));
jest.mock('../messaging/messaging.service', () => ({ MessagingService: class MessagingService {} }));
jest.mock('./crew-enhancement.service', () => ({ CrewEnhancementService: class CrewEnhancementService {} }));
jest.mock('./spacecraft-stats.service', () => ({ SpacecraftStatsService: class SpacecraftStatsService {} }));

import { BadRequestException } from '@nestjs/common';
import { StationRepairService } from './station-repair.service';

type Row = Record<string, any>;

function setup(overrides: { station?: Row; jobs?: Row[]; parts?: number; components?: number; workbees?: number } = {}) {
  const station: Row = {
    id: 100,
    userId: 1,
    name: 'Werft Alpha',
    kind: 'STATION',
    stationRole: 'SHIPYARD',
    crew: 5,
    crewRequired: 5,
    cargoUsed: 50,
    hull: 1000,
    hullMax: 1000,
    passiveRepair: false,
    ...overrides.station,
  };
  const ship = (id: number, hull: number): Row => ({
    id,
    userId: 2,
    name: `Falke ${id}`,
    hull,
    hullMax: 400,
    dockedAtId: 100,
    shipClass: { buildTimeTicks: 4 },
    runtimeSystems: {},
  });
  const ships: Record<number, Row> = { 7: ship(7, 100), 8: ship(8, 200) };
  const jobs: Row[] = overrides.jobs ?? [];
  const cargo: Record<number, Row> = {
    10001: { spacecraftId: 100, commodityId: 10001, amount: overrides.parts ?? 5 },
    10002: { spacecraftId: 100, commodityId: 10002, amount: overrides.components ?? 5 },
  };
  const damagedModule: Row = { id: 1, spacecraftId: 100, integrity: 40, isActive: true, cooldown: 0 };
  const manager: Row = {
    findOne: jest.fn(async (entity: { name: string }, options: { where: Row }) => {
      if (entity.name === 'Spacecraft') return options.where.id === 100 ? station : null;
      if (entity.name === 'CargoItem') return cargo[options.where.commodityId] ?? null;
      if (entity.name === 'StationShipRepair')
        return jobs.find((job) => job.shipId === options.where.shipId) ?? null;
      return null;
    }),
    find: jest.fn(async (entity: { name: string }, options: { where: Row }) => {
      if (entity.name === 'StationShipRepair') return [...jobs];
      if (entity.name === 'SpacecraftModule')
        return options.where.spacecraftId === 100 && station.hullMax === 1000 && overrides.station?.damaged
          ? [damagedModule]
          : [];
      if (entity.name === 'Spacecraft')
        return Array.from({ length: overrides.workbees ?? 0 }, (_, index) => ({
          id: 900 + index,
          shipClass: { role: 'WORKBEE' },
        }));
      return [];
    }),
    existsBy: jest.fn(async () => false),
    countBy: jest.fn(async () => jobs.length),
    create: jest.fn((_entity: unknown, value: Row) => value),
    save: jest.fn(async (value: Row) => {
      if (value.shipId !== undefined && !jobs.includes(value)) jobs.push(value);
      return value;
    }),
    remove: jest.fn(async (value: Row | Row[]) => {
      for (const entry of Array.isArray(value) ? value : [value]) {
        const index = jobs.indexOf(entry);
        if (index >= 0) jobs.splice(index, 1);
      }
    }),
  };
  const dataSource = {
    manager,
    transaction: jest.fn(async (work: (m: Row) => unknown) => work(manager)),
  };
  const messaging = { sendSystem: jest.fn(async () => ({})) };
  const stats = { applyStats: jest.fn() };
  const timing = { dateAfterScaledMinutes: jest.fn((minutes: number) => new Date(Date.now() + minutes * 60_000)) };
  const crewEnhancement = { enhanceSpacecraft: jest.fn(async () => undefined) };
  const service = new StationRepairService(
    dataSource as any,
    messaging as any,
    stats as any,
    timing as any,
    crewEnhancement as any,
  );
  const job = (shipId: number, extra: Row = {}): Row => ({
    id: shipId,
    stationId: 100,
    shipId,
    ship: ships[shipId],
    finishesAt: null,
    stoppedAt: null,
    isStopped: false,
    ...extra,
  });
  return { service, station, ships, jobs, cargo, manager, messaging, crewEnhancement, job };
}

const due = () => new Date(Date.now() - 1000);

describe('StationRepairService queue', () => {
  it('starts the first job with a step timer and queues later ships without one', async () => {
    const ctx = setup();
    ctx.manager.findOne.mockImplementation(async (entity: { name: string }, options: { where: Row }) =>
      entity.name === 'Spacecraft' ? (options.where.kind ? ctx.station : ctx.ships[options.where.id]) : null,
    );
    const first = await ctx.service.queueShip(100, 1, 7);
    expect(first.message).toContain('Voraussichtliche Fertigstellung');
    expect(ctx.jobs[0].finishesAt).toBeInstanceOf(Date);
    const second = await ctx.service.queueShip(100, 1, 8);
    expect(second.message).toContain('Reparaturwarteschlange');
    expect(ctx.jobs[1].finishesAt).toBeNull();
  });

  it('rejects stations that are neither shipyard nor base', async () => {
    const ctx = setup({ station: { stationRole: 'OUTPOST' } });
    ctx.manager.findOne.mockResolvedValue(ctx.station);
    await expect(ctx.service.queueShip(100, 1, 7)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancels a job and informs the ship owner', async () => {
    const ctx = setup();
    ctx.jobs.push(ctx.job(7));
    ctx.manager.findOne.mockImplementation(async (entity: { name: string }) =>
      entity.name === 'Spacecraft' ? ctx.station : ctx.jobs[0],
    );
    await ctx.service.cancel(100, 1, 7);
    expect(ctx.jobs).toHaveLength(0);
    expect(ctx.messaging.sendSystem).toHaveBeenCalledWith(2, 'Schiffsreparatur abgebrochen', expect.any(String), undefined, 'SHIP');
  });

  it('reactivates a stopped queue and shifts the running job by the pause time', async () => {
    const ctx = setup();
    const stoppedAt = new Date(Date.now() - 60_000);
    const finishesAt = new Date(Date.now() + 120_000);
    ctx.jobs.push(ctx.job(7, { finishesAt, stoppedAt, isStopped: true }), ctx.job(8, { isStopped: true }));
    ctx.manager.findOne.mockResolvedValue(ctx.station);
    await ctx.service.reactivate(100, 1);
    expect(ctx.jobs.every((job) => !job.isStopped)).toBe(true);
    expect(ctx.jobs[0].stoppedAt).toBeNull();
    expect(ctx.jobs[0].finishesAt.getTime()).toBeGreaterThan(finishesAt.getTime() + 50_000);
  });
});

describe('StationRepairService tick', () => {
  const run = (ctx: ReturnType<typeof setup>) => {
    ctx.manager.findOne.mockImplementation(async (entity: { name: string }, options: { where: Row }) => {
      if (entity.name === 'Spacecraft') return ctx.station;
      if (entity.name === 'CargoItem') return ctx.cargo[options.where.commodityId] ?? null;
      return null;
    });
    // The ship repair queue runs in the minute runner (sh-AUD-07b, STU FinishPassiveShipRepairJobs).
    return ctx.service.processQueue(100);
  };

  it('repairs the due ship by one step, consumes one spare part and promotes the next job', async () => {
    const ctx = setup({ parts: 3 });
    ctx.jobs.push(ctx.job(7, { finishesAt: due() }), ctx.job(8));
    await run(ctx);
    expect(ctx.ships[7].hull).toBe(200);
    expect(ctx.cargo[10001].amount).toBe(2);
    expect(ctx.cargo[10002].amount).toBe(5);
    expect(ctx.jobs).toHaveLength(2);
    expect(ctx.jobs[0].finishesAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('completes the repair, notifies the owner and starts the next queued ship', async () => {
    const ctx = setup();
    ctx.ships[7].hull = 350;
    ctx.jobs.push(ctx.job(7, { finishesAt: due() }), ctx.job(8));
    await run(ctx);
    expect(ctx.ships[7].hull).toBe(400);
    expect(ctx.jobs.map((job) => job.shipId)).toEqual([8]);
    expect(ctx.jobs[0].finishesAt).toBeInstanceOf(Date);
    expect(ctx.messaging.sendSystem).toHaveBeenCalledWith(2, 'Schiffsreparatur abgeschlossen', expect.any(String), undefined, 'SHIP');
    expect(ctx.crewEnhancement.enhanceSpacecraft).toHaveBeenCalledWith(7, 'REPAIR_COMPLETED');
  });

  it('stops the whole queue when spare parts are missing', async () => {
    const ctx = setup({ parts: 0 });
    ctx.jobs.push(ctx.job(7, { finishesAt: due() }), ctx.job(8));
    await run(ctx);
    expect(ctx.ships[7].hull).toBe(100);
    expect(ctx.jobs.every((job) => job.isStopped && job.stoppedAt)).toBe(true);
    expect(ctx.messaging.sendSystem).toHaveBeenCalledWith(1, 'Reparatur angehalten', expect.any(String), undefined, 'STATION');
  });

  it('drops a job whose ship has undocked', async () => {
    const ctx = setup();
    ctx.ships[7].dockedAtId = null;
    ctx.jobs.push(ctx.job(7, { finishesAt: due() }));
    await run(ctx);
    expect(ctx.jobs).toHaveLength(0);
    expect(ctx.ships[7].hull).toBe(100);
  });

  it('pauses the queue while the station lacks crew', async () => {
    const ctx = setup({ station: { crew: 1 } });
    ctx.jobs.push(ctx.job(7, { finishesAt: due() }));
    await run(ctx);
    expect(ctx.jobs[0].stoppedAt).toBeInstanceOf(Date);
    expect(ctx.ships[7].hull).toBe(100);
  });
});

describe('StationRepairService passive self-repair', () => {
  it('repairs hull and systems with enough docked workbees and finishes with a notice', async () => {
    const ctx = setup({
      station: { stationRole: 'SHIPYARD', hull: 950, damaged: true, passiveRepair: true },
      workbees: 2,
    });
    ctx.manager.findOne.mockImplementation(async (entity: { name: string }, options: { where: Row }) =>
      entity.name === 'Spacecraft' ? ctx.station : (ctx.cargo[options.where.commodityId] ?? null),
    );
    await ctx.service.processTick(100);
    expect(ctx.station.hull).toBe(1000);
    expect(ctx.station.passiveRepair).toBe(false);
    expect(ctx.cargo[10001].amount).toBe(4);
    expect(ctx.cargo[10002].amount).toBe(4);
    expect(ctx.messaging.sendSystem).toHaveBeenCalledWith(1, 'Stationsreparatur abgeschlossen', expect.any(String), undefined, 'STATION');
  });

  it('waits without consuming parts when too few workbees are docked', async () => {
    const ctx = setup({ station: { stationRole: 'SHIPYARD', hull: 900, passiveRepair: true }, workbees: 1 });
    ctx.manager.findOne.mockImplementation(async (entity: { name: string }, options: { where: Row }) =>
      entity.name === 'Spacecraft' ? ctx.station : (ctx.cargo[options.where.commodityId] ?? null),
    );
    await ctx.service.processTick(100);
    expect(ctx.station.hull).toBe(900);
    expect(ctx.cargo[10001].amount).toBe(5);
  });

  it('keeps self-repair in the main tick and the ship queue in the minute runner', async () => {
    const ctx = setup({ station: { stationRole: 'SHIPYARD', hull: 900, passiveRepair: true }, workbees: 5 });
    ctx.manager.findOne.mockImplementation(async (entity: { name: string }, options: { where: Row }) =>
      entity.name === 'Spacecraft' ? ctx.station : (ctx.cargo[options.where.commodityId] ?? null),
    );
    await ctx.service.processQueue(100);
    expect(ctx.station.hull).toBe(900);
    await ctx.service.processTick(100);
    expect(ctx.station.hull).toBe(1000);
  });

  it('honors an explicit repair skip option independently of vacation', async () => {
    const ctx = setup({ station: { passiveRepair: true, hull: 900 }, workbees: 5 });
    await ctx.service.processTick(100, { skipRepair: true });
    expect(ctx.manager.findOne).not.toHaveBeenCalled();
  });
  it.each([47, 49])('continues passive station repair during a vacation request aged %i hours', async (hours) => {
    const ctx = setup({ station: { passiveRepair: true, hull: 900,
      user: { vacationMode: true, vacationStartedAt: new Date(Date.now() - hours * 60 * 60 * 1000) } }, workbees: 5 });
    await ctx.service.processTick(100);
    expect(ctx.station.hull).toBe(1000);
    expect(ctx.cargo[10001].amount).toBe(4);
  });
});
