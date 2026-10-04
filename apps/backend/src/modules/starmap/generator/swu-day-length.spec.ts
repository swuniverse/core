import {
  computeSwuDayNightSwitchMinutes,
  computeSwuTerminatorShiftHours,
} from './swu-planet-archetypes.generator';

const archetype = { rotationPeriodRealHoursRange: [18, 30] as [number, number] };

describe('day length', () => {
  it('varies widely within the planet/moon ranges and is deterministic', () => {
    const planets = Array.from({ length: 200 }, (_, i) => computeSwuDayNightSwitchMinutes(archetype, `p${i}`)!);
    const moons = Array.from({ length: 200 }, (_, i) => computeSwuDayNightSwitchMinutes(archetype, `m${i}`, true)!);
    expect(Math.min(...planets)).toBeGreaterThanOrEqual(12);
    expect(Math.max(...planets)).toBeLessThanOrEqual(150);
    expect(Math.max(...planets) - Math.min(...planets)).toBeGreaterThan(100);
    expect(Math.min(...moons)).toBeGreaterThanOrEqual(6);
    expect(Math.max(...moons)).toBeLessThanOrEqual(80);
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(avg(moons)).toBeLessThan(avg(planets));
    expect(computeSwuDayNightSwitchMinutes(archetype, 'p1')).toBe(planets[1]);
  });

  it('terminator shift cycle is 400-500 hours', () => {
    for (let i = 0; i < 100; i++) {
      const h = computeSwuTerminatorShiftHours(`t${i}`);
      expect(h).toBeGreaterThanOrEqual(400);
      expect(h).toBeLessThanOrEqual(500);
    }
  });
});
