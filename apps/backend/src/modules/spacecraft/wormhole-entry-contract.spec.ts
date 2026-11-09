import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  WormholeEntryDto,
  WORMHOLE_ENTRY_ROUTE,
} from './wormhole-entry-contract';

describe('future wormhole entry contract', () => {
  it('defines the intended endpoint and accepts an optional positive wormhole id', async () => {
    expect(WORMHOLE_ENTRY_ROUTE).toEqual({
      method: 'POST',
      path: 'spacecraft/:id/wormhole/enter',
    });
    for (const value of [{}, { wormholeId: 5 }]) {
      expect(
        await validate(plainToInstance(WormholeEntryDto, value)),
      ).toHaveLength(0);
    }
    for (const value of [0, -1, 1.5, 'invalid']) {
      expect(
        await validate(
          plainToInstance(WormholeEntryDto, { wormholeId: value }),
        ),
      ).not.toHaveLength(0);
    }
  });
});
