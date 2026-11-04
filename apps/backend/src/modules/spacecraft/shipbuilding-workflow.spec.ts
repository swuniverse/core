jest.mock('../starmap/entities/space-location.entity', () => ({
  SpaceLocation: class SpaceLocation {},
}));
import { ShipbuildingCoreService } from './shipbuilding-core.service';
import { SpacecraftStatsService } from './spacecraft-stats.service';
import { FindOperator } from 'typeorm';

function matches(row: any, where: any, hulls: any[]): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'shipClass')
      return matches(
        hulls.find((hull) => hull.id === row.shipClassId),
        value,
        hulls,
      );
    if (value instanceof FindOperator) {
      if (value.type === 'not') return row[key] !== value.value;
      if (value.type === 'in') return value.value.includes(row[key]);
    }
    return row[key] === value;
  });
}

/** A transactional database adapter; the application core and design rules are real. */
function fixture() {
  let rows: Record<string, any[]> = {
    User: [{ id: 2, faction: null }],
    ColonyShipBuildplan: [],
    ColonyShipBuildQueue: [],
    Spacecraft: [],
    SpacecraftModule: [],
  };
  let cargo = 4;
  const hull: any = {
    id: 4,
    key: 'CORVETTE',
    name: 'Corvette',
    category: 'CORVETTE',
    crewMin: 2,
    crewMax: 8,
    hullBase: 100,
    shieldBase: 50,
    epsBase: 10,
    batteryBase: 4,
    reactorBase: 3,
    warpdriveBase: 2,
    evadeBase: 1,
    cargoCapacity: 20,
    buildTimeTicks: 2,
    isNpc: false,
  };
  rows.ShipClassDef = [hull];
  const manager: any = {
    findOne: async (entity: any, options: any) =>
      rows[entity.name]?.find((row) =>
        matches(row, options.where, rows.ShipClassDef),
      ) ?? null,
    count: async (entity: any, options: any) =>
      rows[entity.name]?.filter((row) =>
        matches(row, options.where, rows.ShipClassDef),
      ).length ?? 0,
    create: (entity: any, value: any) => Object.assign(new entity(), value),
    save: async (entity: any, value: any): Promise<any> => {
      if (Array.isArray(value))
        return Promise.all(value.map((row) => manager.save(entity, row)));
      if (!value.id) {
        value.id = rows[entity.name].length + 1;
        rows[entity.name].push(value);
      }
      return value;
    },
  };
  const dataSource: any = {
    transaction: async (work: any) => {
      const before = structuredClone(rows);
      const inventory = cargo;
      try {
        return await work(manager);
      } catch (error) {
        rows = before;
        cargo = inventory;
        throw error;
      }
    },
  };
  const gameData: any = {
    getShipClassSlotRuleForShipClass: () => ({
      moduleSlots: { SPECIAL: 0 },
      slots: [
        { slotId: 'weapon', moduleCategory: 'ENERGY_WEAPON', label: 'Weapon' },
      ],
    }),
    getShipClassDefByKey: () => ({
      buildCosts: [{ commodityId: 7, amount: 4 }],
    }),
    getHangarShipDef: () => null,
    getFabricationItemByOutputCommodity: () => ({
      queueType: 'MODULE',
      moduleType: 'Laser',
      shipyardType: 'ENERGY_WEAPON',
      moduleLevel: 3,
      shipyardModuleStats: { crew: 2 },
    }),
    isShipyardModuleAllowedForShipClass: () => true,
    getAllModules: () => [],
  };
  const unlocks: any = {
    isShipClassUnlocked: async () => true,
    hasTech: async () => true,
  };
  const core = new ShipbuildingCoreService(
    gameData,
    unlocks,
    dataSource,
    new SpacecraftStatsService(gameData),
    { dateAfterScaledMinutes: () => new Date(0) } as never,
  );
  let full = false;
  const adapter: any = {
    source: 'STATION',
    sourceId: 10,
    reserve: async () => ({ buildingFunctionId: null }),
    inventory: async () => [{ commodityId: 7, amount: cargo }],
    consume: async (_manager: any, costs: Array<{ amount: number }>) => {
      cargo -= costs.reduce((sum, cost) => sum + cost.amount, 0);
    },
    placement: async () => (full ? null : { locationId: 9, dockedAtId: 10 }),
  };
  return {
    core,
    adapter,
    hull,
    gameData,
    rows: () => rows,
    cargo: () => cargo,
    full: (value: boolean) => {
      full = value;
    },
  };
}

describe('source-neutral shipbuilding workflow', () => {
  it('keeps generated blueprint names within storage limits when a long default collides', async () => {
    const f = fixture();
    f.hull.name = 'Ä'.repeat(245);
    f.adapter.inventory = async () => [
      { commodityId: 7, amount: 100 },
      { commodityId: 1, amount: 2 },
    ];
    await f.core.startBuild(
      { userId: 2, shipClassId: 4, name: 'First' },
      f.adapter,
    );
    const second = await f.core.startBuild(
      {
        userId: 2,
        shipClassId: 4,
        name: 'Second',
        moduleSelections: [{ slotId: 'weapon', commodityId: 1 }],
      },
      f.adapter,
    );
    expect([...second.buildPlanName!]).toHaveLength(255);
    expect(second.buildPlanName).toMatch(/ \(2\)$/);
  });
  it('creates collision-safe default names for different unnamed designs', async () => {
    const f = fixture();
    f.adapter.inventory = async () => [
      { commodityId: 7, amount: 100 },
      { commodityId: 1, amount: 2 },
    ];
    const first = await f.core.startBuild(
      { userId: 2, shipClassId: 4, name: 'First' },
      f.adapter,
    );
    const second = await f.core.startBuild(
      {
        userId: 2,
        shipClassId: 4,
        name: 'Second',
        moduleSelections: [{ slotId: 'weapon', commodityId: 1 }],
      },
      f.adapter,
    );
    expect(first.buildPlanName).toBe('Corvette Buildplan');
    expect(second.buildPlanName).toBe('Corvette Buildplan (2)');
    expect(f.rows().ColonyShipBuildplan).toHaveLength(2);
  });
  it('rejects a station colonizer when another source already has one under construction', async () => {
    const f = fixture();
    f.hull.isColonizer = true;
    f.rows().ColonyShipBuildQueue.push({
      id: 8,
      userId: 2,
      shipClassId: 4,
      source: 'COLONY',
      colonyId: 3,
      status: 'QUEUED',
      mode: 'BUILD',
    });
    await expect(
      f.core.startBuild(
        { userId: 2, shipClassId: 4, name: 'Second' },
        f.adapter,
      ),
    ).rejects.toThrow('already under construction');
    expect(f.cargo()).toBe(4);
    expect(f.rows().ColonyShipBuildplan).toHaveLength(0);
    expect(f.rows().ColonyShipBuildQueue).toHaveLength(1);
  });
  it('does not build an immobile station hull as a docked ship', async () => {
    const f = fixture();
    f.gameData.getShipClassDefByKey = () => ({
      station: { dockCapacity: 2 },
      buildCosts: [],
    });
    await expect(
      f.core.startBuild(
        { userId: 2, shipClassId: 4, name: 'Station hull' },
        f.adapter,
      ),
    ).rejects.toThrow('Station hull');
    expect(f.cargo()).toBe(4);
    expect(f.rows().ColonyShipBuildQueue).toHaveLength(0);
  });

  it('requires a hull or saved blueprint instead of silently choosing a hull', async () => {
    const f = fixture();
    await expect(
      f.core.startBuild({ userId: 2, name: 'Missing hull' }, f.adapter),
    ).rejects.toThrow('Ship class is required');
    expect(f.cargo()).toBe(4);
  });

  it('rejects an owned operational colonizer but allows replacement of a destroyed one', async () => {
    const f = fixture();
    f.hull.isColonizer = true;
    f.rows().Spacecraft.push({
      id: 7,
      userId: 2,
      shipClassId: 4,
      status: 'IDLE',
    });
    await expect(
      f.core.startBuild(
        { userId: 2, shipClassId: 4, name: 'Second' },
        f.adapter,
      ),
    ).rejects.toThrow('Only one operational');
    expect(f.cargo()).toBe(4);
    f.rows().Spacecraft[0].status = 'DESTROYED';
    await expect(
      f.core.startBuild(
        { userId: 2, shipClassId: 4, name: 'Replacement' },
        f.adapter,
      ),
    ).resolves.toMatchObject({ status: 'QUEUED' });
  });

  it('retries a full dock without losing the paid job and completes exactly once', async () => {
    const f = fixture();
    const job = await f.core.startBuild(
      { userId: 2, shipClassId: 4, name: 'Hope', moduleSelections: [] },
      f.adapter,
    );
    f.full(true);
    await f.core.completeBuild(job.id, f.adapter);
    expect(f.rows().Spacecraft).toHaveLength(0);
    expect(job.status).toBe('QUEUED');
    expect(f.cargo()).toBe(0);
    f.full(false);
    await f.core.completeBuild(job.id, f.adapter);
    await f.core.completeBuild(job.id, f.adapter);
    expect(f.rows().Spacecraft).toHaveLength(1);
    expect(f.rows().Spacecraft[0]).toMatchObject({
      userId: 2,
      dockedAtId: 10,
      buildPlanId: 1,
      crew: 0,
      crewRequired: 2,
    });
    expect(job.status).toBe('COMPLETED');
  });
  it('rolls back a rejected construction without a blueprint, job or inventory loss', async () => {
    const f = fixture();
    await expect(
      f.core.startBuild(
        {
          userId: 2,
          shipClassId: 4,
          name: 'Invalid',
          moduleSelections: [{ slotId: 'missing', commodityId: 1 }],
        },
        f.adapter,
      ),
    ).rejects.toThrow('Invalid module selection');
    expect(f.rows().ColonyShipBuildplan).toHaveLength(0);
    expect(f.rows().ColonyShipBuildQueue).toHaveLength(0);
    expect(f.cargo()).toBe(4);
  });

  it('uses the paid canonical snapshot even when module definitions change before completion', async () => {
    const f = fixture();
    f.adapter.inventory = async () => [
      { commodityId: 7, amount: 4 },
      { commodityId: 1, amount: 1 },
    ];
    const job = await f.core.startBuild(
      {
        userId: 2,
        shipClassId: 4,
        name: 'Hope',
        moduleSelections: [{ slotId: 'weapon', commodityId: 1 }],
      },
      f.adapter,
    );
    f.gameData.getFabricationItemByOutputCommodity = () => undefined;
    await f.core.completeBuild(job.id, f.adapter);
    expect(f.rows().SpacecraftModule[0]).toMatchObject({
      moduleType: 'Laser',
      category: 'ENERGY_WEAPON',
      level: 3,
    });
    expect(f.rows().Spacecraft[0]).toMatchObject({ crewRequired: 4, crew: 0 });
  });

  it('creates a real reusable blueprint and exactly one source reference with the paid job', async () => {
    const f = fixture();
    const job = await f.core.startBuild(
      { userId: 2, shipClassId: 4, name: 'Hope', moduleSelections: [] },
      f.adapter,
    );
    expect(job).toMatchObject({
      source: 'STATION',
      stationId: 10,
      colonyId: null,
      buildPlanId: 1,
      buildPlanName: 'Corvette Buildplan',
      crewRequired: 2,
    });
    expect(f.rows().ColonyShipBuildplan).toHaveLength(1);
    expect(f.cargo()).toBe(0);
  });
});
