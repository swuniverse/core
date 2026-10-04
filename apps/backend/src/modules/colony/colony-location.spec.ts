import { resolveColonyLocation } from './colony-location';

describe('resolveColonyLocation', () => {
  it('resolves the canonical system field', () => {
    expect(
      resolveColonyLocation({
        systemFieldId: 99,
        systemField: { starSystemId: 4, sx: 5, sy: 6 },
      } as never),
    ).toEqual({ scope: 'SYSTEM', systemId: 4, x: 5, y: 6 });
  });
});
