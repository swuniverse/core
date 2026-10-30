import type { Spacecraft } from './entities/spacecraft.entity';

/**
 * STU `EnergyConsumeHandler::calculateBatteryReload`: a station with the reload switch on
 * moves at most a tenth of its battery capacity per tick from freshly produced EPS into the battery.
 */
export function stationBatteryReload(
  ship: Pick<Spacecraft, 'kind' | 'reloadBattery' | 'battery' | 'batteryMax'>,
  epsGain: number,
): number {
  if (ship.kind !== 'STATION' || !ship.reloadBattery || epsGain <= 0) {
    return 0;
  }
  return Math.max(
    0,
    Math.min(
      Math.ceil(ship.batteryMax / 10),
      epsGain,
      ship.batteryMax - ship.battery,
    ),
  );
}
