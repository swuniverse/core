jest.mock('../starmap/entities/space-location.entity', () => ({
  SpaceLocation: class SpaceLocation {},
}));

import { RepairCompletionService } from './repair-completion.service';

function fixture() {
  const colony = { id: 20, userId: 7, isAbandoned: false };
  const ship = { id: 30 };
  const colonyShipyard = { processShipBuildQueue: jest.fn(async () => undefined) };
  const stationRepairs = { processQueue: jest.fn(async () => undefined) };
  const shipRepairs = { processTick: jest.fn(async () => undefined) };
  const gateway = { emitToUser: jest.fn() };
  const service = new RepairCompletionService(
    { find: jest.fn(async () => [{ colonyId: 20 }, { colonyId: 20 }]) } as never,
    { find: jest.fn(async () => [colony]) } as never,
    { find: jest.fn(async () => [{ stationId: 40 }, { stationId: 40 }]) } as never,
    { find: jest.fn(async () => [{ spacecraftId: 30 }]) } as never,
    { find: jest.fn(async () => [ship]) } as never,
    colonyShipyard as never,
    stationRepairs as never,
    shipRepairs as never,
    gateway as never,
  );
  return { service, colony, ship, colonyShipyard, stationRepairs, shipRepairs, gateway };
}

describe('RepairCompletionService', () => {
  it('steps colony, station and on-board repairs once each per minute run', async () => {
    const f = fixture();
    await f.service.run(new Date());
    expect(f.colonyShipyard.processShipBuildQueue).toHaveBeenCalledTimes(1);
    expect(f.colonyShipyard.processShipBuildQueue).toHaveBeenCalledWith(f.colony, true);
    expect(f.stationRepairs.processQueue).toHaveBeenCalledTimes(1);
    expect(f.stationRepairs.processQueue).toHaveBeenCalledWith(40);
    expect(f.shipRepairs.processTick).toHaveBeenCalledWith(f.ship);
    expect(f.gateway.emitToUser).toHaveBeenCalledWith(7, 'COLONY_UPDATED', { colonyId: 20 });
  });

  it('keeps going after one failure and still fails the run', async () => {
    const f = fixture();
    f.colonyShipyard.processShipBuildQueue.mockRejectedValueOnce(new Error('colony broke'));
    await expect(f.service.run(new Date())).rejects.toThrow('colony broke');
    expect(f.stationRepairs.processQueue).toHaveBeenCalled();
    expect(f.shipRepairs.processTick).toHaveBeenCalled();
  });
});
