import { DataSource, IsNull, Not } from 'typeorm';
import { AnomalyRegistry } from '../../modules/anomaly/anomaly-registry';
import { AnomalyService } from '../../modules/anomaly/anomaly.service';
import { AnomalyQueryService } from '../../modules/anomaly/anomaly-query.service';
import { IonStormHandler } from '../../modules/anomaly/ion-storm.handler';
import type { IonStormData } from '../../modules/anomaly/ion-storm-data';
import type { AnomalyRandom } from '../../modules/anomaly/stu-random';
import { connectIntegrationDatabase, resetDatabase } from './database';

/** Hands out scripted values and records each draw's range. */
function scripted(values: number[]) {
  const draws: string[] = [];
  const next = (label: string) => {
    draws.push(label);
    if (!values.length) throw new Error(`unexpected draw ${label}`);
    return values.shift() as number;
  };
  const random: AnomalyRandom = {
    integer: (min, max) => next(`${min}-${max}`),
    normal: (min, max, mean) => next(`normal ${min}-${max}~${mean}`),
  };
  return { random, draws, remaining: values };
}

describe('ion storm (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  async function layer(width: number, height: number, special: Record<string, { isPassable?: boolean; effects?: string[] }> = {}) {
    const saved = await source.getRepository('Layer').save({ name: `Storm ${width}x${height}`, width, height });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const locations = new Map<string, number>();
    for (let cy = 1; cy <= height; cy++) {
      for (let cx = 1; cx <= width; cx++) {
        const field = await source.getRepository('GalaxyField').save({
          layerId: saved.id, cx, cy, fieldTypeId: fieldType.id, ...special[`${cx}|${cy}`],
        });
        const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
        locations.set(`${cx}|${cy}`, location.id);
      }
    }
    return { id: saved.id as number, at: (cx: number, cy: number) => locations.get(`${cx}|${cy}`) as number };
  }

  async function storm(layerId: number, data: Partial<IonStormData>, rootTicks: number, children: Array<[number, number]>) {
    const types = source.getRepository('AnomalyType');
    const type = (await types.findOneBy({ key: 'ION_STORM' })) ?? (await types.save({ key: 'ION_STORM' }));
    const root = await source.getRepository('Anomaly').save({
      typeId: type.id,
      locationId: null,
      remainingTicks: rootTicks,
      data: { layerId, directionInDegrees: 0, velocity: 1, movementType: 'STATIC', isPositivePolarity: true, intensity: 120, ...data },
    });
    const fields = [];
    for (const [locationId, remainingTicks] of children) {
      fields.push(await source.getRepository('Anomaly').save({ typeId: type.id, parentId: root.id, locationId, remainingTicks }));
    }
    return { root, fields };
  }

  async function tick(random: AnomalyRandom, tickNumber = 1) {
    const registry = new AnomalyRegistry();
    // A large density keeps creation out of movement and propagation scenarios.
    registry.register(new IonStormHandler(random, { locationsPerStorm: 1_000_000 }));
    await new AnomalyService(source, registry).processTick(tickNumber);
  }

  const anomaly = (id: number) => source.getRepository('Anomaly').findOneBy({ id });

  it('creates up to ceil(width × height / density) storms per layer on passable fields without NO_ANOMALIES', async () => {
    const map = await layer(3, 1, {
      '2|1': { isPassable: false },
      '3|1': { effects: ['NO_ANOMALIES'] },
    });
    // offset, movement type, polarity, intensity, direction, velocity
    const { random, draws } = scripted([0, 10, 1, 150, 90, 3]);
    const registry = new AnomalyRegistry();
    registry.register(new IonStormHandler(random, { locationsPerStorm: 1 }));
    await new AnomalyService(source, registry).processTick(1);

    expect(draws).toEqual(['0-0', '1-10', '0-1', '50-200', '1-360', 'normal 1-5~2']);
    const roots = await source.getRepository('Anomaly').find({ where: { parentId: IsNull(), locationId: IsNull() } });
    expect(roots).toHaveLength(1);
    expect(roots[0]).toMatchObject({
      remainingTicks: 1000,
      data: { layerId: map.id, movementType: 'VARIABLE', isPositivePolarity: true, intensity: 150, directionInDegrees: 90, velocity: 3 },
    });
    const fields = await source.getRepository('Anomaly').find({ where: { parentId: Not(IsNull()) } });
    expect(fields).toEqual([expect.objectContaining({ parentId: roots[0].id, locationId: map.at(1, 1), remainingTicks: 1000 })]);
  });

  it('moves storm fields along direction and velocity and drops fields leaving the layer or hitting blocked fields', async () => {
    const map = await layer(6, 3, { '3|3': { isPassable: false } });
    // direction 90°, velocity 2: two fields east, none north/south
    const { root, fields } = await storm(map.id, { directionInDegrees: 90, velocity: 2 }, 100, [
      [map.at(1, 2), 5],
      [map.at(5, 2), 5],
      [map.at(1, 3), 5],
    ]);
    const { random, remaining } = scripted([1]);
    await tick(random);

    expect(await anomaly(fields[0].id)).toMatchObject({ locationId: map.at(3, 2), remainingTicks: 5 });
    expect(await anomaly(fields[1].id)).toBeNull();
    expect(await anomaly(fields[2].id)).toBeNull();
    expect(await anomaly(root.id)).toMatchObject({ remainingTicks: 98 });
    expect(remaining).toEqual([]);
  });

  it('rerolls direction and velocity of a variable storm after moving', async () => {
    const map = await layer(3, 3);
    // direction 180°: cos = -1 moves one field north
    const { root, fields } = await storm(map.id, { directionInDegrees: 180, velocity: 1, movementType: 'VARIABLE' }, 50, [[map.at(2, 2), 5]]);
    // new direction, new velocity, root share
    const { random, draws } = scripted([270, 4, 1]);
    await tick(random);

    expect(draws).toEqual(['1-360', 'normal 1-5~2', '1-3']);
    expect(await anomaly(fields[0].id)).toMatchObject({ locationId: map.at(2, 1) });
    expect(await anomaly(root.id)).toMatchObject({
      remainingTicks: 49,
      data: { directionInDegrees: 270, velocity: 4, movementType: 'VARIABLE' },
    });
  });

  it('feeds fields from the root and splits strong fields onto a new neighbour', async () => {
    const map = await layer(7, 7);
    // direction 0°, velocity 1: one field south (y + 1)
    const { root, fields } = await storm(map.id, {}, 1000, [[map.at(4, 4), 50]]);
    // root → field 2 %, neighbour index 3 (right), new field share 50 %
    const { random, draws } = scripted([2, 3, 50]);
    await tick(random);

    expect(draws).toEqual(['1-3', '0-3', '10-90']);
    // root 1000 - 20 = 980, then the lifecycle decrement
    expect(await anomaly(root.id)).toMatchObject({ remainingTicks: 979 });
    // field 50 + 20 = 70, gives 35, then the lifecycle decrement
    expect(await anomaly(fields[0].id)).toMatchObject({ locationId: map.at(4, 5), remainingTicks: 34 });
    const created = await source.getRepository('Anomaly').find({ where: { parentId: root.id, locationId: map.at(5, 5) } });
    // Created during this tick, so the lifecycle first counts it down next tick.
    expect(created).toEqual([expect.objectContaining({ remainingTicks: 35 })]);
  });

  it('feeds an existing storm field instead of creating one and never splits onto NO_ANOMALIES', async () => {
    const map = await layer(7, 7, { '3|5': { effects: ['NO_ANOMALIES'] } });
    // Both storms move one field south. Storm A has the lower ids and ticks first.
    const a = await storm(map.id, {}, 100, [[map.at(5, 3), 5]]);
    const b = await storm(map.id, {}, 1000, [[map.at(4, 3), 50], [map.at(2, 4), 50]]);
    const { random, remaining } = scripted([
      // A: root share 1 % (1 tick), field 6 stays below the split threshold
      1,
      // B field 1 at 4|4: root share 1 % (10), splits right onto A's field at 5|4 with 50 %
      1, 3, 50,
      // B field 2 at 2|5: root share 1 % (9), splits right onto 3|5, which forbids anomalies
      1, 3,
    ]);
    await tick(random);

    expect(remaining).toEqual([]);
    // 5 + 1, lifecycle -1, then + floor(60 × 50 %) from B
    expect(await anomaly(a.fields[0].id)).toMatchObject({ locationId: map.at(5, 4), remainingTicks: 35 });
    expect(await anomaly(b.fields[0].id)).toMatchObject({ locationId: map.at(4, 4), remainingTicks: 29 });
    expect(await anomaly(b.fields[1].id)).toMatchObject({ locationId: map.at(2, 5), remainingTicks: 58 });
    expect(await source.getRepository('Anomaly').countBy({ locationId: map.at(3, 5) })).toBe(0);
    expect(await source.getRepository('Anomaly').countBy({ parentId: b.root.id })).toBe(2);
    expect(await anomaly(b.root.id)).toMatchObject({ remainingTicks: 980 });
  });

  it('keeps a root with fields alive and removes a root without fields', async () => {
    const map = await layer(3, 3);
    const alive = await storm(map.id, {}, 1, [[map.at(2, 1), 5]]);
    const empty = await storm(map.id, {}, 500, []);
    const { random } = scripted([1]);
    await tick(random);

    expect(await anomaly(alive.root.id)).toMatchObject({ remainingTicks: 1 });
    expect(await anomaly(empty.root.id)).toBeNull();
  });

  it('presents storm fields with name, remaining ticks and the root intensity', async () => {
    const map = await layer(2, 1);
    await storm(map.id, { intensity: 175 }, 100, [[map.at(1, 1), 12]]);
    const registry = new AnomalyRegistry();
    registry.register(new IonStormHandler(scripted([]).random));

    expect(await new AnomalyQueryService(source, registry).findAtLocation(map.at(1, 1))).toEqual([
      { type: 'ION_STORM', name: 'Ionensturm', remainingTicks: 12, intensity: 175 },
    ]);
  });
});
