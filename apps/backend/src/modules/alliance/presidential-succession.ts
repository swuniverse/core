import { AlliancePermission } from '@swuniverse/shared';

export interface SuccessionCandidate {
  userId: number;
  /** Rights as stored on the member's roles (parents not expanded). */
  permissions: readonly AlliancePermission[];
  /** Empty activity counts as older than every recorded value. */
  lastActiveAt: Date | null;
  joinedAt: Date;
}

/**
 * Picks the new president among the remaining members: holders of SUCCESSOR,
 * then of DIPLOMATIC, then any other member; within a tier the most recently active, then the
 * longest membership, then the lowest user id. Returns null without
 * candidates. The departing president must not be part of the input.
 */
export function chooseSuccessor(
  candidates: SuccessionCandidate[],
): number | null {
  const priority = (c: SuccessionCandidate) =>
    c.permissions.includes(AlliancePermission.SUCCESSOR)
      ? 0
      : c.permissions.includes(AlliancePermission.DIPLOMATIC)
        ? 1
        : 2;
  const activity = (c: SuccessionCandidate) =>
    c.lastActiveAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  const sorted = [...candidates].sort((a, b) => {
    if (priority(a) !== priority(b)) return priority(a) - priority(b);
    if (activity(a) !== activity(b)) return activity(a) < activity(b) ? 1 : -1;
    if (a.joinedAt.getTime() !== b.joinedAt.getTime()) {
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    }
    return a.userId - b.userId;
  });
  return sorted[0]?.userId ?? null;
}
