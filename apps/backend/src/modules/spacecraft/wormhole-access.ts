import type { DockingActor } from './docking-access';
import type { WormholeRestrictionDto } from '@swuniverse/shared';

/** Explicit privileges, not stance: membership alone matches an ALLIANCE target. */
export function allowsWormholeAccess(
  actor: DockingActor | null,
  rules: readonly WormholeRestrictionDto[],
): boolean {
  if (rules.length === 0) return true;
  if (!actor || actor.factionId == null) return false;
  const targets = {
    USER: actor.userId,
    ALLIANCE: actor.allianceId,
    FACTION: actor.factionId,
    SHIP: actor.shipId,
  };
  const matching = rules.filter(
    (rule) =>
      targets[rule.targetType] != null &&
      targets[rule.targetType] === rule.targetId,
  );
  return (
    !matching.some((rule) => rule.mode === 'DENY') &&
    matching.some((rule) => rule.mode === 'ALLOW')
  );
}
