/**
 * Why a field-by-field flight ended. `ARRIVED` reached the target; the other
 * reasons stop on the last reached field and keep everything done so far.
 * Like STU, alert combat does not stop a flight by itself: `DESTROYED` ends
 * it once every moving ship or the leader is lost, `ALERT_COMBAT` is left
 * for reactions that explicitly stop the route.
 */
export type MovementStopReason =
  | 'ARRIVED'
  | 'ALERT_COMBAT'
  | 'DESTROYED'
  | 'INSUFFICIENT_ENERGY';

export interface CombatReportPartyMemberDto {
  id: number;
  name: string;
  destroyed: boolean;
}

export interface CombatReportLineDto {
  kind: string;
  text: string;
  emphasis: string;
}

/** Report of one resolved battle as shown in the combat report dialog. */
export interface CombatReportDto {
  parties: {
    attacker: CombatReportPartyMemberDto[];
    defender: CombatReportPartyMemberDto[];
  };
  rounds: Array<{ number: number; lines: CombatReportLineDto[] }>;
  outcome: { winner: string; destroyedShipIds: number[] };
}

/** Shared result of system and galaxy flight. */
export interface MovementResultDto {
  plannedSteps: number;
  completedSteps: number;
  stopReason: MovementStopReason;
  /** Surviving moving ships standing on the last reached field. */
  movedShipIds: number[];
  destroyedShipIds: number[];
  /** Every battle fought on the way, in order. */
  combatReports: CombatReportDto[];
}
