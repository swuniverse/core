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

export interface ColonyStockItemRecord {
  commodityId: number;
  name: string;
  amount: number;
}

/** Stock of one active colony; the owner lets callers check membership. */
export interface ColonyStockRecord {
  colonyId: number;
  userId: number;
  items: ColonyStockItemRecord[];
}

/**
 * Narrow read view onto colony, ship, crew and activity data of many players
 * at once. Implementations load the data bundled, not once per player.
 */
export interface MemberOperationsReader {
  memberOperations(userIds: number[]): Promise<MemberOperationsRecord[]>;
  /** Stock (amount > 0) of an active colony; null when missing or abandoned. */
  colonyStock(colonyId: number): Promise<ColonyStockRecord | null>;
}
