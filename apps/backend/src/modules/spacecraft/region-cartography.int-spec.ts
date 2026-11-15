import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { MapRegion } from '../starmap/entities/map-region.entity';
import { RegionDiscovery } from '../starmap/entities/region-discovery.entity';
import { PrestigeHistoryEntry as PrestigeHistory } from '../prestige/entities/prestige-history-entry.entity';
import { PrestigeService } from '../prestige/prestige.service';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import {
  CartographyPlan,
  CartographyPlanStatus,
} from './entities/cartography-plan.entity';
import {
  CartographyPlanService,
  regionTarget,
  type RegionChartedHandler,
} from './cartography-plan.service';

describe('region cartography lifecycle (PostgreSQL)', () => {
  let dataSource: DataSource;
  let plans: CartographyPlanService;
  let prestige: PrestigeService;
  let userId: number;
  let regionId: number;
  let fieldIds: number[];
  let SHIP_ID: number;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    plans = new CartographyPlanService(dataSource.getRepository(CartographyPlan));
    prestige = new PrestigeService(dataSource.getRepository(PrestigeHistory));
  });
  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    userId = (await createUser(dataSource)).id;
    const layer = await dataSource.getRepository(Layer).save({ name: 'Äußerer Rand', width: 10, height: 10 });
    regionId = (await dataSource.getRepository(MapRegion).save({ layerId: layer.id, name: 'Hutt-Raum' })).id;
    const shipClassId = (
      await dataSource.getRepository(ShipClassDef).save({ key: 'REGION_CARTOGRAPHER', name: 'Scout', category: 'SHIP', role: 'SCOUT' })
    ).id;
    fieldIds = [];
    for (const cx of [1, 2]) {
      fieldIds.push(
        (await dataSource.getRepository(GalaxyField).save({ layerId: layer.id, cx, cy: 1, fieldTypeId: 1, regionId })).id,
      );
    }
    const location = await dataSource.getRepository(SpaceLocation).findOneByOrFail({ galaxyFieldId: fieldIds[1] });
    SHIP_ID = (
      await dataSource.getRepository(Spacecraft).save({ name: 'Kartograph', userId, shipClassId, locationId: location.id, runtimeSystems: {} })
    ).id;
  });

  /** Plans the region, reaches both points and starts finalizing. */
  async function finishingPlan(): Promise<void> {
    await plans.createPlan(userId, regionTarget(regionId), fieldIds);
    for (const fieldId of fieldIds) await plans.claimArrivedRegionField(userId, regionId, fieldId);
    await plans.startFinalization(userId, regionTarget(regionId), SHIP_ID);
  }

  const reward: RegionChartedHandler = (manager, charted) =>
    prestige.change(charted.userId, 5, 'Kartographie der Region abgeschlossen', manager);

  it('claims each region measure point exactly once and measures after the last', async () => {
    await plans.createPlan(userId, regionTarget(regionId), fieldIds);

    await expect(plans.claimArrivedRegionField(userId, regionId, fieldIds[0])).resolves.toEqual({ claimed: true, completed: false });
    await expect(plans.claimArrivedRegionField(userId, regionId, fieldIds[0])).resolves.toEqual({ claimed: false, completed: false });
    await expect(plans.claimArrivedRegionField(userId, regionId, fieldIds[1])).resolves.toEqual({ claimed: true, completed: true });

    await expect(plans.getPlan(userId, regionTarget(regionId))).resolves.toMatchObject({
      status: CartographyPlanStatus.MEASURED,
      remainingFieldIds: [],
    });
    // Measuring alone discovers nothing.
    expect(await dataSource.getRepository(RegionDiscovery).count()).toBe(0);
  });

  it('completes after three ticks with exactly one discovery and one reward', async () => {
    await finishingPlan();

    for (const tick of [1, 2]) {
      await expect(plans.progressFinalization(SHIP_ID, reward)).resolves.toMatchObject({ completed: false });
      expect((await plans.getPlan(userId, regionTarget(regionId)))?.finalizationTick).toBe(tick);
    }
    await expect(plans.progressFinalization(SHIP_ID, reward)).resolves.toEqual({
      completed: true,
      userId,
      starSystemId: null,
      mapRegionId: regionId,
    });
    await expect(plans.progressFinalization(SHIP_ID, reward)).resolves.toMatchObject({ completed: false });

    expect(await dataSource.getRepository(RegionDiscovery).find()).toEqual([
      expect.objectContaining({ userId, mapRegionId: regionId, source: 'CARTOGRAPHY' }),
    ]);
    expect(await dataSource.getRepository(PrestigeHistory).find({ where: { userId } })).toEqual([
      expect.objectContaining({ amount: 5 }),
    ]);
    await expect(plans.getPlan(userId, regionTarget(regionId))).resolves.toMatchObject({
      status: CartographyPlanStatus.DONE,
      completionOutcome: 'SUCCESS',
    });
  });

  it('rolls discovery and plan back when the reward fails', async () => {
    await finishingPlan();
    await plans.progressFinalization(SHIP_ID, reward);
    await plans.progressFinalization(SHIP_ID, reward);

    await expect(
      plans.progressFinalization(SHIP_ID, async () => {
        throw new Error('prestige down');
      }),
    ).rejects.toThrow('prestige down');

    expect(await dataSource.getRepository(RegionDiscovery).count()).toBe(0);
    await expect(plans.getPlan(userId, regionTarget(regionId))).resolves.toMatchObject({
      status: CartographyPlanStatus.FINISHING,
      finalizationTick: 2,
    });
    // The next tick completes normally.
    await expect(plans.progressFinalization(SHIP_ID, reward)).resolves.toMatchObject({ completed: true });
  });

  it('completes only once under parallel ticks', async () => {
    await finishingPlan();
    await plans.progressFinalization(SHIP_ID, reward);
    await plans.progressFinalization(SHIP_ID, reward);

    const results = await Promise.all([
      plans.progressFinalization(SHIP_ID, reward),
      plans.progressFinalization(SHIP_ID, reward),
    ]);

    expect(results.filter((result) => result.completed)).toHaveLength(1);
    expect(await dataSource.getRepository(RegionDiscovery).count()).toBe(1);
    expect(await dataSource.getRepository(PrestigeHistory).count({ where: { userId } })).toBe(1);
  });

  it('ends without reward when the region was discovered meanwhile', async () => {
    await finishingPlan();
    await dataSource.getRepository(RegionDiscovery).save({ userId, mapRegionId: regionId, source: 'CARTOGRAPHY' as never });

    await expect(plans.progressFinalization(SHIP_ID, reward)).resolves.toMatchObject({ completed: false });

    await expect(plans.getPlan(userId, regionTarget(regionId))).resolves.toMatchObject({
      status: CartographyPlanStatus.DONE,
      completionOutcome: 'INVALIDATED',
    });
    expect(await dataSource.getRepository(PrestigeHistory).count({ where: { userId } })).toBe(0);
  });

  it('keeps measured progress when a movement resets the finalization', async () => {
    await finishingPlan();
    await plans.progressFinalization(SHIP_ID, reward);

    await plans.resetFinishingForSpacecraft(SHIP_ID);

    await expect(plans.getPlan(userId, regionTarget(regionId))).resolves.toMatchObject({
      status: CartographyPlanStatus.MEASURED,
      finalizingSpacecraftId: null,
      finalizationTick: null,
    });
    expect(await dataSource.getRepository(RegionDiscovery).count()).toBe(0);
  });
});
