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
  faction?: Faction,
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
    service = new ResearchService(mockRepo, mockGameData as any);
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
    );
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
