import type { CombatReportDto } from '@swuniverse/shared';

/**
 * Neutral port for STU `ThreatReaction`: the alerted target of a tractor or
 * boarding attempt fires a one-way battle at the causing ship. The combat
 * side registers here so the spacecraft core never imports it.
 */
export const THREAT_REACTIONS = Symbol('THREAT_REACTIONS');

export type ThreatInteraction = 'ACTIVATE_TRACTOR' | 'BOARD_SHIP';

export interface ThreatReaction {
  /** Runs outside the caller's transaction and persists its own changes. */
  reactToThreat(
    sourceId: number,
    targetId: number,
    interaction: ThreatInteraction,
  ): Promise<CombatReportDto | null>;
}

export async function reactToThreat(
  reactions: ThreatReaction[],
  sourceId: number,
  targetId: number,
  interaction: ThreatInteraction,
): Promise<CombatReportDto | null> {
  let report: CombatReportDto | null = null;
  for (const reaction of reactions) {
    report = (await reaction.reactToThreat(sourceId, targetId, interaction)) ?? report;
  }
  return report;
}
