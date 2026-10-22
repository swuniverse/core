import { render, screen } from '@testing-library/react';
import { Delta, formatDelta, formatNumber } from './format';

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
