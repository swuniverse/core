import type { Spacecraft } from './entities/spacecraft.entity';
import {
  checkInteraction,
  InteractionRule,
  type InteractionContext,
  type InteractionDecision,
} from './interaction-policy';
import type { SpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';
import {
  resolveSpacecraftLocation,
  sameSpacecraftLocation,
} from './spacecraft-field';

export type NearbyInteraction =
  'SCAN' | 'INTERCEPT' | 'ATTACK' | 'CONTACT' | 'TRANSFER';

/**
 * Rule sets for interactions offered by scan, NBS (`getNearby`) and intercept.
 * Every caller derives permission and reason from `decideNearbyInteraction`.
 *
 * Extension hooks (not yet active, see INTERACTION_HOOKS):
 * - Cloaking (Tarnung): a hook returns a rejection when the target is cloaked
 *   and the source has no detection capability; scan and NBS then hide or
 *   refuse the target.
 * - Ion storm: a hook returns a rejection while the shared position carries an
 *   ion storm field effect that disables sensors or weapons.
 */
export const NEARBY_INTERACTION_RULES: Record<
  NearbyInteraction,
  readonly InteractionRule[]
> = {
  SCAN: [InteractionRule.POSITION],
  // The target must be in hyperspace; that inverse check stays with the intercept service.
  INTERCEPT: [InteractionRule.POSITION],
  ATTACK: [
    InteractionRule.SOURCE_UNHYPERSPACED,
    InteractionRule.TARGET_UNHYPERSPACED,
  ],
  CONTACT: [
    InteractionRule.SOURCE_UNHYPERSPACED,
    InteractionRule.TARGET_UNHYPERSPACED,
  ],
  TRANSFER: [
    InteractionRule.SOURCE_UNHYPERSPACED,
    InteractionRule.TARGET_UNHYPERSPACED,
  ],
};

export type InteractionHook = (
  interaction: NearbyInteraction,
  context: InteractionContext,
) => InteractionDecision | null;

/** Registered hooks, evaluated after the rules; empty until cloaking / ion storms exist. */
export const INTERACTION_HOOKS: InteractionHook[] = [];

function inHyperspace(
  ship: Spacecraft,
  systems: SpacecraftRuntimeSystems,
): boolean {
  return (
    resolveSpacecraftLocation(ship)?.scope === 'GALAXY' &&
    systems.WARPDRIVE?.active === true
  );
}

/** Pure mapping of already loaded ships; fields no nearby interaction rule reads stay neutral. */
export function buildNearbyInteractionContext(
  source: Spacecraft,
  sourceSystems: SpacecraftRuntimeSystems,
  target: Spacecraft,
  targetSystems: SpacecraftRuntimeSystems,
): InteractionContext {
  return {
    samePosition: sameSpacecraftLocation(source, target),
    sourceHasSufficientCrew: true,
    sourceCombatCapable: true,
    sourceInHyperspace: inHyperspace(source, sourceSystems),
    targetInHyperspace: inHyperspace(target, targetSystems),
    sourceShieldsActive: sourceSystems.SHIELDS?.active === true,
    targetShieldsActive: targetSystems.SHIELDS?.active === true,
    targetOnVacation: false,
    sourceDestroyed: false,
    targetDestroyed: false,
    sourceBlocked: false,
    targetBlocked: false,
    stanceAllowed: true,
  };
}

export function decideNearbyInteraction(
  interaction: NearbyInteraction,
  context: InteractionContext,
): InteractionDecision {
  const decision = checkInteraction(
    context,
    NEARBY_INTERACTION_RULES[interaction],
  );
  if (!decision.allowed) return decision;
  for (const hook of INTERACTION_HOOKS) {
    const rejected = hook(interaction, context);
    if (rejected && !rejected.allowed) return rejected;
  }
  return decision;
}
