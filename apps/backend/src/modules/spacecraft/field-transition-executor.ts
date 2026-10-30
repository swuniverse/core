import { BadRequestException, Injectable } from '@nestjs/common';

export interface FieldCoordinate {
  x: number;
  y: number;
}

export interface TransitionParticipant {
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
}

export interface FieldTransitionResult {
  completedSteps: number;
  stopped: 'DESTINATION' | 'INSUFFICIENT_COST' | 'DESTROYED';
}

@Injectable()
export class FieldTransitionExecutor {
  async execute<TField>(
    plan: FieldTransitionPlan<TField>,
  ): Promise<FieldTransitionResult> {
    const route = this.route(plan.start, plan.target);
    let completedSteps = 0;

    for (const coordinate of route) {
      const field = await plan.resolveField(coordinate.x, coordinate.y);
      if (!field) throw new BadRequestException('Next field does not exist');
      if (!plan.isPassable(field)) {
        throw new BadRequestException('Next field is not passable');
      }
      if (plan.participants.some((participant) => participant.isDestroyed())) {
        return { completedSteps, stopped: 'DESTROYED' };
      }
      const affordability = await Promise.all(
        plan.participants.map((participant) => participant.canPay()),
      );
      if (affordability.includes(false)) {
        return { completedSteps, stopped: 'INSUFFICIENT_COST' };
      }
      await Promise.all(
        plan.participants.map((participant) => participant.pay()),
      );
      await plan.enter(field, coordinate);
      completedSteps += 1;
      if (plan.participants.some((participant) => participant.isDestroyed())) {
        return { completedSteps, stopped: 'DESTROYED' };
      }
    }

    return { completedSteps, stopped: 'DESTINATION' };
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
