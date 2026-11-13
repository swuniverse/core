jest.mock('../auth/user.entity', () => ({ User: class User {} }));

import {
  basicTradeBuyValue,
  basicTradeSellValue,
  nextBasicTradeValue,
} from './basic-trade.service';

describe('basic trade formula (STU BasicTradeBuy/BasicTradeSell)', () => {
  it('derives buy and sell amounts from the rate value', () => {
    expect(basicTradeBuyValue(189643)).toBe(1896);
    // 1896.43 × 1.1 = 2086.07, truncated
    expect(basicTradeSellValue(189643)).toBe(2086);
  });

  it('moves the newest value by the modifier over n + 1 after a seed', () => {
    expect(nextBasicTradeValue([{ value: 189643, buySell: 0 }], -10)).toBe(189643 - 500);
    expect(nextBasicTradeValue([{ value: 189643, buySell: 0 }], 10)).toBe(189643 + 500);
  });

  it('averages the older latest modifiers but not the newest one', () => {
    const latest = [
      { value: 1000, buySell: -10 },
      { value: 900, buySell: 10 },
      { value: 800, buySell: 10 },
    ];
    // sell: (10 + 10 + 10) × 100 / 4 = 750
    expect(nextBasicTradeValue(latest, 10)).toBe(1750);
    // buy: (−10 + 10 + 10) × 100 / 4 = 250
    expect(nextBasicTradeValue(latest, -10)).toBe(1250);
  });

  it('truncates toward zero like PHP (int)', () => {
    // −10 × 100 / 3 = −333.3 → −333, not −334
    expect(nextBasicTradeValue([{ value: 1000, buySell: 0 }, { value: 900, buySell: 0 }], -10)).toBe(667);
  });
});
