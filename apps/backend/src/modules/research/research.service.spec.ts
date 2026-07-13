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

import { ResearchService } from './research.service';
import { TechDef } from '../game-data/game-data.service';

function makeTech(
  id: number,
  effort: number,
  deps: { type: string; techIds: number[] }[] = [],
): TechDef {
  return {
    id,
    name: `Tech ${id}`,
    category: 'stu',
    effort,
    dependencies: deps,
  } as unknown as TechDef;
}

describe('ResearchService – path resolution', () => {
  let service: ResearchService;
  let techs: Map<number, TechDef>;

  beforeEach(() => {
    techs = new Map();
    const mockGameData = {
      getTechTree: () => [...techs.values()],
      getTech: (id: number) => techs.get(id) ?? null,
      getCommodity: () => null,
      getBuilding: () => null,
    };
    const mockRepo = {} as any;
    service = new ResearchService(mockRepo, mockGameData as any);
  });

  function setTechs(...defs: TechDef[]) {
    techs.clear();
    for (const t of defs) techs.set(t.id, t);
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
    const path = (service as any).resolvePrerequisitePath(
      30,
      new Set([10]),
    );
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
    const path = (service as any).resolvePrerequisitePath(
      10,
      new Set([10]),
    );
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
      mockGameData as unknown as ConstructorParameters<typeof ResearchService>[1],
    );
  });

  it('deduplicates repeated tech definitions by id in research state', async () => {
    techs = [
      makeTech(290001, 10),
      makeTech(290001, 10),
      makeTech(290004, 20),
      makeTech(290004, 20),
      makeTech(290007, 30),
    ];

    const state = await service.getResearchState(42, null);

    expect(state.map((tech) => tech.id)).toEqual([290001, 290004, 290007]);
    expect(mockRepo.find).toHaveBeenCalledTimes(1);
  });
});
