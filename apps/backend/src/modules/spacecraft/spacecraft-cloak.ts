import { Faction } from '@swuniverse/shared';
import type { Spacecraft } from './entities/spacecraft.entity';

/** Only the Galactic Empire may fit and run the cloaking field generator. */
export const CLOAK_FACTION = Faction.GALACTIC_EMPIRE;

/** EPS drawn once when the cloak is engaged (STU `getEnergyUsageForActivation`). */
export const CLOAK_ACTIVATION_EPS = 10;

/** Systems that are shut down by, and cannot run while, the cloak is active. */
export const CLOAK_EXCLUSIVE_SYSTEMS = [
  'SHIELDS',
  'WEAPONS',
  'TORPEDO_BANK',
  'ASTROMETRY_LAB',
] as const;

export function mayUseCloak(faction: Faction | null | undefined): boolean {
  return faction === CLOAK_FACTION;
}

/** Reads the persisted runtime state without requiring hydrated modules. */
export function isCloaked(
  ship: Pick<Spacecraft, 'runtimeSystems'> | null | undefined,
): boolean {
  const cloak = ship?.runtimeSystems?.CLOAK as { active?: boolean } | undefined;
  return cloak?.active === true;
}

/** Cloaked ships are visible to their owner only; alliances grant no exception. */
export function isHiddenFromViewer(
  ship: Pick<Spacecraft, 'runtimeSystems' | 'userId'>,
  viewerId: number,
): boolean {
  return ship.userId !== viewerId && isCloaked(ship);
}
