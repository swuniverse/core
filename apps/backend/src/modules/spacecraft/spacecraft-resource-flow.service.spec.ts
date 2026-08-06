import { SpacecraftResourceFlowService } from './spacecraft-resource-flow.service';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';

describe('SpacecraftResourceFlowService', () => {
  function createService() {
    return new SpacecraftResourceFlowService(new SpacecraftRuntimeStateService());
  }

  function makeShip(overrides = {}) {
    return {
      energy: 0,
      energyMax: 100,
      epsMax: 100,
      warpdrive: 0,
      warpdriveMax: 50,
      battery: 0,
      batteryMax: 20,
      reactorOutput: 10,
      reactorWarpSplit: 100,
      shields: 0,
      shieldsMax: 0,
      runtimeSystems: {},
      ...overrides,
    };
  }

  // All tests: initialize() creates all 10 systems active.
  // Active systems with cost: SENSORS(1) + WEAPONS(1) + TORPEDO_BANK(1) + SPECIAL(1) = 4 epsUsage

  it('split=100 sends nothing to warpdrive, all remaining to EPS', () => {
    const service = createService();
    const ship = makeShip({ reactorWarpSplit: 100, reactorOutput: 10 });
    service.recharge(ship as never, 2);

    // epsUsage=4, maxWarpGain=floor((10-4)/2)=3, warpProd=round(0*3)=0
    // epsProd=10-0=10, netEps=10-4=6, epsGain=min(100,6)=6
    expect(ship.energy).toBe(6);
    expect(ship.warpdrive).toBe(0);
  });

  it('split=0 sends maximum to warpdrive', () => {
    const service = createService();
    const ship = makeShip({ reactorWarpSplit: 0, reactorOutput: 10 });
    service.recharge(ship as never, 2);

    // epsUsage=4, maxWarpGain=floor((10-4)/2)=3, warpProd=round(1*3)=3
    // epsProd=10-3*2=4, netEps=4-4=0, epsGain=0
    // warpGain=min(50,3)=3
    expect(ship.energy).toBe(0);
    expect(ship.warpdrive).toBe(3);
  });

  it('split=50 distributes evenly', () => {
    const service = createService();
    const ship = makeShip({ reactorWarpSplit: 50, reactorOutput: 10 });
    service.recharge(ship as never, 2);

    // maxWarpGain=floor(6/2)=3, warpProd=round(0.5*3)=2
    // epsProd=10-2*2=6, netEps=6-4=2
    // warpGain=2
    expect(ship.energy).toBe(2);
    expect(ship.warpdrive).toBe(2);
  });

  it('leftover goes to battery when EPS and warp are full', () => {
    const service = createService();
    const ship = makeShip({
      reactorWarpSplit: 100,
      reactorOutput: 20,
      energy: 98,
      epsMax: 100,
      energyMax: 100,
      warpdrive: 50,
      warpdriveMax: 50,
      battery: 0,
      batteryMax: 20,
    });
    service.recharge(ship as never, 1);

    // epsUsage=4, maxWarpGain=floor((20-4)/1)=16, warpProd=0 (split=100)
    // epsProd=20, netEps=20-4=16, epsGain=min(2,16)=2
    // warpGain=0 (warp full)
    // leftover: (16-2) + 0 = 14, batteryGain=min(20,14)=14
    expect(ship.energy).toBe(100);
    expect(ship.warpdrive).toBe(50);
    expect(ship.battery).toBe(14);
  });

  it('brownout deactivates systems when reactor cannot cover usage', () => {
    const service = createService();
    const ship = makeShip({
      reactorWarpSplit: 100,
      reactorOutput: 2,
      energy: 0,
      battery: 0,
    });
    service.recharge(ship as never, 1);

    // epsUsage=4, reactorOutput=2
    // maxWarpGain=floor((2-4)/1)=0 (clamped), warpProd=0
    // epsProd=2, netEps=2-4=-2 → brownout deficit=2
    // Deactivation: SPECIAL(1, deficit→1), TORPEDO_BANK(1, deficit→0)
    const systems = ship.runtimeSystems as Record<string, { active: boolean }>;
    expect(systems.SPECIAL?.active).toBe(false);
    expect(systems.TORPEDO_BANK?.active).toBe(false);
    expect(systems.WEAPONS?.active).toBe(true);
    expect(systems.SENSORS?.active).toBe(true);
  });

  it('handles flightCost=0 gracefully (no warp production)', () => {
    const service = createService();
    const ship = makeShip({ reactorWarpSplit: 0, reactorOutput: 10 });
    service.recharge(ship as never, 0);

    // flightCost=0 → maxWarpGain=0 → warpProd=0
    // epsProd=10, netEps=10-4=6
    expect(ship.energy).toBe(6);
    expect(ship.warpdrive).toBe(0);
  });
});
