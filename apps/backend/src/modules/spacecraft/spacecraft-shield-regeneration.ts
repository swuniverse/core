import {
  getShieldRegenerationRate,
  knownFieldEffects,
  type SpacecraftRuntimeSystemsDto,
} from '@swuniverse/shared';
import type { Spacecraft } from './entities/spacecraft.entity';

/** One adapter for list/detail DTOs and the persistent regeneration run. */
export function spacecraftShieldRegenerationRate(
  ship: Spacecraft,
  crew: number,
  crewRequired: number,
  anomalyTypes: readonly string[] = [],
  now = Date.now(),
): number {
  const field = ship.location?.systemField ?? ship.location?.galaxyField;
  return getShieldRegenerationRate(
    {
      shields: ship.shields,
      shieldsMax: ship.shieldsMax,
      crew,
      crewRequired,
      shieldSystem: (ship.runtimeSystems as SpacecraftRuntimeSystemsDto | null)
        ?.SHIELDS,
      status: ship.status,
      rpgHidden: ship.rpgHidden,
      fieldEffects: knownFieldEffects([
        ...(field?.fieldType?.effects ?? []),
        ...((field && 'effects' in field ? field.effects : []) ?? []),
      ]),
      anomalyTypes,
    },
    now,
  );
}
