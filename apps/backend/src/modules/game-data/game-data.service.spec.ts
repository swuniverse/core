import path from 'node:path';
import { GameDataService } from './game-data.service';

process.env.GAME_DATA_PATH = path.resolve(
  process.cwd(),
  process.cwd().endsWith('apps/backend') ? '../../game-data/data' : 'game-data/data',
);

const FUNCTIONS = {
  COLONY_CENTRAL: 1,
  ENERGY_PHALANX: 26,
  PARTICLE_PHALANX: 27,
  ANTI_PARTICLE: 28,
  AIRFIELD: 4,
  FIGHTER_SHIPYARD: 5,
  REPAIR_STATION: 22,
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

  it('loads all torpedo specialization paths', () => {
    expect(
      service
        .getAllTorpedoTypes()
        .map((torpedo) => [torpedo.id, torpedo.damageType]),
    ).toEqual([
      [81, 'PROTON'],
      [82, 'PROTON'],
      [83, 'PROTON'],
      [84, 'QUANTUM'],
      [85, 'HEAVY_QUANTUM'],
      [86, 'PLASMA'],
      [87, 'HEAVY_PLASMA'],
    ]);
    expect(service.getTorpedoTypeByCommodity(86)).toMatchObject({
      id: 86,
      name: 'Plasmatorpedo',
      damageType: 'PLASMA',
      shieldDamageFactor: 140,
    });
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

  it('loads the reduced three-tier shield catalog', () => {
    const shieldItems = service
      .getAllFabricationItems()
      .filter(
        (item) =>
          item.queueType === 'MODULE' && item.shipyardType === 'SHIELDS',
      );

    expect(
      shieldItems.map((item) => item.outputCommodityId).sort((a, b) => a - b),
    ).toEqual([
      10201, 10202, 10203, 10204, 10205, 10206, 10211, 10212, 10213, 10214,
      10215, 10216, 10221, 10222, 10223, 10224, 10225, 10226,
    ]);
    expect(
      [...new Set(shieldItems.map((item) => item.moduleType))].sort(),
    ).toEqual([
      'Militär-Deflektorschild',
      'Standard-Deflektorschild',
      'Verstärkter Deflektorschild',
    ]);
    expect(
      shieldItems.some((item) => /Polarschild/.test(item.displayName)),
    ).toBe(false);
    expect(
      shieldItems.every((item) =>
        /^(Standard-Deflektorschild|Verstärkter Deflektorschild|Militär-Deflektorschild) \(Klasse [1-6]\)$/.test(
          item.displayName,
        ),
      ),
    ).toBe(true);
    expect(service.getFabricationItemByOutputCommodity(10221)?.moduleType).toBe(
      'Militär-Deflektorschild',
    );
    expect(service.getFabricationItemByOutputCommodity(10211)?.moduleType).toBe(
      'Verstärkter Deflektorschild',
    );
  });

  it('loads the six-family hull armor catalog', () => {
    const hullItems = service
      .getAllFabricationItems()
      .filter(
        (item) => item.queueType === 'MODULE' && item.shipyardType === 'HULL',
      );

    expect(
      hullItems.map((item) => item.outputCommodityId).sort((a, b) => a - b),
    ).toEqual([
      10101, 10102, 10103, 10104, 10105, 10106, 10111, 10112, 10113, 10114,
      10115, 10116, 10121, 10122, 10123, 10124, 10125, 10126, 11101, 11102,
      11103, 11104, 11105, 11106, 11111, 11112, 11113, 11114, 11115, 11116,
      11121, 11122, 11123, 11124, 11125, 11126,
    ]);
    expect(
      [...new Set(hullItems.map((item) => item.moduleType))].sort(),
    ).toEqual([
      'Ablative Beskar-Panzerung',
      'Ablative Durastahl-Panzerung',
      'Ablative Matrix-Panzerung',
      'Beskar-Panzerung',
      'Durastahl-Panzerung',
      'Matrix-Panzerung',
    ]);
    expect(
      service
        .getAllModules()
        .find((module) => module.name === 'Ablative Durastahl-Panzerung')
        ?.secret.projectileResistances,
    ).toMatchObject({ QUANTUM: 30, HEAVY_QUANTUM: 25 });
  });

  it('maps heavy energy weapons and torpedo launchers to runtime module types', () => {
    for (const commodityId of [
      11701, 11702, 11703, 11704, 11705, 11706, 11731, 11732, 11733, 11734,
      11735, 11736,
    ]) {
      expect(
        service.getFabricationItemByOutputCommodity(commodityId)?.moduleType,
      ).toBe('Schwerer Turbolaser');
    }
    for (const commodityId of [10801, 10802, 10803, 10804, 10805, 10806]) {
      const item = service.getFabricationItemByOutputCommodity(commodityId);
      expect(item?.moduleType).toBe('Protonentorpedo-Werfer');
      expect(item).toMatchObject({
        shipyardType: 'TORPEDO_BANK',
        shipyardGroup: 'OFFENSE_SYSTEMS',
      });
    }
    for (const commodityId of [10831, 10832, 10833, 10834, 10835, 10836]) {
      const item = service.getFabricationItemByOutputCommodity(commodityId);
      expect(item?.moduleType).toBe('Imperiale Torpedorampe');
      expect(item).toMatchObject({
        shipyardType: 'TORPEDO_BANK',
        shipyardGroup: 'OFFENSE_SYSTEMS',
      });
    }
    for (const commodityId of [11801, 11802, 11803, 11804, 11805, 11806]) {
      const item = service.getFabricationItemByOutputCommodity(commodityId);
      expect(item?.moduleType).toBe('Mehrfach-Torpedorampe');
      expect(item).toMatchObject({
        shipyardType: 'TORPEDO_BANK',
        shipyardGroup: 'OFFENSE_SYSTEMS',
      });
    }
    for (const commodityId of [
      10701, 10702, 10703, 10704, 10705, 10706, 10731, 10732, 10733, 10734,
      10735, 10736, 11701, 11702, 11703, 11704, 11705, 11706, 11731, 11732,
      11733, 11734, 11735, 11736,
    ]) {
      expect(
        service.getFabricationItemByOutputCommodity(commodityId)?.shipyardType,
      ).toBe('ENERGY_WEAPON');
    }
    expect(
      service
        .getAllModules()
        .find((module) => module.name === 'Mehrfach-Torpedorampe')?.secret
        .projectileDamageMultiplier,
    ).toBe(1.5);
  });

  it('loads faction weapon family names from their output commodities', () => {
    const families = [
      {
        faction: 'REBEL_ALLIANCE',
        commodityIds: [10701, 10702, 10703, 10704, 10705, 10706],
        name: 'Blasterkanone',
      },
      {
        faction: 'REBEL_ALLIANCE',
        commodityIds: [11701, 11702, 11703, 11704, 11705, 11706],
        name: 'Schwere Blasterkanone',
      },
      {
        faction: 'GALACTIC_EMPIRE',
        commodityIds: [10731, 10732, 10733, 10734, 10735, 10736],
        name: 'Turbolaser',
      },
      {
        faction: 'GALACTIC_EMPIRE',
        commodityIds: [11731, 11732, 11733, 11734, 11735, 11736],
        name: 'Schwerer Turbolaser',
      },
    ];

    for (const { faction, commodityIds, name } of families) {
      for (const commodityId of commodityIds) {
        const item = service.getFabricationItemByOutputCommodity(commodityId);
        expect(item).toMatchObject({
          faction,
          displayName: `${name} (Klasse ${commodityId % 10})`,
        });
        expect(item?.displayName).toBe(service.getCommodity(commodityId)?.name);
      }
    }
  });

  it('gates special module fabrication by research and compatible hulls', () => {
    const specialModules = [
      ['module.special.crewtransport-modul', 60500],
      ['module.special.astrometrie-labor', 60600],
      ['module.special.hyperraumfeldscanner', 60700],
      ['module.special.matrixsensoren', 60800],
      ['module.special.torpedotransportmodul', 60900],
      ['module.special.shuttlerampe', 61000],
    ] as const;

    for (const [itemKey, researchId] of specialModules) {
      expect(service.getFabricationItem(itemKey)).toMatchObject({
        queueType: 'MODULE',
        shipyardType: 'SPECIAL',
        researchId,
      });
    }

    expect(
      service.isShipyardModuleAllowedForShipClass(
        service.getFabricationItem('module.special.astrometrie-labor')!,
        { key: 'REBEL_FRIGATE_CONSULAR', category: 'FRIGATE' },
      ),
    ).toBe(true);
    expect(
      service.isShipyardModuleAllowedForShipClass(
        service.getFabricationItem('module.special.matrixsensoren')!,
        { key: 'REBEL_SCOUT_HWK_290', category: 'ESCORT' },
      ),
    ).toBe(true);
  });

  it('keeps fabrication catalog references, names and classifications consistent', () => {
    for (const item of service.getAllFabricationItems()) {
      const outputCommodity = service.getCommodity(item.outputCommodityId);

      expect(outputCommodity).toBeDefined();
      expect(item.displayName).toBe(outputCommodity?.name);
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
        expect(item.shipyardType).toBeDefined();
        expect(item.shipyardGroup).toBeDefined();
        expect(
          service
            .getAllModules()
            .some((module) => module.name === item.moduleType),
        ).toBe(true);
        expect(
          service.getFabricationItemByOutputCommodity(item.outputCommodityId),
        ).toEqual(item);
      }
      if (item.queueType === 'TORPEDO') {
        expect(item.displayName).toBe(
          service.getTorpedoTypeByCommodity(item.outputCommodityId)?.name,
        );
      }
    }

    const lightProton = service.getFabricationItem('torpedo.light-proton');
    expect(lightProton).toMatchObject({
      itemKey: 'torpedo.light-proton',
      displayName: 'Leichter Protonentorpedo',
    });
    expect(lightProton?.buildingFunctionIds).toEqual([FUNCTIONS.TORPEDO_FAB]);
  });
});

describe('GameDataService hangar ship definitions', () => {
  let service: GameDataService;

  beforeAll(() => {
    service = new GameDataService();
    service.onModuleInit();
  });

  it('loads current airfield hangar definitions', () => {
    expect(service.getHangarShipDef('REBEL_SHUTTLE_LAAT')).toMatchObject({
      hangarCommodityId: 21401,
      airfieldFunctionId: FUNCTIONS.AIRFIELD,
      startEnergyCost: 90,
      buildEnergyCost: 90,
      defaultModuleCommodityIds: [10101, 10201, 10301, 10401, 10501, 10601, 10701, 10801],
    });
    expect(service.getHangarShipDefByCommodity(21401)).toMatchObject({
      shipClassKey: 'REBEL_SHUTTLE_LAAT',
    });
    expect(service.getAllHangarShipDefs()).toHaveLength(13);

    expect(service.getHangarShipDef('REBEL_FIGHTER_X_WING')).toMatchObject({
      hangarCommodityId: 21201,
      defaultModuleCommodityIds: [10101, 10201, 10301, 10401, 10501, 10601, 11701, 10801],
    });
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

  it('uses the hangar display name for every hull commodity', () => {
    for (const def of service.getAllHangarShipDefs()) {
      expect(service.getCommodity(def.hangarCommodityId)?.name).toBe(
        def.displayName,
      );
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
      allowedBuildingFunctionIds: [6],
      moduleSlots: expect.objectContaining({
        HULL: 1,
        ENERGY_WEAPON: 1,
        TORPEDO_BANK: 1,
      }),
    });
    expect(service.getShipClassSlotRule('FRIGATE')).toMatchObject({
      allowedBuildingFunctionIds: [7],
      moduleSlots: expect.objectContaining({
        HULL: 1,
        ENERGY_WEAPON: 1,
        TORPEDO_BANK: 1,
      }),
    });
    expect(service.getAllShipClassSlotRules().length).toBeGreaterThanOrEqual(6);
  });

  it('uses documented shipyard overrides for Rebel freight hulls', () => {
    expect(service.getShipClassDefByKey('REBEL_FREIGHTER_YT')).toMatchObject({
      allowedBuildingFunctionIds: [4, 5],
    });
    expect(service.getShipClassDefByKey('REBEL_FREIGHTER_GR75')).toMatchObject({
      allowedBuildingFunctionIds: [6, 7],
    });
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
      service.buildingHasFunction(85010100, FUNCTIONS.REPAIR_STATION),
    ).toBe(false);
    expect(
      service.buildingHasFunction(85190100, FUNCTIONS.REPAIR_STATION),
    ).toBe(true);
    expect(service.getBuildingFunction(FUNCTIONS.REPAIR_STATION)).toMatchObject(
      {
        key: 'REPAIR_STATION',
        name: 'Reparaturstation',
      },
    );
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
