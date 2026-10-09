import { AllianceRole } from '@swuniverse/shared';

export interface SuccessionCandidate {
  userId: number;
  role: AllianceRole;
  /** Empty activity counts as older than every recorded value. */
  lastActiveAt: Date | null;
  joinedAt: Date;
}

const ROLE_PRIORITY: Partial<Record<AllianceRole, number>> = {
  [AllianceRole.VICE]: 0,
  [AllianceRole.DIPLOMAT]: 1,
};
const OTHER_PRIORITY = 2;

/**
 * Picks the new president among the remaining members: vice, then diplomat,
 * then any other member; within a tier the most recently active, then the
 * longest membership, then the lowest user id. Returns null without
 * candidates. The departing president must not be part of the input.
 */
export function chooseSuccessor(
  candidates: SuccessionCandidate[],
): number | null {
  const priority = (c: SuccessionCandidate) =>
    ROLE_PRIORITY[c.role] ?? OTHER_PRIORITY;
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
