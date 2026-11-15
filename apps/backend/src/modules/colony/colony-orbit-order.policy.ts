import { ColonyOrbitAssignmentMode } from './entities/colony-orbit-assignment.entity';

/**
 * Central rules for fleet-wide colony defense and blockade orders (STU
 * `StartDefending`/`StartBlocking`/`Stop*`). Ownership and stance towards the
 * colony owner deliberately play no role: every occupied colony may be
 * defended or blockaded. Mutations and read models must both use this policy.
 */
export const ORBIT_ORDER_REASONS = {
  shipDestroyed: 'Das Schiff ist zerstört.',
  notInOrbit: 'Das Schiff befindet sich nicht im Orbit dieser Kolonie.',
  notFleetLeader: 'Nur Flottenführer können Orbitaufträge erteilen.',
  shipNotIdle: 'Das Schiff ist nicht einsatzbereit.',
  colonyFree: 'Die Kolonie ist unbewohnt.',
  fleetHasOrder: 'Die Flotte hat bereits einen Orbitauftrag.',
  alreadyDefending: 'Diese Flotte verteidigt die Kolonie bereits.',
  alreadyBlockading: 'Diese Flotte blockiert die Kolonie bereits.',
  ownerOnVacation:
    'Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!',
  colonyBlockaded: 'Aktion nicht möglich, die Kolonie wird blockiert!',
  colonyDefended: 'Aktion nicht möglich, die Kolonie wird verteidigt!',
  orbitalDefense:
    'Aktion nicht möglich, die Kolonie verfügt über aktive Orbitalverteidigung',
  noOrder: 'Die Flotte hat keinen Orbitauftrag.',
  flightDuringDefense: 'Flug während Kolonie-Verteidigung nicht möglich',
  flightDuringBlockade: 'Flug während Kolonie-Blockierung nicht möglich',
} as const;

export type OrbitOrderReason =
  (typeof ORBIT_ORDER_REASONS)[keyof typeof ORBIT_ORDER_REASONS];

export interface OrbitOrderDecision {
  allowed: boolean;
  reason: OrbitOrderReason | null;
}

export interface FleetOrbitOrder {
  colonyId: number;
  mode: ColonyOrbitAssignmentMode;
}

export interface OrbitOrderStartContext {
  /** Colony in whose orbit the ship is, or null when there is none. */
  colonyId: number | null;
  shipDestroyed: boolean;
  inColonyOrbit: boolean;
  isFleetLeader: boolean;
  shipIdle: boolean;
  colonyOccupied: boolean;
  /** Current order of the ship's fleet, at any colony. */
  fleetOrder: FleetOrbitOrder | null;
  /** Another fleet defends the colony. */
  colonyDefended: boolean;
  /** Another fleet blockades the colony. */
  colonyBlockaded: boolean;
  ownerOnVacation: boolean;
  activeOrbitalDefense: boolean;
}

export interface OrbitOrderStopContext {
  isFleetLeader: boolean;
  fleetOrder: FleetOrbitOrder | null;
}

const ALLOWED: OrbitOrderDecision = { allowed: true, reason: null };

function rejected(reason: OrbitOrderReason): OrbitOrderDecision {
  return { allowed: false, reason };
}

export function evaluateOrbitOrderStart(
  mode: ColonyOrbitAssignmentMode,
  context: OrbitOrderStartContext,
): OrbitOrderDecision {
  const defend = mode === ColonyOrbitAssignmentMode.DEFEND;
  if (context.shipDestroyed) return rejected(ORBIT_ORDER_REASONS.shipDestroyed);
  if (!context.inColonyOrbit || context.colonyId == null) {
    return rejected(ORBIT_ORDER_REASONS.notInOrbit);
  }
  if (!context.isFleetLeader) {
    return rejected(ORBIT_ORDER_REASONS.notFleetLeader);
  }
  if (!context.shipIdle) return rejected(ORBIT_ORDER_REASONS.shipNotIdle);
  if (!context.colonyOccupied) return rejected(ORBIT_ORDER_REASONS.colonyFree);
  const order = context.fleetOrder;
  if (order) {
    if (order.colonyId === context.colonyId && order.mode === mode) {
      return rejected(
        defend
          ? ORBIT_ORDER_REASONS.alreadyDefending
          : ORBIT_ORDER_REASONS.alreadyBlockading,
      );
    }
    return rejected(ORBIT_ORDER_REASONS.fleetHasOrder);
  }
  if (context.ownerOnVacation) {
    return rejected(ORBIT_ORDER_REASONS.ownerOnVacation);
  }
  if (defend && context.colonyBlockaded) {
    return rejected(ORBIT_ORDER_REASONS.colonyBlockaded);
  }
  if (!defend && context.colonyDefended) {
    return rejected(ORBIT_ORDER_REASONS.colonyDefended);
  }
  if (!defend && context.activeOrbitalDefense) {
    return rejected(ORBIT_ORDER_REASONS.orbitalDefense);
  }
  return ALLOWED;
}

export function evaluateOrbitOrderStop(
  context: OrbitOrderStopContext,
): OrbitOrderDecision {
  if (!context.isFleetLeader) {
    return rejected(ORBIT_ORDER_REASONS.notFleetLeader);
  }
  if (!context.fleetOrder) return rejected(ORBIT_ORDER_REASONS.noOrder);
  return ALLOWED;
}
