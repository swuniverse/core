jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('./entities/colony-field.entity', () => ({
  ColonyField: class ColonyField {},
}));
jest.mock('./entities/colony-storage.entity', () => ({
  ColonyStorage: class ColonyStorage {},
}));

import { ConfigService } from '@nestjs/config';
import { WsEventType } from '@swuniverse/shared';
import { BuildingLifecycleService } from './building-lifecycle.service';
import { ColonyBuildingEffectsService } from './colony-building-effects.service';
import { ColonyConstructionService } from './colony-construction.service';
import { ColonyStorageService } from './colony-storage.service';
import { ColonyTickProcessorService } from './colony-tick-processor.service';
import { ColonyEventService } from '../messaging/colony-event.service';
import { TickService } from '../tick/tick.service';

function setup(producesMaintenance = true, sourceActive = true) {
  const definition = (
    id: number,
    production: Array<{ commodityId: number; amount: number }>,
    bevUse = 0,
  ) => ({
    id,
    name: `Gebäude ${id}`,
    production,
    bevUse,
    bevPro: 0,
    epsProc: 0,
    epsCost: 0,
    integrity: 100,
    resourceCosts: [],
    bonuses: { storage: 0 },
    costs: { buildTime: 60 },
    functions: [],
  });
  const sourceProduction = [
    ...(producesMaintenance ? [{ commodityId: 1801, amount: 2 }] : []),
    { commodityId: 1802, amount: 3 },
  ];
  const definitions = {
    100: definition(100, sourceProduction, 2),
    101: definition(101, [...sourceProduction], 2),
    200: {
      ...definition(200, [{ commodityId: 1801, amount: -1 }], 2),
      epsProc: -5,
    },
    300: definition(300, []),
    400: definition(400, [{ commodityId: 1802, amount: -1 }]),
  };
  const field = (id: number, buildingId: number, isActive = true) => ({
    id,
    colonyId: 1,
    fieldIndex: id + 10,
    fieldType: 101,
    layer: buildingId === 200 ? 'ORBIT' : 'SURFACE',
    buildingId: buildingId as number | null,
    isActive,
    isBuilding: false,
    integrity: 100,
    maxIntegrity: 100,
    activateAfterBuild: true,
    buildProgress: 100,
    buildFinishesAt: null as Date | null,
    reactivateAfterUpgrade: null as number | null,
  });
  const source = field(1, 100, sourceActive);
  const consumers = [field(2, 200), field(3, 200)];
  const inactive = field(4, 200, false);
  const underground = field(5, 400);
  const unrelated = field(6, 300);
  const foreignMarker = { ...field(7, 200, false), reactivateAfterUpgrade: 99 };
  const workers = (sourceActive ? 2 : 0) + 4;
  const colony = {
    id: 1,
    userId: 7,
    energy: 50,
    isAbandoned: false,
    fields: [
      source,
      ...consumers,
      inactive,
      underground,
      unrelated,
      foreignMarker,
    ],
    storage: [{ colonyId: 1, commodityId: 2, amount: 20 }],
    changeable: {
      colonyId: 1,
      energy: 50,
      maxEnergy: 100,
      workers,
      workless: 20 - workers,
      maxPopulation: 100,
      maxStorage: 100,
    },
  };
  const gameData = {
    getBuilding: (id: number) => definitions[id as keyof typeof definitions],
    getBuildingFunctions: () => [],
    getCommodity: (id: number) => ({
      name: `Ware ${id}`,
      isSaveable: id < 1800,
      isDeposit: false,
    }),
  };
  const stats = {
    calculateSummary: (_colony: typeof colony, ignored = new Set<number>()) => {
      const active = colony.fields.filter(
        (f) => f.isActive && !f.isBuilding && !ignored.has(f.id),
      );
      const productionDelta = new Map<number, number>();
      let workerUse = 0;
      let energyDelta = 0;
      for (const f of active) {
        const d = gameData.getBuilding(f.buildingId!);
        if (!d) continue;
        workerUse += d.bevUse;
        energyDelta += d.epsProc;
        for (const p of d.production)
          productionDelta.set(
            p.commodityId,
            (productionDelta.get(p.commodityId) ?? 0) + p.amount,
          );
      }
      return {
        productionDelta,
        energyDelta,
        effectiveStorageMax: 100,
        effectiveState: {
          energy: { max: 100 },
          population: {
            available:
              colony.changeable.workers +
              colony.changeable.workless -
              workerUse,
          },
        },
      };
    },
  };
  const fieldRepo = { save: jest.fn(async (value) => value) };
  const changeableRepo = { save: jest.fn(async (value) => value) };
  const colonyRepo = {
    save: jest.fn(async (value) => value),
    increment: jest.fn(async () => ({ affected: 1 })),
    find: jest.fn(async () => [colony]),
  };
  const storageRepo = {
    findOne: jest.fn(async ({ where }) =>
      colony.storage.find((s) => s.commodityId === where.commodityId),
    ),
    save: jest.fn(async (value) => value),
    create: (value: unknown) => value,
    createQueryBuilder: () => ({
      select: () => ({
        where: () => ({
          getRawOne: async () => ({
            total: colony.storage.reduce((sum, item) => sum + item.amount, 0),
          }),
        }),
      }),
    }),
  };
  const hooks = {
    activate: jest.fn(),
    deactivate: jest.fn(),
    destruct: jest.fn(),
  };
  const effects = new ColonyBuildingEffectsService(
    gameData as never,
    {} as never,
    stats as never,
  );
  const lifecycle = new BuildingLifecycleService(
    fieldRepo as never,
    changeableRepo as never,
    new ConfigService(),
    gameData as never,
    hooks as never,
    effects,
  );
  const storage = new ColonyStorageService(storageRepo as never);
  const eventService = { createActionEvent: jest.fn() };
  const construction = new ColonyConstructionService(
    colonyRepo as never,
    fieldRepo as never,
    storageRepo as never,
    gameData as never,
    {} as never,
    stats as never,
    storage,
    lifecycle,
    {} as never,
    eventService as never,
    { findOwnedColony: async () => colony } as never,
    {} as never,
  );
  jest.spyOn(construction, 'validateUpgrade').mockResolvedValue({
    upgrade: {
      toBuildingId: 101,
      energyCost: 5,
      costs: [{ commodityId: 2, amount: 2 }],
    },
    currentDefinition: definitions[100],
    targetDefinition: definitions[101],
  } as never);
  const processor = new ColonyTickProcessorService(
    colonyRepo as never,
    changeableRepo as never,
    fieldRepo as never,
    storageRepo as never,
    {} as never,
    {} as never,
    {} as never,
    gameData as never,
    stats as never,
    storage,
    lifecycle,
    {} as never,
    {} as never,
    eventService as never,
    {} as never,
    {} as never,
  );
  const upgrade = () =>
    construction.upgradeBuilding(1, 7, source.fieldIndex, 100101);
  const complete = () =>
    lifecycle.finishBuildingWithReactivation(
      colony as never,
      source as never,
      definitions[101] as never,
      source.activateAfterBuild,
    );
  return {
    colony,
    source,
    consumers,
    inactive,
    underground,
    unrelated,
    foreignMarker,
    definitions,
    lifecycle,
    construction,
    processor,
    upgrade,
    complete,
    fieldRepo,
    colonyRepo,
    hooks,
  };
}

describe('orbital maintenance upgrade reactivation', () => {
  it('deactivates and marks active maintenance consumers by source ID, without marking the source', async () => {
    const {
      upgrade,
      colony,
      source,
      consumers,
      inactive,
      underground,
      unrelated,
      foreignMarker,
      fieldRepo,
    } = setup();
    await upgrade();
    expect(source).toMatchObject({
      buildingId: 101,
      isBuilding: true,
      isActive: false,
      activateAfterBuild: true,
      reactivateAfterUpgrade: null,
    });
    for (const consumer of consumers) {
      expect(consumer).toMatchObject({
        isActive: false,
        reactivateAfterUpgrade: source.id,
      });
      expect(fieldRepo.save).toHaveBeenCalledWith(consumer);
    }
    expect(inactive.reactivateAfterUpgrade).toBeNull();
    expect(underground.isActive).toBe(true);
    expect(unrelated.isActive).toBe(true);
    expect(foreignMarker.reactivateAfterUpgrade).toBe(99);
    expect(colony.changeable.workers).toBe(0);
    expect(colony.changeable.workless).toBe(20);
    expect(colony.changeable.energy).toBe(45);
    expect(colony.storage[0].amount).toBe(18);
  });

  it.each([
    [false, true],
    [true, false],
  ])(
    'leaves other fields unchanged for maintenance=%s, sourceActive=%s',
    async (maintenance, active) => {
      const { upgrade, consumers, source } = setup(maintenance, active);
      await upgrade();
      expect(
        consumers.every((f) => f.isActive && f.reactivateAfterUpgrade === null),
      ).toBe(true);
      expect(source.reactivateAfterUpgrade).toBeNull();
      expect(source.activateAfterBuild).toBe(active);
    },
  );

  it('reactivates precisely the marked consumers, clears their markers, and emits a completion count', async () => {
    const {
      upgrade,
      colony,
      source,
      consumers,
      inactive,
      foreignMarker,
      processor,
    } = setup();
    await upgrade();
    source.buildFinishesAt = new Date(0);
    const events: Array<{
      type: string;
      activated?: boolean;
      reactivatedCount?: number;
    }> = [];
    await processor.checkBuildingCompletions(colony as never, events as never);
    expect(
      consumers.every((f) => f.isActive && f.reactivateAfterUpgrade === null),
    ).toBe(true);
    expect(inactive.isActive).toBe(false);
    expect(foreignMarker).toMatchObject({
      isActive: false,
      reactivateAfterUpgrade: 99,
    });
    expect(colony.changeable.workers).toBe(6);
    expect(events).toEqual([
      expect.objectContaining({
        type: 'BUILDING_FINISHED',
        activated: true,
        reactivatedCount: 2,
      }),
    ]);
    await processor.checkBuildingCompletions(colony as never, events as never);
    expect(events).toHaveLength(1);
  });

  it.each(['disabled', 'workers', 'energy'] as const)(
    'clears markers without reactivation when source activation fails: %s',
    async (reason) => {
      const { upgrade, complete, colony, source, consumers, definitions } =
        setup();
      await upgrade();
      if (reason === 'disabled') source.activateAfterBuild = false;
      if (reason === 'workers') colony.changeable.workless = 1;
      if (reason === 'energy') {
        colony.changeable.energy = 0;
        definitions[101].epsProc = -10;
      }
      const result = await complete();
      expect(source.isActive).toBe(false);
      expect(result.reactivatedCount).toBe(0);
      expect(result.activationReason).toBeTruthy();
      expect(
        consumers.every(
          (f) => !f.isActive && f.reactivateAfterUpgrade === null,
        ),
      ).toBe(true);
    },
  );

  it.each(['workers', 'energy', 'damage', 'capacity'] as const)(
    'checks each consumer before reactivation: %s',
    async (reason) => {
      const { upgrade, complete, colony, consumers, definitions } = setup();
      await upgrade();
      if (reason === 'workers') colony.changeable.workless = 3;
      if (reason === 'energy') colony.changeable.energy = 0;
      if (reason === 'damage') consumers[1].integrity = 20;
      if (reason === 'capacity')
        definitions[101].production = [
          { commodityId: 1801, amount: 1 },
          { commodityId: 1802, amount: 3 },
        ];
      const result = await complete();
      expect(result.field.isActive).toBe(true);
      expect(result.reactivatedCount).toBe(
        reason === 'workers' || reason === 'energy' ? 0 : 1,
      );
      expect(consumers.every((f) => f.reactivateAfterUpgrade === null)).toBe(
        true,
      );
      expect(consumers[1].isActive).toBe(false);
    },
  );

  it('clears a legacy self-marker and never counts the upgraded field as a reactivated consumer', async () => {
    const { upgrade, complete, source } = setup();
    await upgrade();
    source.reactivateAfterUpgrade = source.id;
    expect((await complete()).reactivatedCount).toBe(2);
    expect(source.reactivateAfterUpgrade).toBeNull();
  });

  it('clears all linked markers when an in-progress upgrade is replaced', async () => {
    const { upgrade, construction, colony, source, consumers, definitions } =
      setup();
    await upgrade();
    jest
      .spyOn(construction, 'validateBuildPlacement')
      .mockResolvedValue(definitions[300] as never);
    await construction.build(1, 7, source.fieldIndex, 300);
    expect(source).toMatchObject({
      buildingId: 300,
      isBuilding: true,
      reactivateAfterUpgrade: null,
    });
    expect(
      consumers.every((f) => !f.isActive && f.reactivateAfterUpgrade === null),
    ).toBe(true);
    expect(colony.changeable.workers).toBe(0);
  });

  it('does not reactivate a replacement on a formerly marked consumer field', async () => {
    const { upgrade, complete, construction, consumers } = setup();
    await upgrade();
    await construction.demolish(1, 7, consumers[0].fieldIndex);
    Object.assign(consumers[0], {
      buildingId: 300,
      isActive: false,
      integrity: 100,
      maxIntegrity: 100,
    });
    expect((await complete()).reactivatedCount).toBe(1);
    expect(consumers[0].isActive).toBe(false);
    expect(consumers[0].reactivateAfterUpgrade).toBeNull();
  });

  it('persists and delivers reactivation from the actual minute completion runner', async () => {
    const { upgrade, colony, source, processor, colonyRepo } = setup();
    await upgrade();
    source.buildFinishesAt = new Date(0);
    const messageRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const events = new ColonyEventService(messageRepo as never);
    const gateway = { emitToUser: jest.fn() };
    const minute = new TickService(
      colonyRepo as never,
      {
        find: async () =>
          colony.fields
            .filter((f) => f.isBuilding)
            .map(() => ({ colonyId: 1 })),
      } as never,
      {} as never,
      {} as never,
      {
        findOne: async () => null,
        create: (value: unknown) => value,
        save: async (value: unknown) => value,
      } as never,
      {
        checkBuildingCompletions:
          processor.checkBuildingCompletions.bind(processor),
      } as never,
      events,
      {} as never,
      {} as never,
      gateway as never,
      new ConfigService(),
      {} as never,
      {} as never,
    );
    await minute.checkBuildingCompletions();
    expect(messageRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 7,
        body: 'Gebäude 101 wurde fertiggestellt und aktiviert. Es wurden 2 Orbitalgebäude reaktiviert.',
        originPayload: expect.objectContaining({ reactivatedCount: 2 }),
      }),
    );
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      7,
      WsEventType.COLONY_TICK_REPORT,
      expect.objectContaining({
        events: [expect.objectContaining({ reactivatedCount: 2 })],
      }),
    );
  });
});
