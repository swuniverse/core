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
  type SpacecraftLocationSource,
} from './spacecraft-field';

export type NearbyInteraction =
  | 'SCAN'
  | 'INTERCEPT'
  | 'ATTACK'
  | 'CONTACT'
  | 'TRANSFER'
  | 'MESSAGE'
  | 'SALVAGE'
  | 'DOCK'
  | 'BOARDING';

/**
 * Rule sets for interactions offered by scan, NBS (`getNearby`) and intercept.
 * Every caller derives permission and reason from `decideNearbyInteraction`.
 *
 * Extension hooks (not yet active, see INTERACTION_HOOKS):
 * - Cloaking (Tarnung): the cloaked-source and cloaked-target rules below
 *   mirror STU's EXPECT_SOURCE/TARGET_UNCLOAKED; NBS hides foreign cloaked
 *   ships entirely, so the target rule is a defence for direct API calls.
 * - Tractor beam (Traktorstrahl): a hook rejects MESSAGE and SALVAGE (and
 *   transfer) while the source is towed or towing, as in STU's tractor checks.
 * - Ion storm: a hook returns a rejection while the shared position carries an
 *   ion storm field effect that disables sensors or weapons. Ships that are
 *   docked (`sourceDocked` / `targetDocked` in the context) are exempt from it.
 */
export const NEARBY_INTERACTION_RULES: Record<
  NearbyInteraction,
  readonly InteractionRule[]
> = {
  SCAN: [InteractionRule.POSITION, InteractionRule.TARGET_UNCLOAKED],
  // The target must be in hyperspace; that inverse check stays with the intercept service.
  INTERCEPT: [
    InteractionRule.POSITION,
    InteractionRule.TARGET_UNCLOAKED,
    InteractionRule.TARGET_VACATION,
  ],
  ATTACK: [
    InteractionRule.SOURCE_UNCLOAKED,
    InteractionRule.TARGET_UNCLOAKED,
    InteractionRule.TARGET_VACATION,
    InteractionRule.SOURCE_UNHYPERSPACED,
    InteractionRule.TARGET_UNHYPERSPACED,
  ],
  CONTACT: [
    InteractionRule.TARGET_UNCLOAKED,
    InteractionRule.SOURCE_UNHYPERSPACED,
    InteractionRule.TARGET_UNHYPERSPACED,
  ],
  TRANSFER: [
    InteractionRule.SOURCE_UNCLOAKED,
    InteractionRule.TARGET_UNCLOAKED,
    InteractionRule.SOURCE_UNHYPERSPACED,
    InteractionRule.TARGET_UNHYPERSPACED,
  ],
  MESSAGE: [
    InteractionRule.POSITION,
    InteractionRule.TARGET_UNCLOAKED,
    InteractionRule.SOURCE_UNHYPERSPACED,
    InteractionRule.TARGET_UNHYPERSPACED,
  ],
  // Wrecks carry no hyperdrive or shields, so only the source side applies.
  SALVAGE: [
    InteractionRule.POSITION,
    InteractionRule.SOURCE_UNCLOAKED,
    InteractionRule.SOURCE_UNHYPERSPACED,
    InteractionRule.SOURCE_UNSHIELDED,
  ],
  // The station must have its shields down; the docking ship drops its own.
  DOCK: [
    InteractionRule.POSITION,
    InteractionRule.SOURCE_UNCLOAKED,
    InteractionRule.SOURCE_UNHYPERSPACED,
    InteractionRule.TARGET_UNHYPERSPACED,
    InteractionRule.TARGET_UNSHIELDED,
  ],
  BOARDING: [
    InteractionRule.POSITION,
    InteractionRule.SOURCE_CREW,
    InteractionRule.SOURCE_INTACT,
    InteractionRule.TARGET_INTACT,
    InteractionRule.SOURCE_UNCLOAKED,
    InteractionRule.TARGET_UNCLOAKED,
    InteractionRule.SOURCE_UNHYPERSPACED,
    InteractionRule.TARGET_UNHYPERSPACED,
    InteractionRule.SOURCE_UNSHIELDED,
    InteractionRule.TARGET_UNSHIELDED,
    InteractionRule.TARGET_VACATION,
  ],
};

export type InteractionHook = (
  interaction: NearbyInteraction,
  context: InteractionContext,
) => InteractionDecision | null;

/** Registered hooks, evaluated after the rules; empty until cloaking / ion storms exist. */
export const INTERACTION_HOOKS: InteractionHook[] = [];

function inHyperspace(
  ship: SpacecraftLocationSource,
  systems: SpacecraftRuntimeSystems,
): boolean {
  return (
    resolveSpacecraftLocation(ship)?.scope === 'GALAXY' &&
    systems.WARPDRIVE?.active === true
  );
}

/** Pure mapping of already loaded ships (the target may also be a wreck with empty systems); fields no nearby interaction rule reads stay neutral. */
export function buildNearbyInteractionContext(
  source: SpacecraftLocationSource,
  sourceSystems: SpacecraftRuntimeSystems,
  target: SpacecraftLocationSource,
  targetSystems: SpacecraftRuntimeSystems,
  targetOnVacation = false,
): InteractionContext {
  return {
    samePosition: sameSpacecraftLocation(source, target),
    sourceHasSufficientCrew: true,
    sourceCombatCapable: true,
    sourceInHyperspace: inHyperspace(source, sourceSystems),
    targetInHyperspace: inHyperspace(target, targetSystems),
    sourceCloaked: sourceSystems.CLOAK?.active === true,
    targetCloaked: targetSystems.CLOAK?.active === true,
    sourceShieldsActive: sourceSystems.SHIELDS?.active === true,
    targetShieldsActive: targetSystems.SHIELDS?.active === true,
    targetOnVacation,
    sourceDestroyed: false,
    targetDestroyed: false,
    sourceBlocked: false,
    targetBlocked: false,
    stanceAllowed: true,
    sourceDocked: (source as { dockedAtId?: number | null }).dockedAtId != null,
    targetDocked: (target as { dockedAtId?: number | null }).dockedAtId != null,
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
