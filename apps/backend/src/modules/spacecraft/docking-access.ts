import {
  DockingPrivilegeMode,
  DockingPrivilegeType,
} from './docking-privilege.types';

export interface DockingRule {
  targetType: DockingPrivilegeType;
  targetId: number;
  mode: DockingPrivilegeMode;
}

export interface DockingActor {
  shipId: number;
  userId: number;
  allianceId: number | null;
  factionId: number | null;
}

export interface DockingAccessDecision {
  allowed: boolean;
  reason?: string;
}

function matches(rule: DockingRule, actor: DockingActor): boolean {
  switch (rule.targetType) {
    case DockingPrivilegeType.USER:
      return rule.targetId === actor.userId;
    case DockingPrivilegeType.ALLIANCE:
      return actor.allianceId != null && rule.targetId === actor.allianceId;
    case DockingPrivilegeType.FACTION:
      return actor.factionId != null && rule.targetId === actor.factionId;
    case DockingPrivilegeType.SHIP:
      return rule.targetId === actor.shipId;
  }
}

/**
 * Station access: the owner always docks; otherwise any matching deny wins,
 * and without a matching allow docking is refused (ADR station docking).
 */
export function decideDockingAccess(
  stationOwnerId: number,
  actor: DockingActor,
  rules: DockingRule[],
): DockingAccessDecision {
  if (stationOwnerId === actor.userId) return { allowed: true };
  const matching = rules.filter((rule) => matches(rule, actor));
  if (matching.some((rule) => rule.mode === DockingPrivilegeMode.DENY)) {
    return { allowed: false, reason: 'Das Andocken wurde verweigert' };
  }
  if (matching.some((rule) => rule.mode === DockingPrivilegeMode.ALLOW)) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'Das Andocken wurde verweigert' };
}
