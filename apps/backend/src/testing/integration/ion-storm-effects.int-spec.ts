import { DataSource } from 'typeorm';
import { AnomalyRegistry } from '../../modules/anomaly/anomaly-registry';
import { AnomalyService } from '../../modules/anomaly/anomaly.service';
import { AnomalyFlightConsequence } from '../../modules/anomaly/anomaly-flight-consequence';
import { IonStormHandler } from '../../modules/anomaly/ion-storm.handler';
import type { IonStormData } from '../../modules/anomaly/ion-storm-data';
import type { AnomalyRandom } from '../../modules/anomaly/stu-random';
import { MessagingService } from '../../modules/messaging/messaging.service';
import { FlightConsequencePipeline } from '../../modules/spacecraft/flight-consequence-pipeline';
import { SpacecraftIonStormEffects } from '../../modules/spacecraft/ion-storm-effects';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

const NOW = 1_800_000_000_000;

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
    skewed: (min, max, mean, skewness) => next(`skewed ${min}-${max}~${mean}/${skewness}`),
  };
  return { random, draws, remaining: values };
}

describe('ion storm effects on spacecraft (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let ownerId: number;
  let shipClassId: number;

  beforeEach(async () => {
    ownerId = (await createUser(source)).id;
    shipClassId = (await source.getRepository('ShipClassDef').save({ key: 'STORM_TEST', name: 'Test', category: 'SHIP', role: 'SHIP', anomalyMass: 1 })).id;
  });

  async function layer(width: number, height: number) {
    const saved = await source.getRepository('Layer').save({ name: 'Storm', width, height });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const locations = new Map<string, number>();
    for (let cy = 1; cy <= height; cy++) {
      for (let cx = 1; cx <= width; cx++) {
        const field = await source.getRepository('GalaxyField').save({ layerId: saved.id, cx, cy, fieldTypeId: fieldType.id });
        locations.set(`${cx}|${cy}`, (await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id);
      }
    }
    return { id: saved.id as number, at: (cx: number, cy: number) => locations.get(`${cx}|${cy}`) as number };
  }

  async function storm(layerId: number, data: Partial<IonStormData>, rootTicks: number, locationId: number, fieldTicks: number) {
    const type = await source.getRepository('AnomalyType').save({ key: 'ION_STORM' });
    const root = await source.getRepository('Anomaly').save({
      typeId: type.id,
      locationId: null,
      remainingTicks: rootTicks,
      data: { layerId, directionInDegrees: 90, velocity: 1, movementType: 'STATIC', isPositivePolarity: true, intensity: 120, ...data },
    });
    return source.getRepository('Anomaly').save({ typeId: type.id, parentId: root.id, locationId, remainingTicks: fieldTicks });
  }

  function spacecraft(values: Record<string, unknown>) {
    return source.getRepository('Spacecraft').save({ userId: ownerId, shipClassId, hull: 100, hullMax: 100, shields: 0, ...values });
  }

  function setup(random: AnomalyRandom) {
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, { emitToUser: () => undefined } as never, {} as never);
    const destruction = {
      destroyInManager: jest.fn(async (manager: { getRepository: (name: string) => { delete: (id: number) => Promise<unknown> } }, id: number) => {
        await manager.getRepository('Spacecraft').delete(id);
        return { evacuatedCrew: 0 };
      }),
    };
    const crewEnhancement = { enhanceSpacecraft: jest.fn(async () => undefined) };
    const handler = new IonStormHandler(random, { locationsPerStorm: 1_000_000 });
    handler.registerEffects(new SpacecraftIonStormEffects({
      random,
      messaging,
      destruction: destruction as never,
      crewEnhancement,
      hasIonStormReduction: () => false,
      now: () => NOW,
    }));
    const registry = new AnomalyRegistry();
    registry.register(handler);
    return { registry, destruction, crewEnhancement };
  }

  it('damages ships, drops station shields and spares vacationing owners on every main tick', async () => {
    const map = await layer(5, 3);
    // direction 90°: the storm field moves from 2|2 to 3|2
    await storm(map.id, {}, 100, map.at(2, 2), 5);
    const ship = await spacecraft({ name: 'Falke', locationId: map.at(3, 2), runtimeSystems: { WARPDRIVE: { active: true, integrity: 100 } } });
    const station = await spacecraft({ name: 'Basis', kind: 'STATION', locationId: map.at(3, 2), shields: 40, runtimeSystems: { SHIELDS: { active: true, integrity: 100 } } });
    const resting = await createUser(source);
    await source.getRepository('User').update(resting.id, { vacationMode: true, vacationStartedAt: new Date(NOW - 49 * 60 * 60 * 1000) });
    const vacation = await spacecraft({ name: 'Urlaub', userId: resting.id, locationId: map.at(3, 2), runtimeSystems: { WARPDRIVE: { active: true, integrity: 100 } } });
    const behind = await spacecraft({ name: 'Zurück', locationId: map.at(2, 2), runtimeSystems: {} });
    // root share 1 %; ship: damage roll 10 of 1–10, no crit, system share ×1, hyperdrive
    const { random, draws, remaining } = scripted([1, 10, 7, 1, 0]);
    const { registry } = setup(random);

    await new AnomalyService(source, registry).processTick(1);

    expect(draws).toEqual(['1-3', 'normal 1-10~undefined', '0-20', '1-5', '0-0']);
    expect(remaining).toEqual([]);
    // ceil(10 × 100 × 120 / 10000) = 12 hull damage; system share ceil(100 × 12 × 1 / 100) = 12
    expect(await source.getRepository('Spacecraft').findOneByOrFail({ id: ship.id })).toMatchObject({
      hull: 88,
      runtimeSystems: { WARPDRIVE: { active: true, integrity: 88 } },
    });
    expect(await source.getRepository('Spacecraft').findOneByOrFail({ id: station.id })).toMatchObject({
      hull: 100,
      runtimeSystems: { SHIELDS: { active: false } },
    });
    expect(await source.getRepository('Spacecraft').findOneByOrFail({ id: vacation.id })).toMatchObject({ hull: 100 });
    expect(await source.getRepository('Spacecraft').findOneByOrFail({ id: behind.id })).toMatchObject({ hull: 100 });

    const messages = await source.getRepository('Message').find({ order: { id: 'ASC' } });
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ folder: 'SHIP', body: expect.stringContaining('Ionensturm'), targetId: ship.id });
    expect(messages[0].body).toBe([
      'Die Falke in Sektor 3|2 befindet sich in einem gefährlichen Ionensturm.',
      '- Hüllenschaden: 12 - Status: 88',
      '- Folgendes System wurde beschädigt: Hyperantrieb',
    ].join('\n'));
    expect(messages[1]).toMatchObject({ folder: 'STATION', body: 'Die Basis in Sektor 3|2 befindet sich in einem gefährlichen Ionensturm.\nDie Schilde sind ausgefallen' });
  });

  it('leaves spacecraft alone on a storm field about to expire', async () => {
    const map = await layer(5, 3);
    // root 50 shares floor(0.5) = 0 ticks, so the field keeps its single remaining tick
    await storm(map.id, {}, 50, map.at(2, 2), 1);
    const ship = await spacecraft({ name: 'Falke', locationId: map.at(3, 2), runtimeSystems: {} });
    const { random, remaining } = scripted([1]);

    await new AnomalyService(source, setup(random).registry).processTick(1);

    expect(remaining).toEqual([]);
    expect(await source.getRepository('Spacecraft').findOneByOrFail({ id: ship.id })).toMatchObject({ hull: 100 });
    expect(await source.getRepository('Message').count()).toBe(0);
  });

  it('knocks out the hyperdrive and damages an entering ship through its shields', async () => {
    const map = await layer(3, 1);
    await storm(map.id, { intensity: 100 }, 100, map.at(2, 1), 10);
    const ship = await spacecraft({
      name: 'Falke',
      locationId: map.at(2, 1),
      shields: 30,
      runtimeSystems: { SHIELDS: { active: true, integrity: 100 }, WARPDRIVE: { active: true, integrity: 100, cooldown: 0 } },
    });
    await source.getRepository('SpacecraftModule').save({ spacecraftId: ship.id, category: 'SHIELDS', moduleType: 'Deflektorschild', level: 3 });
    // drive outage 600 s, damage roll 20 of 1–20, no crit
    const { random, draws } = scripted([600, 20, 4]);
    const { registry, crewEnhancement } = setup(random);
    const field = await source.getRepository('GalaxyField').findOneByOrFail({ layerId: map.id, cx: 2, cy: 1 });

    const messages = await new FlightConsequencePipeline([new AnomalyFlightConsequence(source, registry)]).onEnterField(ship as never, field as never);

    expect(draws).toEqual(['skewed 0-3600~600/2', 'normal 1-20~undefined', '0-20']);
    expect(crewEnhancement.enhanceSpacecraft).toHaveBeenCalledWith(ship.id, 'ION_STORM_FLIGHT', expect.anything());
    // net 20; shield level 3 → factor 70 %: 20 net damage absorb trunc(14) shield points
    expect(await source.getRepository('Spacecraft').findOneByOrFail({ id: ship.id })).toMatchObject({
      hull: 100,
      shields: 16,
      runtimeSystems: { WARPDRIVE: { active: false, cooldown: NOW + 600_000 } },
    });
    expect(messages).toEqual([
      'In Sektor 2|1 befindet sich ein gefährlicher Ionensturm.',
      'Der Hyperantrieb ist ausgefallen und kann vorerst nicht mehr aktiviert werden',
      '- Schildschaden: 14 - Status: 16',
    ]);
    expect(await source.getRepository('Message').find()).toMatchObject([{ folder: 'SHIP', body: expect.stringContaining('Ionensturm'), targetId: ship.id }]);
  });

  it('destroys a ship whose hull does not survive the entry through the destruction service', async () => {
    const map = await layer(3, 1);
    await storm(map.id, { intensity: 100 }, 100, map.at(2, 1), 10);
    const ship = await spacecraft({ name: 'Wrack', locationId: map.at(2, 1), hull: 5, runtimeSystems: { SUBLIGHT_DRIVE: { active: true, integrity: 100 } } });
    const { random } = scripted([0, 20, 9]);
    const { registry, destruction } = setup(random);
    const field = await source.getRepository('GalaxyField').findOneByOrFail({ layerId: map.id, cx: 2, cy: 1 });

    const messages = await new FlightConsequencePipeline([new AnomalyFlightConsequence(source, registry)]).onEnterField(ship as never, field as never);

    expect(destruction.destroyInManager).toHaveBeenCalledWith(expect.anything(), ship.id, 'ANOMALY', expect.anything());
    expect(ship.status).toBe('DESTROYED');
    expect(await source.getRepository('Spacecraft').findOneBy({ id: ship.id })).toBeNull();
    expect(messages).toContain('Der Impulsantrieb ist ausgefallen und kann vorerst nicht mehr aktiviert werden');
    expect(messages).toContain('-- Das Schiff wurde zerstört!');
    expect(await source.getRepository('Message').find()).toMatchObject([{ targetId: null }]);
  });
});
