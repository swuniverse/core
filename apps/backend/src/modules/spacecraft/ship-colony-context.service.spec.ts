import { BadRequestException } from '@nestjs/common';
import { calculateTransferEnergyCost } from './transfer-cost';

describe('transfer energy cost', () => {
  it.each([
    [1, 1],
    [5, 1],
    [6, 2],
    [10, 2],
  ])('charges one EPS per five capacity: %s -> %s', (amount, cost) => {
    expect(calculateTransferEnergyCost(amount)).toBe(cost);
  });
  it('rejects invalid amounts', () => {
    expect(() => calculateTransferEnergyCost(0)).toThrow(BadRequestException);
    expect(() => calculateTransferEnergyCost(1.5)).toThrow(BadRequestException);
  });
});
