import type { SpaceLocationDto } from '@swuniverse/shared';

export const MEMBER_OPERATIONS_READER = Symbol('MEMBER_OPERATIONS_READER');

export interface MemberColonyRecord {
  id: number;
  name: string;
  location: SpaceLocationDto | null;
  energy: number;
  energyMax: number;
  storageUsed: number;
  storageMax: number;
  population: number;
  populationMax: number;
}

export interface MemberShipRecord {
  id: number;
  name: string;
  shipClassId: number;
  shipClassName: string;
  location: SpaceLocationDto | null;
}

/** Operational data of one player; never contains anything private. */
export interface MemberOperationsRecord {
  userId: number;
  lastActiveAt: Date | null;
  crew: { assigned: number; limit: number };
  /** Active (not abandoned) colonies only. */
  colonies: MemberColonyRecord[];
  /** Ships that are not destroyed. */
  ships: MemberShipRecord[];
}

/**
 * Narrow read view onto colony, ship, crew and activity data of many players
 * at once. Implementations load the data bundled, not once per player.
 * Further read methods (e.g. `colonyStock`) are added here.
 */
export interface MemberOperationsReader {
  memberOperations(userIds: number[]): Promise<MemberOperationsRecord[]>;
}
