import { stationBatteryReload } from './station-battery-reload';

const station = { kind: 'STATION', reloadBattery: true, battery: 0, batteryMax: 45 } as never;

describe('stationBatteryReload', () => {
  it('moves at most a tenth of the battery capacity per tick', () => {
    expect(stationBatteryReload(station, 100)).toBe(5);
  });

  it('is limited by the produced EPS and the free battery space', () => {
    expect(stationBatteryReload(station, 3)).toBe(3);
    expect(
      stationBatteryReload({ ...(station as object), battery: 43 } as never, 100),
    ).toBe(2);
  });

  it('does nothing when switched off, without EPS gain or on ships', () => {
    expect(stationBatteryReload({ ...(station as object), reloadBattery: false } as never, 9)).toBe(0);
    expect(stationBatteryReload(station, 0)).toBe(0);
    expect(stationBatteryReload({ ...(station as object), kind: 'SHIP' } as never, 9)).toBe(0);
  });
});
