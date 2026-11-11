import { DataSource, EntityManager } from 'typeorm';
import { AnomalyRegistry } from '../../modules/anomaly/anomaly-registry';
import { AnomalyService } from '../../modules/anomaly/anomaly.service';
import { Anomaly } from '../../modules/anomaly/entities/anomaly.entity';
import { TickService } from '../../modules/tick/tick.service';
import { GameTickState } from '../../modules/tick/entities/game-tick-state.entity';
import { connectIntegrationDatabase, resetDatabase } from './database';

describe('anomalies in the main tick', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  it.each([
    {
      remainingTicks: 3,
      pauseAt: 'tick',
      expectedRemaining: 1,
      disappearances: 0,
    },
    {
      remainingTicks: 1,
      pauseAt: 'disappear',
      expectedRemaining: null,
      disappearances: 1,
    },
  ])(
    'serializes overlapping distinct ticks at $pauseAt',
    async ({ remainingTicks, pauseAt, expectedRemaining, disappearances }) => {
      const types = source.getRepository('AnomalyType');
      const anomalies = source.getRepository('Anomaly');
      const type = await types.save({ key: 'CONCURRENT' });
      const anomaly = await anomalies.save({ typeId: type.id, remainingTicks });
      let releaseFirst!: () => void;
      let signalFirst!: (pid: number) => void;
      const firstPaused = new Promise<number>((resolve) => {
        signalFirst = resolve;
      });
      const resumeFirst = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      let calls = 0;
      let secondEntered = false;
      const pause = async (manager: EntityManager) => {
        calls += 1;
        if (calls === 1) {
          const [{ pid }] = await manager.query(
            'SELECT pg_backend_pid() AS pid',
          );
          signalFirst(pid);
          await resumeFirst;
        } else {
          secondEntered = true;
        }
      };
      const registry = new AnomalyRegistry();
      registry.register({
        key: 'CONCURRENT',
        handleTick: async (_anomaly: Anomaly, manager: EntityManager) => {
          if (pauseAt === 'tick') await pause(manager);
        },
        onDisappear: async (_anomaly: Anomaly, manager: EntityManager) => {
          if (pauseAt === 'disappear') await pause(manager);
          await manager.query(
            `INSERT INTO anomaly_types ("key") VALUES ('disappeared:' || txid_current())`,
          );
        },
        checkForCreation: async () => undefined,
        handleIncomingSpacecraft: async () => undefined,
      });
      const lifecycle = new AnomalyService(source, registry);
      const first = lifecycle.processTick(201);
      let second: Promise<void> | undefined;
      try {
        const firstPid = await firstPaused;
        second = lifecycle.processTick(202);
        const deadline = Date.now() + 5000;
        while (!secondEntered) {
          const [{ waiting }] = await source.query(
            `SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND pid <> $1 AND pid <> pg_backend_pid() AND wait_event_type = 'Lock') AS waiting`,
            [firstPid],
          );
          if (waiting) break;
          if (Date.now() >= deadline)
            throw new Error('second tick did not overlap first');
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } finally {
        releaseFirst();
        await Promise.all([first, ...(second ? [second] : [])]);
      }
      const stored = await anomalies.findOneBy({ id: anomaly.id });
      expect(stored?.remainingTicks ?? null).toBe(expectedRemaining);
      const [{ count }] = await source.query(
        `SELECT COUNT(*)::int AS count FROM anomaly_types WHERE "key" LIKE 'disappeared:%'`,
      );
      expect(count).toBe(disappearances);
    },
  );

  it('serializes creation checks even when there are no existing anomalies', async () => {
    const type = await source
      .getRepository('AnomalyType')
      .save({ key: 'CREATION' });
    const registry = new AnomalyRegistry();
    let signalFirst!: (pid: number) => void;
    let releaseFirst!: () => void;
    const firstPaused = new Promise<number>((resolve) => {
      signalFirst = resolve;
    });
    const resumeFirst = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let calls = 0;
    let secondEntered = false;
    registry.register({
      key: 'CREATION',
      handleTick: async () => undefined,
      onDisappear: async () => undefined,
      handleIncomingSpacecraft: async () => undefined,
      checkForCreation: async (manager: EntityManager) => {
        const repo = manager.getRepository(Anomaly);
        const count = await repo.count();
        calls += 1;
        if (calls === 1) {
          const [{ pid }] = await manager.query(
            'SELECT pg_backend_pid() AS pid',
          );
          signalFirst(pid);
          await resumeFirst;
        } else {
          secondEntered = true;
        }
        if (count === 0)
          await repo.save({ typeId: type.id, remainingTicks: 3 });
      },
    });
    const lifecycle = new AnomalyService(source, registry);
    const first = lifecycle.processTick(301);
    let second: Promise<void> | undefined;
    try {
      const firstPid = await firstPaused;
      second = lifecycle.processTick(302);
      const deadline = Date.now() + 5000;
      while (!secondEntered) {
        const [{ waiting }] = await source.query(
          `SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND pid <> $1 AND pid <> pg_backend_pid() AND wait_event_type = 'Lock') AS waiting`,
          [firstPid],
        );
        if (waiting) break;
        if (Date.now() >= deadline)
          throw new Error('second creation check did not overlap');
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } finally {
      releaseFirst();
      await Promise.all([first, ...(second ? [second] : [])]);
    }
    const anomalies = await source.getRepository(Anomaly).find();
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].remainingTicks).toBe(2);
    expect(calls).toBe(2);
  });

  it('releases serialization on rollback so a waiting tick can finish', async () => {
    const type = await source
      .getRepository('AnomalyType')
      .save({ key: 'ROLLBACK' });
    const anomalies = source.getRepository(Anomaly);
    const anomaly = await anomalies.save({
      typeId: type.id,
      remainingTicks: 2,
    });
    let signalFirst!: (pid: number) => void;
    let releaseFirst!: () => void;
    const firstPaused = new Promise<number>((resolve) => {
      signalFirst = resolve;
    });
    const resumeFirst = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let calls = 0;
    let secondEntered = false;
    const registry = new AnomalyRegistry();
    registry.register({
      key: 'ROLLBACK',
      handleTick: async (_anomaly: Anomaly, manager: EntityManager) => {
        calls += 1;
        if (calls === 1) {
          const [{ pid }] = await manager.query(
            'SELECT pg_backend_pid() AS pid',
          );
          signalFirst(pid);
          await resumeFirst;
          throw new Error('abort first transaction');
        }
        secondEntered = true;
      },
      onDisappear: async () => undefined,
      handleIncomingSpacecraft: async () => undefined,
      checkForCreation: async () => undefined,
    });
    const lifecycle = new AnomalyService(source, registry);
    const first = lifecycle.processTick(401).then(
      () => null,
      (error: Error) => error.message,
    );
    let second: Promise<void> | undefined;
    try {
      const firstPid = await firstPaused;
      second = lifecycle.processTick(402);
      const deadline = Date.now() + 5000;
      while (!secondEntered) {
        const [{ waiting }] = await source.query(
          `SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND pid <> $1 AND pid <> pg_backend_pid() AND wait_event_type = 'Lock') AS waiting`,
          [firstPid],
        );
        if (waiting) break;
        if (Date.now() >= deadline)
          throw new Error('waiting tick did not overlap');
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } finally {
      releaseFirst();
    }
    expect(await first).toBe('abort first transaction');
    await second;
    expect(
      (await anomalies.findOneByOrFail({ id: anomaly.id })).remainingTicks,
    ).toBe(1);
    await lifecycle.processTick(401);
    expect(await anomalies.findOneBy({ id: anomaly.id })).toBeNull();
  });

  it('keeps a surviving child when its parent expires', async () => {
    const types = source.getRepository('AnomalyType');
    const anomalies = source.getRepository('Anomaly');
    const type = await types.save({ key: 'TEST' });
    const root = await anomalies.save({ typeId: type.id, remainingTicks: 1 });
    const child = await anomalies.save({
      typeId: type.id,
      parentId: root.id,
      remainingTicks: 2,
    });
    const registry = new AnomalyRegistry();
    registry.register({
      key: 'TEST',
      checkForCreation: async () => undefined,
      handleTick: async () => undefined,
      onDisappear: async () => undefined,
      handleIncomingSpacecraft: async () => undefined,
    });
    await new AnomalyService(source, registry).processTick(100);
    expect(await anomalies.findOneByOrFail({ id: child.id })).toMatchObject({
      parentId: null,
      remainingTicks: 1,
    });
  });

  it('rolls back a failed handler and retries the same tick without consuming lifespan', async () => {
    const types = source.getRepository('AnomalyType');
    const anomalies = source.getRepository('Anomaly');
    const type = await types.save({ key: 'TEST' });
    const anomaly = await anomalies.save({
      typeId: type.id,
      remainingTicks: 2,
    });
    const registry = new AnomalyRegistry();
    let fail = true;
    registry.register({
      key: 'TEST',
      handleTick: async () => {
        if (fail) throw new Error('handler failure');
      },
      checkForCreation: async () => undefined,
      onDisappear: async () => undefined,
      handleIncomingSpacecraft: async () => undefined,
    });
    const lifecycle = new AnomalyService(source, registry);
    await expect(lifecycle.processTick(99)).rejects.toThrow('handler failure');
    expect(
      (await anomalies.findOneByOrFail({ id: anomaly.id })).remainingTicks,
    ).toBe(2);
    fail = false;
    await lifecycle.processTick(99);
    expect(
      (await anomalies.findOneByOrFail({ id: anomaly.id })).remainingTicks,
    ).toBe(1);
  });

  it('runs existing handlers before creation, expires objects and does not process a retry twice', async () => {
    const events: string[] = [];
    const types = source.getRepository('AnomalyType');
    const anomalies = source.getRepository('Anomaly');
    const type = await types.save({ key: 'TEST' });
    const existing = await anomalies.save({
      typeId: type.id,
      remainingTicks: 1,
      data: null,
    });
    const registry = new AnomalyRegistry();
    const handler = {
      key: 'TEST',
      handleTick: async (anomaly: Anomaly) => {
        events.push(`tick:${anomaly.id}`);
      },
      onDisappear: async (anomaly: Anomaly) => {
        events.push(`disappear:${anomaly.id}`);
      },
      handleIncomingSpacecraft: async () => undefined,
      checkForCreation: async (manager: EntityManager) => {
        events.push('creation');
        if (events.filter((event) => event === 'creation').length === 1) {
          await manager.getRepository('Anomaly').save({
            typeId: type.id,
            remainingTicks: 1,
            data: { created: true },
          });
        }
      },
    };
    registry.register(handler);
    expect(() => registry.register(handler)).toThrow();
    const lifecycle = new AnomalyService(source, registry);
    let failOnce = true;
    const tick = new TickService(
      source.getRepository('Colony') as never,
      source.getRepository('ColonyField') as never,
      source.getRepository('Spacecraft') as never,
      source.getRepository('User') as never,
      source.getRepository(GameTickState),
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { emitToAll: () => undefined } as never,
      {} as never,
      {
        recordSnapshot: async () => {
          if (failOnce) {
            failOnce = false;
            throw new Error('later tick failure');
          }
        },
      } as never,
      { recordSnapshots: async () => undefined } as never,
      { deleteExpired: async () => undefined } as never,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      lifecycle,
    );
    await expect(tick.handleTick(1234)).rejects.toThrow('later tick failure');
    const created = await anomalies.findOneByOrFail({ typeId: type.id });
    expect(created).toMatchObject({
      remainingTicks: 1,
      data: { created: true },
    });
    expect(events).toEqual([
      `tick:${existing.id}`,
      `disappear:${existing.id}`,
      'creation',
    ]);
    await tick.handleTick(1234);
    expect(events).toHaveLength(3);
    await tick.handleTick(1235);
    expect(await anomalies.count()).toBe(0);
    expect(events).toEqual([
      `tick:${existing.id}`,
      `disappear:${existing.id}`,
      'creation',
      `tick:${created.id}`,
      `disappear:${created.id}`,
      'creation',
    ]);
  });
});
