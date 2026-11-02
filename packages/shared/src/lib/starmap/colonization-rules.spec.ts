import { describe, expect, it } from 'vitest';

import {
  getColonizationLimitType,
  type ColonizationLimitIncrease,
} from './colonization-rules.js';

describe('colonization limits', () => {
  it('exposes a shared data contract for research-defined increases', () => {
    const increase: ColonizationLimitIncrease = { type: 'moon', amount: 2 };

    expect(increase).toEqual({ type: 'moon', amount: 2 });
  });

  it.each([
    [1, 'planet'],
    [2, 'moon'],
    [3, 'asteroid'],
  ] as const)('maps celestial object type %i to %s', (objectType, type) => {
    expect(getColonizationLimitType(objectType)).toBe(type);
  });
});
