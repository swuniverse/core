import { SpacecraftResourceFlowService } from './spacecraft-resource-flow.service';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';

describe('SpacecraftResourceFlowService', () => {
  function createService() {
    return new SpacecraftResourceFlowService(
      new SpacecraftRuntimeStateService(),
    );
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
      reactorFuel: 100,
      reactorFuelMax: 100,
      reactorWarpSplit: 100,
      shields: 0,
      shieldsMax: 0,
      runtimeSystems: {},
      ...overrides,
    };
  }

  // initialize() creates all runtime systems active.
  // Active costs: LSS + NBS + WEAPONS + TORPEDO_BANK + SPECIAL + LIFE_SUPPORT = 6.

  it('split=100 sends nothing to hyperdrive, all remaining to EPS', () => {
    const service = createService();
    const ship = makeShip({ reactorWarpSplit: 100, reactorOutput: 10 });
    service.recharge(ship as never, 2);

    expect(ship.energy).toBe(4);
    expect(ship.warpdrive).toBe(0);
  });

  it('split=0 sends maximum to hyperdrive', () => {
    const service = createService();
    const ship = makeShip({ reactorWarpSplit: 0, reactorOutput: 10 });
    service.recharge(ship as never, 2);

    expect(ship.energy).toBe(0);
    expect(ship.warpdrive).toBe(2);
  });

  it('split=50 distributes evenly', () => {
    const service = createService();
    const ship = makeShip({ reactorWarpSplit: 50, reactorOutput: 10 });
    service.recharge(ship as never, 2);

    expect(ship.energy).toBe(2);
    expect(ship.warpdrive).toBe(1);
  });

  it('does not automatically charge ship batteries from leftover reactor output', () => {
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

    expect(ship.energy).toBe(100);
    expect(ship.warpdrive).toBe(50);
    expect(ship.battery).toBe(0);
  });

  it('caps output by reactor load and consumes actual energy use', () => {
    const service = createService();
    const ship = makeShip({
      reactorOutput: 10,
      reactorFuel: 3,
      reactorWarpSplit: 100,
    });
    service.recharge(ship as never, 1);
    expect(ship.energy).toBe(0);
    expect(ship.reactorFuel).toBe(0);
  });

  it('does not consume reactor load for already full stores', () => {
    const service = createService();
    const ship = makeShip({
      energy: 100,
      epsMax: 100,
      energyMax: 100,
      warpdrive: 50,
      warpdriveMax: 50,
      battery: 20,
      batteryMax: 20,
    });
    service.recharge(ship as never, 1);
    expect(ship.reactorFuel).toBe(94);
  });

  it('brownout deactivates systems when reactor cannot cover usage', () => {
    const service = createService();
    const ship = makeShip({
      reactorWarpSplit: 100,
      reactorOutput: 3,
      energy: 0,
      battery: 0,
    });
    service.recharge(ship as never, 1);

    // epsUsage=6, reactorOutput=3, so three non-critical systems brown out.
    // Deactivation: SPECIAL, TORPEDO_BANK, WEAPONS.
    const systems = ship.runtimeSystems as Record<string, { active: boolean }>;
    expect(systems.SPECIAL?.active).toBe(false);
    expect(systems.TORPEDO_BANK?.active).toBe(false);
    expect(systems.WEAPONS?.active).toBe(false);
    expect(systems.LONG_RANGE_SENSORS?.active).toBe(true);
    expect(systems.SHORT_RANGE_SENSORS?.active).toBe(true);
  });

  it('handles flightCost=0 gracefully (no warp production)', () => {
    const service = createService();
    const ship = makeShip({ reactorWarpSplit: 0, reactorOutput: 10 });
    service.recharge(ship as never, 0);

    // flightCost=0 → maxWarpGain=0 → warpProd=0
    expect(ship.energy).toBe(4);
    expect(ship.warpdrive).toBe(0);
  });

  it('uses the same calculation for the read model and recharge', () => {
    const service = createService();
    const ship = makeShip({ reactorWarpSplit: 100, reactorOutput: 10 });
    const flow = service.calculate(ship as never, 2);
    expect(flow.totalSystemConsumption).toBe(6);
    expect(flow.systems).toContainEqual(
      expect.objectContaining({ systemKey: 'LIFE_SUPPORT', epsPerTick: 1 }),
    );
    service.recharge(ship as never, 2);
    expect(ship.energy).toBe(flow.netEps);
  });
});
