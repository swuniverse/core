/** STU attack causes; callers still determine and authorize the parties. */
export enum CombatCause {
  SHIP_FIGHT = 'SHIP_FIGHT',
  ALERT_YELLOW = 'ALERT_YELLOW',
  ALERT_RED = 'ALERT_RED',
  COLONY_DEFENSE = 'COLONY_DEFENSE',
  ACTIVATE_TRACTOR = 'ACTIVATE_TRACTOR',
  BOARD_SHIP = 'BOARD_SHIP',
}

export function isOneWayCombat(cause: CombatCause): boolean {
  return [CombatCause.ACTIVATE_TRACTOR, CombatCause.BOARD_SHIP].includes(cause);
}
