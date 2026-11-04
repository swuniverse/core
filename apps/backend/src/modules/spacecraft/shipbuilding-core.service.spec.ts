jest.mock('../starmap/entities/space-location.entity', () => ({
  SpaceLocation: class SpaceLocation {},
}));
import { BadRequestException } from '@nestjs/common';
import { ShipbuildingCoreService } from './shipbuilding-core.service';

describe('ShipbuildingCoreService', () => {
  const gameData = {
    getHangarShipDef: jest.fn(),
    getShipClassSlotRuleForShipClass: jest.fn(),
    getShipClassSlotRule: jest.fn(() => ({
      moduleSlots: { SPECIAL: 1 },
      slots: [
        { slotId: 'weapon', moduleCategory: 'ENERGY_WEAPON', label: 'Weapon' },
        { slotId: 'special', moduleCategory: 'SPECIAL', label: 'Special' },
      ],
    })),
    getFabricationItemByOutputCommodity: jest.fn((id: number) => ({
      queueType: 'MODULE',
      outputCommodityId: id,
      moduleType: `M${id}`,
      shipyardType: id === 2 ? 'SPECIAL' : 'ENERGY_WEAPON',
      moduleLevel: id + 1,
      researchId: id === 2 ? 42 : null,
      researchRequired: 'Special systems',
      shipyardModuleStats: { crew: id },
    })),
    isShipyardModuleAllowedForShipClass: jest.fn(() => true),
    getShipClassDefByKey: jest.fn(() => ({
      buildCosts: [{ commodityId: 7, amount: 4 }],
    })),
  };
  const unlocks = { hasTech: jest.fn(async () => true) };
  const service = new ShipbuildingCoreService(
    gameData as never,
    unlocks as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const hull = {
    id: 3,
    key: 'CORVETTE',
    name: 'Corvette',
    category: 'CORVETTE',
    crewMin: 2,
    crewMax: 4,
  } as never;

  beforeEach(() => jest.clearAllMocks());

  it('validates modules and calculates authoritative costs through a source-neutral seam', async () => {
    await expect(
      service.prepare(7, hull, [{ slotId: 'weapon', commodityId: 1 }], null),
    ).resolves.toMatchObject({
      moduleSelections: [{ slotId: 'weapon', commodityId: 1 }],
      moduleCommodityIds: [1],
      moduleTypes: ['M1'],
      modules: [
        {
          slotId: 'weapon',
          commodityId: 1,
          moduleType: 'M1',
          category: 'ENERGY_WEAPON',
          level: 2,
        },
      ],
      materialCosts: [{ commodityId: 7, amount: 4 }],
      crewRequired: 3,
    });
  });

  it('charges selected modules once when hull costs already contain their commodities', async () => {
    gameData.getShipClassDefByKey.mockReturnValueOnce({
      buildCosts: [
        { commodityId: 1, amount: 3 },
        { commodityId: 7, amount: 4 },
      ],
    });
    const build = await service.prepare(
      7,
      hull,
      [{ slotId: 'weapon', commodityId: 1 }],
      null,
    );
    expect(build.materialCosts).toEqual([{ commodityId: 7, amount: 4 }]);
  });

  it('rejects customization of a fixed hangar design for both origins', async () => {
    gameData.getHangarShipDef.mockReturnValueOnce({
      defaultModuleCommodityIds: [1],
    });
    await expect(
      service.prepare(7, hull, [{ slotId: 'special', commodityId: 2 }], null),
    ).rejects.toThrow('fixed module layout');
  });

  it('rejects two special modules assigned to the same physical slot', async () => {
    gameData.getShipClassSlotRuleForShipClass.mockReturnValueOnce({
      moduleSlots: { SPECIAL: 2 },
      slots: [
        { slotId: 'special-a', moduleCategory: 'SPECIAL', label: 'Special A' },
        { slotId: 'special-b', moduleCategory: 'SPECIAL', label: 'Special B' },
      ],
    });
    await expect(
      service.prepare(
        7,
        Object.assign({}, hull, { crewMax: 10 }) as never,
        [
          { slotId: 'special-a', commodityId: 2 },
          { slotId: 'special-a', commodityId: 2 },
        ],
        null,
      ),
    ).rejects.toThrow('Duplicate module selection');
  });

  it('enforces module research through the shared seam', async () => {
    unlocks.hasTech.mockResolvedValueOnce(false);
    await expect(
      service.prepare(7, hull, [{ slotId: 'special', commodityId: 2 }], null),
    ).rejects.toThrow('Research required');
  });

  it('enforces crew and special-module rules for every source adapter', async () => {
    await expect(
      service.prepare(
        7,
        hull,
        [
          { slotId: 'weapon', commodityId: 1 },
          { slotId: 'special', commodityId: 2 },
        ],
        null,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
