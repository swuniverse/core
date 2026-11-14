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
  'warpCooldown',
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
  'arrivalAt',
  'originLocationId',
  'targetLocationId',
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
  persisted.originLocation = moving.originLocation;
  persisted.targetLocation = moving.targetLocation;
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
