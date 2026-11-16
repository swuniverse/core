import {
  collectionBlockReason,
  stopCollection,
} from './resource-collection-state';
import type { Spacecraft } from './entities/spacecraft.entity';

function ship(): Spacecraft {
  return {
    kind: 'SHIP',
    status: 'IDLE',
    operatingMode: 'NORMAL',
    energy: 15,
    alertState: 'GREEN',
    locationId: 5,
    modules: [
      {
        category: 'SPECIAL',
        moduleType: 'Ressourcen-Kollektor',
        integrity: 100,
        cooldown: 0,
      },
    ],
    runtimeSystems: {
      RESOURCE_COLLECTOR: { active: false, integrity: 100, cooldown: 0 },
      SHORT_RANGE_SENSORS: { active: true, integrity: 100, cooldown: 0 },
    },
  } as unknown as Spacecraft;
}
describe('Resource collection rules', () => {
  it('accepts an intact collector with NBS and 15 EPS', () => {
    expect(collectionBlockReason(ship(), true)).toBeNull();
  });
  it.each([
    'module',
    'integrity',
    'sensors',
    'shields',
    'warp',
    'cloak',
    'docked',
    'tractor',
    'standby',
    'combat',
    'red',
    'energy',
  ])('refuses %s', (reason) => {
    const target = ship();
    const state = target.runtimeSystems as Record<
      string,
      { active: boolean; integrity: number; cooldown: number }
    >;
    if (reason === 'module') target.modules = [];
    if (reason === 'integrity') state.RESOURCE_COLLECTOR.integrity = 0;
    if (reason === 'sensors') state.SHORT_RANGE_SENSORS.active = false;
    if (['shields', 'warp', 'cloak'].includes(reason))
      state[
        reason === 'shields'
          ? 'SHIELDS'
          : reason === 'warp'
            ? 'WARPDRIVE'
            : 'CLOAK'
      ] = { active: true, integrity: 100, cooldown: 0 };
    if (reason === 'docked') target.dockedAtId = 6;
    if (reason === 'tractor') target.tractoredShipId = 6;
    if (reason === 'standby')
      target.operatingMode = 'STANDBY' as Spacecraft['operatingMode'];
    if (reason === 'combat')
      target.status = 'IN_COMBAT' as Spacecraft['status'];
    if (reason === 'red') target.alertState = 'RED' as Spacecraft['alertState'];
    if (reason === 'energy') target.energy = 14;
    expect(collectionBlockReason(target, true)).not.toBeNull();
  });
  it('clears gathering selection and active state without changing other systems', () => {
    const target = ship();
    target.runtimeSystems = {
      ...target.runtimeSystems,
      RESOURCE_COLLECTOR: {
        active: true,
        integrity: 80,
        cooldown: 0,
        resourceCommodityId: 3,
        resourceLocationId: 5,
      },
    };
    expect(stopCollection(target)).toBe(true);
    expect(target.runtimeSystems).toMatchObject({
      RESOURCE_COLLECTOR: { active: false, integrity: 80 },
      SHORT_RANGE_SENSORS: { active: true },
    });
    expect(
      (target.runtimeSystems as Record<string, Record<string, unknown>>)
        .RESOURCE_COLLECTOR.resourceCommodityId,
    ).toBeUndefined();
    expect(stopCollection(target)).toBe(false);
  });
});
