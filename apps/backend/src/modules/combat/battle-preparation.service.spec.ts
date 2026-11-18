jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  AlertState: { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' },
  SpacecraftOperatingMode: { NORMAL: 'NORMAL' },
  SpacecraftStatus: {
    DESTROYED: 'DESTROYED',
    IDLE: 'IDLE',
    IN_COMBAT: 'IN_COMBAT',
  },
}));
jest.mock('../spacecraft/spacecraft-repair.service', () => ({
  SpacecraftRepairService: class SpacecraftRepairService {},
}));
jest.mock('../spacecraft/spacecraft-crew.service', () => ({
  SpacecraftCrewService: class SpacecraftCrewService {},
}));
jest.mock('../spacecraft/spacecraft-torpedo.service', () => ({
  SpacecraftTorpedoService: class SpacecraftTorpedoService {},
}));
jest.mock('../spacecraft/entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../colony/entities/colony-storage.entity', () => ({
  ColonyStorage: class ColonyStorage {},
}));
jest.mock('../spacecraft/entities/cargo-item.entity', () => ({
  CargoItem: class CargoItem {},
}));
jest.mock('../anomaly/entities/anomaly.entity', () => ({
  Anomaly: class Anomaly {},
}));
jest.mock('../colony/entities/colony-ship-build-queue.entity', () => ({
  ColonyShipBuildQueue: class ColonyShipBuildQueue {},
  ColonyShipBuildQueueMode: {
    BUILD: 'BUILD',
    REPAIR: 'REPAIR',
    RETROFIT: 'RETROFIT',
  },
  ColonyShipBuildQueueStatus: {
    QUEUED: 'QUEUED',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  },
}));
import { FindOperator } from 'typeorm';
import { BattlePreparationService } from './battle-preparation.service';
import { CombatCause } from './combat-cause';
import { CombatEngine, CombatAction } from './combat.engine';
import { SpacecraftAlertService } from '../spacecraft/spacecraft-alert.service';
import { SpacecraftRuntimeStateService } from '../spacecraft/spacecraft-runtime-state.service';

function member(id: number, alertState = 'YELLOW'): any {
  return {
    ship: {
      id,
      userId: id,
      name: `Schiff ${id}`,
      kind: 'SHIP',
      alertState,
      locationId: 5,
      location: { kind: 'GALAXY_FIELD', galaxyField: {} },
      hull: 1000,
      hullMax: 1000,
      shields: 50,
      shieldsMax: 50,
      energy: 20,
      crew: 2,
      crewRequired: 2,
      status: 'IDLE',
      dockedAtId: 9,
      runtimeSystems: {
        WARPDRIVE: { active: true, cooldown: 0, integrity: 100 },
        CLOAK: { active: true, cooldown: 0, integrity: 100 },
      },
    },
    modules: [
      ['COMPUTER', 'Computer'],
      ['EPS', 'Energieverteiler'],
      ['SHIELDS', 'Schilde'],
      ['SENSORS', 'Sensoren'],
      ['WEAPONS', 'Laser'],
      ['PROJECTILE', 'Torpedobank'],
      ['HYPERDRIVE', 'Antrieb'],
      ['SPECIAL', 'Tarnvorrichtung'],
    ].map(([category, moduleType]) => ({
      spacecraftId: id,
      category,
      moduleType,
      integrity: 100,
      cooldown: 0,
      isActive: true,
      level: 1,
    })),
  };
}
function matches(row: any, where: any): boolean {
  return Object.entries(where).every(([key, value]) =>
    value instanceof FindOperator
      ? value.type === 'in'
        ? value.value.includes(row[key])
        : value.type === 'moreThan'
          ? row[key] > value.value
          : false
      : row[key] === value,
  );
}
function fixture(members = [member(1), member(2)]) {
  let rows: Record<string, any[]> = {
    Spacecraft: structuredClone(members.map((entry) => entry.ship)),
    Colony: [{ userId: 1 }, { userId: 2 }],
    Anomaly: [],
    ColonyShipBuildQueue: [],
    ColonyStorage: [],
    CargoItem: [],
  };
  const manager: any = {
    find: jest.fn(async (entity, options) =>
      (rows[entity.name] ?? []).filter((row) => matches(row, options.where)),
    ),
    findOne: jest.fn(
      async (entity, options) =>
        rows[entity.name].find((row) => matches(row, options.where)) ?? null,
    ),
    exists: jest.fn(async (entity, options) =>
      rows[entity.name].some((row) => matches(row, options.where)),
    ),
    create: (entity: any, value: any) => Object.assign(new entity(), value),
    save: jest.fn(async (entity, value) => {
      const collection = rows[entity.name];
      const index = collection.findIndex(
        (row) => row.id === value.id && value.id != null,
      );
      if (index >= 0) collection[index] = structuredClone(value);
      else {
        value.id ??= collection.length + 1;
        collection.push(structuredClone(value));
      }
      return value;
    }),
  };
  const db = {
    transaction: async (work: any) => {
      const before = structuredClone(rows);
      try {
        return await work(manager);
      } catch (error) {
        rows = before;
        throw error;
      }
    },
  };
  const repairs = { cancelTasks: jest.fn(async () => []) };
  const crew = {
    hasEnoughCrew: jest.fn(async (ship) => ship.crew >= ship.crewRequired),
  };
  const service = new BattlePreparationService(
    db as any,
    repairs as any,
    crew as any,
    new SpacecraftAlertService(new SpacecraftRuntimeStateService()),
  );
  return { service, manager, repairs, crew, rows: () => rows, members };
}

describe('BattlePreparationService FightLib ready', () => {
  it('prepares both parties before any fire, cancels/refunds tasks and retains red alert after combat', async () => {
    const f = fixture([member(1, 'YELLOW'), member(2, 'RED')]);
    f.repairs.cancelTasks.mockResolvedValue([
      { userId: 1, name: 'Schiff 1' },
    ] as never);
    const log = await f.service.prepare(
      [f.members[0]],
      [f.members[1]],
      CombatCause.SHIP_FIGHT,
    );
    for (const participant of f.members) {
      expect(participant.ship.dockedAtId).toBeNull();
      expect(participant.ship.runtimeSystems.WARPDRIVE.active).toBe(false);
      expect(participant.ship.runtimeSystems.CLOAK.active).toBe(false);
      for (const key of ['SHIELDS', 'SHORT_RANGE_SENSORS', 'WEAPONS'])
        expect(participant.ship.runtimeSystems[key].active).toBe(true);
    }
    expect(f.members[0].ship.runtimeSystems.TORPEDO_BANK.active).toBe(false);
    expect(f.members[1].ship.runtimeSystems.TORPEDO_BANK.active).toBe(true);
    expect(f.members.map((entry) => entry.ship.energy)).toEqual([17, 16]);
    expect(f.repairs.cancelTasks).toHaveBeenCalledWith(f.manager, [1], true);
    expect(f.repairs.cancelTasks).toHaveBeenCalledWith(f.manager, [2], true);
    expect(
      log.every((entry) => entry.action === CombatAction.PREPARATION),
    ).toBe(true);
    const formulas: any = {
      damage: {
        level_scaling: 0,
        base_multiplier: 1,
        variance_min: 1,
        variance_max: 1,
        crit_chance: 0,
      },
      hit_chance: { base: 1, min: 0, max: 1, speed_modifier: 0 },
      ship_class_modifiers: {},
      ion_effects: { disable_chance: 0 },
    };
    const engine = new CombatEngine(
      {
        getCombatFormulas: () => formulas,
        getAllModules: () => [
          { name: 'Laser', secret: { baseDamage: 1 }, public: {} },
        ],
      } as any,
      { consumeForAttack: async () => null } as any,
      { next: () => 0.5 },
    );
    await engine.resolveBattle([f.members[0]], [f.members[1]]);
    expect(f.members.map((entry) => entry.ship.alertState)).toEqual([
      'YELLOW',
      'RED',
    ]);
  });

  it('GREEN follows the STU early return: raises to yellow but does not activate combat systems yet', async () => {
    const f = fixture([member(1, 'GREEN')]);
    const log = await f.service.prepare(f.members, [], CombatCause.SHIP_FIGHT);
    expect(f.members[0].ship.alertState).toBe('YELLOW');
    expect(f.members[0].ship.energy).toBe(19);
    expect(f.members[0].ship.runtimeSystems.SHIELDS.active).toBe(false);
    expect(log).toContainEqual(
      expect.objectContaining({ detail: 'Alarmstufe auf Gelb geändert' }),
    );
  });

  it.each([CombatCause.ACTIVATE_TRACTOR, CombatCause.BOARD_SHIP])(
    'leaves defenders completely unprepared for %s',
    async (cause) => {
      const f = fixture();
      const original = structuredClone(f.members[1].ship);
      await f.service.prepare([f.members[0]], [f.members[1]], cause);
      expect(f.members[1].ship).toEqual(original);
      expect(f.rows().Spacecraft[1]).toEqual(original);
      expect(f.repairs.cancelTasks).toHaveBeenCalledTimes(1);
    },
  );

  it('cancels queued/paused repairs and retrofits once, preserves build/completed jobs and refunds their actual source', async () => {
    const f = fixture([member(1)]);
    f.rows().ColonyShipBuildQueue.push(
      { id: 1, spacecraftId: 1, mode: 'REPAIR', status: 'QUEUED' },
      {
        id: 2,
        spacecraftId: 1,
        mode: 'RETROFIT',
        status: 'PAUSED',
        colonyId: 10,
        retrofitSnapshot: { consumedModuleCommodityIds: [7, 7] },
      },
      {
        id: 3,
        spacecraftId: 1,
        mode: 'RETROFIT',
        status: 'QUEUED',
        stationId: 20,
        retrofitSnapshot: { consumedModuleCommodityIds: [8] },
      },
      { id: 4, spacecraftId: 1, mode: 'BUILD', status: 'QUEUED' },
      {
        id: 5,
        spacecraftId: 1,
        mode: 'RETROFIT',
        status: 'COMPLETED',
        colonyId: 10,
        retrofitSnapshot: { consumedModuleCommodityIds: [7] },
      },
    );
    f.rows().ColonyStorage.push({
      id: 1,
      colonyId: 10,
      commodityId: 7,
      amount: 5,
    });
    await f.service.prepare(f.members, [], CombatCause.SHIP_FIGHT);
    expect(f.rows().ColonyShipBuildQueue.map((row) => row.status)).toEqual([
      'CANCELLED',
      'CANCELLED',
      'CANCELLED',
      'QUEUED',
      'COMPLETED',
    ]);
    expect(f.rows().ColonyStorage[0].amount).toBe(7);
    expect(f.rows().CargoItem[0]).toMatchObject({
      spacecraftId: 20,
      commodityId: 8,
      amount: 1,
    });
    await f.service.prepare(f.members, [], CombatCause.SHIP_FIGHT);
    expect(f.rows().ColonyStorage[0].amount).toBe(7);
    expect(f.rows().CargoItem[0].amount).toBe(1);
  });

  it('rolls back cancellation/refunds and does not mutate caller snapshots if readiness persistence fails', async () => {
    const f = fixture([member(1)]);
    f.rows().ColonyShipBuildQueue.push({
      id: 1,
      spacecraftId: 1,
      mode: 'RETROFIT',
      status: 'QUEUED',
      colonyId: 10,
      retrofitSnapshot: { consumedModuleCommodityIds: [7] },
    });
    const before = structuredClone(f.rows());
    const original = structuredClone(f.members[0].ship);
    f.manager.save.mockImplementation(async (entity: any) => {
      if (entity.name === 'Spacecraft') throw new Error('save failed');
    });
    await expect(
      f.service.prepare(f.members, [], CombatCause.SHIP_FIGHT),
    ).rejects.toThrow('save failed');
    expect(f.rows()).toEqual(before);
    expect(f.members[0].ship).toEqual(original);
  });

  it.each(['crew', 'eps', 'computer', 'anomaly', 'held'])(
    'reports %s readiness failures with the relevant ship ID',
    async (reason) => {
      const f = fixture([member(1, reason === 'eps' ? 'GREEN' : 'YELLOW')]);
      if (reason === 'crew') f.crew.hasEnoughCrew.mockResolvedValue(false);
      if (reason === 'eps') f.rows().Spacecraft[0].energy = 0;
      if (reason === 'computer')
        f.rows().Spacecraft[0].runtimeSystems.COMPUTER = {
          active: false,
          integrity: 100,
          cooldown: 0,
        };
      if (reason === 'anomaly')
        f.rows().Anomaly.push({
          locationId: 5,
          remainingTicks: 1,
          type: { key: 'ION_STORM' },
        });
      if (reason === 'held')
        f.rows().Spacecraft.push({ id: 9, tractoredShipId: 1 });
      const log = await f.service.prepare(
        f.members,
        [],
        CombatCause.SHIP_FIGHT,
      );
      expect(log).toContainEqual(
        expect.objectContaining({
          sourceId: 1,
          detail: expect.stringMatching(/nicht|Nicht/),
        }),
      );
      expect(f.members[0].ship.runtimeSystems.SHIELDS.active).toBe(false);
    },
  );

  it('rejects a ship that left the sector before cancelling any work', async () => {
    const f = fixture([member(1)]);
    f.rows().Spacecraft[0].locationId = 6;
    await expect(
      f.service.prepare(f.members, [], CombatCause.SHIP_FIGHT),
    ).rejects.toThrow('Kampfsektor verlassen');
    expect(f.repairs.cancelTasks).not.toHaveBeenCalled();
  });
});
