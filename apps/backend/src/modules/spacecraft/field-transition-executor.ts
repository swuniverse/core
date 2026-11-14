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
  canPay(): boolean | Promise<boolean>;
  pay(): void | Promise<void>;
  isDestroyed(): boolean;
}

export interface FieldTransitionPlan<TField> {
  start: FieldCoordinate;
  target: FieldCoordinate;
  resolveField(x: number, y: number): Promise<TField | null>;
  isPassable(field: TField): boolean;
  participants: TransitionParticipant[];
  enter(field: TField, coordinate: FieldCoordinate): void | Promise<void>;
  /** Context handed to the movement reactions after each entered field. */
  reactionContext(field: TField, coordinate: FieldCoordinate): MovementReactionContext;
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
    const reports: { combat: CombatReportDto | null } = { combat: null };
    const result = (stopReason: MovementStopReason): MovementResultDto => {
      const destroyed = plan.participants.filter((participant) => participant.isDestroyed());
      return {
        plannedSteps: route.length,
        completedSteps,
        stopReason,
        movedShipIds:
          completedSteps === 0
            ? []
            : plan.participants
                .filter((participant) => !participant.isDestroyed())
                .map((participant) => participant.id),
        destroyedShipIds: destroyed.map((participant) => participant.id),
        combatReport: reports.combat,
      };
    };

    for (const coordinate of route) {
      const field = await plan.resolveField(coordinate.x, coordinate.y);
      if (!field) throw new BadRequestException('Next field does not exist');
      if (!plan.isPassable(field)) {
        throw new BadRequestException('Next field is not passable');
      }
      if (plan.participants.some((participant) => participant.isDestroyed())) {
        return result('DESTROYED');
      }
      const affordability = await Promise.all(
        plan.participants.map((participant) => participant.canPay()),
      );
      if (affordability.includes(false)) {
        return result('INSUFFICIENT_ENERGY');
      }
      await Promise.all(
        plan.participants.map((participant) => participant.pay()),
      );
      await plan.enter(field, coordinate);
      completedSteps += 1;
      if (plan.participants.some((participant) => participant.isDestroyed())) {
        return result('DESTROYED');
      }
      const stopRequested = await this.react(plan.reactionContext(field, coordinate), reports);
      if (plan.participants.every((participant) => participant.isDestroyed())) {
        return result('DESTROYED');
      }
      if (stopRequested) return result('ALERT_COMBAT');
      if (plan.participants.some((participant) => participant.isDestroyed())) {
        return result('DESTROYED');
      }
    }

    return result('ARRIVED');
  }

  /** Runs the reactions in order; the first requested stop ends the round. */
  private async react(
    context: MovementReactionContext,
    reports: { combat: CombatReportDto | null },
  ): Promise<boolean> {
    for (const reaction of this.reactions) {
      const outcome = await reaction.afterTransition(context);
      if (outcome?.report) reports.combat = outcome.report;
      if (outcome?.stop) return true;
    }
    return false;
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
