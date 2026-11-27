import { parseSettlerListQuery } from './settler-list.query';

describe('parseSettlerListQuery', () => {
  it('defaults to id ascending on page 1', () => {
    expect(parseSettlerListQuery({})).toEqual({ page: 1, sort: 'id', order: 'asc', search: '' });
  });

  it.each([
    ['abc', 1],
    ['0', 1],
    ['-4', 1],
    ['2.9', 2],
    ['7', 7],
  ])('reads page %p as %p', (page, expected) => {
    expect(parseSettlerListQuery({ page }).page).toBe(expected);
  });

  it('accepts only known sort fields and orders', () => {
    expect(parseSettlerListQuery({ sort: 'faction', order: 'desc' })).toMatchObject({
      sort: 'faction',
      order: 'desc',
    });
    expect(parseSettlerListQuery({ sort: 'password"; DROP TABLE', order: 'sideways' })).toMatchObject({
      sort: 'id',
      order: 'asc',
    });
  });

  it('trims and bounds the search text', () => {
    expect(parseSettlerListQuery({ search: '  Leia ' }).search).toBe('Leia');
    expect(parseSettlerListQuery({ search: 'x'.repeat(500) }).search).toHaveLength(100);
  });
});
