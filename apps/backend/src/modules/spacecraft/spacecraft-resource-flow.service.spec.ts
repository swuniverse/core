import { SpacecraftResourceFlowService } from './spacecraft-resource-flow.service';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';

describe('SpacecraftResourceFlowService', () => {
  it('charges EPS, then warpdrive, then battery from reactor output', () => {
    const service = new SpacecraftResourceFlowService(
      new SpacecraftRuntimeStateService(),
    );
    // reactor=10, shields=0 (no shield upkeep), SENSORS+COMPUTER+WEAPONS active = 3 upkeep
    // remaining=7: EPS missing=5 → charged, remaining=2: warpdrive missing=3 → 2 charged, battery stays 0
    const ship = {
      energy: 5,
      energyMax: 10,
      epsMax: 10,
      warpdrive: 1,
      warpdriveMax: 4,
      battery: 0,
      batteryMax: 10,
      reactorOutput: 10,
      shields: 0,
      shieldsMax: 0,
      runtimeSystems: {},
    };

    service.recharge(ship as never);

    expect(ship).toMatchObject({
      energy: 10,
      warpdrive: 3,
      battery: 0,
      runtimeSystems: expect.objectContaining({
        EPS: expect.objectContaining({ current: 10, max: 10 }),
        WARPDRIVE: expect.objectContaining({ current: 3, max: 4 }),
        REACTOR: expect.objectContaining({ current: 10, max: 10 }),
      }),
    });
  });

  it('uses battery for all active system upkeep when reactor and EPS are insufficient', () => {
    const service = new SpacecraftResourceFlowService(
      new SpacecraftRuntimeStateService(),
    );
    // reactor=0, EPS=0, shields=10 active (2), SENSORS(1)+COMPUTER(1)+WEAPONS(1) = total 5
    // battery=5 pays all, shields stay active
    const ship = {
      energy: 0,
      energyMax: 10,
      epsMax: 10,
      warpdrive: 0,
      warpdriveMax: 0,
      battery: 5,
      batteryMax: 10,
      reactorOutput: 0,
      shields: 10,
      shieldsMax: 10,
      runtimeSystems: { SHIELDS: { active: true, cooldown: 0, integrity: 100 } },
    };

    service.recharge(ship as never);

    expect(ship.battery).toBe(0);
    expect(ship.runtimeSystems).toMatchObject({
      SHIELDS: expect.objectContaining({ active: true }),
    });
  });

  it('deactivates shields when reactor, EPS, and battery cannot pay upkeep', () => {
    const service = new SpacecraftResourceFlowService(
      new SpacecraftRuntimeStateService(),
    );
    const ship = {
      energy: 0,
      energyMax: 10,
      epsMax: 10,
      warpdrive: 0,
      warpdriveMax: 0,
      battery: 1,
      batteryMax: 10,
      reactorOutput: 0,
      shields: 10,
      shieldsMax: 10,
      runtimeSystems: { SHIELDS: { active: true, cooldown: 0, integrity: 100 } },
    };

    service.recharge(ship as never);

    expect(ship.battery).toBe(0);
    expect(ship.runtimeSystems).toMatchObject({
      SHIELDS: expect.objectContaining({ active: false }),
    });
  });
});
