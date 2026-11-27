import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as yaml from 'js-yaml';

const DATA = join(__dirname, '../../../../../game-data/data');

describe('basic trade configuration (tmw-T7b)', () => {
  const config = yaml.load(readFileSync(join(DATA, 'trade/basic-trade.yaml'), 'utf8')) as {
    networks: number[];
    commodities: Array<{ commodityId: number; startValue: number }>;
  };

  it('offers exactly the STU basic trade commodities at their oldest STU test rates in both faction networks', () => {
    expect(config.networks).toEqual([1, 2]);
    expect(config.commodities).toEqual([
      { commodityId: 2, startValue: 189643 },
      { commodityId: 4, startValue: 94492 },
      { commodityId: 21, startValue: 54151 },
    ]);
  });

  it('refers to Doonium, Kunststoff and Durastahl-Legierung', () => {
    const map = yaml.load(readFileSync(join(DATA, 'commodities/stu-commodity-map.yaml'), 'utf8'));
    const entries = (Array.isArray(map) ? map : Object.values(map as object).find(Array.isArray)) as Array<{ id: number; name: string }>;
    const names = config.commodities.map(({ commodityId }) => entries.find((entry) => entry.id === commodityId)?.name);
    expect(names).toEqual(['Doonium', 'Kunststoff', 'Durastahl-Legierung']);
  });
});
