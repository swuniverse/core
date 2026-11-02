import { describe, expect, it } from 'vitest';

import {
  COLONIZATION_TECH_IDS,
  getColonizationLimitIncrease,
} from './colonization-rules.js';

describe('getColonizationLimitIncrease', () => {
  it.each([
    [COLONIZATION_TECH_IDS.REBEL_HOSTILE_PLANETS, 'planet'],
    [COLONIZATION_TECH_IDS.EMPIRE_MOON_COLONIZATION_1, 'moon'],
    [COLONIZATION_TECH_IDS.REBEL_ASTEROID_THIN, 'asteroid'],
  ] as const)('maps research %i to a +1 %s limit', (techId, type) => {
    expect(getColonizationLimitIncrease(techId)).toEqual({ type, amount: 1 });
  });

  it('returns null for research without a colony limit increase', () => {
    expect(getColonizationLimitIncrease(999999)).toBeNull();
  });
});
