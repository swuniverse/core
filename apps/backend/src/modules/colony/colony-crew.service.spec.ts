jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('./entities/colony-stats.entity', () => ({
  ColonyStats: class ColonyStats {},
}));
jest.mock('./entities/colony-crew-training-queue.entity', () => ({
  ColonyCrewTrainingQueue: class ColonyCrewTrainingQueue {},
  ColonyCrewTrainingQueueStatus: { QUEUED: 'QUEUED', COMPLETED: 'COMPLETED' },
}));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
}));

import { ColonyCrewService } from './colony-crew.service';

function createService() {
  const colonyRepo = { find: jest.fn<Promise<any[]>, any[]>(async () => []) };
  const statsRepo = { save: jest.fn(async (value) => value) };
  const crewTrainingQueueRepo = {
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
  };
  const crewRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 100, ...value })),
    delete: jest.fn(async () => ({})),
  };
  const crewAssignmentRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    count: jest.fn(async () => 0),
    delete: jest.fn(async () => ({})),
  };
  const shipRepo = { save: jest.fn(async (value) => value) };
  const colonyStatsService = {
    calculateSummary: jest.fn(() => ({
      productionDelta: new Map([[1300, 100]]),
      workersUsed: 20,
    })),
  };
  const service = new ColonyCrewService(
    colonyRepo as any,
    statsRepo as any,
    crewTrainingQueueRepo as any,
    crewRepo as any,
    crewAssignmentRepo as any,
    shipRepo as any,
    colonyStatsService as any,
  );
  return {
    service,
    colonyRepo,
    statsRepo,
    crewTrainingQueueRepo,
    crewRepo,
    crewAssignmentRepo,
    shipRepo,
    colonyStatsService,
  };
}

describe('ColonyCrewService', () => {
  it('calculates a STU-shaped local crew limit from workers and life standard', () => {
    const { service } = createService();
    const colony = {
      id: 1,
      population: 50,
      stats: { workers: 20 },
      fields: [],
    };

    expect(service.getLocalCrewLimit(colony as any)).toBe(14);
  });

  it('sums local crew limits into a global user crew limit', async () => {
    const { service, colonyRepo } = createService();
    colonyRepo.find.mockResolvedValue([
      { id: 1, population: 50, stats: { workers: 20 }, fields: [] },
      { id: 2, population: 50, stats: { workers: 20 }, fields: [] },
    ]);

    await expect(service.getGlobalCrewLimit(1)).resolves.toBe(28);
  });

  it('computes remaining and trainable crew counts', async () => {
    const { service, colonyRepo, crewAssignmentRepo, crewTrainingQueueRepo } =
      createService();
    colonyRepo.find.mockResolvedValue([
      { id: 1, population: 50, stats: { workers: 20 }, fields: [] },
    ]);
    crewAssignmentRepo.count.mockResolvedValue(3);
    crewTrainingQueueRepo.find.mockResolvedValue([{ amount: 2 }]);

    await expect(service.getRemainingCount(1)).resolves.toBe(9);
    await expect(service.getTrainableCount(1)).resolves.toBe(2);
  });

  it('creates crew and colony assignments on training completion', async () => {
    const { service, crewRepo, crewAssignmentRepo, statsRepo } =
      createService();
    crewAssignmentRepo.count.mockResolvedValue(2);
    const colony = { id: 1, userId: 5, stats: { trainedCrew: 0 }, fields: [] };

    await service.createCrewOnColony(colony as any, 2);

    expect(crewRepo.save).toHaveBeenCalledTimes(2);
    expect(crewAssignmentRepo.save).toHaveBeenCalledTimes(2);
    expect(statsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ trainedCrew: 2 }),
    );
  });
});
