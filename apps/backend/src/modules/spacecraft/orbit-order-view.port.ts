import type { SpacecraftOrbitOrderViewDto } from '@swuniverse/shared';

/**
 * Read port for the fleet-wide colony orbit order in the ship field context.
 * The colony module owns the orbit order policy and fills the port at
 * startup, so the spacecraft core never imports colony services.
 */
export const ORBIT_ORDER_VIEW = Symbol('ORBIT_ORDER_VIEW');

export interface OrbitOrderViewPort {
  view:
    | ((shipId: number, userId: number) => Promise<SpacecraftOrbitOrderViewDto | null>)
    | null;
}
