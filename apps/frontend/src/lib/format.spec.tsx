import { render, screen } from '@testing-library/react';
import { Delta, formatDelta, formatGameDate, formatGameDateTime, formatNumber } from './format';

describe('number formatting', () => {
  it('formats numbers with German thousands separators', () => {
    expect(formatNumber(1_234_567)).toBe('1.234.567');
  });

  it('adds a sign only to positive deltas', () => {
    expect(formatDelta(42)).toBe('+42');
    expect(formatDelta(0)).toBe('0');
    expect(formatDelta(-42)).toBe('-42');
  });
});

describe('Delta', () => {
  it.each([
    [12, 'text-swu-positive'],
    [-12, 'text-swu-negative'],
  ])('colors %s according to its sign', (value, expectedClass) => {
    render(<Delta value={value} />);

    expect(screen.getByText(formatDelta(value)).className).toContain(expectedClass);
  });

  it('leaves zero neutral', () => {
    render(<Delta value={0} />);

    expect(screen.getByText('0').className).not.toMatch(/text-swu-(positive|negative)/);
  });
});

describe('game dates', () => {
  const local = (...parts: [number, number, number, number?, number?]) =>
    new Date(parts[0], parts[1] - 1, parts[2], parts[3] ?? 12, parts[4] ?? 0).toISOString();

  it('shows the real day and month with the year after the Battle of Yavin', () => {
    expect(formatGameDate(local(2026, 11, 14))).toBe('14.11.3 NSY');
    expect(formatGameDateTime(local(2026, 3, 5, 8, 7))).toBe('05.03.3 NSY, 08:07');
    expect(formatGameDate(local(2023, 6, 1))).toBe('01.06.0 NSY');
    expect(formatGameDate(local(2021, 6, 1))).toBe('01.06.2 VSY');
  });

  it('changes the year at local midnight on New Year', () => {
    expect(formatGameDateTime(local(2026, 12, 31, 23, 59))).toBe('31.12.3 NSY, 23:59');
    expect(formatGameDateTime(local(2027, 1, 1, 0, 0))).toBe('01.01.4 NSY, 00:00');
  });
});
