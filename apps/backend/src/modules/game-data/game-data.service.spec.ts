import { GameDataService } from './game-data.service';

const FUNCTIONS = {
  COLONY_CENTRAL: 1,
  ENERGY_PHALANX: 26,
  PARTICLE_PHALANX: 27,
  ANTI_PARTICLE: 28,
  AIRFIELD: 4,
  FIGHTER_SHIPYARD: 5,
  REPAIR_SHIPYARD: 22,
  WAREHOUSE: 23,
  TORPEDO_FAB: 9,
  MODULEFAB_TYPE1_LVL1: 10,
  MODULEFAB_TYPE2_LVL1: 13,
  MODULEFAB_TYPE3_LVL1: 16,
  ACADEMY: 20,
};

describe('GameDataService commodity semantics', () => {
  let service: GameDataService;

  beforeAll(() => {
    service = new GameDataService();
    service.onModuleInit();
  });

  it('distinguishes saveable, effect and deposit commodities', () => {
    expect(service.getCommodity(2)).toMatchObject({
      isSaveable: true,
      isEffect: false,
      isDeposit: false,
    });
    expect(service.getCommodity(1001)).toMatchObject({
      isSaveable: false,
      isEffect: true,
    });
    expect(service.getCommodity(1505)).toMatchObject({
      isDeposit: true,
    });
  });

  it('removes obsolete research lab capacity consumers from research centers', () => {
    for (const building of service.getAllBuildings()) {
      const producesResearchPoints = building.production.some(
        (entry) => entry.commodityId >= 1701 && entry.commodityId <= 1722,
      );
      if (!producesResearchPoints) continue;

      expect(building.production).not.toContainEqual(
        expect.objectContaining({
          commodityId: 1700,
          amount: expect.any(Number),
        }),
      );
    }
  });
});

describe('GameDataService colony class deposits', () => {
  let service: GameDataService;

  beforeAll(() => {
    service = new GameDataService();
    service.onModuleInit();
  });

  it('exposes colony-class deposit definitions and growth rate', () => {
    expect(service.getColonyClassDeposits(201)).toContainEqual(
      expect.objectContaining({
        commodityId: 1505,
        minAmount: 12,
        maxAmount: 12,
      }),
    );
    expect(service.getColonyClass(201)).toMatchObject({
      bevGrowthRate: 100,
    });
  });
});

describe('GameDataService terraforming', () => {
  let service: GameDataService;

  beforeAll(() => {
    service = new GameDataService();
    service.onModuleInit();
  });

  it('loads curated STU-like terraforming options', () => {
    expect(service.getTerraforming(111101)).toMatchObject({
      fromFieldType: 111,
      toFieldType: 101,
      energyCost: 25,
    });
    expect(
      service.getTerraformingForFieldType(111).map((option) => option.id),
    ).toContain(111101);
  });
});

describe('GameDataService building upgrades', () => {
  let service: GameDataService;

  beforeAll(() => {
    service = new GameDataService();
    service.onModuleInit();
  });

  it('loads curated STU-like building upgrades', () => {
    expect(service.getBuildingUpgradesForBuilding(11010100)).toContainEqual(
      expect.objectContaining({
        fromBuildingId: 11010100,
        toBuildingId: 11010103,
      }),
    );
    expect(service.getBuildingUpgrade(1101010003)).toMatchObject({
      energyCost: 32,
      costs: [{ commodityId: 2, amount: 30 }],
    });
  });
});

describe('GameDataService social effects', () => {
  let service: GameDataService;

  beforeAll(() => {
    service = new GameDataService();
    service.onModuleInit();
  });

  it('loads curated social effect mappings', () => {
    expect(service.getSocialEffects()).toMatchObject({
      lifeStandardCommodityId: 1300,
      fallback: {
        primaryEffectCommodityId: 1001,
        secondaryEffectCommodityId: 1601,
      },
    });
    expect(service.getCommodity(1300)).toBeDefined();
    expect(service.getCommodity(1001)).toBeDefined();
    expect(service.getCommodity(1601)).toBeDefined();
  });
});

describe('GameDataService torpedo types', () => {
  let service: GameDataService;

  beforeAll(() => {
    service = new GameDataService();
    service.onModuleInit();
  });

  it('loads representative STU-like torpedo types', () => {
    expect(service.getTorpedoType(81)).toMatchObject({
      commodityId: 81,
      name: 'Micro-Protonentorpedo',
      baseDamage: expect.any(Number),
      energyCost: expect.any(Number),
    });
    expect(service.getTorpedoTypeByCommodity(82)).toMatchObject({ id: 82 });
    expect(service.getAllTorpedoTypes().length).toBeGreaterThanOrEqual(3);
  });

  it('references existing commodities and fabrication outputs', () => {
    for (const torpedo of service.getAllTorpedoTypes()) {
      expect(service.getCommodity(torpedo.commodityId)).toBeDefined();
      expect(torpedo.baseDamage).toBeGreaterThan(0);
      expect(torpedo.hitFactor).toBeGreaterThan(0);
      expect(torpedo.productionAmount).toBeGreaterThan(0);
      expect(
        service
          .getAllFabricationItems()
          .some((item) => item.outputCommodityId === torpedo.commodityId),
      ).toBe(true);
    }
  });
});

describe('GameDataService fabrication items', () => {
  let service: GameDataService;

  beforeAll(() => {
    service = new GameDataService();
    service.onModuleInit();
  });

  it('loads representative module and torpedo fabrication items', () => {
    expect(service.getFabricationItem('torpedo.micro-proton')).toMatchObject({
      queueType: 'TORPEDO',
      outputCommodityId: 81,
      buildingFunctionIds: [FUNCTIONS.TORPEDO_FAB],
    });
    expect(
      service.getFabricationItem('module.weapon.turbolaser-k1'),
    ).toMatchObject({
      queueType: 'MODULE',
      outputCommodityId: 10701,
      moduleType: 'Leichter Turbolaser',
      moduleCategory: 'WEAPONS',
      moduleLevel: 1,
      buildingFunctionIds: [FUNCTIONS.MODULEFAB_TYPE1_LVL1],
    });
    expect(service.getAllFabricationItems().length).toBeGreaterThanOrEqual(7);
  });

  it('references existing output commodities, cost commodities and building functions', () => {
    for (const item of service.getAllFabricationItems()) {
      expect(service.getCommodity(item.outputCommodityId)).toBeDefined();
      expect(item.costs.length).toBeGreaterThan(0);
      for (const cost of item.costs) {
        expect(service.getCommodity(cost.commodityId)).toBeDefined();
        expect(cost.amount).toBeGreaterThan(0);
      }
      for (const functionId of item.buildingFunctionIds) {
        expect(service.getBuildingFunction(functionId)).toBeDefined();
      }
      if (item.queueType === 'MODULE') {
        expect(item.moduleType).toBeTruthy();
        expect(
          service
            .getAllModules()
            .some((module) => module.name === item.moduleType),
        ).toBe(true);
        expect(
          service.getFabricationItemByOutputCommodity(item.outputCommodityId),
        ).toEqual(item);
      }
    }
  });
});

describe('GameDataService hangar ship definitions', () => {
  let service: GameDataService;

  beforeAll(() => {
    service = new GameDataService();
    service.onModuleInit();
  });

  it('loads curated airfield hangar definitions', () => {
    expect(service.getHangarShipDef('REBEL_CORVETTE_GR75')).toMatchObject({
      hangarCommodityId: 21601,
      airfieldFunctionId: FUNCTIONS.AIRFIELD,
      startEnergyCost: expect.any(Number),
      buildCosts: expect.any(Array),
    });
    expect(service.getHangarShipDefByCommodity(21601)).toMatchObject({
      shipClassKey: 'REBEL_CORVETTE_GR75',
    });
    expect(service.getAllHangarShipDefs().length).toBeGreaterThanOrEqual(2);
  });

  it('references existing commodities and the airfield function', () => {
    for (const def of service.getAllHangarShipDefs()) {
      expect(service.getCommodity(def.hangarCommodityId)).toBeDefined();
      expect(service.getBuildingFunction(def.airfieldFunctionId)).toBeDefined();
      expect(def.airfieldFunctionId).toBe(FUNCTIONS.AIRFIELD);
      expect(def.startEnergyCost).toBeGreaterThanOrEqual(0);
      expect(def.buildEnergyCost).toBeGreaterThanOrEqual(0);
      for (const cost of def.buildCosts) {
        expect(service.getCommodity(cost.commodityId)).toBeDefined();
        expect(cost.amount).toBeGreaterThan(0);
      }
    }
  });
});

describe('GameDataService ship class slot rules', () => {
  let service: GameDataService;

  beforeAll(() => {
    service = new GameDataService();
    service.onModuleInit();
  });

  it('loads shipyard compatibility and module slot rules', () => {
    expect(service.getShipClassSlotRule('CORVETTE')).toMatchObject({
      category: 'CORVETTE',
      allowedBuildingFunctionIds: [5, 6, 22],
      moduleSlots: expect.objectContaining({ HULL: 1, WEAPONS: 2 }),
    });
    expect(service.getShipClassSlotRule('FRIGATE')).toMatchObject({
      allowedBuildingFunctionIds: [7, 22],
      moduleSlots: expect.objectContaining({ HULL: 2, WEAPONS: 4 }),
    });
    expect(service.getAllShipClassSlotRules().length).toBeGreaterThanOrEqual(6);
  });
});

describe('GameDataService building function mapping', () => {
  let service: GameDataService;

  beforeAll(() => {
    service = new GameDataService();
    service.onModuleInit();
  });

  it('maps headquarters to colony central', () => {
    expect(
      service.buildingHasFunction(82010100, FUNCTIONS.COLONY_CENTRAL),
    ).toBe(true);
    expect(service.getBuilding(82010100)?.functions).toContain(
      FUNCTIONS.COLONY_CENTRAL,
    );
  });

  it('maps airfields and shipyards by function instead of hardcoded building ids', () => {
    expect(service.buildingHasFunction(81110100, FUNCTIONS.AIRFIELD)).toBe(
      true,
    );
    expect(service.buildingHasFunction(81120100, FUNCTIONS.AIRFIELD)).toBe(
      true,
    );
    expect(service.buildingHasFunction(81130100, FUNCTIONS.AIRFIELD)).toBe(
      true,
    );
    expect(
      service.buildingHasFunction(85010100, FUNCTIONS.REPAIR_SHIPYARD),
    ).toBe(true);
    expect(service.getBuilding(81130100)).toMatchObject({
      name: 'Raumhafen',
      epsCost: 240,
      epsProc: -7,
      bevUse: 18,
      costs: { buildTime: 14400 },
      production: [{ commodityId: 1801, amount: 20 }],
      resourceCosts: [
        { commodityId: 2, amount: 71 },
        { commodityId: 4, amount: 96 },
        { commodityId: 21, amount: 62 },
      ],
    });
    expect(
      service.buildingHasFunction(85110100, FUNCTIONS.FIGHTER_SHIPYARD),
    ).toBe(true);
    expect(
      service
        .getBuildingsByFunction(FUNCTIONS.FIGHTER_SHIPYARD)
        .map((b) => b.id),
    ).toContain(85110100);
  });

  it('maps planetary defense functions', () => {
    expect(
      service.buildingHasFunction(100030100, FUNCTIONS.ENERGY_PHALANX),
    ).toBe(true);
    expect(
      service.buildingHasFunction(100040100, FUNCTIONS.PARTICLE_PHALANX),
    ).toBe(true);
    expect(
      service.buildingHasFunction(100050100, FUNCTIONS.ANTI_PARTICLE),
    ).toBe(true);
  });

  it('maps academy, warehouse and module fabrication buildings', () => {
    expect(service.buildingHasFunction(51010100, FUNCTIONS.ACADEMY)).toBe(true);
    expect(service.buildingHasFunction(81210100, FUNCTIONS.WAREHOUSE)).toBe(
      true,
    );
    expect(
      service.buildingHasFunction(81810100, FUNCTIONS.MODULEFAB_TYPE1_LVL1),
    ).toBe(true);
  });

  it('exposes building function definitions', () => {
    expect(service.getBuildingFunction(FUNCTIONS.ACADEMY)).toMatchObject({
      id: FUNCTIONS.ACADEMY,
      key: 'ACADEMY',
    });
    expect(service.getAllBuildingFunctions().length).toBeGreaterThanOrEqual(29);
  });
});
