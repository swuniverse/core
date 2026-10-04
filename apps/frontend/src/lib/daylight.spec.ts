import { describe, expect, it } from 'vitest';
import { surfaceTimeState, type SwuDaylightInfo } from './daylight';

const HOUR = 60_000; // 1 angezeigte Stunde = 1 echte Minute
const rotating: SwuDaylightInfo = {
  tidalLocked: false,
  zoneSlot: 2,
  dayNightSwitchMinutes: 10,
  dayNightPhaseHours: 0,
};

describe('surfaceTimeState', () => {
  it('rotating: each column alternates day/night every switch interval', () => {
    const a = surfaceTimeState(rotating, 3, 10, 0);
    const b = surfaceTimeState(rotating, 3, 10, 10 * HOUR);
    const c = surfaceTimeState(rotating, 3, 10, 20 * HOUR);
    expect(a).not.toBe(b);
    expect(a).toBe(c);
  });

  it('rotating: never a night band in the middle - at most one day/night boundary across the columns', () => {
    for (let t = 0; t < 40; t += 0.5) {
      const states = Array.from({ length: 10 }, (_, c) => surfaceTimeState(rotating, c, 10, t * HOUR));
      const changes = states.filter((s, i) => i > 0 && s !== states[i - 1]).length;
      expect(changes).toBeLessThanOrEqual(1);
    }
  });

  it('tidal-locked: night side always night, day side always day', () => {
    const base = { tidalLocked: true, dayNightSwitchMinutes: null, terminatorShiftHours: 450 };
    for (const t of [0, 100 * HOUR, 333 * HOUR]) {
      expect(surfaceTimeState({ ...base, zoneSlot: 1 }, 4, 10, t)).toBe('night');
      expect(surfaceTimeState({ ...base, zoneSlot: 3 }, 4, 10, t)).toBe('day');
    }
  });

  it('tidal-locked terminator: boundary sweeps across the map over a cycle', () => {
    const info: SwuDaylightInfo = {
      tidalLocked: true, zoneSlot: 2, dayNightSwitchMinutes: null, terminatorShiftHours: 400, dayNightPhaseHours: 0,
    };
    const dayColumns = (t: number) =>
      Array.from({ length: 10 }, (_, c) => surfaceTimeState(info, c, 10, t)).filter((s) => s === 'day').length;
    expect(dayColumns(100 * HOUR)).toBeGreaterThan(dayColumns(0));
    expect(dayColumns(300 * HOUR)).toBeLessThan(dayColumns(0));
  });
});
