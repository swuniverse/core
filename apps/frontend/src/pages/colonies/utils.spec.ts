import type { BuildingDef } from './types';
import {
  canAfford,
  getTerraformingOptionsForField,
  maxAffordable,
} from './utils';

const building = {
  epsCost: 5,
  resourceCosts: [{ commodityId: 2, amount: 4 }],
} as BuildingDef;
const storage = [{ commodityId: 2, amount: 12 }];

describe('colony build affordability', () => {
  it('requires construction energy in addition to resources', () => {
    expect(canAfford(building, storage, 4)).toBe(false);
    expect(canAfford(building, storage, 5)).toBe(true);
  });

  it('limits the affordable count by energy', () => {
    expect(maxAffordable(building, storage, 9)).toBe(1);
  });

  it('handles buildings with only an energy cost', () => {
    const energyOnly = { epsCost: 5, resourceCosts: [] } as BuildingDef;

    expect(maxAffordable(energyOnly, [], 4)).toBe(0);
    expect(maxAffordable(energyOnly, [], 10)).toBe(2);
  });

  it('keeps unlimited affordability for buildings without costs', () => {
    const freeBuilding = { epsCost: 0, resourceCosts: [] } as BuildingDef;

    expect(maxAffordable(freeBuilding, [], 0)).toBe(Infinity);
  });

  it('prefers a bonus-specific terraforming option over its generic variant', () => {
    const options = getTerraformingOptionsForField(
      { fieldType: 111, terrainTileId: 11103 } as never,
      [
        { id: 111101, fromFieldType: 111, toFieldType: 101 },
        { id: 11110103, fromFieldType: 11103, toFieldType: 10103 },
      ] as never,
    );

    expect(options.map((option) => option.id)).toEqual([11110103]);
  });
});
