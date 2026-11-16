import {
  prepareScrappingModules,
  recycleScrappingModules,
  scrappingCode,
} from './station-scrapping-rules';

describe('Station scrapping rules', () => {
  it('uses the STU six-character MD5 confirmation code', () => {
    expect(scrappingCode('Test')).toBe('0cbc66');
  });

  it('scales the guaranteed recycling chance with integrity and groups equal modules', () => {
    const random = jest.fn().mockReturnValueOnce(50).mockReturnValueOnce(26);
    expect(
      prepareScrappingModules(
        [
          { commodityId: 101, integrity: 100 },
          { commodityId: 101, integrity: 50 },
          { commodityId: 102, integrity: 0 },
        ],
        random,
      ),
    ).toEqual([
      { commodityId: 101, count: 2, guaranteed: true },
      { commodityId: 102, count: 1, guaranteed: false },
    ]);
    expect(random).toHaveBeenCalledTimes(2);
  });

  it('returns one guaranteed module, otherwise uses STU 33 percent loss and random count', () => {
    const random = jest
      .fn()
      .mockReturnValueOnce(33)
      .mockReturnValueOnce(34)
      .mockReturnValueOnce(2);
    expect(
      recycleScrappingModules(
        [
          { commodityId: 101, count: 4, guaranteed: true },
          { commodityId: 102, count: 3, guaranteed: false },
          { commodityId: 103, count: 5, guaranteed: false },
        ],
        random,
      ),
    ).toEqual([
      { commodityId: 101, amount: 1 },
      { commodityId: 103, amount: 2 },
    ]);
    expect(random).toHaveBeenLastCalledWith(1, 6);
  });
});
