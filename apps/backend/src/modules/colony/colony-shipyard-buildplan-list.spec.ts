import { ColonyProjectionService } from './colony-projection.service';

function qb(rows: unknown[]) {
  const q: Record<string, jest.Mock> = {};
  for (const m of [
    'select',
    'addSelect',
    'where',
    'andWhere',
    'setParameter',
    'groupBy',
  ]) {
    q[m] = jest.fn(() => q);
  }
  q.getRawMany = jest.fn(async () => rows);
  return q;
}

describe('shipyard buildplan list DTO', () => {
  it('adds ship count, build time, crew, module names and delete lock from grouped queries', async () => {
    const plans = [
      {
        id: 1,
        shipClassId: 4,
        name: 'A',
        signature: 's1',
        moduleSelections: [{ slotId: 'x', commodityId: 50 }],
        moduleCommodityIds: [50],
        moduleTypes: ['T'],
      },
      {
        id: 2,
        shipClassId: 4,
        name: 'B',
        signature: 's2',
        moduleSelections: [],
        moduleCommodityIds: [],
        moduleTypes: [],
      },
      {
        id: 3,
        shipClassId: 4,
        name: 'C',
        signature: 's3',
        moduleSelections: [],
        moduleCommodityIds: [],
        moduleTypes: [],
      },
    ];
    const shipQb = qb([
      { planId: 1, total: '3', visible: '2' },
      // only destroyed ships: hidden from the count, but still locks deletion
      { planId: 2, total: '1', visible: null },
    ]);
    const queueQb = qb([{ planId: 3, count: '1' }]);
    const shipRepo = { createQueryBuilder: jest.fn(() => shipQb) };
    const shipBuildQueueRepo = { createQueryBuilder: jest.fn(() => queueQb) };
    const service = Object.assign(
      Object.create(ColonyProjectionService.prototype),
      {
        shipRepo,
        shipBuildQueueRepo,
        shipBuildplanRepo: { find: jest.fn(async () => plans) },
        gameData: {
          getFabricationItemByOutputCommodity: (id: number) => ({
            displayName: `Modul ${id}`,
            shipyardModuleStats: { crew: 5 },
          }),
        },
        timing: { scaleBuildTimeSeconds: (s: number) => s * 2 },
      },
    );

    const rows = await service.listBuildplans(
      9,
      new Map([[4, { id: 4, crewMin: 10, buildTimeTicks: 600 }]]),
    );

    expect(rows[0]).toMatchObject({
      shipCount: 2,
      buildSeconds: 1200,
      crewRequired: 15,
      moduleNames: ['Modul 50'],
      canDelete: false,
    });
    expect(rows[1]).toMatchObject({
      shipCount: 0,
      crewRequired: 10,
      canDelete: false,
    });
    expect(rows[2]).toMatchObject({ shipCount: 0, canDelete: false });
    expect(shipRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(shipBuildQueueRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
  });

  it('allows deleting an unused plan', async () => {
    const service = Object.assign(
      Object.create(ColonyProjectionService.prototype),
      {
        shipRepo: { createQueryBuilder: () => qb([]) },
        shipBuildQueueRepo: { createQueryBuilder: () => qb([]) },
        shipBuildplanRepo: {
          find: async () => [
            {
              id: 1,
              shipClassId: 4,
              name: 'A',
              signature: 's',
              moduleSelections: [],
              moduleCommodityIds: [],
              moduleTypes: [],
            },
          ],
        },
        gameData: {},
      },
    );
    const [row] = await service.listBuildplans(9, new Map());
    expect(row).toMatchObject({
      shipCount: 0,
      canDelete: true,
      buildSeconds: null,
      crewRequired: null,
    });
  });
});
