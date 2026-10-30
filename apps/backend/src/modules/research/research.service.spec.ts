jest.mock('./entities/research.entity', () => ({
  Research: class Research {},
  ResearchStatus: {
    LOCKED: 'LOCKED',
    AVAILABLE: 'AVAILABLE',
    IN_PROGRESS: 'IN_PROGRESS',
    QUEUED: 'QUEUED',
    COMPLETED: 'COMPLETED',
  },
}));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));

import { Faction } from '@swuniverse/shared';
import { ResearchService } from './research.service';
import { TechDef } from '../game-data/game-data.service';

function makeTech(
  id: number,
  effort: number,
  deps: { type: string; techIds: number[] }[] = [],
  faction: TechDef['faction'] = 'SHARED',
): TechDef {
  return {
    id,
    name: `Tech ${id}`,
    category: 'stu',
    effort,
    dependencies: deps,
    faction,
  } as unknown as TechDef;
}

describe('ResearchService – path resolution', () => {
  let service: ResearchService;
  let techs: TechDef[];

  beforeEach(() => {
    techs = [];
    const mockGameData = {
      getTechTree: () => techs,
      getTech: (id: number) => techs.find((tech) => tech.id === id) ?? null,
      getCommodity: () => null,
      getBuilding: () => null,
    };
    const mockRepo = {} as any;
    service = new ResearchService(
      mockRepo,
      mockGameData as any,
      {} as any,
      {} as any,
    );
  });

  function setTechs(...defs: TechDef[]) {
    techs = defs;
  }

  it('resolves linear chain', () => {
    setTechs(
      makeTech(10, 5),
      makeTech(20, 10, [{ type: 'REQUIRE', techIds: [10] }]),
      makeTech(30, 15, [{ type: 'REQUIRE', techIds: [20] }]),
    );
    const path = (service as any).resolvePrerequisitePath(30, new Set());
    expect(path).toEqual([10, 20, 30]);
  });

  it('skips completed techs', () => {
    setTechs(
      makeTech(10, 5),
      makeTech(20, 10, [{ type: 'REQUIRE', techIds: [10] }]),
      makeTech(30, 15, [{ type: 'REQUIRE', techIds: [20] }]),
    );
    const path = (service as any).resolvePrerequisitePath(30, new Set([10]));
    expect(path).toEqual([20, 30]);
  });

  it('handles diamond dependencies', () => {
    setTechs(
      makeTech(10, 5),
      makeTech(20, 10, [{ type: 'REQUIRE', techIds: [10] }]),
      makeTech(21, 8, [{ type: 'REQUIRE', techIds: [10] }]),
      makeTech(30, 15, [{ type: 'REQUIRE', techIds: [20, 21] }]),
    );
    const path = (service as any).resolvePrerequisitePath(30, new Set());
    // 10 must come before 20 and 21, all before 30
    expect(path.indexOf(10)).toBeLessThan(path.indexOf(20));
    expect(path.indexOf(10)).toBeLessThan(path.indexOf(21));
    expect(path.indexOf(20)).toBeLessThan(path.indexOf(30));
    expect(path.indexOf(21)).toBeLessThan(path.indexOf(30));
  });

  it('picks cheapest REQUIRE_SOME option', () => {
    setTechs(
      makeTech(10, 100),
      makeTech(11, 5),
      makeTech(30, 15, [{ type: 'REQUIRE_SOME', techIds: [10, 11] }]),
    );
    const path = (service as any).resolvePrerequisitePath(30, new Set());
    expect(path).toContain(11);
    expect(path).not.toContain(10);
  });

  it('skips root tech IDs', () => {
    setTechs(
      makeTech(1001, 0),
      makeTech(20, 10, [{ type: 'REQUIRE', techIds: [1001] }]),
    );
    const path = (service as any).resolvePrerequisitePath(20, new Set());
    expect(path).toEqual([20]);
    expect(path).not.toContain(1001);
  });

  it('returns empty for already-completed target', () => {
    setTechs(makeTech(10, 5));
    const path = (service as any).resolvePrerequisitePath(10, new Set([10]));
    expect(path).toEqual([]);
  });
});

describe('ResearchService – state deduplication', () => {
  let service: ResearchService;
  let techs: TechDef[];
  let mockRepo: { find: jest.Mock<Promise<never[]>, []> };

  beforeEach(() => {
    techs = [];
    const mockGameData = {
      getTechTree: () => techs,
      getTech: (id: number) => techs.find((tech) => tech.id === id) ?? null,
      getCommodity: () => null,
      getBuilding: () => null,
    };
    mockRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    service = new ResearchService(
      mockRepo as unknown as ConstructorParameters<typeof ResearchService>[0],
      mockGameData as unknown as ConstructorParameters<
        typeof ResearchService
      >[1],
      {} as ConstructorParameters<typeof ResearchService>[2],
      {} as ConstructorParameters<typeof ResearchService>[3],
    );
  });

  it('returns completedAt and display data for unlocked ship classes and modules', async () => {
    const completedAt = new Date('2026-10-22T12:34:56.000Z');
    techs = [
      {
        ...makeTech(910001, 10),
        unlocks: {
          shipClasses: [701],
          modules: ['Militär-Scanner'],
        },
      } as TechDef,
    ];
    mockRepo.find.mockResolvedValue([
      {
        techId: 910001,
        status: 'COMPLETED',
        completedAt,
      } as never,
    ]);
    const gameData = (service as any).gameData;
    gameData.getShipClassDefs = () => [
      {
        key: 'REBEL_SCOUT',
        name: 'A-Wing Aufklärer',
        stuRumpId: 701,
      },
    ];
    gameData.getAllFabricationItems = () => [
      {
        displayName: 'Militär-Scanner',
        moduleType: 'Militär-Scanner',
        outputCommodityId: 9901,
      },
    ];

    const state = await service.getResearchState(42, null);

    expect(state[0]).toMatchObject({
      completedAt,
      unlocks: {
        shipClasses: [
          { id: 701, key: 'REBEL_SCOUT', name: 'A-Wing Aufklärer' },
        ],
        modules: [
          {
            name: 'Militär-Scanner',
            commodityId: 9901,
          },
        ],
      },
    });
  });

  it('includes shared technology for both factions', async () => {
    techs = [makeTech(910000, 10, [], 'SHARED')];

    const rebelState = await service.getResearchState(
      42,
      Faction.REBEL_ALLIANCE,
    );
    const empireState = await service.getResearchState(
      42,
      Faction.GALACTIC_EMPIRE,
    );

    expect(rebelState.map((tech) => tech.id)).toEqual([910000]);
    expect(empireState.map((tech) => tech.id)).toEqual([910000]);
  });

  it('deduplicates repeated tech definitions by id in research state', async () => {
    techs = [
      makeTech(910001, 10),
      makeTech(910001, 10),
      makeTech(910004, 20),
      makeTech(910004, 20),
      makeTech(910007, 30),
    ];

    const state = await service.getResearchState(42, null);

    expect(state.map((tech) => tech.id)).toEqual([910001, 910004, 910007]);
    expect(mockRepo.find).toHaveBeenCalledTimes(1);
  });

  it('hides the imperial-exclusive Tarnfeld-Generator from rebel research state', async () => {
    techs = [
      makeTech(200501, 60, [], Faction.REBEL_ALLIANCE),
      makeTech(200503, 60, [], Faction.GALACTIC_EMPIRE),
      makeTech(
        60100,
        50,
        [{ type: 'REQUIRE', techIds: [200503] }],
        Faction.GALACTIC_EMPIRE,
      ),
    ];

    const rebelState = await service.getResearchState(
      42,
      Faction.REBEL_ALLIANCE,
    );
    const empireState = await service.getResearchState(
      42,
      Faction.GALACTIC_EMPIRE,
    );

    expect(rebelState.map((tech) => tech.id)).toEqual([200501]);
    expect(rebelState.map((tech) => tech.id)).not.toContain(60100);

    const empireCloakingGenerator = empireState.find(
      (tech) => tech.id === 60100,
    );
    expect(empireState.map((tech) => tech.id)).toEqual([200503, 60100]);
    expect(empireCloakingGenerator?.dependencies).toEqual([
      { type: 'REQUIRE', techIds: [200503] },
    ]);
  });

  it('hides the excluded target after its source research starts', async () => {
    techs = [
      makeTech(10, 5, [{ type: 'EXCLUDE', techIds: [20] }]),
      makeTech(20, 5),
    ];
    mockRepo.find.mockResolvedValue([
      { techId: 10, status: 'IN_PROGRESS' } as never,
    ]);

    const state = await service.getResearchState(42, null);

    expect(state.map((tech) => tech.id)).toEqual([10]);
  });

  it('uses faction-specific duplicate tech definitions for imperial module dependencies', async () => {
    techs = [
      makeTech(200101, 12, [], Faction.REBEL_ALLIANCE),
      makeTech(200103, 12, [], Faction.GALACTIC_EMPIRE),
      makeTech(200501, 60, [], Faction.REBEL_ALLIANCE),
      makeTech(200503, 60, [], Faction.GALACTIC_EMPIRE),
      makeTech(
        290001,
        40,
        [{ type: 'REQUIRE', techIds: [200101] }],
        Faction.REBEL_ALLIANCE,
      ),
      makeTech(
        290001,
        40,
        [{ type: 'REQUIRE', techIds: [200103] }],
        Faction.GALACTIC_EMPIRE,
      ),
      makeTech(
        290004,
        180,
        [{ type: 'REQUIRE', techIds: [200501, 290001] }],
        Faction.REBEL_ALLIANCE,
      ),
      makeTech(
        290004,
        180,
        [{ type: 'REQUIRE', techIds: [200503, 290001] }],
        Faction.GALACTIC_EMPIRE,
      ),
    ];

    const rebelState = await service.getResearchState(
      42,
      Faction.REBEL_ALLIANCE,
    );
    const empireState = await service.getResearchState(
      42,
      Faction.GALACTIC_EMPIRE,
    );

    expect(rebelState.find((tech) => tech.id === 290001)?.dependencies).toEqual(
      [{ type: 'REQUIRE', techIds: [200101] }],
    );
    expect(rebelState.find((tech) => tech.id === 290004)?.dependencies).toEqual(
      [{ type: 'REQUIRE', techIds: [200501, 290001] }],
    );
    expect(
      empireState.find((tech) => tech.id === 290001)?.dependencies,
    ).toEqual([{ type: 'REQUIRE', techIds: [200103] }]);
    expect(
      empireState.find((tech) => tech.id === 290004)?.dependencies,
    ).toEqual([{ type: 'REQUIRE', techIds: [200503, 290001] }]);
  });
});

describe('ResearchService – completion notifications', () => {
  const completedTech = {
    ...makeTech(10, 5),
    mappedCommodityId: 7,
  } as TechDef;

  function setup(remainingPoints: number, production = 5) {
    const research = {
      id: 91,
      userId: 42,
      techId: 10,
      status: 'IN_PROGRESS',
      remainingPoints,
      spentPoints: 0,
      progress: 0,
      finishesAt: new Date(),
      completedAt: null as Date | null,
      blockedReason: null,
    };
    const repository = {
      findOne: jest.fn().mockResolvedValueOnce(research),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (value) => value),
    };
    const messaging = { sendSystem: jest.fn().mockResolvedValue({}) };
    const gateway = { emitToUser: jest.fn() };
    const service = new ResearchService(
      repository as any,
      {
        getTech: () => completedTech,
        getTechTree: () => [completedTech],
      } as any,
      messaging as any,
      gateway as any,
    );

    return {
      service,
      research,
      repository,
      messaging,
      gateway,
      commodityProduction: new Map([[7, production]]),
    };
  }

  it('sets the completion timestamp and sends one colony message and websocket event', async () => {
    const context = setup(5);
    const beforeCompletion = new Date();

    await context.service.processTick(42, 0, context.commodityProduction);

    expect(context.research.completedAt).toEqual(expect.any(Date));
    expect(context.research.completedAt?.getTime()).toBeGreaterThanOrEqual(
      beforeCompletion.getTime(),
    );
    expect(context.messaging.sendSystem).toHaveBeenCalledWith(
      42,
      "Forschung 'Tech 10' wurde abgeschlossen",
      "Forschung 'Tech 10' wurde abgeschlossen",
      'research-completed:91',
      expect.anything(),
    );
    expect(context.gateway.emitToUser).toHaveBeenCalledWith(
      42,
      'RESEARCH_COMPLETED',
      { techId: 10, name: 'Tech 10' },
    );
  });

  it('does not notify when research remains in progress', async () => {
    const context = setup(10);

    await context.service.processTick(42, 0, context.commodityProduction);

    expect(context.messaging.sendSystem).not.toHaveBeenCalled();
    expect(context.gateway.emitToUser).not.toHaveBeenCalled();
  });

  it.each([
    [Faction.REBEL_ALLIANCE, 1.1, 11],
    [Faction.GALACTIC_EMPIRE, 1, 10],
  ])(
    'applies the %s research multiplier once to produced points',
    async (faction, researchMultiplier, expectedPoints) => {
      const context = setup(100, 10);
      const findByKey = jest.fn().mockResolvedValue({
        key: faction,
        modifiers: [{ researchMultiplier }],
      });
      const service = new ResearchService(
        context.repository as any,
        {
          getTech: () => completedTech,
          getTechTree: () => [completedTech],
        } as any,
        context.messaging as any,
        context.gateway as any,
        { findByKey } as any,
      );

      await service.processTick(42, 0, context.commodityProduction, faction);

      expect(context.research.spentPoints).toBe(expectedPoints);
      expect(context.research.remainingPoints).toBe(100 - expectedPoints);
      expect(findByKey).toHaveBeenCalledWith(faction);
    },
  );

  it('floors multiplied production without carrying fractional points', async () => {
    const context = setup(100, 5);
    const service = new ResearchService(
      context.repository as any,
      {
        getTech: () => completedTech,
        getTechTree: () => [completedTech],
      } as any,
      context.messaging as any,
      context.gateway as any,
      {
        findByKey: jest.fn().mockResolvedValue({
          modifiers: [{ researchMultiplier: 0.9 }],
        }),
      } as any,
    );

    await service.processTick(
      42,
      0,
      context.commodityProduction,
      Faction.GALACTIC_EMPIRE,
    );

    expect(context.research.spentPoints).toBe(4);
    expect(context.research.remainingPoints).toBe(96);
  });

  it('does not duplicate a durable completion message on a repeated tick', async () => {
    const context = setup(5);

    await context.service.processTick(42, 0, context.commodityProduction);
    await context.service.processTick(42, 0, context.commodityProduction);

    expect(context.messaging.sendSystem).toHaveBeenCalledTimes(1);
    expect(context.messaging.sendSystem).toHaveBeenCalledWith(
      42,
      expect.any(String),
      expect.any(String),
      'research-completed:91',
      expect.anything(),
    );
  });
});

describe('ResearchService – restart state', () => {
  it('clears a stale blocked reason when research is restarted', async () => {
    const research = {
      userId: 42,
      techId: 10,
      status: 'AVAILABLE',
      queuePosition: null,
      blockedReason: 'NO_RESEARCH_PRODUCTION',
      remainingPoints: 5,
    };
    const repository = {
      find: jest.fn().mockResolvedValue([research]),
      save: jest.fn(async (value) => value),
    };
    const tech = makeTech(10, 5);
    const service = new ResearchService(
      repository as any,
      {
        getTechTree: () => [tech],
        getTech: () => tech,
      } as any,
      {} as any,
      {} as any,
    );

    await service.startResearch(42, 10);

    expect(research.blockedReason).toBeNull();
    expect(research.status).toBe('IN_PROGRESS');
  });
});

describe('ResearchService – ship reward completion', () => {
  const rewardTech = {
    ...makeTech(10, 5),
    mappedCommodityId: 7,
    shipReward: { shipClassKey: 'frigate', moduleSelections: [] },
  } as unknown as TechDef;

  function setup(tech: TechDef, result: any) {
    const research = {
      id: 91,
      userId: 42,
      techId: 10,
      status: 'IN_PROGRESS',
      remainingPoints: 5,
      spentPoints: 0,
      progress: 0,
      finishesAt: new Date(),
      completedAt: null as Date | null,
      blockedReason: null,
    };
    const repository = {
      findOne: jest.fn().mockResolvedValueOnce(research),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (value) => value),
    };
    const messaging = { sendSystem: jest.fn().mockResolvedValue({}) };
    const service = new ResearchService(
      repository as any,
      { getTech: () => tech, getTechTree: () => [tech] } as any,
      messaging as any,
      { emitToUser: jest.fn() } as any,
    );
    const granter = jest.fn(async () => result);
    service.registerShipRewardGranter(granter);
    return { service, messaging, granter };
  }
  const production = new Map([[7, 5]]);

  it('sends one ship folder message after a granted reward', async () => {
    const ctx = setup(rewardTech, {
      outcome: 'granted',
      shipId: 1,
      shipClassName: 'Frigate',
    });
    await ctx.service.processTick(42, 0, production);
    expect(ctx.granter).toHaveBeenCalledWith(42, 10);
    const calls = ctx.messaging.sendSystem.mock.calls.filter(
      (c: any[]) => c[4] === 'SHIP',
    );
    expect(calls).toHaveLength(1);
    expect(calls[0][2]).toBe(
      'Als Belohnung für den Abschluss der Forschung wurde dir ein Schiff vom Typ Frigate überstellt',
    );
    expect(calls[0][3]).toBe('research-reward-ship:42:10');
  });

  it.each(['no-mapping', 'no-colony', 'already-granted'])(
    'sends no ship message for outcome %s',
    async (outcome) => {
      const ctx = setup(rewardTech, { outcome });
      await ctx.service.processTick(42, 0, production);
      expect(
        ctx.messaging.sendSystem.mock.calls.filter(
          (c: any[]) => c[4] === 'SHIP',
        ),
      ).toHaveLength(0);
    },
  );

  it('does not call the granter without a reward mapping', async () => {
    const ctx = setup({ ...rewardTech, shipReward: undefined } as TechDef, {
      outcome: 'granted',
      shipClassName: 'X',
    });
    await ctx.service.processTick(42, 0, production);
    expect(ctx.granter).not.toHaveBeenCalled();
  });
});
