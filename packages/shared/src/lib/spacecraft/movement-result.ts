/**
 * Why a field-by-field flight ended. `ARRIVED` reached the target; the other
 * reasons stop on the last reached field and keep everything done so far.
 */
export type MovementStopReason =
  | 'ARRIVED'
  | 'ALERT_COMBAT'
  | 'DESTROYED'
  | 'INSUFFICIENT_ENERGY';

export interface MovementCombatReportDto {
  messages: string[];
}

/** Shared result of system and galaxy flight. */
export interface MovementResultDto {
  plannedSteps: number;
  completedSteps: number;
  stopReason: MovementStopReason;
  /** Surviving moving ships standing on the last reached field. */
  movedShipIds: number[];
  destroyedShipIds: number[];
  combatReport: MovementCombatReportDto | null;
}
