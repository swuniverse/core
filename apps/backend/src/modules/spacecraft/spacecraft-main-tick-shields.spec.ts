jest.mock('../starmap/entities/space-location.entity', () => ({
  SpaceLocation: class SpaceLocation {},
}));
import { SpacecraftService } from './spacecraft.service';

describe('main tick leaves shields to the independent regeneration run', () => {
  it('neither regenerates shields nor spends two EPS even with enough energy', async () => {
    const ship: any = {
      id: 1,
      kind: 'SHIP',
      status: 'IDLE',
      crew: 0,
      shields: 20,
      shieldsMax: 100,
      energy: 20,
      energyMax: 100,
      epsMax: 100,
      battery: 0,
      batteryMax: 10,
      reactorOutput: 0,
      runtimeSystems: { LIFE_SUPPORT: { active: true, integrity: 100 } },
    };
    const service: any = Object.assign(
      Object.create(SpacecraftService.prototype),
      {
        stationConstructionService: {
          processTick: jest.fn(async () => ({
            completed: false,
            paused: false,
          })),
        },
        takeoverService: { processTick: jest.fn() },
        moduleRepo: { find: jest.fn(async () => []) },
        shipClassService: { findById: jest.fn(async () => null) },
        spacecraftRuntimeStateService: {
          initialize: (value: any) => value.runtimeSystems,
        },
        spacecraftResourceFlowService: {
          recharge: jest.fn(() => ({ deactivatedSystems: [] })),
        },
        trackerService: { processTick: jest.fn() },
        shipRepo: { save: jest.fn(async (value) => value) },
        cartographyPlanService: {
          getPlanForFinalizingSpacecraft: jest.fn(async () => null),
        },
      },
    );
    await service.processTick(ship, { skipRepair: true });
    expect(ship.shields).toBe(20);
    expect(ship.energy).toBe(20);
    expect(service.shipRepo.save).toHaveBeenCalledWith(ship);
  });
});
