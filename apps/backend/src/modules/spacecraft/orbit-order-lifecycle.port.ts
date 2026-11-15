import type { EntityManager } from 'typeorm';

/**
 * Lifecycle port of fleet-wide colony orbit orders (STU
 * `AbstractDirectedMovement` flight lock, `CancelColonyBlockOrDefend`).
 * The colony module owns orders and fills the port at startup, so the
 * spacecraft core never imports colony services.
 */
export const ORBIT_ORDER_LIFECYCLE = Symbol('ORBIT_ORDER_LIFECYCLE');

export interface OrbitOrderTractorCause {
  /** Ship that was towed away while leading the fleet with the order. */
  towedShipName: string;
}

export interface OrbitOrderLifecycle {
  /**
   * Why the fleet's leader may not fly, or null. Callers run it inside their
   * transaction after locking the fleet.
   */
  flightBlockReason(manager: EntityManager, fleetId: number): Promise<string | null>;
  /**
   * Ends the fleet's order inside the caller's transaction (blockade state
   * included) and returns the notifications to send after the commit.
   */
  cancelForFleet(
    manager: EntityManager,
    fleetId: number,
    tractor?: OrbitOrderTractorCause,
  ): Promise<() => Promise<void>>;
}

export interface OrbitOrderLifecyclePort {
  lifecycle: OrbitOrderLifecycle | null;
}
