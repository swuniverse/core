jest.mock('../starmap/entities/space-location.entity', () => ({
  SpaceLocation: class SpaceLocation {},
}));
import { TickService } from './tick.service';
import { ColonyTickProcessorService } from '../colony/colony-tick-processor.service';

function fixture(jobs: unknown[] = []) {
  const tickState = { status: 'STARTED' };
  const service = Object.create(TickService.prototype) as TickService;
  const fieldRepo = { find: jest.fn(async () => []) };
  const colonyRepo = { find: jest.fn(async () => []) };
  const tickStateRepo = {
    findOne: jest.fn(async () => null),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const shipyardCompletions = {
    findDueJobs: jest.fn(async () => jobs),
    completeJobs: jest.fn(async () => undefined),
  };
  const failureMail = { notify: jest.fn(async () => undefined) };
  Object.assign(service, {
    fieldRepo,
    colonyRepo,
    tickStateRepo,
    shipyardCompletions,
    failureMail,
  });
  return {
    service,
    tickState,
    fieldRepo,
    colonyRepo,
    tickStateRepo,
    shipyardCompletions,
    failureMail,
  };
}

describe('minute shipyard runner', () => {
  it('runs shipyard-only work without loading all colonies and records its successful duration', async () => {
    const f = fixture([{ id: 1 }]);
    await f.service.checkBuildingCompletions();
    expect(f.shipyardCompletions.findDueJobs).toHaveBeenCalledWith(
      expect.any(Date),
    );
    expect(f.colonyRepo.find).not.toHaveBeenCalled();
    expect(f.shipyardCompletions.completeJobs).toHaveBeenCalledWith([
      { id: 1 },
    ]);
    expect(f.tickStateRepo.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tickType: 'BUILDING_COMPLETION',
        status: 'COMPLETED',
        startedAt: expect.any(Date),
        completedAt: expect.any(Date),
      }),
    );
  });

  it('does not record or process an empty scheduled run', async () => {
    const f = fixture();
    await f.service.checkBuildingCompletions();
    expect(f.tickStateRepo.findOne).not.toHaveBeenCalled();
    expect(f.tickStateRepo.save).not.toHaveBeenCalled();
    expect(f.shipyardCompletions.completeJobs).not.toHaveBeenCalled();
    expect(f.colonyRepo.find).not.toHaveBeenCalled();
  });

  it('keeps the admin-requested empty run visible', async () => {
    const f = fixture();
    await f.service.checkBuildingCompletions(true);
    expect(f.tickStateRepo.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'COMPLETED' }),
    );
  });

  it('skips a competing history insertion instead of failing an overlapping runner', async () => {
    const f = fixture([{ id: 1 }]);
    f.tickStateRepo.findOne = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ status: 'STARTED' });
    f.tickStateRepo.save.mockRejectedValueOnce(
      Object.assign(new Error('duplicate run'), { code: '23505' }),
    );
    await expect(f.service.checkBuildingCompletions()).resolves.toBeUndefined();
    expect(f.shipyardCompletions.completeJobs).not.toHaveBeenCalled();
    expect(f.failureMail.notify).not.toHaveBeenCalled();
  });

  it('records completion failures and sends the existing tick error notification', async () => {
    const f = fixture([{ id: 1 }]);
    const failure = new Error('shipyard failed');
    f.shipyardCompletions.completeJobs.mockRejectedValue(failure);
    await expect(f.service.checkBuildingCompletions()).rejects.toBe(failure);
    expect(f.tickStateRepo.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'FAILED',
        error: expect.stringContaining('shipyard failed'),
      }),
    );
    expect(f.failureMail.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        tickType: 'BUILDING_COMPLETION',
        status: 'FAILED',
      }),
    );
  });

  it('the colony main tick delegates only repairs to the shipyard queue', async () => {
    const processor = Object.create(
      ColonyTickProcessorService.prototype,
    ) as ColonyTickProcessorService;
    const shipyard = { processShipBuildQueue: jest.fn(async () => undefined) };
    const colony = { id: 1 };
    Object.assign(processor, { colonyShipyardService: shipyard });
    await (
      processor as unknown as {
        processShipRepairQueue(colony: unknown): Promise<void>;
      }
    ).processShipRepairQueue(colony);
    expect(shipyard.processShipBuildQueue).toHaveBeenCalledWith(colony, true);
  });
});
