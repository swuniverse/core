import { BadRequestException } from '@nestjs/common';
import { ShipbuildingCoreService } from './shipbuilding-core.service';

describe('ShipbuildingCoreService', () => {
  const gameData = {
    getShipClassSlotRuleForShipClass: jest.fn(),
    getShipClassSlotRule: jest.fn(() => ({
      moduleSlots: { SPECIAL: 1 },
      slots: [
        { slotId: 'weapon', moduleCategory: 'ENERGY_WEAPON', label: 'Weapon' },
        { slotId: 'special', moduleCategory: 'SPECIAL', label: 'Special' },
      ],
    })),
    getFabricationItemByOutputCommodity: jest.fn((id: number) => ({
      queueType: 'MODULE', outputCommodityId: id, moduleType: `M${id}`,
      shipyardType: id === 2 ? 'SPECIAL' : 'ENERGY_WEAPON', shipyardModuleStats: { crew: id },
    })),
    isShipyardModuleAllowedForShipClass: jest.fn(() => true),
    getShipClassDefByKey: jest.fn(() => ({ buildCosts: [{ commodityId: 7, amount: 4 }] })),
  };
  const service = new ShipbuildingCoreService(gameData as never);
  const hull = { id: 3, key: 'CORVETTE', name: 'Corvette', category: 'CORVETTE', crewMin: 2, crewMax: 4 } as never;

  it('validates modules and calculates authoritative costs through a source-neutral seam', () => {
    expect(service.prepare(hull, [{ slotId: 'weapon', commodityId: 1 }], null)).toMatchObject({
      moduleSelections: [{ slotId: 'weapon', commodityId: 1 }],
      moduleCommodityIds: [1],
      moduleTypes: ['ENERGY_WEAPON'],
      materialCosts: [{ commodityId: 7, amount: 4 }],
      crewRequired: 3,
    });
  });

  it('enforces crew and special-module rules for every source adapter', () => {
    expect(() => service.prepare(hull, [
      { slotId: 'weapon', commodityId: 1 },
      { slotId: 'special', commodityId: 2 },
    ], null)).toThrow(BadRequestException);
  });
});
