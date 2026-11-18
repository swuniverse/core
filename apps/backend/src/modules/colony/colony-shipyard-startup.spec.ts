jest.mock('../starmap/entities/space-location.entity', () => ({ SpaceLocation: class SpaceLocation {} }));
import { ColonyShipyardService } from './colony-shipyard.service';

describe('colony retrofit system startup', () => {
  it('starts replacement scanners OFF and preserves the running state of untouched systems', async () => {
    const scanner = { id: 1, spacecraftId: 10, slotId: 'scanner', category: 'SPECIAL', moduleType: 'Hyperraumfeldscanner', level: 1, integrity: 100, cooldown: 0, isActive: true };
    const shields = { ...scanner, id: 2, slotId: 'shields', category: 'SHIELDS', moduleType: 'Schilde' };
    const ship = { id: 10, userId: 1, shipClassId: 4, crewMax: 5, runtimeSystems: {
      SUBSPACE_SCANNER: { active: true, integrity: 20, cooldown: 3 },
      SHIELDS: { active: true, integrity: 90, cooldown: 0 },
    } };
    const job = { id: 20, spacecraftId: 10, userId: 1, status: 'QUEUED', moduleSelections: [
      { slotId: 'scanner', commodityId: 3 }, { slotId: 'shields', commodityId: 2 },
    ] };
    const service = Object.assign(Object.create(ColonyShipyardService.prototype), {
      shipRepo: { findOne: jest.fn(async () => ship), save: jest.fn(async (value) => value) },
      shipClassRepo: { findOneBy: jest.fn(async () => ({ id: 4 })) },
      spacecraftModuleRepo: {
        find: jest.fn(async () => [scanner, shields]), remove: jest.fn(),
        create: (value: unknown) => value, save: jest.fn(async (value) => value),
      },
      normalizeInstalledModuleSelections: () => [{ slotId: 'scanner', commodityId: 1 }, { slotId: 'shields', commodityId: 2 }],
      resolveModuleCommodityId: (module: typeof scanner) => module.id,
      colonyStatsService: { calculateSummary: () => ({ effectiveStorageMax: 100 }) },
      colonyStorageService: { upperStorage: jest.fn(async () => 1) },
      spacecraftStatsService: { applyStats: jest.fn() },
      calculateCrewRequired: () => 1,
      gameData: { getFabricationItemByOutputCommodity: () => ({ moduleType: 'Hyperraumfeldscanner', shipyardType: 'SPECIAL', moduleLevel: 2 }) },
      shipBuildQueueRepo: { save: jest.fn() },
    });
    await service.finishShipRetrofitQueue({}, job);
    expect(ship.runtimeSystems.SUBSPACE_SCANNER).toEqual({ active: false, integrity: 100, cooldown: 0 });
    expect(ship.runtimeSystems.SHIELDS).toMatchObject({ active: true, integrity: 90 });
    expect(service.spacecraftModuleRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: true, integrity: 100, level: 2 }));
    expect(job.status).toBe('COMPLETED');
    expect(service.shipRepo.save).toHaveBeenCalledWith(ship);
  });
});
