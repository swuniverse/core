import type { CombatReportDto } from '@swuniverse/shared';
import type { Spacecraft } from './entities/spacecraft.entity';
import type { FieldCoordinate } from './field-transition-executor';

/**
 * Neutral arrival/reaction port of field-by-field flight. Alert combat and
 * later arrival reactions register here without the spacecraft core
 * importing their modules.
 */
export const MOVEMENT_REACTIONS = Symbol('MOVEMENT_REACTIONS');

export interface MovementReactionContext {
  scope: 'SYSTEM' | 'GALAXY';
  /** Galaxy field id or system field id of the reached field. */
  fieldId: number;
  coordinate: FieldCoordinate;
  leader: Spacecraft;
  /** Leader and fleet members that entered the field. */
  participants: Spacecraft[];
  /**
   * Ship towing the moving party, if any. Not set by flights yet; reserved
   * for the tractor rules of sc-WP-TRACT-1a.
   */
  tractoringShip?: Spacecraft | null;
}

export interface MovementReactionOutcome {
  /** Stops the remaining route on the reached field. */
  stop?: boolean;
  /** Battles fought on the reached field. */
  reports?: CombatReportDto[];
  /**
   * The reaction changed moving ships (damage, destruction); the flight
   * reloads their state before the next field.
   */
  changedParticipants?: boolean;
}

export interface MovementReaction {
  /** Runs after every completed field transition; persists its own changes. */
  afterTransition(
    context: MovementReactionContext,
  ): Promise<MovementReactionOutcome | void> | MovementReactionOutcome | void;
}
