jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../colony/entities/crew.entity', () => ({
  Crew: class Crew {},
  CrewType: {},
}));
jest.mock('../colony/entities/crew-assignment.entity', () => ({
  CrewAssignment: class CrewAssignment {},
}));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../starmap/entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('../starmap/entities/layer.entity', () => ({
  Layer: class Layer {},
}));
jest.mock('../starmap/entities/celestial-object.entity', () => ({
  CelestialObject: class CelestialObject {},
}));
jest.mock('../starmap/entities/galaxy-field.entity', () => ({
  GalaxyField: class GalaxyField {},
}));
jest.mock('../starmap/entities/system-field.entity', () => ({
  SystemField: class SystemField {},
}));
jest.mock('../starmap/entities/space-location.entity', () => ({
  SpaceLocation: class SpaceLocation {},
}));
jest.mock('../starmap/generator/planet-generator.service', () => ({
  PlanetGeneratorService: class PlanetGeneratorService {},
}));
jest.mock('../starmap/generator/stu-planet-surface.generator', () => ({
  supportsStuSurface: jest.fn(() => true),
}));
jest.mock('./entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('./entities/fleet.entity', () => ({ Fleet: class Fleet {} }));
jest.mock('./entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));
jest.mock('./entities/spacecraft-wreck.entity', () => ({
  SpacecraftWreck: class SpacecraftWreck {},
}));
jest.mock('./entities/admin-ship-buildplan.entity', () => ({
  AdminShipBuildplan: class AdminShipBuildplan {},
}));
jest.mock('./entities/spacecraft.entity', () => ({
  AlertState: { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' },
  SpacecraftOperatingMode: { NORMAL: 'NORMAL', STANDBY: 'STANDBY' },
  SpacecraftLssMode: { DISABLED: 'DISABLED', CARTOGRAPHY: 'CARTOGRAPHY' },
  SpacecraftStatus: {
    IDLE: 'IDLE',
    IN_FLIGHT: 'IN_FLIGHT',
    IN_COMBAT: 'IN_COMBAT',
    DESTROYED: 'DESTROYED',
  },
  Spacecraft: class Spacecraft {},
}));

import { SpacecraftService } from './spacecraft.service';
import {
  SpacecraftLssMode,
  SpacecraftOperatingMode,
  SpacecraftStatus,
} from './entities/spacecraft.entity';

type Plan = {
  id: number;
  userId: number;
  starSystemId: number;
  status: 'PLANNED' | 'MEASURED' | 'FINISHING' | 'DONE';
  remainingFieldIds: number[];
  finalizationStartedAt: Date | null;
  finalizationTick: number | null;
  finalizingSpacecraftId: number | null;
  completedAt: Date | null;
};

const qualifiedSystems = () => ({
  ASTROMETRY_LAB: { active: true, integrity: 100, cooldown: 0 },
  SHORT_RANGE_SENSORS: { active: true, integrity: 100, cooldown: 0 },
  LONG_RANGE_SENSORS: { active: true, integrity: 100, cooldown: 0 },
  LIFE_SUPPORT: { active: true, integrity: 100, cooldown: 0 },
  SUBLIGHT_DRIVE: { active: true, integrity: 100, cooldown: 0 },
  WARPDRIVE: { active: true, integrity: 100, cooldown: 0 },
});

function systemLocation(fieldId: number, x: number, y: number) {
  return {
    locationId: fieldId + 100,
    location: {
      id: fieldId + 100,
      kind: 'SYSTEM_FIELD',
      systemField: { id: fieldId, starSystemId: 42, sx: x, sy: y },
    },
  };
}

function createHarness() {
  const ships = new Map<number, any>([
    [
      1,
      {
        id: 1,
        userId: 11,
        shipClassId: 1,
        status: SpacecraftStatus.IDLE,
        operatingMode: SpacecraftOperatingMode.NORMAL,
        energy: 40,
        energyMax: 40,
        epsMax: 40,
        battery: 0,
        batteryMax: 0,
        reactorFuel: 10,
        reactorOutput: 3,
        warpdrive: 5,
        warpdriveMax: 5,
        warpCooldown: 0,
        shields: 0,
        shieldsMax: 0,
        modules: [],
        runtimeSystems: qualifiedSystems(),
        lssMode: SpacecraftLssMode.DISABLED,
        ...systemLocation(10, 1, 1),
      },
    ],
    [
      2,
      {
        id: 2,
        userId: 11,
        shipClassId: 1,
        status: SpacecraftStatus.IDLE,
        operatingMode: SpacecraftOperatingMode.NORMAL,
        energy: 40,
        energyMax: 40,
        epsMax: 40,
        battery: 0,
        batteryMax: 0,
        reactorFuel: 10,
        reactorOutput: 3,
        warpdrive: 5,
        warpdriveMax: 5,
        warpCooldown: 0,
        shields: 0,
        shieldsMax: 0,
        modules: [],
        runtimeSystems: qualifiedSystems(),
        lssMode: SpacecraftLssMode.DISABLED,
        ...systemLocation(12, 1, 3),
      },
    ],
  ]);
  const fields = [
    { id: 10, starSystemId: 42, sx: 1, sy: 1, isPassable: true, damage: 0 },
    { id: 11, starSystemId: 42, sx: 1, sy: 2, isPassable: true, damage: 0 },
    { id: 12, starSystemId: 42, sx: 1, sy: 3, isPassable: true, damage: 0 },
  ];
  let plan: Plan | null = null;
  const discoveries: Array<{ userId: number; starSystemId: number }> = [];
  const prestige = { change: jest.fn() };
  const messages = { sendSystem: jest.fn() };
  const cartography = {
    getPlan: jest.fn(async (userId: number, systemId: number) =>
      plan?.userId === userId && plan.starSystemId === systemId ? plan : null,
    ),
    getPlanForFinalizingSpacecraft: jest.fn(async (spacecraftId: number) =>
      plan?.status === 'FINISHING' &&
      plan.finalizingSpacecraftId === spacecraftId
        ? plan
        : null,
    ),
    createPlan: jest.fn(
      async (userId: number, systemId: number, fieldIds: number[]) => {
        plan ??= {
          id: 1,
          userId,
          starSystemId: systemId,
          status: fieldIds.length ? 'PLANNED' : 'MEASURED',
          remainingFieldIds: [...fieldIds],
          finalizationStartedAt: null,
          finalizationTick: null,
          finalizingSpacecraftId: null,
          completedAt: null,
        };
        return plan;
      },
    ),
    claimArrivedField: jest.fn(
      async (_userId: number, _systemId: number, fieldId: number) => {
        if (
          !plan ||
          plan.status !== 'PLANNED' ||
          !plan.remainingFieldIds.includes(fieldId)
        ) {
          return { claimed: false, completed: false };
        }
        plan.remainingFieldIds = plan.remainingFieldIds.filter(
          (id) => id !== fieldId,
        );
        const completed = plan.remainingFieldIds.length === 0;
        if (completed) plan.status = 'MEASURED';
        return { claimed: true, completed };
      },
    ),
    startFinalization: jest.fn(
      async (_userId: number, _systemId: number, spacecraftId: number) => {
        if (!plan || plan.status !== 'MEASURED')
          throw new Error('not measured');
        plan.status = 'FINISHING';
        plan.finalizingSpacecraftId = spacecraftId;
        plan.finalizationTick = 0;
        plan.finalizationStartedAt = new Date('2026-10-16T12:00:00.000Z');
        return plan;
      },
    ),
    resetFinishingForSpacecraft: jest.fn(async (spacecraftId: number) => {
      if (
        plan?.status === 'FINISHING' &&
        plan.finalizingSpacecraftId === spacecraftId
      ) {
        plan.status = 'MEASURED';
        plan.finalizingSpacecraftId = null;
        plan.finalizationTick = null;
        plan.finalizationStartedAt = null;
      }
    }),
    progressFinalization: jest.fn(async (spacecraftId: number) => {
      if (
        !plan ||
        plan.status !== 'FINISHING' ||
        plan.finalizingSpacecraftId !== spacecraftId
      ) {
        return { completed: false, userId: null, starSystemId: null };
      }
      plan.finalizationTick = (plan.finalizationTick ?? 0) + 1;
      if (plan.finalizationTick < 3) {
        return { completed: false, userId: null, starSystemId: null };
      }
      plan.status = 'DONE';
      plan.finalizingSpacecraftId = null;
      plan.completedAt = new Date();
      discoveries.push({
        userId: plan.userId,
        starSystemId: plan.starSystemId,
      });
      return {
        completed: true,
        userId: plan.userId,
        starSystemId: plan.starSystemId,
      };
    }),
  };
  const shipRepo = {
    findOne: jest.fn(async ({ where }: any) => ships.get(where.id) ?? null),
    save: jest.fn(async (ship: any) => {
      ships.set(ship.id, ship);
      return ship;
    }),
  };
  const moduleRepo = { find: jest.fn(async () => []), save: jest.fn() };
  const systemFieldRepo = {
    find: jest.fn(async () => fields),
    findOne: jest.fn(
      async ({ where }: any) =>
        fields.find(
          (field) => field.sx === where.sx && field.sy === where.sy,
        ) ?? null,
    ),
    findByIds: jest.fn(async (ids: number[]) =>
      fields.filter((field) => ids.includes(field.id)),
    ),
  };
  const dataSource = {
    getRepository: jest.fn(() => ({
      find: jest.fn(async () => []),
      findOne: jest.fn(async ({ where }: any) => {
        const field = fields.find(
          (candidate) => candidate.id === where.systemFieldId,
        );
        return field
          ? {
              id: field.id + 100,
              kind: 'SYSTEM_FIELD',
              systemField: field,
            }
          : null;
      }),
    })),
  };
  const runtime = {
    initialize: jest.fn((ship: any) => ship.runtimeSystems),
    getSystems: jest.fn((ship: any) => ship.runtimeSystems),
  };
  const service = new SpacecraftService(
    shipRepo as never,
    moduleRepo as never,
    {} as never,
    { findOne: jest.fn(async () => ({ id: 42, maxX: 3, maxY: 3 })) } as never,
    {} as never,
    {} as never,
    {} as never,
    systemFieldRepo as never,
    {} as never,
    dataSource as never,
    { getCombatFormulas: jest.fn() } as never,
    { findById: jest.fn(async () => ({ flightEnergyCost: 1 })) } as never,
    { isSystemExplored: jest.fn(async () => false) } as never,
    {} as never,
    {} as never,
    {} as never,
    {
      getRequiredCrew: jest.fn(async () => 1),
      getAssignedCrewCount: jest.fn(async () => 1),
      hasEnoughCrew: jest.fn(async () => true),
    } as never,
    {} as never,
    { recharge: jest.fn() } as never,
    runtime as never,
    { emitToUser: jest.fn() } as never,
    {} as never,
    {
      saveUnlessDestroyed: jest.fn(async (ship: any) => {
        await shipRepo.save(ship);
        return true;
      }),
    } as never,
    {} as never,
    {} as never,
    {} as never,
    cartography as never,
    messages as never,
    prestige as never,
  );
  jest
    .spyOn(service, 'findOne')
    .mockImplementation(async (id: number, userId: number) => {
      const ship = ships.get(id);
      if (!ship || ship.userId !== userId) throw new Error('not found');
      return ship;
    });
  jest.spyOn(service as any, 'getSensorRange').mockResolvedValue(1);
  return {
    service,
    ships,
    cartography,
    prestige,
    messages,
    discoveries,
    get plan() {
      return plan;
    },
  };
}

describe('cartography lifecycle integration (in-process)', () => {
  it('uses two ships for measurement points, awards prestige, finalizes over three ticks, and creates exactly one discovery', async () => {
    const harness = createHarness();

    const planned = await harness.service.createCartographyPlan(1, 11);
    expect(planned).toMatchObject({
      status: 'PLANNED',
      remainingFieldIds: expect.arrayContaining([11, 12]),
    });
    expect(harness.ships.get(1).lssMode).toBe(SpacecraftLssMode.CARTOGRAPHY);

    await harness.service.navigate(1, 11, 1, 2);
    await harness.service.navigate(2, 11, 1, 2);
    await harness.service.navigate(2, 11, 1, 3);
    expect(harness.plan).toMatchObject({
      status: 'MEASURED',
      remainingFieldIds: [],
    });
    expect(harness.prestige.change).toHaveBeenCalledTimes(2);

    await harness.service.startCartographyFinalization(2, 11);
    expect(harness.ships.get(2).energy).toBe(23);
    for (let tick = 1; tick <= 3; tick += 1) {
      await harness.service.processTick(harness.ships.get(2));
      expect(harness.plan?.finalizationTick).toBe(tick);
    }

    expect(harness.plan).toMatchObject({
      status: 'DONE',
      finalizingSpacecraftId: null,
    });
    expect(harness.discoveries).toEqual([{ userId: 11, starSystemId: 42 }]);
    expect(harness.prestige.change).toHaveBeenLastCalledWith(
      11,
      10,
      'Kartographie eines Sternensystems abgeschlossen',
    );
  });

  it('aborts finalization without prestige when the finalizer is no longer in the planned system', async () => {
    const harness = createHarness();
    await harness.service.createCartographyPlan(1, 11);
    await harness.service.navigate(1, 11, 1, 2);
    await harness.service.navigate(2, 11, 1, 2);
    await harness.service.navigate(2, 11, 1, 3);
    await harness.service.startCartographyFinalization(1, 11);

    harness.ships.get(1).location.systemField.starSystemId = 99;
    await harness.service.processTick(harness.ships.get(1));

    expect(harness.plan).toMatchObject({
      status: 'MEASURED',
      finalizingSpacecraftId: null,
      finalizationTick: null,
    });
    expect(harness.prestige.change).not.toHaveBeenCalledWith(
      11,
      10,
      'Kartographie eines Sternensystems abgeschlossen',
    );
    expect(harness.messages.sendSystem).toHaveBeenCalledWith(
      11,
      'Kartographie',
      expect.stringContaining('abgebrochen'),
      'cartography-finalization-aborted:1',
    );
  });

  it('does not send an abort message when no finalization is open', async () => {
    const harness = createHarness();

    await harness.service.processTick(harness.ships.get(1));

    expect(harness.messages.sendSystem).not.toHaveBeenCalled();
  });

  it('resets a finalization when flight begins, preserving measured progress for the other ship to resume', async () => {
    const harness = createHarness();
    await harness.service.createCartographyPlan(1, 11);
    await harness.service.navigate(1, 11, 1, 2);
    await harness.service.navigate(2, 11, 1, 2);
    await harness.service.navigate(2, 11, 1, 3);
    await harness.service.startCartographyFinalization(1, 11);

    harness.ships.get(1).status = SpacecraftStatus.IN_FLIGHT;
    await harness.service.processTick(harness.ships.get(1));

    expect(harness.plan).toMatchObject({
      status: 'MEASURED',
      remainingFieldIds: [],
      finalizingSpacecraftId: null,
    });

    await harness.service.startCartographyFinalization(2, 11);
    expect(harness.plan).toMatchObject({
      status: 'FINISHING',
      finalizingSpacecraftId: 2,
    });
  });

  it('notifies the player when a tick resets finalization after sensor loss', async () => {
    const harness = createHarness();
    await harness.service.createCartographyPlan(1, 11);
    await harness.service.navigate(1, 11, 1, 2);
    await harness.service.navigate(2, 11, 1, 2);
    await harness.service.navigate(2, 11, 1, 3);
    await harness.service.startCartographyFinalization(1, 11);

    harness.ships.get(1).runtimeSystems.LONG_RANGE_SENSORS.active = false;
    await harness.service.processTick(harness.ships.get(1));

    expect(harness.messages.sendSystem).toHaveBeenCalledWith(
      11,
      'Kartographie',
      expect.stringContaining('abgebrochen'),
      'cartography-finalization-aborted:1',
    );
  });

  it('resets a finalization on sensor loss and lets the other qualified ship resume without losing measured progress', async () => {
    const harness = createHarness();
    await harness.service.createCartographyPlan(1, 11);
    await harness.service.navigate(1, 11, 1, 2);
    await harness.service.navigate(2, 11, 1, 2);
    await harness.service.navigate(2, 11, 1, 3);
    await harness.service.startCartographyFinalization(1, 11);

    harness.ships.get(1).runtimeSystems.LONG_RANGE_SENSORS.active = false;
    await harness.service.processTick(harness.ships.get(1));
    expect(harness.plan).toMatchObject({
      status: 'MEASURED',
      remainingFieldIds: [],
      finalizingSpacecraftId: null,
    });

    await harness.service.startCartographyFinalization(2, 11);
    await harness.service.processTick(harness.ships.get(2));
    expect(harness.plan).toMatchObject({
      status: 'FINISHING',
      finalizingSpacecraftId: 2,
      finalizationTick: 1,
    });
  });
});
