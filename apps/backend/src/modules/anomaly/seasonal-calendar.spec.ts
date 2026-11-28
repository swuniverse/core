import { berlinDay, easterSunday } from './seasonal-calendar';
describe('Seasonal calendar', () => {
  it.each([
    [2024, '2024-03-31'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2038, '2038-04-25'],
  ])('computes Easter in %s', (year, expected) =>
    expect(easterSunday(year as number)).toBe(expected),
  );
  it('uses Berlin midnight instead of UTC or the process timezone', () => {
    expect(berlinDay(new Date('2026-11-30T22:59:59Z'))).toBe('2026-11-30');
    expect(berlinDay(new Date('2026-11-30T23:00:00Z'))).toBe('2026-12-01');
    expect(berlinDay(new Date('2026-04-04T22:00:00Z'))).toBe('2026-04-05');
  });
});

import { winterEventActive } from './anomaly.service';
describe('Winter event window', () => {
  it.each([
    ['2026-11-30T22:59:59Z', false],
    ['2026-11-30T23:00:00Z', true],
    ['2026-12-24T22:59:59Z', true],
    ['2026-12-24T23:00:00Z', false],
  ])('at %s is %s', (iso, expected) =>
    expect(winterEventActive(new Date(iso))).toBe(expected),
  );
});
