jest.mock('../starmap/entities/space-location.entity', () => ({ SpaceLocation: class SpaceLocation {} }));
import { TickService } from './tick.service';
import { isVacationEffective, VACATION_DELAY_MS } from '@swuniverse/shared';

const NOW = 1800000000000;
function fixture(flag: boolean, age: number | null) {
  const user = { id: 1, vacationMode: flag, vacationStartedAt: age == null ? null : new Date(NOW - age), faction: 'REBEL_ALLIANCE' };
  const colony = { id: 10, userId: 1, isAbandoned: false };
  const jobs = ['BUILD', 'RETROFIT', 'REPAIR'].map((mode) => ({ mode, status: 'QUEUED' }));
  const colonyService = {
    processTick: jest.fn(async () => ({ researchPoints: 0, productionDelta: new Map(), events: [] })),
    processShipRepairQueue: jest.fn(async () => { for (const job of jobs) if (job.mode === 'REPAIR') job.status = 'COMPLETED'; }),
  };
  const ship = { id: 20, userId: 1, kind: 'SHIP', location: null };
  const station = { id: 21, userId: 1, kind: 'STATION', location: null };
  const spacecraftService = { processTick: jest.fn() };
  const crew = { enforceGlobalCrewLimit: jest.fn(async () => 0) };
  const userRepo = { find: jest.fn(async () => [user]) };
  const service = new TickService(
    { find: jest.fn(async () => [colony]) } as any, {} as any,
    { find: jest.fn(async () => [ship, station]) } as any, userRepo as any,
    { findOne: jest.fn(async () => null), create: (value: any) => value, save: jest.fn(async (value) => value) } as any,
    colonyService as any, { createTickEvents: jest.fn() } as any, spacecraftService as any,
    { processTick: jest.fn() } as any, { emitToAll: jest.fn(), emitToUser: jest.fn() } as any,
    { get: jest.fn() } as any, { recordSnapshot: jest.fn() } as any, { recordSnapshots: jest.fn() } as any,
    { deleteExpired: jest.fn() } as any, crew as any,
  );
  return { service, colonyService, spacecraftService, crew, userRepo, user, colony, ship, station, jobs };
}

describe('vacation efficacy in the main tick', () => {
  it.each([
    ['fresh request', true, 0, false],
    ['47 hours', true, 47 * 60 * 60 * 1000, false],
    ['exactly 48 hours', true, VACATION_DELAY_MS, false],
    ['48 hours plus one millisecond', true, VACATION_DELAY_MS + 1, true],
    ['49 hours', true, 49 * 60 * 60 * 1000, true],
    ['ended vacation', false, VACATION_DELAY_MS + 1, false],
    ['missing activation date', true, null, false],
  ])('uses the shared delay for %s and keeps all ship/station repairs running', async (_label, flag, age, effective) => {
    jest.useFakeTimers().setSystemTime(NOW);
    try {
      const f = fixture(Boolean(flag), age as number | null);
      expect(isVacationEffective(f.user)).toBe(effective);
      await f.service.handleTick(NOW);
      expect(f.userRepo.find).toHaveBeenCalledWith(expect.objectContaining({ select: expect.arrayContaining(['vacationStartedAt']) }));
      expect(f.colonyService.processTick).toHaveBeenCalledTimes(effective ? 0 : 1);
      expect(f.crew.enforceGlobalCrewLimit).toHaveBeenCalledTimes(effective ? 0 : 1);
      expect(f.colonyService.processShipRepairQueue).toHaveBeenCalledTimes(effective ? 1 : 0);
      if (effective) expect(f.jobs.map((job) => job.status)).toEqual(['QUEUED', 'QUEUED', 'COMPLETED']);
      expect(f.spacecraftService.processTick).toHaveBeenCalledWith(f.ship);
      expect(f.spacecraftService.processTick).toHaveBeenCalledWith(f.station);
      expect(f.spacecraftService.processTick.mock.calls.every((args) => args.length === 1)).toBe(true);
    } finally { jest.useRealTimers(); }
  });
});
