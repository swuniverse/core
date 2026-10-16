jest.mock('./entities/cartography-plan.entity', () => ({
  CartographyPlan: class CartographyPlan {},
  CartographyPlanStatus: {
    PLANNED: 'PLANNED',
    MEASURED: 'MEASURED',
    FINISHING: 'FINISHING',
    DONE: 'DONE',
  },
}));

import { BadRequestException } from '@nestjs/common';
import { CartographyPlanStatus } from './entities/cartography-plan.entity';
import { CartographyPlanService } from './cartography-plan.service';

describe('CartographyPlanService', () => {
  it('returns the existing player/system plan without replacing its persisted measurement fields', async () => {
    const existing = {
      id: 4,
      userId: 11,
      starSystemId: 42,
      status: CartographyPlanStatus.PLANNED,
      remainingFieldIds: [7, 8],
    };
    const repo = {
      findOne: jest.fn(async () => existing),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = new CartographyPlanService(repo as never);

    await expect(service.createPlan(11, 42, [1, 2, 3])).resolves.toBe(existing);

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('returns the concurrently created player/system plan on a duplicate-key race', async () => {
    const concurrentPlan = {
      id: 8,
      userId: 11,
      starSystemId: 42,
      status: CartographyPlanStatus.MEASURED,
      remainingFieldIds: [],
    };
    const repo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(concurrentPlan),
      create: jest.fn((plan) => plan),
      save: jest.fn(async () => {
        throw { code: '23505' };
      }),
    };
    const service = new CartographyPlanService(repo as never);

    await expect(service.createPlan(11, 42, [1, 2])).resolves.toBe(
      concurrentPlan,
    );
    expect(repo.create).toHaveBeenCalledWith({
      userId: 11,
      starSystemId: 42,
      status: CartographyPlanStatus.PLANNED,
      remainingFieldIds: [1, 2],
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: null,
    });
  });

  it('marks a plan without measurement fields as measured at creation', async () => {
    const repo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((plan) => plan),
      save: jest.fn(async (plan) => ({ id: 9, ...plan })),
    };
    const service = new CartographyPlanService(repo as never);

    await expect(service.createPlan(11, 42, [])).resolves.toMatchObject({
      status: CartographyPlanStatus.MEASURED,
      remainingFieldIds: [],
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: CartographyPlanStatus.MEASURED }),
    );
  });

  it('returns one preserved plan to parallel planners after a duplicate-key race', async () => {
    const persisted = {
      id: 17,
      userId: 11,
      starSystemId: 42,
      status: CartographyPlanStatus.PLANNED,
      remainingFieldIds: [3, 4],
    };
    const repo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(persisted),
      create: jest.fn((plan) => plan),
      save: jest.fn(async () => {
        throw { code: '23505' };
      }),
    };
    const service = new CartographyPlanService(repo as never);

    await expect(service.createPlan(11, 42, [99])).resolves.toBe(persisted);
    expect(persisted.remainingFieldIds).toEqual([3, 4]);
  });

  it('resets only the finishing plan for a deactivated finalizing spacecraft', async () => {
    const plan = {
      id: 3,
      status: CartographyPlanStatus.FINISHING,
      remainingFieldIds: [],
      finalizingSpacecraftId: 9,
      finalizationStartedAt: new Date(),
      finalizationTick: 2,
    };
    const repo = {
      findOne: jest.fn(async () => plan),
      save: jest.fn(async (value) => value),
    };
    const service = new CartographyPlanService(repo as never);

    await service.resetFinishingForSpacecraft(9);

    expect(plan).toMatchObject({
      status: CartographyPlanStatus.MEASURED,
      finalizingSpacecraftId: null,
      finalizationStartedAt: null,
      finalizationTick: null,
    });
    expect(repo.save).toHaveBeenCalledWith(plan);
  });

  it('atomically claims one arrived measurement point, then marks the plan measured', async () => {
    const plan = {
      id: 3,
      userId: 11,
      starSystemId: 42,
      status: CartographyPlanStatus.PLANNED,
      remainingFieldIds: [7],
    };
    const repo = {
      manager: {
        transaction: jest.fn(async (work) => work({
          getRepository: (entity) =>
            entity.name === 'SystemExploration'
              ? { findOne: jest.fn(async () => null) }
              : entity.name === 'SystemField'
                ? { find: jest.fn(async () => [{ id: 7 }]) }
                : {
                    findOne: jest.fn(async () => plan),
                    save: jest.fn(async (value) => value),
                  },
        })),
      },
    };
    const service = new CartographyPlanService(repo as never);

    await expect(service.claimArrivedField(11, 42, 7)).resolves.toEqual({
      claimed: true,
      completed: true,
    });
    expect(plan).toMatchObject({
      status: CartographyPlanStatus.MEASURED,
      remainingFieldIds: [],
    });
  });

  it('removes disappeared planned fields and ends a plan without an arrival reward', async () => {
    const plan = {
      id: 3,
      userId: 11,
      starSystemId: 42,
      status: CartographyPlanStatus.PLANNED,
      remainingFieldIds: [7],
    };
    const save = jest.fn(async (value) => value);
    const repo = {
      manager: {
        transaction: jest.fn(async (work) => work({
          getRepository: (entity) =>
            entity.name === 'SystemExploration'
              ? { findOne: jest.fn(async () => null) }
              : entity.name === 'SystemField'
                ? { find: jest.fn(async () => []) }
                : { findOne: jest.fn(async () => plan), save },
        })),
      },
    };
    const service = new CartographyPlanService(repo as never);

    await expect(service.claimArrivedField(11, 42, 99)).resolves.toEqual({
      claimed: false,
      completed: false,
    });
    expect(plan).toMatchObject({
      status: CartographyPlanStatus.MEASURED,
      remainingFieldIds: [],
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('allows exactly one transition from measured to finishing', async () => {
    const plan = {
      id: 3,
      userId: 11,
      starSystemId: 42,
      status: CartographyPlanStatus.MEASURED,
      remainingFieldIds: [],
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
    };
    const repo = {
      findOne: jest.fn(async () => plan),
      save: jest.fn(async (value) => value),
    };
    const service = new CartographyPlanService(repo as never);
    const startedAt = new Date('2026-10-16T12:00:00.000Z');

    await expect(
      service.startFinalization(11, 42, 9, startedAt),
    ).resolves.toMatchObject({
      status: CartographyPlanStatus.FINISHING,
      finalizingSpacecraftId: 9,
      finalizationTick: 0,
      finalizationStartedAt: startedAt,
    });

    await expect(
      service.startFinalization(11, 42, 10, startedAt),
    ).rejects.toEqual(
      new BadRequestException('Die Kartographie wird bereits finalisiert'),
    );
  });
});
