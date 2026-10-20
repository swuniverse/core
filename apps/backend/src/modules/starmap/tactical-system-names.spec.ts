import {
  TACTICAL_CANON_NAMES,
  pickTacticalSystemNames,
} from './tactical-system-names';

const hash = (value: string) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

describe('pickTacticalSystemNames', () => {
  it('is deterministic and unique', () => {
    const a = pickTacticalSystemNames(TACTICAL_CANON_NAMES, 56, 'seed', hash);
    const b = pickTacticalSystemNames(TACTICAL_CANON_NAMES, 56, 'seed', hash);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(56);
    expect(a.some((name) => name.startsWith('Tactical-'))).toBe(false);
  });

  it('falls back to generic names when the pool is too small', () => {
    expect(pickTacticalSystemNames(['Naboo'], 2, 's', hash)).toEqual([
      'Naboo',
      'Tactical-2',
    ]);
  });

  it('ships 56 unique canon names', () => {
    expect(new Set(TACTICAL_CANON_NAMES).size).toBe(56);
  });
});
