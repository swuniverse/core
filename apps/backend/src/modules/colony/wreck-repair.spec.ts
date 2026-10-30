import {
  pickWreckShip,
  WRECK_MAX_DAMAGE,
  WRECK_MIN_DAMAGE,
  wreckDamageForField,
  wreckRepairPlan,
} from '@swuniverse/shared';

describe('wreck repair', () => {
  it('keeps damage stable per field and within range', () => {
    for (let i = 0; i < 200; i++) {
      const damage = wreckDamageForField(7, i);
      expect(damage).toBe(wreckDamageForField(7, i));
      expect(damage).toBeGreaterThanOrEqual(WRECK_MIN_DAMAGE);
      expect(damage).toBeLessThanOrEqual(WRECK_MAX_DAMAGE);
    }
  });

  it('halves costs and time with a repair station', () => {
    const base = wreckRepairPlan(100, false);
    const bonus = wreckRepairPlan(100, true);
    expect(base.costs).toEqual([
      { commodityId: 10001, amount: 10 },
      { commodityId: 10002, amount: 5 },
    ]);
    expect(base.durationMinutes).toBe(20);
    expect(bonus.costs.map((c) => c.amount)).toEqual([5, 3]);
    expect(bonus.durationMinutes).toBe(10);
  });

  it('favours ARC-170 and Vulture Droid in the loot table', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 7000; i++) {
      const key = pickWreckShip(i / 7000);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    expect(counts.SALVAGE_FIGHTER_ARC_170).toBeGreaterThan(
      counts.SALVAGE_FIGHTER_N1,
    );
    expect(counts.SALVAGE_FIGHTER_VULTURE_DROID).toBeGreaterThan(
      counts.SALVAGE_FIGHTER_DELTA_7,
    );
    expect(Object.keys(counts)).toHaveLength(5);
  });
});
