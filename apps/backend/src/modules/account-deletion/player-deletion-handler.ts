import type { EntityManager } from 'typeorm';

export const PLAYER_DELETION_HANDLERS = Symbol('PLAYER_DELETION_HANDLERS');

/**
 * One domain's part of an account deletion (STU `PlayerDeletionHandlerInterface`).
 *
 * Each feature module owns its handler: it imports `AccountDeletionModule`
 * and calls `PlayerDeletionService.register(this)` in `onModuleInit`, so the
 * deletion module never imports feature modules. Handlers run by ascending
 * `order`; the user row is deleted last.
 *
 * Current order: 10 alliance, 20 messages, 30 HoloNet, 40 account data,
 * 100 trade (abandons own trade posts before their stations go), 200 ships
 * and knowledge, colonies follow (sh-AP-05d).
 *
 * Content other players see stays and loses its author (`NULL`), shown as
 * "Gelöschter Siedler" (see `deleted-player.ts`). Personal data goes.
 */
export interface PlayerDeletionHandler {
  order: number;
  /**
   * Optional step before the deletion transaction, for domains that run
   * their own transactions (e.g. the alliance departure). Its effect is kept
   * even if the deletion itself fails later.
   */
  prepare?(userId: number): Promise<void>;
  /** Runs inside the deletion transaction; the user row is still locked. */
  delete(tx: EntityManager, userId: number): Promise<void>;
}
