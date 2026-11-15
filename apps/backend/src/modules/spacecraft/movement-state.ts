import { BadRequestException } from '@nestjs/common';
import { isDeepStrictEqual } from 'node:util';
import type { Spacecraft } from './entities/spacecraft.entity';

const MOVEMENT_STATE_KEYS = [
  'id',
  'userId',
  'shipClassId',
  'kind',
  'locationId',
  'status',
  'operatingMode',
  'fleetId',
  'dockedAtId',
  'tractoredShipId',
  'energy',
  'energyMax',
  'epsMax',
  'warpdrive',
  'warpdriveMax',
  'reactorFuel',
  'reactorFuelMax',
  'reactorOutput',
  'shields',
  'shieldsMax',
  'hull',
  'hullMax',
  'crewRequired',
  'runtimeSystems',
  'shortRangeSensorsCooldownUntil',
  'lastGalaxyFlightDirection',
] as const;

export type MovementState = Pick<
  Spacecraft,
  (typeof MOVEMENT_STATE_KEYS)[number]
> & {
  modules?: Array<
    Pick<
      NonNullable<Spacecraft['modules']>[number],
      'id' | 'category' | 'moduleType' | 'integrity' | 'cooldown' | 'isActive'
    >
  >;
};

export interface FleetMovementState {
  id: number;
  leaderId: number;
  isFixed: boolean;
  memberIds: number[];
  memberLocations: Map<number, number | null>;
}

export interface MovementOriginals extends Map<Spacecraft, MovementState> {
  fleet: FleetMovementState | null;
}

export function captureMovementOriginals(ship: Spacecraft): MovementOriginals {
  return Object.assign(new Map([[ship, captureMovementState(ship)]]), {
    fleet: null,
  });
}

/** Capture before activation, undocking, payment or position changes. */
export function captureMovementState(ship: Spacecraft): MovementState {
  const state = Object.fromEntries(
    MOVEMENT_STATE_KEYS.map((key) => [key, ship[key]]),
  ) as Pick<Spacecraft, (typeof MOVEMENT_STATE_KEYS)[number]>;
  return structuredClone({
    ...state,
    ...(ship.modules
      ? {
          modules: ship.modules
            .map(
              ({
                id,
                category,
                moduleType,
                integrity,
                cooldown,
                isActive,
              }) => ({
                id,
                category,
                moduleType,
                integrity,
                cooldown,
                isActive,
              }),
            )
            .sort((a, b) => a.id - b.id),
        }
      : {}),
  });
}

/** Apply only the bounded movement fields to the current locked row. */
export function applyMovementState(
  persisted: Spacecraft,
  moving: Spacecraft,
): void {
  Object.assign(
    persisted,
    Object.fromEntries(MOVEMENT_STATE_KEYS.map((key) => [key, moving[key]])),
  );
  persisted.location = moving.location;
}

export function assertMovementState(
  persisted: Spacecraft,
  original: MovementState,
): void {
  if (!isDeepStrictEqual(captureMovementState(persisted), original)) {
    throw new BadRequestException(
      'Bewegungszustand ist veraltet; bitte erneut versuchen',
    );
  }
}

/** Takes over the bounded movement fields of a freshly loaded row. */
export function refreshMovementFields(
  moving: Spacecraft,
  persisted: Spacecraft,
): void {
  Object.assign(
    moving,
    Object.fromEntries(MOVEMENT_STATE_KEYS.map((key) => [key, persisted[key]])),
  );
}

/** Stored values compare as JSON: undefined keys and Date instances drop out. */
function sameStoredValue(left: unknown, right: unknown): boolean {
  const normalize = (value: unknown) =>
    value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  return isDeepStrictEqual(normalize(left), normalize(right));
}

/**
 * Field consequences change a ship after its step was committed. Returns the
 * changed movement fields to persist; a field that someone else changed to a
 * different value in the meantime makes the movement stale.
 */
export function consequenceChanges(
  moving: Spacecraft,
  original: MovementState,
  persisted: Spacecraft,
): Partial<Spacecraft> {
  const changes: Record<string, unknown> = {};
  for (const key of MOVEMENT_STATE_KEYS) {
    if (sameStoredValue(moving[key], original[key])) continue;
    if (sameStoredValue(persisted[key], moving[key])) continue;
    if (!sameStoredValue(persisted[key], original[key])) {
      throw new BadRequestException(
        'Bewegungszustand ist veraltet; bitte erneut versuchen',
      );
    }
    changes[key] = moving[key];
  }
  return changes as Partial<Spacecraft>;
}
