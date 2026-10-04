import { solarOutputFactor, solarOutputTJ, SWU_SOLAR_MAX_OUTPUT_TJ } from './swu-solar';

describe('swu-solar', () => {
  it('gives the exact worked example from the design note: tidal-locked hot Wueste, sonnennah', () => {
    // Gebundener Wuestenplanet (Atmosphaere A), sonnennah (orbitDistance=0), Hot-Zone
    // -> 1.6 * 1.3 * 1.0 = 2.08 roh, gedeckelt bei 3200 TJ (2.08*1600=3328 > 3200).
    const factor = solarOutputFactor(0, 3, 'tidal-locked', 'A');
    expect(factor).toBeCloseTo(2.08, 5);
    expect(solarOutputTJ(0, 3, 'tidal-locked', 6, null)).toBe(SWU_SOLAR_MAX_OUTPUT_TJ);
  });

  it('is exactly 0 on the permanent night side of a tidal-locked planet', () => {
    expect(solarOutputFactor(0, 1, 'tidal-locked', 'A')).toBe(0);
    expect(solarOutputTJ(0, 1, 'tidal-locked', 6, null)).toBe(0);
  });

  it('is 0 for gas giants regardless of zone/distance (no solid ground)', () => {
    expect(solarOutputFactor(0.5, 2, 'rotating', 'B')).toBe(0);
    expect(solarOutputTJ(0.5, 2, 'rotating', 15, 'A')).toBe(0);
  });

  it('rotating planets: yield peaks at the equator and drops towards the poles', () => {
    const polar = solarOutputFactor(0.3, 1, 'rotating', 'A');
    const temperate = solarOutputFactor(0.3, 2, 'rotating', 'A');
    const equator = solarOutputFactor(0.3, 3, 'rotating', 'A');
    expect(polar).toBeLessThan(temperate);
    expect(temperate).toBeLessThan(equator);
  });

  it('reaches the 1600 TJ baseline at neutral distance/rotation/atmosphere', () => {
    // distanceFactor bei orbitDistance=0.5 -> 1.6-0.6=1.0, zoneFactor rotating gemaessigt=1.0, atmosphere A=1.0
    expect(solarOutputTJ(0.5, 2, 'rotating', 6, null)).toBe(1600);
  });

  it('clamps orbitDistance outside [0,1]', () => {
    expect(solarOutputFactor(-1, 2, 'rotating', 'A')).toBe(
      solarOutputFactor(0, 2, 'rotating', 'A'),
    );
    expect(solarOutputFactor(5, 2, 'rotating', 'A')).toBe(
      solarOutputFactor(1, 2, 'rotating', 'A'),
    );
  });
});
