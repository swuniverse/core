jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../colony/entities/crew.entity', () => ({
  Crew: class Crew {},
  CrewType: { CREWMAN: 'CREWMAN' },
}));
jest.mock('../colony/entities/crew-assignment.entity', () => ({
  CrewAssignment: class CrewAssignment {},
}));
jest.mock('../starmap/entities/space-location.entity', () => ({
  SpaceLocation: class SpaceLocation {},
}));
jest.mock('./entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));
jest.mock('./entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  AlertState: { GREEN: 'GREEN' },
  SpacecraftStatus: { IDLE: 'IDLE' },
  SpacecraftOperatingMode: { NORMAL: 'NORMAL' },
}));
jest.mock('../research/research-reward-grant.service', () => ({
  ResearchRewardGrantService: class ResearchRewardGrantService {},
}));
jest.mock('./spacecraft-crew.service', () => ({
  SpacecraftCrewService: class SpacecraftCrewService {},
}));
jest.mock('./spacecraft-runtime-state.service', () => ({
  SpacecraftRuntimeStateService: class SpacecraftRuntimeStateService {},
}));
jest.mock('./spacecraft-stats.service', () => ({
  SpacecraftStatsService: class SpacecraftStatsService {},
}));

import { Colony } from '../colony/entities/colony.entity';
import { Crew } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { ResearchRewardShipService } from './research-reward-ship.service';

const shipClass = {
  id: 3,
  key: 'frigate',
  name: 'Frigate',
  hullBase: 100,
  shieldBase: 50,
  epsBase: 20,
  warpdriveBase: 5,
  crewMin: 2,
  crewMax: 4,
  cargoCapacity: 10,
  batteryBase: 1,
  reactorBase: 2,
};

function setup(opts: {
  reserve?: any;
  colony?: any;
  tech?: any;
  commodity?: any;
}) {
  const saved: Record<string, any[]> = {};
  const repos = new Map<any, any>();
  const makeRepo = (cls: any, extra: object = {}) => {
    const name = cls.name;
    saved[name] = [];
    const repo = {
      create: (v: any) => ({ ...v }),
      save: jest.fn(async (v: any) => {
        v.id ??= saved[name].length + 1;
        if (!saved[name].includes(v)) saved[name].push(v);
        return v;
      }),
      ...extra,
    };
    repos.set(cls, repo);
  };
  makeRepo(Spacecraft);
  makeRepo(SpacecraftModule);
  makeRepo(Crew);
  makeRepo(CrewAssignment);
  makeRepo(Colony, { findOne: jest.fn(async () => opts.colony ?? null) });
  makeRepo(SpaceLocation, { findOneBy: jest.fn(async () => ({ id: 9 })) });
  makeRepo(ShipClassDef, { findOneBy: jest.fn(async () => shipClass) });
  const manager = { getRepository: (cls: any) => repos.get(cls) };
  let committed = true;
  const dataSource = {
    transaction: async (fn: any) => {
      try {
        return await fn(manager);
      } catch (e) {
        committed = false;
        throw e;
      }
    },
  };
  const grants = {
    reserve: jest.fn(async () => opts.reserve ?? { outcome: 'reserved' }),
    complete: jest.fn(async () => true),
  };
  const gameData = {
    getTech: () => opts.tech ?? reward,
    getFabricationItemByOutputCommodity: () =>
      opts.commodity === undefined
        ? { moduleType: 'HULL', shipyardType: 'HULL', moduleLevel: 1 }
        : opts.commodity,
  };
  const stats = { applyStats: jest.fn() };
  const crew = {
    applyRequiredCrew: jest.fn((ship: any, base: number) => {
      ship.crewRequired = base;
    }),
    calculateRequiredCrew: jest.fn(() => 3),
  };
  const runtime = {
    initialize: jest.fn(() => ({
      SHIELDS: { active: false, integrity: 5, cooldown: 2 },
    })),
  };
  const service = new ResearchRewardShipService(
    dataSource as any,
    gameData as any,
    grants as any,
    stats as any,
    crew as any,
    runtime as any,
  );
  return { service, saved, grants, committed: () => committed };
}

const reward = {
  id: 7,
  shipReward: {
    shipClassKey: 'frigate',
    moduleSelections: [{ slotId: 'hull', commodityId: 100 }],
  },
};

describe('ResearchRewardShipService', () => {
  it('spawns a configured ship with modules and crew and completes the grant', async () => {
    const { service, saved, grants } = setup({
      colony: { id: 1, systemFieldId: 5 },
    });
    const result = await service.grantShipReward(1, 7);
    expect(result).toEqual({ outcome: 'granted', shipId: 1 });
    expect(saved.Spacecraft[0]).toMatchObject({
      userId: 1,
      locationId: 9,
      crew: 3,
      runtimeSystems: {
        SHIELDS: { active: true, integrity: 100, cooldown: 0 },
      },
    });
    expect(saved.SpacecraftModule).toHaveLength(1);
    expect(saved.Crew).toHaveLength(3);
    expect(saved.CrewAssignment).toHaveLength(3);
    expect(grants.complete).toHaveBeenCalledTimes(1);
  });

  it('creates no ship without a colony and leaves the grant resumable', async () => {
    const { service, saved, grants } = setup({});
    expect(await service.grantShipReward(1, 7)).toEqual({
      outcome: 'no-colony',
    });
    expect(saved.Spacecraft).toHaveLength(0);
    expect(grants.complete).not.toHaveBeenCalled();
  });

  it('rolls back on invalid module configuration', async () => {
    const { service, saved, grants, committed } = setup({
      colony: { id: 1, systemFieldId: 5 },
      commodity: null,
    });
    await expect(service.grantShipReward(1, 7)).rejects.toThrow(
      /not a ship module/,
    );
    expect(committed()).toBe(false);
    expect(saved.Spacecraft).toHaveLength(0);
    expect(grants.complete).not.toHaveBeenCalled();
  });

  it('spawns nothing for completed grants or missing mapping', async () => {
    for (const outcome of ['already-granted', 'no-mapping']) {
      const { service, saved } = setup({
        reserve: { outcome },
        colony: { id: 1, systemFieldId: 5 },
      });
      expect(await service.grantShipReward(1, 7)).toEqual({ outcome });
      expect(saved.Spacecraft).toHaveLength(0);
    }
  });

  it('is idempotent across repeated calls', async () => {
    const { service, saved, grants } = setup({
      colony: { id: 1, systemFieldId: 5 },
    });
    await service.grantShipReward(1, 7);
    grants.reserve.mockResolvedValue({ outcome: 'already-granted' } as any);
    await service.grantShipReward(1, 7);
    expect(saved.Spacecraft).toHaveLength(1);
  });
});
