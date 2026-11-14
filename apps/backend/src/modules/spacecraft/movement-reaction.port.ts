import type { MovementCombatReportDto } from '@swuniverse/shared';
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
}

export interface MovementReactionOutcome {
  /** Stops the remaining route on the reached field. */
  stop?: boolean;
  report?: MovementCombatReportDto | null;
}

export interface MovementReaction {
  /** Runs after every completed field transition; persists its own changes. */
  afterTransition(
    context: MovementReactionContext,
  ): Promise<MovementReactionOutcome | void> | MovementReactionOutcome | void;
}
