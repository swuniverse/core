import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DatabaseController, DismissCrewRequest } from './database.controller';

describe('crew endpoints', () => {
  const errors = (crewIds: unknown) => validate(plainToInstance(DismissCrewRequest, { crewIds }));

  it.each([
    [[1, 2, 3]],
    [[]],
  ])('accepts %j', async (ids) => {
    expect(await errors(ids)).toHaveLength(0);
  });

  it.each([
    ['not a list', 'x'],
    ['a string id', ['1']],
    ['a fraction', [1.5]],
    ['zero', [0]],
    ['a negative id', [-4]],
    ['an id beyond int4', [2147483648]],
    ['more than 500 ids', Array.from({ length: 501 }, (_, i) => i + 1)],
  ])('rejects %s', async (_label, ids) => {
    expect(await errors(ids)).not.toHaveLength(0);
  });

  it('works on the authenticated player only', async () => {
    const crew = { list: jest.fn(async () => ({ members: [] })), dismiss: jest.fn(async () => ({ dismissed: 0 })) };
    const controller = new DatabaseController(
      {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, crew as never,
    );

    await controller.getCrew({ user: { sub: 42 } });
    await controller.dismissCrew({ user: { sub: 42 } }, { crewIds: [7, 8] });

    expect(crew.list).toHaveBeenCalledWith(42);
    expect(crew.dismiss).toHaveBeenCalledWith(42, [7, 8]);
  });
});
