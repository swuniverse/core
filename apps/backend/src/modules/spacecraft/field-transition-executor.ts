import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import type {
  CombatReportDto,
  MovementResultDto,
  MovementStopReason,
} from '@swuniverse/shared';
import {
  MOVEMENT_REACTIONS,
  type MovementReaction,
  type MovementReactionContext,
} from './movement-reaction.port';

export interface FieldCoordinate {
  x: number;
  y: number;
}

export interface TransitionParticipant {
  id: number;
  /** Losing a required participant ends the flight; fleets hand over instead. */
  required?: boolean;
  canPay(): boolean | Promise<boolean>;
  pay(): void | Promise<void>;
  isDestroyed(): boolean;
}

export interface FieldTransitionPlan<TField> {
  start: FieldCoordinate;
  target: FieldCoordinate;
  resolveField(x: number, y: number): Promise<TField | null>;
  isPassable(field: TField): boolean;
  /** Destroyed participants drop out; the others fly on (STU `FlightCompany`). */
  participants: TransitionParticipant[];
  enter(field: TField, coordinate: FieldCoordinate): void | Promise<void>;
  /** Context handed to the movement reactions after each entered field. */
  reactionContext(field: TField, coordinate: FieldCoordinate): MovementReactionContext;
  /** Reloads moving ships after losses or a reaction changed them. */
  refreshParticipants?(): void | Promise<void>;
}

@Injectable()
export class FieldTransitionExecutor {
  constructor(
    @Optional()
    @Inject(MOVEMENT_REACTIONS)
    private readonly reactions: MovementReaction[] = [],
  ) {}

  /** A discontinuous passage enters only its destination, never an invented route. */
  async enterDestination<TField>(
    field: TField,
    isPassable: (field: TField) => boolean,
    enter: (field: TField) => void | Promise<void>,
  ): Promise<void> {
    if (!isPassable(field)) throw new BadRequestException('Destination field is not passable');
    await enter(field);
  }

  async execute<TField>(
    plan: FieldTransitionPlan<TField>,
  ): Promise<MovementResultDto> {
    const route = this.route(plan.start, plan.target);
    let completedSteps = 0;
    const combatReports: CombatReportDto[] = [];
    const active = () => plan.participants.filter((participant) => !participant.isDestroyed());
    const lost = () =>
      active().length === 0 ||
      plan.participants.some((participant) => participant.required && participant.isDestroyed());
    const result = (stopReason: MovementStopReason): MovementResultDto => ({
      plannedSteps: route.length,
      completedSteps,
      stopReason,
      movedShipIds: completedSteps === 0 ? [] : active().map((participant) => participant.id),
      destroyedShipIds: plan.participants
        .filter((participant) => participant.isDestroyed())
        .map((participant) => participant.id),
      combatReports,
    });

    for (const coordinate of route) {
      const field = await plan.resolveField(coordinate.x, coordinate.y);
      if (!field) throw new BadRequestException('Next field does not exist');
      if (!plan.isPassable(field)) {
        throw new BadRequestException('Next field is not passable');
      }
      if (lost()) return result('DESTROYED');
      const moving = active();
      const affordability = await Promise.all(moving.map((participant) => participant.canPay()));
      if (affordability.includes(false)) {
        return result('INSUFFICIENT_ENERGY');
      }
      await Promise.all(moving.map((participant) => participant.pay()));
      await plan.enter(field, coordinate);
      completedSteps += 1;
      if (lost()) return result('DESTROYED');
      // A field consequence destroyed someone: hand over before reacting.
      if (active().length < moving.length) await plan.refreshParticipants?.();
      const reaction = await this.react(plan.reactionContext(field, coordinate), combatReports);
      if (reaction.changed) await plan.refreshParticipants?.();
      if (lost()) return result('DESTROYED');
      if (reaction.stop) return result('ALERT_COMBAT');
    }

    return result('ARRIVED');
  }

  /** Runs the reactions in order; the first requested stop ends the round. */
  private async react(
    context: MovementReactionContext,
    combatReports: CombatReportDto[],
  ): Promise<{ stop: boolean; changed: boolean }> {
    let changed = false;
    for (const reaction of this.reactions) {
      const outcome = await reaction.afterTransition(context);
      if (outcome?.reports) combatReports.push(...outcome.reports);
      changed ||= Boolean(outcome?.changedParticipants);
      if (outcome?.stop) return { stop: true, changed };
    }
    return { stop: false, changed };
  }

  private route(
    start: FieldCoordinate,
    target: FieldCoordinate,
  ): FieldCoordinate[] {
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    if (dx !== 0 && dy !== 0) {
      throw new BadRequestException(
        'Only orthogonal movement allowed (horizontal or vertical)',
      );
    }
    if (dx === 0 && dy === 0) {
      throw new BadRequestException('Already at target position');
    }
    const steps = Math.abs(dx || dy);
    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    return Array.from({ length: steps }, (_, index) => ({
      x: start.x + stepX * (index + 1),
      y: start.y + stepY * (index + 1),
    }));
  }
}
