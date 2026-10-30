jest.mock('./entities/research-reward-grant.entity', () => ({
  ResearchRewardGrant: class ResearchRewardGrant {},
  ResearchRewardGrantStatus: { RESERVED: 'RESERVED', COMPLETED: 'COMPLETED' },
}));

import { ResearchRewardGrantService } from './research-reward-grant.service';

interface Row {
  userId: number;
  techId: number;
  status: string;
  grantedAt: Date | null;
}

/** In-memory manager emulating the unique key, orIgnore and row semantics. */
function makeManager(rows: Row[]) {
  const repo = {
    createQueryBuilder: () => {
      let values: Row | undefined;
      let setValues: Partial<Row> | undefined;
      let params: any;
      const qb: any = {
        insert: () => qb,
        update: () => qb,
        values: (v: Row) => ((values = v), qb),
        set: (v: Partial<Row>) => ((setValues = v), qb),
        where: (_: string, p: any) => ((params = p), qb),
        orIgnore: () => qb,
        execute: async () => {
          if (values) {
            const exists = rows.some(
              (r) => r.userId === values!.userId && r.techId === values!.techId,
            );
            if (exists) return { raw: [], identifiers: [] };
            rows.push({ ...values, grantedAt: null });
            return { raw: [{ id: rows.length }], identifiers: [{}] };
          }
          const hit = rows.filter(
            (r) =>
              r.userId === params.userId &&
              r.techId === params.techId &&
              r.status === params.status,
          );
          hit.forEach((r) => Object.assign(r, setValues));
          return { affected: hit.length };
        },
      };
      return qb;
    },
    findOne: async ({ where }: any) =>
      rows.find(
        (r) => r.userId === where.userId && r.techId === where.techId,
      ) ?? null,
  };
  return { getRepository: () => repo } as any;
}

describe('ResearchRewardGrantService', () => {
  const gameData = {
    getTech: (id: number) => (id === 7 ? { id, shipReward: {} } : { id }),
  } as any;
  let rows: Row[];
  let service: ResearchRewardGrantService;

  beforeEach(() => {
    rows = [];
    service = new ResearchRewardGrantService(gameData);
  });

  it('creates no grant without a reward mapping', async () => {
    const result = await service.reserve(makeManager(rows), 1, 8);
    expect(result).toEqual({ outcome: 'no-mapping' });
    expect(rows).toHaveLength(0);
  });

  it('reserves once and completes', async () => {
    const manager = makeManager(rows);
    expect((await service.reserve(manager, 1, 7)).outcome).toBe('reserved');
    expect(await service.complete(manager, 1, 7, new Date(5))).toBe(true);
    expect(rows[0]).toMatchObject({
      status: 'COMPLETED',
      grantedAt: new Date(5),
    });
  });

  it('is idempotent after completion', async () => {
    const manager = makeManager(rows);
    await service.reserve(manager, 1, 7);
    await service.complete(manager, 1, 7);
    expect(await service.reserve(manager, 1, 7)).toEqual({
      outcome: 'already-granted',
    });
    expect(await service.complete(manager, 1, 7)).toBe(false);
    expect(rows).toHaveLength(1);
  });

  it('resumes an unfinished reservation without a second row', async () => {
    const manager = makeManager(rows);
    await service.reserve(manager, 1, 7);
    const again = await service.reserve(manager, 1, 7);
    expect(again.outcome).toBe('resumed');
    expect(rows).toHaveLength(1);
  });

  it('lets only one of two concurrent reservations start fresh', async () => {
    const manager = makeManager(rows);
    const results = await Promise.all([
      service.reserve(manager, 1, 7),
      service.reserve(manager, 1, 7),
    ]);
    expect(results.filter((r) => r.outcome === 'reserved')).toHaveLength(1);
    expect(rows).toHaveLength(1);
  });

  it('keeps grants per player separate', async () => {
    const manager = makeManager(rows);
    await service.reserve(manager, 1, 7);
    expect((await service.reserve(manager, 2, 7)).outcome).toBe('reserved');
    expect(rows).toHaveLength(2);
  });
});
