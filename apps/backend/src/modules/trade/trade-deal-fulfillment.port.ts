import type { EntityManager } from 'typeorm';

/**
 * Ship and buildplan delivery for Hutt Cartel deals. The spacecraft module
 * registers its implementation, so trade does not import the ship domain.
 */
export interface TradeDealFulfillment {
  /** STU `ShipCreator` at the post: no crew, energy, reactor and warp drive at 25%. */
  createShip(manager: EntityManager, input: { userId: number; buildplanId: number; locationId: number }): Promise<void>;
  /** STU `copyBuildplan`: the admin plan becomes an own buildplan of the player. */
  grantBuildplan(manager: EntityManager, input: { userId: number; buildplanId: number }): Promise<void>;
}
