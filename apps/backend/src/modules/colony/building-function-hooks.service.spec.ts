jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('./entities/colony-field.entity', () => ({
  ColonyField: class ColonyField {},
}));
jest.mock('../spacecraft/entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
}));

import {
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
} from './entities/colony-ship-build-queue.entity';
import { ColonyFabricationQueueStatus } from './entities/colony-fabrication-queue.entity';
import { ColonyCrewTrainingQueueStatus } from './entities/colony-crew-training-queue.entity';
import { BuildingFunctionHooksService } from './building-function-hooks.service';

const shipClass = {
  id: 7,
  name: 'CR90-Korvette',
  category: 'CORVETTE',
};

function createService() {
  const queueRepo = {
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    save: jest.fn(async (value: any) => value),
  };
  const shipClassRepo = {
    findBy: jest.fn(async () => [shipClass]),
  };
  const fabricationQueueRepo = {
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    save: jest.fn(async (value: any) => value),
  };
  const crewTrainingQueueRepo = {
    update: jest.fn(async () => ({ affected: 0 })),
  };
  const gameData = {
    getBuildingFunctions: jest.fn((buildingId: number) =>
      buildingId === 100 ? [5] : buildingId === 101 ? [6] : [],
    ),
    getShipClassDefByKey: jest.fn(),
    getShipClassSlotRule: jest.fn(() => ({
      allowedBuildingFunctionIds: [5, 6],
    })),
    getFabricationItem: jest.fn(() => ({
      name: 'Deflektormodul',
      costs: [{ commodityId: 1, amount: 4 }],
    })),
    getCommodity: jest.fn(() => ({ name: 'Durastahl' })),
  };
  const eventService = {
    createActionEvent: jest.fn(async (value) => value),
  };
  const storageService = {
    upperStorage: jest.fn(async (_colony, _commodityId, amount) => amount),
  };
  const statsService = {
    calculateSummary: jest.fn(() => ({ effectiveStorageMax: 100 })),
  };
  const defenseService = {
    calculateMaxShields: jest.fn(() => 0),
    syncShieldCapacity: jest.fn(),
  };
  return {
    service: new BuildingFunctionHooksService(
      queueRepo as any,
      shipClassRepo as any,
      fabricationQueueRepo as any,
      crewTrainingQueueRepo as any,
      gameData as any,
      eventService as any,
      storageService as any,
      statsService as any,
      defenseService as any,
    ),
    queueRepo,
    fabricationQueueRepo,
    crewTrainingQueueRepo,
    eventService,
    storageService,
    defenseService,
  };
}

const colony = (fields = [{ id: 1, buildingId: 100, isActive: true }]) => ({
  id: 1,
  userId: 9,
  fields,
});

const queue = (overrides = {}) => ({
  id: 3,
  colonyId: 1,
  userId: 9,
  shipClassId: 7,
  mode: ColonyShipBuildQueueMode.BUILD,
  name: 'CR90 Alderaan',
  status: ColonyShipBuildQueueStatus.QUEUED,
  stoppedAt: null,
  finishesAt: new Date('2026-10-22T12:00:00Z'),
  ...overrides,
});

describe('BuildingFunctionHooksService', () => {
  beforeEach(() =>
    jest.useFakeTimers().setSystemTime(new Date('2026-10-22T10:00:00Z')),
  );
  afterEach(() => jest.useRealTimers());

  it('pauses compatible build and retrofit jobs when their last shipyard is deactivated', async () => {
    const { service, queueRepo, eventService } = createService();
    const jobs = [
      queue(),
      queue({ id: 4, mode: ColonyShipBuildQueueMode.RETROFIT }),
      queue({ id: 5, mode: ColonyShipBuildQueueMode.REPAIR }),
    ];
    queueRepo.find.mockResolvedValue(jobs);

    await service.deactivate(
      colony() as any,
      { buildingId: 100, id: 1 } as any,
      [5],
    );

    expect(jobs.map((job) => job.status)).toEqual([
      ColonyShipBuildQueueStatus.PAUSED,
      ColonyShipBuildQueueStatus.PAUSED,
      ColonyShipBuildQueueStatus.PAUSED,
    ]);
    expect(
      jobs.every(
        (job) => (job.stoppedAt as Date | null)?.getTime() === Date.now(),
      ),
    ).toBe(true);
    expect(eventService.createActionEvent).toHaveBeenCalledTimes(3);
  });

  it('keeps jobs running when another compatible shipyard remains active', async () => {
    const { service, queueRepo } = createService();
    const job = queue();
    queueRepo.find.mockResolvedValue([job]);

    await service.deactivate(
      colony([
        { id: 1, buildingId: 100, isActive: true },
        { id: 2, buildingId: 101, isActive: true },
      ]) as any,
      { id: 1, buildingId: 100 } as any,
      [5],
    );

    expect(job.status).toBe(ColonyShipBuildQueueStatus.QUEUED);
    expect(queueRepo.save).not.toHaveBeenCalled();
  });

  it('resumes paused jobs and extends their finish time by the pause duration', async () => {
    const { service, queueRepo } = createService();
    const job = queue({
      status: ColonyShipBuildQueueStatus.PAUSED,
      stoppedAt: new Date('2026-10-22T09:30:00Z'),
    });
    queueRepo.find.mockResolvedValue([job]);

    await service.activate(colony() as any, { buildingId: 100 } as any, [5]);

    expect(job.status).toBe(ColonyShipBuildQueueStatus.QUEUED);
    expect(job.stoppedAt).toBeNull();
    expect(job.finishesAt).toEqual(new Date('2026-10-22T12:30:00Z'));
  });

  it('cancels fabrication jobs with full storage-capped refunds on deactivation', async () => {
    const { service, fabricationQueueRepo, storageService, eventService } = createService();
    const job = {
      id: 8,
      colonyId: 1,
      userId: 9,
      itemKey: 'deflector',
      amount: 3,
      buildingFunctionId: 10,
      status: ColonyFabricationQueueStatus.QUEUED,
    };
    fabricationQueueRepo.find.mockResolvedValue([job]);
    storageService.upperStorage.mockResolvedValue(5);

    await service.deactivate(colony() as any, { id: 1 } as any, [10]);

    expect(job.status).toBe(ColonyFabricationQueueStatus.CANCELLED);
    expect(storageService.upperStorage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      1,
      12,
      100,
    );
    expect(eventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('5 Durastahl') }),
    );
  });

  it('cancels academy training and synchronizes shields on lifecycle changes', async () => {
    const { service, crewTrainingQueueRepo, defenseService } = createService();
    await service.destruct(colony() as any, { id: 1 } as any, [20]);
    expect(crewTrainingQueueRepo.update).toHaveBeenCalledWith(
      { colonyId: 1, status: ColonyCrewTrainingQueueStatus.QUEUED },
      { status: ColonyCrewTrainingQueueStatus.CANCELLED },
    );

    const shieldColony = colony() as any;
    await service.deactivate(shieldColony, { id: 1 } as any, [24]);
    expect(defenseService.syncShieldCapacity).toHaveBeenCalledWith(shieldColony, 0);
  });

  it('cancels open jobs when their shipyard is demolished', async () => {
    const { service, queueRepo, eventService } = createService();
    const build = queue();
    const retrofit = queue({ id: 4, mode: ColonyShipBuildQueueMode.RETROFIT });
    queueRepo.find.mockResolvedValue([build, retrofit]);

    await service.destruct(
      colony() as any,
      { buildingId: 100, id: 1 } as any,
      [5],
    );

    expect(build.status).toBe(ColonyShipBuildQueueStatus.CANCELLED);
    expect(retrofit.status).toBe(ColonyShipBuildQueueStatus.CANCELLED);
    expect(eventService.createActionEvent).toHaveBeenCalledTimes(2);
  });
});
