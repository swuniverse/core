import { countSwuMiningFields, rateSwuSettlement } from './swu-settlement-rating';

const mining = { x: 8, y: 2, z: 8 };

describe('swu-settlement-rating', () => {
  it('rates all-full factors as Perfekt', () => {
    const r = rateSwuSettlement({ mining, oreSources: 14, atmosphere: 'A', solarOutputTJ: 2000, deuteriumSources: 18 });
    expect(r.rating).toBe('PERFECT');
    expect(r.score).toBe(8);
  });

  it('rates an atmosphere-less world with good resources and sun as Gut', () => {
    const r = rateSwuSettlement({ mining, oreSources: 14, atmosphere: 'E', solarOutputTJ: 2400, deuteriumSources: 18 });
    expect(r.rating).toBe('GOOD');
    expect(r.factors.atmosphere.present).toBe(false);
  });

  it('rates toxic atmosphere without sunlight as Schwierig', () => {
    const r = rateSwuSettlement({ mining, oreSources: 14, atmosphere: 'D', solarOutputTJ: 0, deuteriumSources: 6 });
    expect(r.rating).toBe('DIFFICULT');
  });

  it('rates a gas giant without mining or sun as Herausfordernd', () => {
    const r = rateSwuSettlement({
      mining: { x: 0, y: 0, z: 0 },
      oreSources: 14,
      atmosphere: 'B',
      solarOutputTJ: 0,
      deuteriumSources: 0,
    });
    expect(r.rating).toBe('CHALLENGING');
  });

  it('scores deuterium by source count, halved thresholds for moons', () => {
    const base = { mining, oreSources: 14, atmosphere: 'A' as const, solarOutputTJ: 2000 };
    expect(rateSwuSettlement({ ...base, deuteriumSources: 12 }).factors.deuterium.points).toBe(2);
    expect(rateSwuSettlement({ ...base, deuteriumSources: 6 }).factors.deuterium.points).toBe(1);
    expect(rateSwuSettlement({ ...base, deuteriumSources: 0 }).factors.deuterium.points).toBe(0);
    expect(rateSwuSettlement({ ...base, deuteriumSources: 6, isMoon: true }).factors.deuterium.points).toBe(2);
  });

  it('counts direct, geoengineerable and deep mining fields', () => {
    const classify = (t: string) =>
      t === 'B640' ? ['bergbau'] : t === 'E430' ? ['bergbau_tiefsee'] : t === 'U6B1' ? ['bergbau_untergrund'] : [];
    expect(countSwuMiningFields([['B640', 'C630', 'E430', 'C110']], [['U6B1', 'U101']], classify)).toEqual({
      x: 1,
      y: 1,
      z: 2,
    });
  });
});
