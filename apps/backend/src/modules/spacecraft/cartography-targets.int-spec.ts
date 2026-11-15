import { DataSource, QueryFailedError } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { AddCartographyTargetsAndRegionDiscoveries20261115200000 } from '../../database/migrations/20261115200000-add-cartography-targets-and-region-discoveries';
import { Layer } from '../starmap/entities/layer.entity';
import { MapRegion } from '../starmap/entities/map-region.entity';
import { RegionDiscovery } from '../starmap/entities/region-discovery.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { RegionDiscoveryService } from '../starmap/region-discovery.service';
import {
  CartographyPlan,
  CartographyPlanStatus,
  CartographyTargetType,
} from './entities/cartography-plan.entity';
import {
  CartographyPlanService,
  regionTarget,
  systemTarget,
} from './cartography-plan.service';

describe('cartography targets and region discoveries (PostgreSQL)', () => {
  let dataSource: DataSource;
  let userId: number;
  let systemId: number;
  let regionId: number;
  let plans: CartographyPlanService;
  let regions: RegionDiscoveryService;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    plans = new CartographyPlanService(dataSource.getRepository(CartographyPlan));
    regions = new RegionDiscoveryService(dataSource.getRepository(RegionDiscovery));
  });
  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    userId = (await createUser(dataSource)).id;
    const layer = await dataSource.getRepository(Layer).save({ name: 'Mittlerer Rand', width: 10, height: 10 });
    systemId = (
      await dataSource
        .getRepository(StarSystem)
        .save({ name: 'Kessel', cx: 1, cy: 1, layerId: layer.id, systemTypeId: 1 })
    ).id;
    regionId = (await dataSource.getRepository(MapRegion).save({ layerId: layer.id, name: 'Kessel-Route' })).id;
  });

  const insertPlan = (values: Record<string, unknown>) =>
    dataSource.getRepository(CartographyPlan).insert({
      userId,
      status: CartographyPlanStatus.PLANNED,
      remainingFieldIds: [],
      ...values,
    });

  it.each([
    ['no target', { targetType: CartographyTargetType.SYSTEM, starSystemId: null, mapRegionId: null }],
    ['both targets', () => ({ targetType: CartographyTargetType.SYSTEM, starSystemId: systemId, mapRegionId: regionId })],
    ['a region on a system plan', () => ({ targetType: CartographyTargetType.SYSTEM, starSystemId: null, mapRegionId: regionId })],
    ['a system on a region plan', () => ({ targetType: CartographyTargetType.REGION, starSystemId: systemId, mapRegionId: null })],
  ])('rejects a plan with %s', async (_label, values) => {
    const row = typeof values === 'function' ? values() : values;
    await expect(insertPlan(row)).rejects.toThrow(QueryFailedError);
  });

  it('keeps one plan per player and typed target', async () => {
    const region = await plans.createPlan(userId, regionTarget(regionId), [5, 6]);
    const system = await plans.createPlan(userId, systemTarget(systemId), [7]);

    expect(region).toMatchObject({ targetType: 'REGION', mapRegionId: regionId, starSystemId: null });
    expect(system).toMatchObject({ targetType: 'SYSTEM', starSystemId: systemId, mapRegionId: null });
    await expect(plans.createPlan(userId, regionTarget(regionId), [9])).resolves.toMatchObject({
      id: region.id,
      remainingFieldIds: [5, 6],
    });
    await expect(
      insertPlan({ targetType: CartographyTargetType.REGION, mapRegionId: regionId }),
    ).rejects.toThrow(QueryFailedError);
    await expect(plans.getPlan(userId, systemTarget(systemId))).resolves.toMatchObject({ id: system.id });
    await expect(plans.getPlan(userId, regionTarget(regionId))).resolves.toMatchObject({ id: region.id });
  });

  it('migrates existing plans idempotently as unchanged system plans', async () => {
    await insertPlan({
      starSystemId: systemId,
      status: CartographyPlanStatus.MEASURED,
      remainingFieldIds: [3],
      finalizationTick: 2,
    });
    const before = await dataSource.getRepository(CartographyPlan).findOneByOrFail({ userId });
    const runner = dataSource.createQueryRunner();
    try {
      await new AddCartographyTargetsAndRegionDiscoveries20261115200000().up(runner);
    } finally {
      await runner.release();
    }

    const after = await dataSource.getRepository(CartographyPlan).findOneByOrFail({ userId });
    expect(after).toEqual({ ...before, targetType: 'SYSTEM', mapRegionId: null });
    await expect(insertPlan({ starSystemId: systemId })).rejects.toThrow(QueryFailedError);
  });

  it('records a region discovery once and reads it back', async () => {
    const first = await regions.record(userId, regionId);
    const second = await regions.record(userId, regionId);

    expect(first).toMatchObject({ created: true, discovery: { userId, mapRegionId: regionId, source: 'CARTOGRAPHY' } });
    expect(second).toMatchObject({ created: false, discovery: { id: first.discovery.id } });
    expect(first.discovery.discoveredAt).toBeInstanceOf(Date);
    await expect(regions.has(userId, regionId)).resolves.toBe(true);
    await expect(regions.list(userId)).resolves.toHaveLength(1);
  });

  it('rolls a region discovery back with its transaction', async () => {
    await expect(
      dataSource.transaction(async (manager) => {
        await regions.record(userId, regionId, undefined, manager);
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');

    await expect(regions.has(userId, regionId)).resolves.toBe(false);
  });
});
