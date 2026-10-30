import { BadRequestException } from '@nestjs/common';
import { FieldTransitionExecutor } from './field-transition-executor';

describe('FieldTransitionExecutor', () => {
  const field = (x: number, y: number, passable = true) => ({ x, y, passable });

  it('processes every field of an orthogonal route in deterministic order', async () => {
    const entered: string[] = [];
    const executor: FieldTransitionExecutor = new FieldTransitionExecutor();

    const result = await executor.execute({
      start: { x: 1, y: 1 },
      target: { x: 1, y: 4 },
      resolveField: async (x, y) => field(x, y),
      isPassable: (next) => next.passable,
      participants: [
        {
          canPay: () => true,
          pay: () => undefined,
          isDestroyed: () => false,
        },
      ],
      enter: async (next) => {
        entered.push(`${next.x}|${next.y}`);
      },
    });

    expect(entered).toEqual(['1|2', '1|3', '1|4']);
    expect(result.completedSteps).toBe(3);
  });

  it('rejects diagonal routes before entering a field', async () => {
    const enter = jest.fn();
    const executor: FieldTransitionExecutor = new FieldTransitionExecutor();

    await expect(
      executor.execute({
        start: { x: 1, y: 1 },
        target: { x: 2, y: 2 },
        resolveField: async (x, y) => field(x, y),
        isPassable: (next) => next.passable,
        participants: [],
        enter,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(enter).not.toHaveBeenCalled();
  });

  it('stops before a missing or impassable intermediate field', async () => {
    const entered: string[] = [];
    const executor: FieldTransitionExecutor = new FieldTransitionExecutor();

    await expect(
      executor.execute({
        start: { x: 1, y: 1 },
        target: { x: 4, y: 1 },
        resolveField: async (x, y) =>
          x === 3 ? field(x, y, false) : field(x, y),
        isPassable: (next) => next.passable,
        participants: [],
        enter: async (next) => {
          entered.push(`${next.x}|${next.y}`);
        },
      }),
    ).rejects.toThrow('passable');
    expect(entered).toEqual(['2|1']);
  });

  it('stops before the next field when a cost participant cannot pay', async () => {
    let energy = 2;
    const entered: string[] = [];
    const executor: FieldTransitionExecutor = new FieldTransitionExecutor();

    const result = await executor.execute({
      start: { x: 1, y: 1 },
      target: { x: 4, y: 1 },
      resolveField: async (x, y) => field(x, y),
      isPassable: (next) => next.passable,
      participants: [
        {
          canPay: () => energy >= 1,
          pay: () => {
            energy -= 1;
          },
          isDestroyed: () => false,
        },
      ],
      enter: async (next) => {
        entered.push(`${next.x}|${next.y}`);
      },
    });

    expect(result).toEqual({ completedSteps: 2, stopped: 'INSUFFICIENT_COST' });
    expect(entered).toEqual(['2|1', '3|1']);
  });

  it('stops after a field consequence destroys a participant', async () => {
    let destroyed = false;
    const entered: string[] = [];
    const executor: FieldTransitionExecutor = new FieldTransitionExecutor();

    const result = await executor.execute({
      start: { x: 1, y: 1 },
      target: { x: 4, y: 1 },
      resolveField: async (x, y) => field(x, y),
      isPassable: (next) => next.passable,
      participants: [
        {
          canPay: () => true,
          pay: () => undefined,
          isDestroyed: () => destroyed,
        },
      ],
      enter: async (next) => {
        entered.push(`${next.x}|${next.y}`);
        destroyed = true;
      },
    });

    expect(result).toEqual({ completedSteps: 1, stopped: 'DESTROYED' });
    expect(entered).toEqual(['2|1']);
  });
});
