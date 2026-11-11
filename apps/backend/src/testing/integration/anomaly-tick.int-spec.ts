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
