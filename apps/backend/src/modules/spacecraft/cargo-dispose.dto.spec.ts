import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CargoDisposeDto } from './cargo-dispose.dto';

describe('CargoDisposeDto', () => {
  it('accepts a list of nonnegative whole quantities', async () => {
    expect(
      await validate(
        plainToInstance(CargoDisposeDto, {
          items: [
            { commodityId: 7, amount: 0 },
            { commodityId: 8, amount: 100 },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it.each([
    {},
    { items: null },
    { items: {} },
    { items: [{ commodityId: 0, amount: 1 }] },
    { items: [{ commodityId: 1, amount: -1 }] },
    { items: [{ commodityId: 1, amount: 1.5 }] },
    { items: [{ commodityId: 1, amount: Number.MAX_SAFE_INTEGER + 1 }] },
    { items: [{ commodityId: 1 }] },
    { items: [null] },
    {
      items: Array.from({ length: 1001 }, () => ({
        commodityId: 1,
        amount: 1,
      })),
    },
  ])('rejects malformed disposal payload %#', async (body) => {
    expect(
      (await validate(plainToInstance(CargoDisposeDto, body))).length,
    ).toBeGreaterThan(0);
  });
});
