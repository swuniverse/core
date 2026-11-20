import type { SpacecraftRuntimeSystemsDto } from '@swuniverse/shared';
import type { Spacecraft } from './entities/spacecraft.entity';
import {
  getRuntimeSystemsForModule,
  isCoolingDown,
} from './spacecraft-runtime-state.service';

export const COLLECTOR_ACTIVATION_EPS = 15;
export const COLLECTOR_EPS_PER_TICK = 10;

export function collectionBlockReason(
  ship: Spacecraft,
  activating = false,
): string | null {
  const systems = ship.runtimeSystems as SpacecraftRuntimeSystemsDto;
  const collector = systems?.RESOURCE_COLLECTOR;
  if (
    !collector ||
    collector.integrity <= 0 ||
    !ship.modules?.some(
      (module) =>
        getRuntimeSystemsForModule(module).includes('RESOURCE_COLLECTOR') &&
        module.integrity > 0,
    )
  )
    return 'Kein intakter Ressourcen-Kollektor';
  if (
    isCoolingDown(collector) ||
    ship.modules.some(
      (module) =>
        getRuntimeSystemsForModule(module).includes('RESOURCE_COLLECTOR') &&
        isCoolingDown(module),
    )
  )
    return 'Kollektor kühlt ab';
  if (
    ship.kind !== 'SHIP' ||
    ship.status !== 'IDLE' ||
    ship.operatingMode === 'STANDBY'
  )
    return 'Schiff ist nicht einsatzbereit';
  if (ship.alertState === 'RED') return 'Alarmstufe Rot';
  if (ship.dockedAtId != null) return 'Schiff ist angedockt';
  if (ship.tractoredShipId != null || systems.TRACTOR_BEAM?.active)
    return 'Traktorstrahl ist aktiv';
  if (systems.WARPDRIVE?.active) return 'Hyperantrieb muss deaktiviert sein';
  if (systems.SHIELDS?.active) return 'Schilde müssen deaktiviert sein';
  if (systems.CLOAK?.active) return 'Tarnung muss deaktiviert sein';
  if (
    !systems.SHORT_RANGE_SENSORS?.active ||
    systems.SHORT_RANGE_SENSORS.integrity <= 0
  )
    return 'Intakte aktive Nahbereichssensoren erforderlich';
  if (activating && !collector.active && ship.energy < COLLECTOR_ACTIVATION_EPS)
    return 'Mindestens 15 EPS erforderlich';
  return null;
}

export function stopCollection(ship: Spacecraft): boolean {
  const collector = (ship.runtimeSystems as SpacecraftRuntimeSystemsDto)
    ?.RESOURCE_COLLECTOR;
  if (
    !collector ||
    (!collector.active && collector.resourceCommodityId == null)
  )
    return false;
  delete collector.resourceCommodityId;
  delete collector.resourceLocationId;
  collector.active = false;
  return true;
}

/** shortcut: one provisional stock for every field type and commodity; calibrated per field in sc-AUD-12b. */
export const DEFAULT_FIELD_STOCK = 10_000;

/** STU `BussardCollectorHandler`: 95–105 per tick, 190–220 with a faction module, capped by stock and free cargo. */
export function collectAmount(
  factionModule: boolean,
  stock: number,
  freeCargo: number,
  random = Math.random,
): number {
  const [min, max] = factionModule ? [190, 220] : [95, 105];
  const roll = min + Math.floor(random() * (max - min + 1));
  return Math.max(0, Math.min(roll, stock, freeCargo));
}
