import type { EntityManager } from 'typeorm';

export const PLAYER_DELETION_HANDLERS = Symbol('PLAYER_DELETION_HANDLERS');

export interface PlayerDeletionHandler {
  order: number;
  delete(tx: EntityManager, userId: number): Promise<void>;
}
