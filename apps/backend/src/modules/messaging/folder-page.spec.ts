import { parsePage } from './folder-page';

describe('parsePage', () => {
  it.each([
    [undefined, 1],
    ['', 1],
    ['abc', 1],
    ['0', 1],
    ['-3', 1],
    ['1.5', 1],
    ['2.9', 2],
    ['4', 4],
  ])('%p → %p', (input, expected) => {
    expect(parsePage(input)).toBe(expected);
  });
});
