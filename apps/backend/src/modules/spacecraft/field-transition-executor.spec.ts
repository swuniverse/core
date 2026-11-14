import { BadRequestException } from '@nestjs/common';
import type { Spacecraft } from './entities/spacecraft.entity';
import {
  FieldTransitionExecutor,
  type FieldTransitionPlan,
  type TransitionParticipant,
} from './field-transition-executor';
import type {
  MovementReaction,
  MovementReactionContext,
} from './movement-reaction.port';

type TestField = { x: number; y: number; passable: boolean };

const field = (x: number, y: number, passable = true): TestField => ({ x, y, passable });

function participant(
  id: number,
  overrides: Partial<TransitionParticipant> = {},
): TransitionParticipant & { destroyed: boolean } {
  const state: TransitionParticipant & { destroyed: boolean } = {
    id,
    destroyed: false,
    canPay: () => true,
    pay: () => undefined,
    isDestroyed: () => state.destroyed,
    ...overrides,
  };
  return state;
}

function plan(
  overrides: Partial<FieldTransitionPlan<TestField>> = {},
): FieldTransitionPlan<TestField> & { entered: string[] } {
  const entered: string[] = [];
  return {
    entered,
    start: { x: 1, y: 1 },
    target: { x: 4, y: 1 },
    resolveField: async (x, y) => field(x, y),
    isPassable: (next) => next.passable,
    participants: [participant(1)],
    enter: async (next) => {
      entered.push(`${next.x}|${next.y}`);
    },
    reactionContext: (next, coordinate): MovementReactionContext => ({
      scope: 'GALAXY',
      fieldId: next.x * 10 + next.y,
      coordinate,
      leader: { id: 1 } as Spacecraft,
      participants: [],
    }),
    ...overrides,
  };
}

describe('FieldTransitionExecutor', () => {
  it('processes every field of an orthogonal route in deterministic order', async () => {
    const route = plan({ target: { x: 1, y: 4 } });

    const result = await new FieldTransitionExecutor().execute(route);

    expect(route.entered).toEqual(['1|2', '1|3', '1|4']);
    expect(result).toEqual({
      plannedSteps: 3,
      completedSteps: 3,
      stopReason: 'ARRIVED',
      movedShipIds: [1],
      destroyedShipIds: [],
      combatReport: null,
    });
  });

  it('rejects diagonal routes and commands without a field change before any reaction', async () => {
    const reaction = { afterTransition: jest.fn() };
    const executor = new FieldTransitionExecutor([reaction]);

    for (const target of [{ x: 2, y: 2 }, { x: 1, y: 1 }]) {
      const route = plan({ target });
      await expect(executor.execute(route)).rejects.toBeInstanceOf(BadRequestException);
      expect(route.entered).toEqual([]);
    }
    expect(reaction.afterTransition).not.toHaveBeenCalled();
  });

  it('stops before a missing or impassable intermediate field', async () => {
    const route = plan({
      resolveField: async (x, y) => (x === 3 ? field(x, y, false) : field(x, y)),
    });

    await expect(new FieldTransitionExecutor().execute(route)).rejects.toThrow('passable');
    expect(route.entered).toEqual(['2|1']);
  });

  it('reports partial progress when a cost participant cannot pay the next field', async () => {
    let energy = 2;
    const route = plan({
      participants: [
        participant(1, {
          canPay: () => energy >= 1,
          pay: () => {
            energy -= 1;
          },
        }),
      ],
    });

    const result = await new FieldTransitionExecutor().execute(route);

    expect(result).toMatchObject({
      plannedSteps: 3,
      completedSteps: 2,
      stopReason: 'INSUFFICIENT_ENERGY',
      movedShipIds: [1],
    });
    expect(route.entered).toEqual(['2|1', '3|1']);
  });

  it('stops after a field consequence destroys a participant and lists the losses', async () => {
    const leader = participant(1);
    const member = participant(2);
    const route = plan({
      participants: [leader, member],
      enter: async (next) => {
        route.entered.push(`${next.x}|${next.y}`);
        member.destroyed = true;
      },
    });

    const result = await new FieldTransitionExecutor().execute(route);

    expect(result).toMatchObject({
      completedSteps: 1,
      stopReason: 'DESTROYED',
      movedShipIds: [1],
      destroyedShipIds: [2],
    });
    expect(route.entered).toEqual(['2|1']);
  });

  it('runs the reactions after every entered field with the reached field as context', async () => {
    const contexts: MovementReactionContext[] = [];
    const reaction: MovementReaction = {
      afterTransition: (context) => {
        contexts.push(context);
      },
    };
    const route = plan();

    await new FieldTransitionExecutor([reaction]).execute(route);

    expect(contexts.map((context) => context.coordinate)).toEqual([
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
    ]);
    expect(contexts[0]).toMatchObject({ scope: 'GALAXY', fieldId: 21 });
  });

  it('stops on the intermediate field when a reaction requests it and keeps its report', async () => {
    const later = { afterTransition: jest.fn() };
    const alert: MovementReaction = {
      afterTransition: ({ coordinate }) =>
        coordinate.x === 3
          ? { stop: true, report: { messages: ['Alarm Rot: Feuergefecht'] } }
          : undefined,
    };
    const route = plan();

    const result = await new FieldTransitionExecutor([alert, later]).execute(route);

    expect(route.entered).toEqual(['2|1', '3|1']);
    expect(result).toEqual({
      plannedSteps: 3,
      completedSteps: 2,
      stopReason: 'ALERT_COMBAT',
      movedShipIds: [1],
      destroyedShipIds: [],
      combatReport: { messages: ['Alarm Rot: Feuergefecht'] },
    });
    expect(later.afterTransition).toHaveBeenCalledTimes(1);
  });

  it('keeps survivors on the reached field when a reaction destroys fleet members', async () => {
    const leader = participant(1);
    const member = participant(2);
    const destroyer: MovementReaction = {
      afterTransition: () => {
        member.destroyed = true;
        return { stop: true, report: { messages: ['Schiff 2 zerstört'] } };
      },
    };
    const route = plan({ participants: [leader, member] });

    const result = await new FieldTransitionExecutor([destroyer]).execute(route);

    expect(route.entered).toEqual(['2|1']);
    expect(result).toMatchObject({
      completedSteps: 1,
      stopReason: 'ALERT_COMBAT',
      movedShipIds: [1],
      destroyedShipIds: [2],
    });
  });

  it('ends with DESTROYED when a reaction destroys every participant', async () => {
    const leader = participant(1);
    const destroyer: MovementReaction = {
      afterTransition: () => {
        leader.destroyed = true;
        return { stop: true };
      },
    };

    const result = await new FieldTransitionExecutor([destroyer]).execute(
      plan({ participants: [leader] }),
    );

    expect(result).toMatchObject({
      completedSteps: 1,
      stopReason: 'DESTROYED',
      movedShipIds: [],
      destroyedShipIds: [1],
    });
  });

  it('stops without a stop request once a reaction destroyed a member', async () => {
    const member = participant(2);
    const route = plan({ participants: [participant(1), member] });
    const destroyer: MovementReaction = {
      afterTransition: () => {
        member.destroyed = true;
      },
    };

    const result = await new FieldTransitionExecutor([destroyer]).execute(route);

    expect(route.entered).toEqual(['2|1']);
    expect(result).toMatchObject({ stopReason: 'DESTROYED', destroyedShipIds: [2] });
  });
});
