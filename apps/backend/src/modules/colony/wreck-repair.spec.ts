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

  it('splits wrecks 40:60 between droids and oldtimers, bigger ships rarer', () => {
    const counts: Record<string, number> = {};
    const n = 10000;
    for (let i = 0; i < n; i++) {
      const key = pickWreckShip(i / n);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    expect(
      counts.SALVAGE_FIGHTER_VULTURE_DROID +
        counts.SALVAGE_FIGHTER_VULTURE_B_DROID,
    ).toBe(n * 0.4);
    expect(counts.SALVAGE_FIGHTER_VULTURE_DROID).toBeGreaterThan(
      counts.SALVAGE_FIGHTER_VULTURE_B_DROID,
    );
    expect(counts.SALVAGE_FIGHTER_ARC_170).toBeGreaterThan(
      counts.SALVAGE_FIGHTER_N1,
    );
    expect(counts.SALVAGE_FIGHTER_N1).toBeGreaterThan(
      counts.SALVAGE_CORVETTE_LAAT_I,
    );
    expect(counts.SALVAGE_CORVETTE_LAAT_I).toBeGreaterThan(
      counts.SALVAGE_CORVETTE_ST_70,
    );
    expect(counts.SALVAGE_CORVETTE_ST_70).toBeGreaterThan(
      counts.SALVAGE_CORVETTE_C70_CHARGER,
    );
    expect(counts.SALVAGE_CORVETTE_C9979).toBeGreaterThan(
      counts.SALVAGE_CRUISER_LUCREHULK,
    );
    expect(counts.SALVAGE_CORVETTE_C70_CHARGER).toBeGreaterThan(
      counts.SALVAGE_CRUISER_VENATOR,
    );
    expect(counts.SALVAGE_FRIGATE_PELTA).toBeGreaterThan(
      counts.SALVAGE_CRUISER_VENATOR,
    );
    expect(counts.SALVAGE_FRIGATE_MUNIFICENT).toBeGreaterThan(
      counts.SALVAGE_CRUISER_PROVIDENCE,
    );
    expect(counts.SALVAGE_CRUISER_PROVIDENCE).toBeGreaterThan(
      counts.SALVAGE_CRUISER_LUCREHULK,
    );
    expect(Object.keys(counts)).toHaveLength(15);
  });
});
