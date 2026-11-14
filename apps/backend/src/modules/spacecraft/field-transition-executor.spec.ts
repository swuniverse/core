import type { CombatReportDto } from '@swuniverse/shared';
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

const battleReport = (text: string): CombatReportDto => ({
  parties: { attacker: [], defender: [] },
  rounds: [{ number: 1, lines: [{ kind: 'INFO', text, emphasis: 'neutral' }] }],
  outcome: { winner: 'ATTACKER', destroyedShipIds: [] },
});

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
      combatReports: [],
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

  it('flies on without destroyed members and neither charges nor checks them (STU flight company)', async () => {
    const leader = participant(1, { required: true });
    const pay = jest.fn();
    const member = participant(2, { canPay: () => !member.destroyed, pay });
    const route = plan({
      participants: [leader, member],
      enter: async (next) => {
        route.entered.push(`${next.x}|${next.y}`);
        member.destroyed = true;
      },
    });

    const result = await new FieldTransitionExecutor().execute(route);

    expect(route.entered).toEqual(['2|1', '3|1', '4|1']);
    expect(pay).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      completedSteps: 3,
      stopReason: 'ARRIVED',
      movedShipIds: [1],
      destroyedShipIds: [2],
    });
  });

  it('refreshes the participants after a field consequence destroyed one, before reacting', async () => {
    const order: string[] = [];
    const leader = participant(1);
    const route = plan({
      participants: [leader, participant(2)],
      enter: async (next) => {
        route.entered.push(`${next.x}|${next.y}`);
        if (next.x === 2) leader.destroyed = true;
      },
      refreshParticipants: () => {
        order.push('refresh');
      },
    });
    const reaction: MovementReaction = {
      afterTransition: ({ coordinate }) => {
        order.push(`react ${coordinate.x}`);
      },
    };

    const result = await new FieldTransitionExecutor([reaction]).execute(route);

    expect(order).toEqual(['refresh', 'react 2', 'react 3', 'react 4']);
    expect(result).toMatchObject({ stopReason: 'ARRIVED', movedShipIds: [2], destroyedShipIds: [1] });
  });

  it('ends the flight when the required leader is destroyed', async () => {
    const leader = participant(1, { required: true });
    const route = plan({
      participants: [leader, participant(2)],
      enter: async (next) => {
        route.entered.push(`${next.x}|${next.y}`);
        leader.destroyed = true;
      },
    });

    const result = await new FieldTransitionExecutor().execute(route);

    expect(route.entered).toEqual(['2|1']);
    expect(result).toMatchObject({
      completedSteps: 1,
      stopReason: 'DESTROYED',
      movedShipIds: [2],
      destroyedShipIds: [1],
    });
  });

  it('runs the reactions after every entered field with the reached field as context', async () => {
    const contexts: MovementReactionContext[] = [];
    const reaction: MovementReaction = {
      afterTransition: (context) => {
        contexts.push(context);
      },
    };

    await new FieldTransitionExecutor([reaction]).execute(plan());

    expect(contexts.map((context) => context.coordinate)).toEqual([
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
    ]);
    expect(contexts[0]).toMatchObject({ scope: 'GALAXY', fieldId: 21 });
  });

  it('collects battle reports along the route and refreshes the participants after changes', async () => {
    const refreshParticipants = jest.fn();
    const alert: MovementReaction = {
      afterTransition: ({ coordinate }) =>
        coordinate.x === 4
          ? undefined
          : { reports: [battleReport(`Kampf auf ${coordinate.x}`)], changedParticipants: true },
    };

    const result = await new FieldTransitionExecutor([alert]).execute(plan({ refreshParticipants }));

    expect(result).toMatchObject({ completedSteps: 3, stopReason: 'ARRIVED' });
    expect(result.combatReports).toEqual([battleReport('Kampf auf 2'), battleReport('Kampf auf 3')]);
    expect(refreshParticipants).toHaveBeenCalledTimes(2);
  });

  it('continues with the survivors when a reaction destroys a fleet member', async () => {
    const member = participant(2);
    const route = plan({ participants: [participant(1, { required: true }), member] });
    const destroyer: MovementReaction = {
      afterTransition: () => {
        if (member.destroyed) return;
        member.destroyed = true;
        return { reports: [battleReport('Schiff 2 zerstört')], changedParticipants: true };
      },
    };

    const result = await new FieldTransitionExecutor([destroyer]).execute(route);

    expect(route.entered).toEqual(['2|1', '3|1', '4|1']);
    expect(result).toMatchObject({
      stopReason: 'ARRIVED',
      movedShipIds: [1],
      destroyedShipIds: [2],
      combatReports: [battleReport('Schiff 2 zerstört')],
    });
  });

  it('ends with DESTROYED when a reaction destroys every participant', async () => {
    const leader = participant(1, { required: true });
    const destroyer: MovementReaction = {
      afterTransition: () => {
        leader.destroyed = true;
        return { changedParticipants: true };
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

  it('stops on the intermediate field when a reaction explicitly requests it', async () => {
    const later = { afterTransition: jest.fn() };
    const blocker: MovementReaction = {
      afterTransition: ({ coordinate }) => (coordinate.x === 3 ? { stop: true } : undefined),
    };
    const route = plan();

    const result = await new FieldTransitionExecutor([blocker, later]).execute(route);

    expect(route.entered).toEqual(['2|1', '3|1']);
    expect(result).toMatchObject({ completedSteps: 2, stopReason: 'ALERT_COMBAT', movedShipIds: [1] });
    expect(later.afterTransition).toHaveBeenCalledTimes(1);
  });
});
