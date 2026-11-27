import type { DockingActor } from './docking-access';
import type { WormholeRestrictionDto } from '@swuniverse/shared';

/** Like STU: DENY wins, otherwise a matching ALLOW is required (no rules = closed). */
export function allowsWormholeAccess(
  actor: DockingActor | null,
  rules: readonly WormholeRestrictionDto[],
): boolean {
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
