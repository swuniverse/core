jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('./entities/colony-field.entity', () => ({
  ColonyField: class ColonyField {},
}));
jest.mock('./entities/colony-storage.entity', () => ({
  ColonyStorage: class ColonyStorage {},
}));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  AlertState: { GREEN: 'GREEN' },
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: { DOCKED: 'DOCKED', IN_FLIGHT: 'IN_FLIGHT' },
}));
jest.mock('../spacecraft/entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));
jest.mock('../spacecraft/spacecraft.service', () => ({
  SpacecraftService: class SpacecraftService {},
}));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../research/entities/research.entity', () => ({
  Research: class Research {},
  ResearchStatus: {
    AVAILABLE: 'AVAILABLE',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    LOCKED: 'LOCKED',
  },
}));

import { ColonyService } from './colony.service';
import { ColonyStatsService } from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import { BuildingLifecycleService } from './building-lifecycle.service';
import { TickService } from '../tick/tick.service';
import {
  GameTickStatus,
  GameTickType,
} from '../tick/entities/game-tick-state.entity';
import { ResearchService } from '../research/research.service';
import { ResearchStatus } from '../research/entities/research.entity';
import { WsEventType } from '@swuniverse/shared';

function createColonyService(overrides: Partial<Record<string, unknown>> = {}) {
  const colonyRepo = {
    save: jest.fn(async (value) => value),
    find: jest.fn(async () => []),
    findOne: jest.fn(),
  };
  const fieldRepo = { save: jest.fn(async (value) => value) };
  const statsRepo = { save: jest.fn(async (value) => value) };
  const shipRepo = {
    find: jest.fn(async () => []),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    remove: jest.fn(async (value) => value),
  };
  const cargoRepo = {
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    save: jest.fn(async (value) => value),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(async () => ({ total: 0 })),
    })),
  };
  const shipClassRepo = { findOneBy: jest.fn(), findOne: jest.fn() };
  const shipBuildQueueRepo = {
    create: jest.fn((value) => value),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const shipBuildplanRepo = {
    create: jest.fn((value) => value),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    findOne: jest.fn(),
    save: jest.fn(async (value) => ({ id: 1, ...value })),
  };
  const spacecraftModuleRepo = {
    create: jest.fn((value) => value),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    save: jest.fn(async (value) => value),
    remove: jest.fn(async (value) => value),
  };
  const fabricationQueueRepo = {
    create: jest.fn((value) => value),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const crewTrainingQueueRepo = {
    create: jest.fn((value) => value),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    save: jest.fn(async (value) => value),
  };
  const depositMiningRepo = {
    find: jest.fn(async () => []),
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const storageRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
    create: jest.fn((value) => value),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(async () => ({ total: 0 })),
    })),
  };
  const gameData = {
    getBuilding: jest.fn((id: number) => {
      const buildings: Record<number, any> = {
        82010100: {
          id: 82010100,
          name: 'HQ',
          epsProc: 16,
          researchPoints: 2,
          bevUse: 0,
          bevPro: 84,
          lager: 1000,
          bonuses: { population: 84, storage: 1000 },
          allowedFieldTypes: [],
          isUnique: false,
          costs: { buildTime: 60 },
          resourceCosts: [],
          production: [
            { commodityId: 2, amount: 5 },
            { commodityId: 1300, amount: 84 },
          ],
        },
        100: {
          id: 100,
          name: 'Mine',
          epsProc: 0,
          epsCost: 10,
          integrity: 1000,
          researchPoints: 0,
          bevUse: 0,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [101],
          isUnique: false,
          costs: { buildTime: 60 },
          resourceCosts: [{ commodityId: 2, amount: 5 }],
          production: [{ commodityId: 2, amount: 10 }],
        },
        101: {
          id: 101,
          name: 'Improved Mine',
          epsProc: 0,
          epsCost: 10,
          integrity: 1200,
          researchPoints: 0,
          bevUse: 0,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [101],
          isUnique: false,
          costs: { buildTime: 120 },
          resourceCosts: [{ commodityId: 2, amount: 10 }],
          production: [{ commodityId: 2, amount: 20 }],
        },
        200: {
          id: 200,
          name: 'EPS Consumer',
          epsProc: -20,
          researchPoints: 0,
          bevUse: 0,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [101],
          isUnique: false,
          costs: { buildTime: 60 },
          resourceCosts: [],
          production: [{ commodityId: 2, amount: 10 }],
        },
        300: {
          id: 300,
          name: 'Limited Building',
          epsProc: 0,
          researchPoints: 0,
          bevUse: 0,
          bevPro: 0,
          lager: 0,
          colonyLimit: 1,
          globalLimit: 2,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [101],
          isUnique: false,
          costs: { buildTime: 60 },
          resourceCosts: [],
          production: [],
        },
        700: {
          id: 700,
          name: 'Orbit Test Building',
          epsProc: 0,
          researchPoints: 0,
          bevUse: 0,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [900],
          isUnique: false,
          costs: { buildTime: 60 },
          resourceCosts: [],
          production: [],
        },
        600: {
          id: 600,
          name: 'Orbital Consumer',
          epsProc: 0,
          researchPoints: 0,
          bevUse: 0,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [900],
          isUnique: false,
          costs: { buildTime: 60 },
          resourceCosts: [],
          production: [{ commodityId: 1801, amount: -1 }],
        },
        500: {
          id: 500,
          name: 'Deposit Drill',
          epsProc: 0,
          researchPoints: 0,
          bevUse: 0,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [101],
          isUnique: false,
          costs: { buildTime: 60 },
          resourceCosts: [],
          production: [{ commodityId: 1505, amount: -3 }],
        },
        400: {
          id: 400,
          name: 'Worker Building',
          epsProc: 0,
          researchPoints: 0,
          bevUse: 4,
          bevPro: 12,
          lager: 0,
          bonuses: { population: 12, storage: 0 },
          allowedFieldTypes: [101],
          isUnique: false,
          costs: { buildTime: 60 },
          resourceCosts: [],
          production: [],
        },
      };
      return buildings[id];
    }),
    getBuildingFunctions: jest.fn((buildingId: number) =>
      buildingId === 85010100
        ? [22]
        : buildingId === 85210100
          ? [6]
          : buildingId === 85310100
            ? [7]
            : buildingId === 81810100
              ? [10]
              : buildingId === 81910100
                ? [13]
                : buildingId === 82010101
                  ? [16]
                  : buildingId === 81710100
                    ? [9]
                    : buildingId === 51010100
                      ? [20]
                      : [],
    ),
    getBuildingFunction: jest.fn((id: number) => ({
      id,
      name: `Function ${id}`,
    })),
    buildingHasFunction: jest.fn(
      (buildingId: number, functionId: number) =>
        (buildingId === 81810100 && functionId === 10) ||
        (buildingId === 81910100 && functionId === 13) ||
        (buildingId === 82010101 && functionId === 16) ||
        (buildingId === 81710100 && functionId === 9) ||
        (buildingId === 51010100 && functionId === 20) ||
        (buildingId === 81130100 && functionId === 4) ||
        (buildingId === 85010100 && functionId === 22) ||
        (buildingId === 85210100 && functionId === 6) ||
        (buildingId === 100010100 && functionId === 24) ||
        (buildingId === 100020100 && functionId === 25),
    ),
    getFieldBuildRule: jest.fn(() => null),
    getTerraforming: jest.fn((id: number) =>
      id === 101201
        ? {
            id: 101201,
            fromFieldType: 101,
            toFieldType: 201,
            energyCost: 5,
            duration: 60,
            researchId: null,
            costs: [{ commodityId: 2, amount: 4 }],
          }
        : undefined,
    ),
    getBuildingUpgrade: jest.fn((id: number) =>
      id === 100101
        ? {
            id: 100101,
            fromBuildingId: 100,
            toBuildingId: 101,
            researchId: null,
            description: 'Improve mine',
            energyCost: 5,
            costs: [{ commodityId: 2, amount: 4 }],
          }
        : undefined,
    ),
    getColonyClass: jest.fn(() => ({
      classId: 201,
      bevGrowthRate: 100,
      baseProduction: [{ commodityId: 1505, amount: 12 }],
    })),
    getAllModules: jest.fn(() => [
      { name: 'Laser Cannon', category: 'WEAPONS' },
      { name: 'Shield Generator', category: 'SHIELDS' },
    ]),
    getFabricationItem: jest.fn((itemKey: string) => {
      const items: Record<string, any> = {
        'module.weapon.turbolaser-k1': {
          itemKey: 'module.weapon.turbolaser-k1',
          queueType: 'MODULE',
          displayName: 'Turbolaser (Klasse 1)',
          outputCommodityId: 10701,
          outputAmount: 1,
          moduleType: 'Laser Cannon',
          moduleCategory: 'WEAPONS',
          moduleLevel: 1,
          buildingFunctionIds: [10],
          durationSeconds: 60,
          costs: [{ commodityId: 2, amount: 10 }],
        },
        'module.shield.particle-k1': {
          itemKey: 'module.shield.particle-k1',
          queueType: 'MODULE',
          displayName: 'Partikelschild (Klasse 1)',
          outputCommodityId: 10201,
          outputAmount: 1,
          moduleType: 'Shield Generator',
          moduleCategory: 'SHIELDS',
          moduleLevel: 1,
          buildingFunctionIds: [13],
          durationSeconds: 60,
          costs: [{ commodityId: 2, amount: 8 }],
        },
        'torpedo.micro-proton': {
          itemKey: 'torpedo.micro-proton',
          queueType: 'TORPEDO',
          displayName: 'Micro-Protonentorpedo',
          outputCommodityId: 81,
          outputAmount: 1,
          buildingFunctionIds: [9],
          durationSeconds: 30,
          costs: [{ commodityId: 2, amount: 4 }],
        },
      };
      return items[itemKey];
    }),
    getFabricationItemByOutputCommodity: jest.fn((commodityId: number) => {
      const byOutput = {
        10701: {
          itemKey: 'module.weapon.turbolaser-k1',
          queueType: 'MODULE',
          displayName: 'Turbolaser (Klasse 1)',
          outputCommodityId: 10701,
          outputAmount: 1,
          moduleType: 'Laser Cannon',
          moduleCategory: 'WEAPONS',
          moduleLevel: 1,
          buildingFunctionIds: [10],
          durationSeconds: 60,
          costs: [{ commodityId: 2, amount: 10 }],
        },
        10201: {
          itemKey: 'module.shield.particle-k1',
          queueType: 'MODULE',
          displayName: 'Partikelschild (Klasse 1)',
          outputCommodityId: 10201,
          outputAmount: 1,
          moduleType: 'Shield Generator',
          moduleCategory: 'SHIELDS',
          moduleLevel: 1,
          buildingFunctionIds: [13],
          durationSeconds: 60,
          costs: [{ commodityId: 2, amount: 10 }],
        },
      } as Record<number, any>;
      return byOutput[commodityId];
    }),
    getShipClassSlotRule: jest.fn((category: string) => {
      const rules: Record<string, any> = {
        CORVETTE: {
          category: 'CORVETTE',
          allowedBuildingFunctionIds: [5, 6, 22],
          moduleSlots: { WEAPONS: 2, SHIELDS: 1 },
        },
        FRIGATE: {
          category: 'FRIGATE',
          allowedBuildingFunctionIds: [7, 22],
          moduleSlots: { WEAPONS: 4, SHIELDS: 2 },
        },
      };
      return rules[category];
    }),
    getAllHangarShipDefs: jest.fn(() => [
      {
        shipClassKey: 'REBEL_STARTER_CORVETTE',
        hangarCommodityId: 21601,
        displayName: 'Rebel Starter Corvette Hangar Rump',
        airfieldFunctionId: 4,
        startEnergyCost: 25,
        buildEnergyCost: 35,
        buildCosts: [
          { commodityId: 2, amount: 20 },
          { commodityId: 4, amount: 10 },
        ],
        defaultModuleCommodityIds: [],
        defaultTorpedoCommodityId: null,
        defaultTorpedoAmount: 0,
      },
    ]),
    getHangarShipDef: jest.fn((shipClassKey: string) =>
      shipClassKey === 'REBEL_STARTER_CORVETTE'
        ? {
            shipClassKey: 'REBEL_STARTER_CORVETTE',
            hangarCommodityId: 21601,
            displayName: 'Rebel Starter Corvette Hangar Rump',
            airfieldFunctionId: 4,
            startEnergyCost: 25,
            buildEnergyCost: 35,
            buildCosts: [
              { commodityId: 2, amount: 20 },
              { commodityId: 4, amount: 10 },
            ],
            defaultModuleCommodityIds: [],
            defaultTorpedoCommodityId: null,
            defaultTorpedoAmount: 0,
          }
        : undefined,
    ),
    getHangarShipDefByCommodity: jest.fn((commodityId: number) =>
      commodityId === 21601
        ? {
            shipClassKey: 'REBEL_STARTER_CORVETTE',
            hangarCommodityId: 21601,
            displayName: 'Rebel Starter Corvette Hangar Rump',
            airfieldFunctionId: 4,
            startEnergyCost: 25,
            buildEnergyCost: 35,
            buildCosts: [
              { commodityId: 2, amount: 20 },
              { commodityId: 4, amount: 10 },
            ],
            defaultModuleCommodityIds: [],
            defaultTorpedoCommodityId: null,
            defaultTorpedoAmount: 0,
          }
        : undefined,
    ),
    getAllShipClassSlotRules: jest.fn(() => [
      {
        category: 'CORVETTE',
        allowedBuildingFunctionIds: [5, 6, 22],
        moduleSlots: { WEAPONS: 2, SHIELDS: 1 },
      },
      {
        category: 'FRIGATE',
        allowedBuildingFunctionIds: [7, 22],
        moduleSlots: { WEAPONS: 4, SHIELDS: 2 },
      },
    ]),
    getAllFabricationItems: jest.fn(() => [
      {
        itemKey: 'module.weapon.turbolaser-k1',
        queueType: 'MODULE',
        displayName: 'Turbolaser (Klasse 1)',
        outputCommodityId: 10701,
        outputAmount: 1,
        moduleType: 'Laser Cannon',
        moduleCategory: 'WEAPONS',
        moduleLevel: 1,
        buildingFunctionIds: [10],
        durationSeconds: 60,
        costs: [{ commodityId: 2, amount: 10 }],
      },
      {
        itemKey: 'torpedo.micro-proton',
        queueType: 'TORPEDO',
        displayName: 'Micro-Protonentorpedo',
        outputCommodityId: 81,
        outputAmount: 1,
        buildingFunctionIds: [9],
        durationSeconds: 30,
        costs: [{ commodityId: 2, amount: 4 }],
      },
    ]),
    getCommodity: jest.fn((id: number) => ({
      id,
      name: String(id),
      isTradeOnly: id >= 1000,
      isEffect: id >= 1000,
      isSaveable: id < 1000,
      isDeposit: id === 1505,
    })),
  };

  const statsService = new ColonyStatsService(gameData as any);
  const colonyStorageService = new ColonyStorageService(storageRepo as any);
  const buildingLifecycleService = new BuildingLifecycleService(
    fieldRepo as any,
    statsRepo as any,
  );
  const spacecraftStatsService = {
    applyStats: jest.fn((ship) => ship),
  };
  const colonyCrewService = {
    getRemainingCount: jest.fn(async () => 999),
    getTrainableCount: jest.fn(async () => 999),
    getInTrainingCount: jest.fn(async () => 0),
    getFreeAssignmentCount: jest.fn(async () => 999),
    getAvailableColonyCrew: jest.fn(async () => [
      { crewId: 1 },
      { crewId: 2 },
      { crewId: 3 },
      { crewId: 4 },
      { crewId: 5 },
    ]),
    reserveCrewForShipBuild: jest.fn(async (_colony, amount: number) =>
      Array.from({ length: amount }, (_value, index) => index + 1),
    ),
    assignCrewToShip: jest.fn(async () => undefined),
    returnCrewToColony: jest.fn(async () => undefined),
    transferCrewFromShipToColony: jest.fn(async () => undefined),
    removeExcessColonyCrew: jest.fn(async () => 0),
    createCrewOnColony: jest.fn(async () => []),
    getAssignedToColonyCount: jest.fn(async () => 0),
    getLocalCrewLimit: jest.fn(() => 10),
    getGlobalCrewLimit: jest.fn(async () => 100),
  };
  const unlockResolver = {
    isBuildingUnlocked: jest.fn(async () => true),
    hasTech: jest.fn(async () => true),
    hasTechByName: jest.fn(async () => true),
    isShipClassUnlocked: jest.fn(async () => true),
  };
  const service = new ColonyService(
    colonyRepo as any,
    fieldRepo as any,
    storageRepo as any,
    depositMiningRepo as any,
    statsRepo as any,
    shipRepo as any,
    cargoRepo as any,
    {} as any,
    shipBuildQueueRepo as any,
    shipBuildplanRepo as any,
    spacecraftModuleRepo as any,
    fabricationQueueRepo as any,
    crewTrainingQueueRepo as any,
    shipClassRepo as any,
    gameData as any,
    unlockResolver as any,
    statsService,
    colonyStorageService,
    buildingLifecycleService,
    spacecraftStatsService as any,
    colonyCrewService as any,
  );

  return Object.assign(
    {
      service,
      colonyRepo,
      fieldRepo,
      storageRepo,
      statsRepo,
      shipRepo,
      cargoRepo,
      shipClassRepo,
      shipBuildQueueRepo,
      shipBuildplanRepo,
      spacecraftModuleRepo,
      fabricationQueueRepo,
      crewTrainingQueueRepo,
      depositMiningRepo,
      gameData,
      unlockResolver,
      statsService,
      colonyStorageService,
      buildingLifecycleService,
      spacecraftStatsService,
      colonyCrewService,
    },
    overrides,
  );
}

describe('colony tick calculations', () => {
  it('uses one summary for active building and colony-class production', () => {
    const { statsService } = createColonyService();
    const colony = {
      id: 1,
      colonyClassId: 201,
      populationMax: 100,
      storageMax: 3000,
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
      ],
    };

    const summary = statsService.calculateSummary(colony as any);

    expect(summary.energyDelta).toBe(16);
    expect(summary.productionDelta.get(2)).toBe(5);
    expect(summary.productionDelta.get(1300)).toBe(84);
    expect(summary.depositDelta.get(1505)).toBe(12);
    expect(summary.researchPoints).toBe(3);
    expect(summary.effectivePopulationMax).toBe(184);
    expect(summary.effectiveStorageMax).toBe(4000);
  });

  it('matches STU screenshot-style housing and immigration numbers', () => {
    const { service, statsService } = createColonyService();
    const colony = {
      id: 1,
      colonyClassId: 201,
      population: 84,
      populationMax: 0,
      storageMax: 3000,
      stats: {
        workers: 24,
        workless: 60,
        maxPopulation: 168,
        populationLimit: 0,
        immigrationEnabled: true,
      },
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
      ],
    };

    const summary = statsService.calculateSummary(colony as any);

    expect(colony.stats.workers + colony.stats.workless).toBe(84);
    expect(summary.maxHousing).toBe(168);
    expect(summary.freeHousing).toBe(84);
    expect((service as any).calculatePopulationGrowth(colony, summary)).toBe(
      57,
    );
  });

  it('does not double-count active housing when persisted stats exist', () => {
    const { statsService } = createColonyService();
    const colony = {
      id: 1,
      colonyClassId: 201,
      population: 84,
      populationMax: 0,
      storageMax: 3000,
      stats: { maxPopulation: 168 },
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
      ],
    };

    const summary = statsService.calculateSummary(colony as any);

    expect(summary.housingBonus).toBe(84);
    expect(summary.effectivePopulationMax).toBe(168);
    expect(summary.freeHousing).toBe(84);
  });

  it('returns no immigration without free housing, enabled immigration, or population-limit capacity', () => {
    const { service, statsService } = createColonyService();
    const colony = {
      id: 1,
      colonyClassId: 201,
      population: 168,
      populationMax: 0,
      storageMax: 3000,
      stats: {
        workers: 24,
        workless: 144,
        maxPopulation: 168,
        populationLimit: 0,
        immigrationEnabled: true,
      },
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
      ],
    };

    expect(
      (service as any).calculatePopulationGrowth(
        colony,
        statsService.calculateSummary(colony as any),
      ),
    ).toBe(0);

    colony.population = 84;
    colony.stats.workless = 60;
    colony.stats.immigrationEnabled = false;
    expect(
      (service as any).calculatePopulationGrowth(
        colony,
        statsService.calculateSummary(colony as any),
      ),
    ).toBe(0);

    colony.stats.immigrationEnabled = true;
    colony.stats.populationLimit = 100;
    expect(
      (service as any).calculatePopulationGrowth(
        colony,
        statsService.calculateSummary(colony as any),
      ),
    ).toBe(16);
  });

  it('keeps colony population and workless stats synchronized during immigration', async () => {
    const { service, statsRepo, colonyRepo } = createColonyService();
    const colony = {
      id: 1,
      colonyClassId: 201,
      population: 84,
      populationMax: 0,
      storageMax: 3000,
      stats: {
        workers: 24,
        workless: 60,
        maxPopulation: 168,
        populationLimit: 0,
        immigrationEnabled: true,
      },
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
      ],
    };

    await (service as any).growPopulation(colony);

    expect(colony.population).toBe(141);
    expect(colony.stats.workless).toBe(117);
    expect(statsRepo.save).toHaveBeenCalledWith(colony.stats);
    expect(colonyRepo.save).toHaveBeenCalledWith(colony);
  });

  it('keeps a typical STU HQ + mine fixture consistent', () => {
    const { statsService } = createColonyService();
    const colony = {
      id: 1,
      colonyClassId: 201,
      populationMax: 100,
      storageMax: 3000,
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
        { id: 2, buildingId: 100, isBuilding: false, isActive: true },
      ],
    };

    const summary = statsService.calculateSummary(colony as any);

    expect({
      energyDelta: summary.energyDelta,
      dooniumDelta: summary.productionDelta.get(2),
      baseDepositDelta: summary.depositDelta.get(1505),
      researchPoints: summary.researchPoints,
      effectiveStorageMax: summary.effectiveStorageMax,
    }).toMatchInlineSnapshot(`
{
  "baseDepositDelta": 12,
  "dooniumDelta": 15,
  "effectiveStorageMax": 4000,
  "energyDelta": 16,
  "researchPoints": 3,
}
`);
  });

  it('caps positive storage production at effective storage max', async () => {
    const { service, storageRepo } = createColonyService();
    const storage = { id: 1, colonyId: 1, commodityId: 2, amount: 95 };
    storageRepo.findOne.mockResolvedValue(storage);
    storageRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(async () => ({ total: 95 })),
    });
    const colony = {
      id: 1,
      colonyClassId: 999,
      energy: 0,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      storageUsed: 95,
      fields: [{ id: 1, buildingId: 100, isBuilding: false, isActive: true }],
    };

    await (service as any).balanceAndProduce(colony);

    expect(storage.amount).toBe(100);
    expect(colony.storageUsed).toBe(100);
  });

  it('rejects terraforming occupied fields and invalid options', async () => {
    const { service, colonyRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 50,
      fields: [
        {
          id: 1,
          fieldIndex: 5,
          fieldType: 101,
          buildingId: 100,
          isBuilding: false,
        },
      ],
      storage: [],
    });

    await expect(service.terraformField(1, 1, 5, 101201)).rejects.toThrow(
      'field with a building',
    );

    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 50,
      fields: [
        {
          id: 1,
          fieldIndex: 5,
          fieldType: 101,
          buildingId: null,
          isBuilding: false,
        },
      ],
      storage: [],
    });

    await expect(service.terraformField(1, 1, 5, 999)).rejects.toThrow(
      'Invalid terraforming option',
    );
  });

  it('starts and completes terraforming for a valid empty field', async () => {
    const { service, colonyRepo, storageRepo, fieldRepo } =
      createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      terrainTileId: 101,
      buildingId: null,
      isBuilding: false,
      isActive: true,
      terraformingId: null as number | null,
      terraformingFinishesAt: null as Date | null,
    };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 50,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      fields: [field],
      storage: [],
    };
    const storage = { colonyId: 1, commodityId: 2, amount: 10 };
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);

    await service.terraformField(1, 1, 5, 101201);

    expect(storage.amount).toBe(6);
    expect(colony.energy).toBe(45);
    expect(field.terraformingId).toBe(101201);
    expect(field.terraformingFinishesAt).toBeInstanceOf(Date);

    field.terraformingFinishesAt = new Date(Date.now() - 1000);
    await service.checkBuildingCompletions(colony as any);

    expect(field.fieldType).toBe(201);
    expect(field.terrainTileId).toBe(201);
    expect(field.terraformingId).toBeNull();
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
  });

  it('upgrades a building into a new build job and preserves activation preference', async () => {
    const { service, colonyRepo, storageRepo, fieldRepo } =
      createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      buildingId: 100,
      isBuilding: false,
      isActive: true,
      integrity: 1000,
      maxIntegrity: 1000,
      activateAfterBuild: true,
      reactivateAfterUpgrade: null as number | null,
    };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 50,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      stats: { workers: 0, workless: 10 },
      fields: [field],
      storage: [],
    };
    const storage = { colonyId: 1, commodityId: 2, amount: 10 };
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);

    await service.upgradeBuilding(1, 1, 5, 100101);

    expect(storage.amount).toBe(6);
    expect(colony.energy).toBe(45);
    expect(field.buildingId).toBe(101);
    expect(field.isBuilding).toBe(true);
    expect(field.activateAfterBuild).toBe(true);
    expect(field.reactivateAfterUpgrade).toBe(1);
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
  });

  it('repairs a damaged building with proportional costs', async () => {
    const { service, colonyRepo, storageRepo, fieldRepo } =
      createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      buildingId: 100,
      isBuilding: false,
      isActive: true,
      integrity: 500,
      maxIntegrity: 1000,
    };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 50,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      fields: [field],
      storage: [],
    };
    const storage = { colonyId: 1, commodityId: 2, amount: 10 };
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);

    await service.repairBuilding(1, 1, 5);

    expect(storage.amount).toBe(7);
    expect(colony.energy).toBe(45);
    expect(field.integrity).toBe(1000);
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
  });

  it('does not remove headquarters', async () => {
    const { service, colonyRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      fields: [
        {
          id: 1,
          fieldIndex: 0,
          buildingId: 82010100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
    });

    await expect(service.demolish(1, 1, 0)).rejects.toThrow(
      'Cannot demolish headquarters',
    );
  });

  it('blocks orbit construction while colony is blockaded', async () => {
    const { service, colonyRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 50,
      stats: { isBlockaded: true },
      fields: [
        {
          id: 1,
          fieldIndex: 5,
          fieldType: 900,
          buildingId: null,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
    });

    await expect(service.build(1, 1, 5, 700)).rejects.toThrow('blockaded');
  });

  it('builds a mine job with costs deducted through storage service', async () => {
    const { service, colonyRepo, storageRepo, fieldRepo } =
      createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      buildingId: null,
      isBuilding: false,
      isActive: true,
    };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 50,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      fields: [field],
      storage: [],
    };
    const storage = { colonyId: 1, commodityId: 2, amount: 10 };
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);

    await service.build(1, 1, 5, 100);

    expect(storage.amount).toBe(5);
    expect(field.buildingId).toBe(100);
    expect(field.isBuilding).toBe(true);
    expect(field.isActive).toBe(false);
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
  });

  it('enforces formalized per-colony building limits', async () => {
    const { service, gameData } = createColonyService();
    const colony = {
      id: 1,
      fields: [{ id: 1, buildingId: 300, isBuilding: false }],
    };
    const building = gameData.getBuilding(300);

    await expect(
      (service as any).checkBuildingLimits(colony, 1, building),
    ).rejects.toThrow('limited to 1 per colony');
  });

  it('does not activate a heavily damaged building', async () => {
    const { service, colonyRepo } = createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      buildingId: 400,
      isBuilding: false,
      isActive: false,
      integrity: 400,
      maxIntegrity: 1000,
    };
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 50,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      stats: { workers: 0, workless: 10 },
      fields: [field],
      storage: [],
    });

    await expect(service.toggleBuilding(1, 1, 5)).rejects.toThrow(
      'too damaged',
    );
    expect(field.isActive).toBe(false);
  });

  it('updates worker stats and effective housing on activation/deactivation', async () => {
    const { statsService, gameData, statsRepo, buildingLifecycleService } =
      createColonyService();
    const colony = {
      id: 1,
      colonyClassId: 999,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      stats: {
        colonyId: 1,
        workers: 0,
        workless: 10,
        maxPopulation: 100,
        maxStorage: 100,
      },
      fields: [{ id: 1, buildingId: 400, isBuilding: false, isActive: true }],
    };
    const definition = gameData.getBuilding(400);

    await buildingLifecycleService.activateBuildingStats(
      colony as any,
      definition,
    );
    let summary = statsService.calculateSummary(colony as any);

    expect(colony.stats.workers).toBe(4);
    expect(colony.stats.workless).toBe(6);
    expect(colony.stats.maxPopulation).toBe(112);
    expect(summary.effectivePopulationMax).toBe(112);
    expect(summary.maxHousing).toBe(112);
    expect(summary.freeHousing).toBe(102);

    colony.fields[0].isActive = false;
    await buildingLifecycleService.deactivateBuildingStats(
      colony as any,
      definition,
    );
    summary = statsService.calculateSummary(colony as any);

    expect(colony.stats.workers).toBe(0);
    expect(colony.stats.workless).toBe(10);
    expect(colony.stats.maxPopulation).toBe(100);
    expect(summary.effectivePopulationMax).toBe(100);
    expect(statsRepo.save).toHaveBeenCalledTimes(2);
  });

  it('reduces deposit mining remainder for negative deposit production', async () => {
    const { service, depositMiningRepo, gameData } = createColonyService();
    gameData.getColonyClass.mockReturnValue({
      classId: 999,
      bevGrowthRate: 100,
      baseProduction: [],
    });
    const mining = {
      userId: 1,
      colonyId: 1,
      commodityId: 1505,
      amountLeft: 10,
    };
    depositMiningRepo.findOne.mockResolvedValue(mining);
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 0,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      storageUsed: 0,
      fields: [{ id: 1, buildingId: 500, isBuilding: false, isActive: true }],
    };

    await (service as any).balanceAndProduce(colony);

    expect(mining.amountLeft).toBe(7);
    expect(depositMiningRepo.save).toHaveBeenCalledWith(mining);
  });

  it('deactivates a mine-like building when deposit remainder is insufficient', async () => {
    const { service, depositMiningRepo, gameData, fieldRepo } =
      createColonyService();
    gameData.getColonyClass.mockReturnValue({
      classId: 999,
      bevGrowthRate: 100,
      baseProduction: [],
    });
    depositMiningRepo.findOne.mockResolvedValue({
      userId: 1,
      colonyId: 1,
      commodityId: 1505,
      amountLeft: 1,
    });
    const field = { id: 1, buildingId: 500, isBuilding: false, isActive: true };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 0,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      storageUsed: 0,
      fields: [field],
    };

    await (service as any).balanceAndProduce(colony);

    expect(field.isActive).toBe(false);
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
  });

  it('collects tick events for automatic deactivation', async () => {
    const { service } = createColonyService();
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 0,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      storageUsed: 0,
      fields: [
        {
          id: 1,
          fieldIndex: 7,
          buildingId: 200,
          isBuilding: false,
          isActive: true,
        },
      ],
    };

    const result = await service.processTick(colony as any);

    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: 'BUILDING_DEACTIVATED',
        fieldIndex: 7,
        reason: 'ENERGY',
      }),
    );
  });

  it('deactivates orbital maintenance consumers when maintenance is missing', async () => {
    const { service, fieldRepo } = createColonyService();
    const field = {
      id: 1,
      fieldIndex: 9,
      buildingId: 600,
      isBuilding: false,
      isActive: true,
    };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 10,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      fields: [field],
    };

    await (service as any).balanceAndProduce(colony);

    expect(field.isActive).toBe(false);
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
  });

  it('deactivates a non-HQ building when EPS would go below zero', async () => {
    const { service, fieldRepo, storageRepo } = createColonyService();
    storageRepo.findOne.mockResolvedValue({
      id: 1,
      colonyId: 1,
      commodityId: 2,
      amount: 0,
    });
    const consumerField = {
      id: 2,
      buildingId: 200,
      isBuilding: false,
      isActive: true,
    };
    const colony = {
      id: 1,
      colonyClassId: 999,
      energy: 0,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      storageUsed: 0,
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
        consumerField,
      ],
    };

    await (service as any).balanceAndProduce(colony);

    expect(consumerField.isActive).toBe(false);
    expect(fieldRepo.save).toHaveBeenCalledWith(consumerField);
    expect(colony.energy).toBe(16);
  });
});

describe('colony shields', () => {
  it('sets shield frequency and loads shield battery using energy', async () => {
    const {
      service,
      colonyRepo,
      statsRepo,
      colonyRepo: repo,
    } = createColonyService();
    const colony = {
      id: 1,
      userId: 1,
      energy: 50,
      colonyClassId: 999,
      stats: {
        shields: 0,
        maxShields: 20,
        shieldFrequency: null,
      },
      fields: [
        { id: 1, buildingId: 100010100, isBuilding: false, isActive: true },
        { id: 2, buildingId: 100020100, isBuilding: false, isActive: true },
      ],
      storage: [],
    };
    colonyRepo.findOne.mockResolvedValue(colony);

    await service.setShieldFrequency(1, 1, 12345);
    await service.loadShields(1, 1, 7);

    expect(colony.stats.shieldFrequency).toBe(12345);
    expect(colony.stats.shields).toBe(7);
    expect(colony.energy).toBe(43);
    expect(statsRepo.save).toHaveBeenCalledWith(colony.stats);
    expect(repo.save).toHaveBeenCalledWith(colony);
  });
});

describe('crew training queues', () => {
  it('queues crew training when academy is active', async () => {
    const { service, colonyRepo, crewTrainingQueueRepo, statsRepo } =
      createColonyService();
    const stats = { workless: 5, trainedCrew: 0 };
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      fields: [
        {
          id: 1,
          buildingId: 51010100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
      stats,
    });

    const queue = await service.queueCrewTraining(1, 1, 2);

    expect(crewTrainingQueueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2, userId: 1, colonyId: 1 }),
    );
    expect(stats.workless).toBe(3);
    expect(statsRepo.save).toHaveBeenCalledWith(stats);
    expect(queue).toMatchObject({ amount: 2 });
  });

  it('completes crew training and creates colony crew assignments', async () => {
    const { service, crewTrainingQueueRepo, colonyCrewService } =
      createColonyService();
    const job = {
      id: 1,
      colonyId: 1,
      userId: 1,
      amount: 2,
      finishesAt: new Date(Date.now() - 1000),
      status: 'QUEUED',
    };
    const colony = { id: 1, userId: 1, stats: { trainedCrew: 0 } };
    crewTrainingQueueRepo.find.mockResolvedValue([job]);

    await (service as any).processCrewTrainingQueue(colony);

    expect(colonyCrewService.createCrewOnColony).toHaveBeenCalledWith(
      colony,
      2,
    );
    expect(job.status).toBe('COMPLETED');
  });
});

describe('fabrication queues', () => {
  const activeWeaponFabColony = {
    id: 1,
    userId: 1,
    colonyClassId: 999,
    storageMax: 100,
    fields: [
      {
        id: 1,
        buildingId: 81810100,
        isBuilding: false,
        isActive: true,
      },
    ],
    storage: [],
  };

  it('queues mapped module fabrication when matching building function is active', async () => {
    const { service, colonyRepo, fabricationQueueRepo, storageRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue(activeWeaponFabColony);
    storageRepo.findOne.mockResolvedValue({
      id: 1,
      colonyId: 1,
      commodityId: 2,
      amount: 999,
    });

    const queue = await service.queueFabrication(
      1,
      1,
      'MODULE' as any,
      'module.weapon.turbolaser-k1',
      2,
      10,
    );

    expect(storageRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ commodityId: 2, amount: 979 }),
    );
    expect(fabricationQueueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        queueType: 'MODULE',
        itemKey: 'module.weapon.turbolaser-k1',
        amount: 2,
        buildingFunctionId: 10,
      }),
    );
    expect(queue).toMatchObject({
      itemKey: 'module.weapon.turbolaser-k1',
      amount: 2,
    });
  });

  it('rejects unknown fabrication items', async () => {
    const { service } = createColonyService();
    await expect(
      service.queueFabrication(1, 1, 'MODULE' as any, 'unknown', 1, 10),
    ).rejects.toThrow('Unknown fabrication item');
  });

  it('rejects item/function mismatches', async () => {
    const { service } = createColonyService();
    await expect(
      service.queueFabrication(
        1,
        1,
        'MODULE' as any,
        'module.weapon.turbolaser-k1',
        1,
        13,
      ),
    ).rejects.toThrow('cannot be produced');
  });

  it('requires an active matching fabrication building', async () => {
    const { service, colonyRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      ...activeWeaponFabColony,
      fields: [
        { id: 1, buildingId: 81810100, isBuilding: false, isActive: false },
      ],
    });

    await expect(
      service.queueFabrication(
        1,
        1,
        'MODULE' as any,
        'module.weapon.turbolaser-k1',
        1,
        10,
      ),
    ).rejects.toThrow('Required fabrication building is not active');
  });

  it('allows only one active queue per building function', async () => {
    const { service, colonyRepo, fabricationQueueRepo, storageRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue(activeWeaponFabColony);
    fabricationQueueRepo.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 99 }]);
    storageRepo.findOne.mockResolvedValue({ amount: 999 });

    await expect(
      service.queueFabrication(
        1,
        1,
        'MODULE' as any,
        'module.weapon.turbolaser-k1',
        1,
        10,
      ),
    ).rejects.toThrow('already active');
  });

  it('completes finished fabrication queue jobs into storage with cap', async () => {
    const { service, fabricationQueueRepo, storageRepo } =
      createColonyService();
    const job = {
      id: 1,
      colonyId: 1,
      userId: 1,
      queueType: 'MODULE',
      itemKey: 'module.weapon.turbolaser-k1',
      amount: 2,
      buildingFunctionId: 10,
      finishesAt: new Date(Date.now() - 1000),
      status: 'QUEUED',
    };
    fabricationQueueRepo.find.mockResolvedValue([job]);
    storageRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(async () => ({ total: 99 })),
    });
    storageRepo.findOne.mockResolvedValue(null);

    await (service as any).processFabricationQueue({
      id: 1,
      colonyClassId: 999,
      storageMax: 100,
      fields: [],
    });

    expect(storageRepo.create).toHaveBeenCalledWith({
      colonyId: 1,
      commodityId: 10701,
      amount: 1,
    });
    expect(job.status).toBe('COMPLETED');
    expect(fabricationQueueRepo.save).toHaveBeenCalledWith(job);
  });

  it('cancels queued jobs with a 50 percent refund', async () => {
    const { service, colonyRepo, fabricationQueueRepo, storageRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue(activeWeaponFabColony);
    const job = {
      id: 7,
      colonyId: 1,
      userId: 1,
      queueType: 'MODULE',
      itemKey: 'module.weapon.turbolaser-k1',
      amount: 3,
      buildingFunctionId: 10,
      finishesAt: new Date(Date.now() + 1000),
      status: 'QUEUED',
    };
    fabricationQueueRepo.findOne.mockResolvedValue(job);
    storageRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(async () => ({ total: 0 })),
    });
    storageRepo.findOne.mockResolvedValue(null);

    await service.cancelFabricationQueue(1, 1, 7);

    expect(storageRepo.create).toHaveBeenCalledWith({
      colonyId: 1,
      commodityId: 2,
      amount: 15,
    });
    expect(job.status).toBe('CANCELLED');
    expect(fabricationQueueRepo.save).toHaveBeenCalledWith(job);
  });
});

describe('ship building compatibility', () => {
  it('creates deterministic buildplan signatures independent of module order', () => {
    const { service } = createColonyService();
    expect((service as any).createBuildplanSignature(1, [10701, 10201])).toBe(
      (service as any).createBuildplanSignature(1, [10201, 10701]),
    );
    expect(
      (service as any).createBuildplanSignature(2, [10201, 10701]),
    ).not.toBe((service as any).createBuildplanSignature(1, [10201, 10701]));
  });

  it('finishes queued ship builds during colony tick', async () => {
    const { service, shipBuildQueueRepo, shipRepo } = createColonyService();
    const job = {
      id: 1,
      colonyId: 1,
      userId: 1,
      shipClassId: 1,
      name: 'Queued Ship',
      finishesAt: new Date(Date.now() - 1000),
      status: 'QUEUED',
      shipClass: {
        id: 1,
        name: 'Test Fighter',
        hullBase: 10,
        shieldBase: 5,
        epsBase: 20,
        warpBase: 2,
        crewMin: 1,
        crewMax: 2,
        cargoCapacity: 20,
        batteryBase: 5,
      },
    };
    shipBuildQueueRepo.find.mockResolvedValue([job]);
    const colony = {
      id: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      posX: 3,
      posY: 4,
      starSystem: { layerId: 1 },
    };

    await (service as any).processShipBuildQueue(colony);

    expect(shipRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Queued Ship', shipClassId: 1 }),
    );
    expect(job.status).toBe('COMPLETED');
    expect(shipBuildQueueRepo.save).toHaveBeenCalledWith(job);
  });

  it('creates spacecraft modules from queued module commodity snapshots', async () => {
    const {
      service,
      shipBuildQueueRepo,
      shipRepo,
      spacecraftModuleRepo,
      spacecraftStatsService,
    } = createColonyService();
    const job = {
      id: 1,
      colonyId: 1,
      userId: 1,
      shipClassId: 1,
      name: 'Module Ship',
      moduleCommodityIds: [10701],
      moduleTypes: ['Laser Cannon'],
      finishesAt: new Date(Date.now() - 1000),
      status: 'QUEUED',
      shipClass: {
        id: 1,
        name: 'Test Fighter',
        hullBase: 10,
        shieldBase: 5,
        epsBase: 20,
        warpBase: 2,
        crewMin: 1,
        crewMax: 2,
        cargoCapacity: 20,
        batteryBase: 5,
      },
    };
    shipBuildQueueRepo.find.mockResolvedValue([job]);
    shipRepo.save.mockResolvedValueOnce({ id: 55, name: 'Module Ship' });

    await (service as any).processShipBuildQueue({
      id: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      posX: 3,
      posY: 4,
      starSystem: { layerId: 1 },
    });

    expect(spacecraftModuleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        spacecraftId: 55,
        moduleType: 'Laser Cannon',
        category: 'WEAPONS',
        level: 1,
      }),
    );
    expect(spacecraftStatsService.applyStats).toHaveBeenCalledWith(
      expect.objectContaining({ id: 55 }),
      job.shipClass,
      expect.arrayContaining([
        expect.objectContaining({ moduleType: 'Laser Cannon' }),
      ]),
    );
    expect(job.status).toBe('COMPLETED');
  });

  it('keeps buildShip compatible by creating a ship build queue job', async () => {
    const {
      service,
      colonyRepo,
      storageRepo,
      shipClassRepo,
      shipBuildQueueRepo,
      shipRepo,
      gameData,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      currentLayerId: 1,
      posX: 3,
      posY: 4,
      colonyClassId: 999,
      fields: [
        {
          id: 1,
          fieldIndex: 1,
          buildingId: 85010100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
      starSystem: { layerId: 1 },
    });
    storageRepo.findOne.mockImplementation(async ({ where }: any) => ({
      colonyId: 1,
      commodityId: where.commodityId,
      amount: 999,
    }));
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      isNpc: false,
      name: 'Test Fighter',
      hullBase: 10,
      shieldBase: 5,
      epsBase: 20,
      warpBase: 2,
      crewMin: 1,
      crewMax: 2,
      cargoCapacity: 20,
      batteryBase: 5,
    });

    const queue = await service.buildShip(
      1,
      1,
      1,
      'Red One',
      ['Laser Cannon'],
      'Starter Plan',
    );

    expect(gameData.getBuildingFunctions).toHaveBeenCalledWith(85010100);
    expect(shipBuildQueueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Red One',
        shipClassId: 1,
        userId: 1,
        buildPlanName: 'Starter Plan',
        moduleTypes: ['Laser Cannon'],
      }),
    );
    expect(shipRepo.save).not.toHaveBeenCalled();
    expect(queue).toMatchObject({
      name: 'Red One',
      shipClassId: 1,
      buildPlanName: 'Starter Plan',
    });
  });

  it('rejects ship classes that do not match the active shipyard function', async () => {
    const { service, colonyRepo, storageRepo, shipClassRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      fields: [
        {
          id: 1,
          fieldIndex: 1,
          buildingId: 85210100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
    });
    storageRepo.findOne.mockResolvedValue({ amount: 999 });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      isNpc: false,
      name: 'Test Frigate',
      category: 'FRIGATE',
      hullBase: 10,
      shieldBase: 5,
      epsBase: 20,
      warpBase: 2,
      crewMin: 1,
      crewMax: 2,
      cargoCapacity: 20,
      batteryBase: 5,
    });

    await expect(
      service.buildShip(1, 1, 1, 'Wrong Yard', [], 'Plan'),
    ).rejects.toThrow('FRIGATE cannot be built');
  });

  it('rejects module selections that exceed ship class slots', async () => {
    const { service, colonyRepo, storageRepo, shipClassRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      fields: [
        {
          id: 1,
          fieldIndex: 1,
          buildingId: 85010100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
    });
    storageRepo.findOne.mockResolvedValue({ amount: 999 });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      isNpc: false,
      name: 'Test Corvette',
      category: 'CORVETTE',
      hullBase: 10,
      shieldBase: 5,
      epsBase: 20,
      warpBase: 2,
      crewMin: 1,
      crewMax: 2,
      cargoCapacity: 20,
      batteryBase: 5,
    });

    await expect(
      service.buildShip(
        1,
        1,
        1,
        'Too Many Lasers',
        [],
        'Plan',
        [10701, 10701, 10701],
      ),
    ).rejects.toThrow('Too many WEAPONS');
  });

  it('buildShip consumes selected module commodities from colony storage', async () => {
    const {
      service,
      colonyRepo,
      storageRepo,
      shipClassRepo,
      shipBuildQueueRepo,
      shipBuildplanRepo,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      currentLayerId: 1,
      posX: 3,
      posY: 4,
      colonyClassId: 999,
      fields: [
        {
          id: 1,
          fieldIndex: 1,
          buildingId: 85010100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
      starSystem: { layerId: 1 },
    });
    storageRepo.findOne.mockImplementation(async ({ where }: any) => ({
      colonyId: 1,
      commodityId: where.commodityId,
      amount: where.commodityId === 10701 ? 1 : 999,
    }));
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      isNpc: false,
      name: 'Test Fighter',
      hullBase: 10,
      shieldBase: 5,
      epsBase: 20,
      warpBase: 2,
      crewMin: 1,
      crewMax: 2,
      cargoCapacity: 20,
      batteryBase: 5,
    });

    await service.buildShip(1, 1, 1, 'Module Red', [], 'Module Plan', [10701]);

    expect(shipBuildplanRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleCommodityIds: [10701],
        moduleTypes: ['Laser Cannon'],
      }),
    );
    expect(storageRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ commodityId: 10701, amount: 0 }),
    );
    expect(shipBuildQueueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleCommodityIds: [10701],
        moduleTypes: ['Laser Cannon'],
        buildPlanName: 'Module Plan',
      }),
    );
  });
});

describe('orbit ship operations', () => {
  it('lands ships by transferring cargo and removing the ship', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      cargoRepo,
      colonyCrewService,
      storageRepo,
      shipClassRepo,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      colonyClassId: 999,
      energy: 100,
      storageMax: 100,
      fields: [
        {
          id: 1,
          fieldIndex: 1,
          buildingId: 81130100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
      stats: { workless: 0, trainedCrew: 0 },
    });
    shipRepo.findOne = jest.fn(async () => ({
      id: 7,
      userId: 1,
      shipClassId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      crew: 2,
      cargoUsed: 5,
      cargoMax: 20,
    }));
    cargoRepo.find.mockResolvedValue([{ commodityId: 2, amount: 5 }]);
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      key: 'REBEL_STARTER_CORVETTE',
    });
    storageRepo.findOne.mockResolvedValue(null);

    await service.landShip(1, 1, 7);

    expect(colonyCrewService.transferCrewFromShipToColony).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ id: 7 }),
      2,
    );
    expect(shipRepo.remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
    );
  });

  it('rejects landing when colony crew capacity is insufficient', async () => {
    const { service, colonyRepo, shipRepo, colonyCrewService, shipClassRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      colonyClassId: 999,
      fields: [
        {
          id: 1,
          fieldIndex: 1,
          buildingId: 81130100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
      stats: { workless: 0, trainedCrew: 0 },
    });
    shipRepo.findOne = jest.fn(async () => ({
      id: 7,
      userId: 1,
      shipClassId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      crew: 3,
      cargoUsed: 0,
      cargoMax: 20,
    }));
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      key: 'REBEL_STARTER_CORVETTE',
    });
    colonyCrewService.getFreeAssignmentCount.mockResolvedValue(1);

    await expect(service.landShip(1, 1, 7)).rejects.toThrow(
      'Not enough colony crew capacity',
    );
  });

  it('disassembles ships with energy cost and refund', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      cargoRepo,
      colonyCrewService,
      storageRepo,
      shipClassRepo,
    } = createColonyService();
    const colony = {
      id: 1,
      userId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      colonyClassId: 999,
      energy: 50,
      storageMax: 100,
      fields: [],
      storage: [],
      stats: { workless: 0, trainedCrew: 0 },
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    shipRepo.findOne = jest.fn(async () => ({
      id: 8,
      userId: 1,
      shipClassId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      crew: 1,
      cargoUsed: 0,
      cargoMax: 20,
    }));
    cargoRepo.find.mockResolvedValue([]);
    storageRepo.findOne.mockResolvedValue(null);
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      hullBase: 10,
      shieldBase: 5,
      epsBase: 20,
      cargoCapacity: 20,
    });

    await service.disassembleShip(1, 1, 8);

    expect(colony.energy).toBe(30);
    expect(colonyCrewService.transferCrewFromShipToColony).toHaveBeenCalled();
    expect(shipRepo.remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 8 }),
    );
  });
});

describe('building lifecycle', () => {
  it('clears a building field for removal', () => {
    const fieldRepo = { save: jest.fn(async (value) => value) };
    const statsRepo = { save: jest.fn(async (value) => value) };
    const service = new BuildingLifecycleService(
      fieldRepo as any,
      statsRepo as any,
    );
    const field = {
      buildingId: 400,
      isActive: false,
      isBuilding: false,
      buildProgress: 100,
      buildFinishesAt: new Date(),
    } as any;

    service.clearBuilding(field);

    expect(field).toMatchObject({
      buildingId: null,
      isActive: true,
      isBuilding: false,
      buildProgress: 0,
      buildFinishesAt: null,
    });
  });

  it('finishes a building and activates it when workers are available', async () => {
    const fieldRepo = { save: jest.fn(async (value) => value) };
    const statsRepo = { save: jest.fn(async (value) => value) };
    const service = new BuildingLifecycleService(
      fieldRepo as any,
      statsRepo as any,
    );
    const colony = {
      stats: { workers: 0, workless: 5 },
    } as any;
    const field = {
      isBuilding: true,
      buildProgress: 0,
      buildFinishesAt: new Date(),
      isActive: false,
    } as any;
    const definition = {
      bevUse: 3,
      integrity: 1000,
      isActivateable: true,
    } as any;

    await service.finishBuilding(colony, field, definition);

    expect(field.isBuilding).toBe(false);
    expect(field.buildProgress).toBe(100);
    expect(field.isActive).toBe(true);
    expect(field.integrity).toBe(1000);
    expect(field.maxIntegrity).toBe(1000);
    expect(colony.stats.workers).toBe(3);
    expect(colony.stats.workless).toBe(2);
  });
});

describe('research tick semantics', () => {
  it('advances research by produced points instead of stored inventory', async () => {
    const research = {
      userId: 1,
      techId: 220101,
      status: ResearchStatus.IN_PROGRESS,
      remainingPoints: 10,
      spentPoints: 0,
      progress: 0,
    };
    const researchRepo = {
      findOne: jest.fn(async () => research),
      save: jest.fn(async (value) => value),
    };
    const gameData = {
      getTech: jest.fn(() => ({ id: 220101, effort: 10, dependencies: [] })),
    };
    const service = new ResearchService(researchRepo as any, gameData as any);

    await service.processTick(1, 3);

    expect(research.spentPoints).toBe(3);
    expect(research.remainingPoints).toBe(7);
    expect(research.status).toBe(ResearchStatus.IN_PROGRESS);
  });
});

describe('main tick idempotency', () => {
  it('does not process an already completed durable tick slot', async () => {
    const colonyRepo = { find: jest.fn() };
    const tickStateRepo = {
      findOne: jest.fn(async () => ({
        tickType: GameTickType.MAIN,
        tickNumber: Date.now(),
        status: GameTickStatus.COMPLETED,
      })),
      save: jest.fn(),
    };
    const service = new TickService(
      colonyRepo as any,
      {} as any,
      { find: jest.fn() } as any,
      { find: jest.fn() } as any,
      tickStateRepo as any,
      {} as any,
      {} as any,
      {} as any,
      { emitToAll: jest.fn(), emitToUser: jest.fn() } as any,
    );

    const result = await service.handleTick();

    expect(result.status).toBe(GameTickStatus.COMPLETED);
    expect(colonyRepo.find).not.toHaveBeenCalled();
  });

  it('manual ticks use a fresh tick number instead of the completed scheduled slot', async () => {
    const colonyRepo = { find: jest.fn(async () => []) };
    const tickStateRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const service = new TickService(
      colonyRepo as any,
      {} as any,
      { find: jest.fn(async () => []) } as any,
      { find: jest.fn(async () => []) } as any,
      tickStateRepo as any,
      {} as any,
      {} as any,
      { processTick: jest.fn(async () => undefined) } as any,
      { emitToAll: jest.fn(), emitToUser: jest.fn() } as any,
    );

    const result = await service.triggerManualTick();

    expect(result.status).toBe(GameTickStatus.COMPLETED);
    expect(tickStateRepo.findOne).toHaveBeenCalledWith({
      where: { tickType: GameTickType.MAIN, tickNumber: result.tickNumber },
    });
    expect(colonyRepo.find).toHaveBeenCalled();
  });

  it('emits a colony tick report when a shortage creates events', async () => {
    const colony = { id: 1, userId: 7 };
    const colonyRepo = { find: jest.fn(async () => [colony]) };
    const shipRepo = { find: jest.fn(async () => []) };
    const userRepo = { find: jest.fn(async () => [{ id: 7 }]) };
    const tickStateRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const colonyService = {
      processTick: jest.fn(async () => ({
        researchPoints: 1,
        productionDelta: new Map(),
        events: [
          {
            type: 'BUILDING_DEACTIVATED',
            fieldIndex: 7,
            reason: 'ENERGY',
          },
        ],
      })),
    };
    const researchService = { processTick: jest.fn(async () => undefined) };
    const gateway = { emitToAll: jest.fn(), emitToUser: jest.fn() };
    const service = new TickService(
      colonyRepo as any,
      {} as any,
      shipRepo as any,
      userRepo as any,
      tickStateRepo as any,
      colonyService as any,
      {} as any,
      researchService as any,
      gateway as any,
    );

    await service.handleTick();

    expect(gateway.emitToUser).toHaveBeenCalledWith(
      7,
      WsEventType.COLONY_TICK_REPORT,
      expect.objectContaining({
        colonyId: 1,
        events: [
          expect.objectContaining({
            type: 'BUILDING_DEACTIVATED',
            reason: 'ENERGY',
          }),
        ],
      }),
    );
  });
});

describe('ship repair queues', () => {
  const repairColony = () => ({
    id: 1,
    userId: 1,
    starSystemId: 10,
    celestialObjectId: 20,
    colonyClassId: 999,
    energy: 100,
    storageMax: 100,
    fields: [
      {
        id: 1,
        fieldIndex: 1,
        buildingId: 85010100,
        isBuilding: false,
        isActive: true,
      },
    ],
    storage: [],
    stats: { workless: 0, trainedCrew: 0, maxStorage: 100 },
  });

  it('queues repair and deducts spare parts/system components', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      spacecraftModuleRepo,
      storageRepo,
      shipBuildQueueRepo,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue(repairColony());
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      name: 'Damaged Corvette',
      hull: 50,
      hullMax: 250,
    });
    spacecraftModuleRepo.find.mockResolvedValue([
      { id: 11, spacecraftId: 7, integrity: 40, moduleType: 'Laser Cannon' },
    ]);
    const storage: Record<number, any> = {
      10001: { colonyId: 1, commodityId: 10001, amount: 5 },
      10002: { colonyId: 1, commodityId: 10002, amount: 5 },
    };
    storageRepo.findOne.mockImplementation(
      async ({ where }: any) => storage[where.commodityId] ?? null,
    );

    const queue = await service.queueShipRepair(1, 1, 7);

    expect(storage[10001].amount).toBe(4);
    expect(storage[10002].amount).toBe(4);
    expect(shipBuildQueueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'REPAIR',
        spacecraftId: 7,
        repairSnapshot: expect.objectContaining({
          hullBefore: 50,
          hullAfter: 250,
          costs: [
            { commodityId: 10001, amount: 1 },
            { commodityId: 10002, amount: 1 },
          ],
        }),
      }),
    );
    expect(queue.mode).toBe('REPAIR');
  });

  it('rejects repair without active repair shipyard or without damage', async () => {
    const { service, colonyRepo, shipRepo, spacecraftModuleRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue({ ...repairColony(), fields: [] });
    await expect(service.queueShipRepair(1, 1, 7)).rejects.toThrow(
      'Active repair shipyard required',
    );

    colonyRepo.findOne.mockResolvedValue(repairColony());
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      name: 'Fine Corvette',
      hull: 100,
      hullMax: 100,
    });
    spacecraftModuleRepo.find.mockResolvedValue([
      { id: 11, spacecraftId: 7, integrity: 100, moduleType: 'Laser Cannon' },
    ]);
    await expect(service.queueShipRepair(1, 1, 7)).rejects.toThrow(
      'Ship is not damaged',
    );
  });

  it('completes repair queue through colony tick', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      shipBuildQueueRepo,
      spacecraftModuleRepo,
      spacecraftStatsService,
    } = createColonyService();
    const colony = repairColony();
    colonyRepo.findOne.mockResolvedValue(colony);
    const ship = {
      id: 7,
      userId: 1,
      shipClassId: 1,
      hull: 20,
      hullMax: 100,
      shields: 0,
      shieldsMax: 10,
      energy: 0,
      energyMax: 10,
    };
    shipRepo.findOne.mockResolvedValue(ship);
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      hullBase: 100,
      shieldBase: 10,
      epsBase: 10,
      warpBase: 1,
      crewMax: 5,
      cargoCapacity: 10,
      batteryBase: 0,
    });
    const module = {
      id: 11,
      spacecraftId: 7,
      moduleType: 'Laser Cannon',
      category: 'WEAPONS',
      level: 1,
      integrity: 25,
      cooldown: 2,
      isActive: false,
    };
    spacecraftModuleRepo.find.mockResolvedValue([module]);
    shipBuildQueueRepo.find.mockResolvedValue([
      {
        id: 99,
        colonyId: 1,
        userId: 1,
        shipClassId: 1,
        spacecraftId: 7,
        mode: 'REPAIR',
        status: 'QUEUED',
        finishesAt: new Date(Date.now() - 1000),
      },
    ]);

    await service.processTick(colony as any);

    expect(module).toMatchObject({
      integrity: 100,
      cooldown: 0,
      isActive: true,
    });
    expect(ship.hull).toBe(100);
    expect(spacecraftStatsService.applyStats).toHaveBeenCalled();
    expect(shipBuildQueueRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 99, status: 'COMPLETED' }),
    );
  });
});

describe('ship retrofit queues', () => {
  const retrofitColony = () => ({
    id: 1,
    userId: 1,
    starSystemId: 10,
    celestialObjectId: 20,
    colonyClassId: 999,
    energy: 100,
    storageMax: 100,
    fields: [
      {
        id: 1,
        fieldIndex: 1,
        buildingId: 85210100,
        isBuilding: false,
        isActive: true,
      },
    ],
    storage: [],
    stats: { workless: 0, trainedCrew: 0, maxStorage: 100 },
  });

  const shipClass = {
    id: 1,
    name: 'Test Corvette',
    category: 'CORVETTE',
    isNpc: false,
    buildTimeTicks: 1,
    hullBase: 100,
    shieldBase: 10,
    epsBase: 10,
    warpBase: 1,
    crewMax: 5,
    cargoCapacity: 10,
    batteryBase: 0,
  };

  it('queues retrofit and consumes only newly added modules', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      spacecraftModuleRepo,
      storageRepo,
      shipBuildQueueRepo,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue(retrofitColony());
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      name: 'Corvette',
    });
    shipClassRepo.findOneBy.mockResolvedValue(shipClass);
    spacecraftModuleRepo.find.mockResolvedValue([]);
    const storage: Record<number, any> = {
      10701: { colonyId: 1, commodityId: 10701, amount: 2 },
    };
    storageRepo.findOne.mockImplementation(
      async ({ where }: any) => storage[where.commodityId] ?? null,
    );

    const queue = await service.queueShipRetrofit(1, 1, 7, [10701], 'Retro');

    expect(storage[10701].amount).toBe(1);
    expect(shipBuildQueueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'RETROFIT',
        spacecraftId: 7,
        buildPlanName: 'Retro',
        moduleCommodityIds: [10701],
        retrofitSnapshot: expect.objectContaining({
          oldModuleCommodityIds: [],
          newModuleCommodityIds: [10701],
          consumedModuleCommodityIds: [10701],
        }),
      }),
    );
    expect(queue.mode).toBe('RETROFIT');
  });

  it('rejects unchanged retrofit selection', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      spacecraftModuleRepo,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue(retrofitColony());
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      name: 'Corvette',
    });
    shipClassRepo.findOneBy.mockResolvedValue(shipClass);
    spacecraftModuleRepo.find.mockResolvedValue([
      {
        id: 11,
        spacecraftId: 7,
        moduleType: 'Laser Cannon',
        category: 'WEAPONS',
        level: 1,
        integrity: 100,
      },
    ]);

    await expect(service.queueShipRetrofit(1, 1, 7, [10701])).rejects.toThrow(
      'No retrofit changes selected',
    );
  });

  it('completes retrofit by replacing modules and returning intact removed modules', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      shipBuildQueueRepo,
      spacecraftModuleRepo,
      storageRepo,
      spacecraftStatsService,
    } = createColonyService();
    const colony = retrofitColony();
    colonyRepo.findOne.mockResolvedValue(colony);
    const ship = {
      id: 7,
      userId: 1,
      shipClassId: 1,
      hull: 100,
      hullMax: 100,
      shields: 10,
      shieldsMax: 10,
      energy: 10,
      energyMax: 10,
    };
    shipRepo.findOne.mockResolvedValue(ship);
    shipClassRepo.findOneBy.mockResolvedValue(shipClass);
    const oldModule = {
      id: 11,
      spacecraftId: 7,
      moduleType: 'Laser Cannon',
      category: 'WEAPONS',
      level: 1,
      integrity: 100,
      isActive: true,
      cooldown: 0,
    };
    spacecraftModuleRepo.find.mockResolvedValue([oldModule]);
    const storage: Record<number, any> = {};
    storageRepo.findOne.mockImplementation(
      async ({ where }: any) => storage[where.commodityId] ?? null,
    );
    storageRepo.create.mockImplementation((value: any) => {
      storage[value.commodityId] = { ...value };
      return storage[value.commodityId];
    });
    shipBuildQueueRepo.find.mockResolvedValue([
      {
        id: 100,
        colonyId: 1,
        userId: 1,
        shipClassId: 1,
        spacecraftId: 7,
        mode: 'RETROFIT',
        shipClass,
        moduleCommodityIds: [10201],
        moduleTypes: ['Shield Generator'],
        retrofitSnapshot: {
          oldModuleCommodityIds: [10701],
          newModuleCommodityIds: [10201],
          newModuleTypes: ['Shield Generator'],
          returnedModuleCommodityIds: [],
          consumedModuleCommodityIds: [10201],
        },
        status: 'QUEUED',
        finishesAt: new Date(Date.now() - 1000),
      },
    ]);

    await service.processTick(colony as any);

    expect(spacecraftModuleRepo.remove).toHaveBeenCalledWith([oldModule]);
    expect(spacecraftModuleRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        spacecraftId: 7,
        moduleType: 'Shield Generator',
        category: 'SHIELDS',
        integrity: 100,
      }),
    );
    expect(storage[10701].amount).toBe(1);
    expect(spacecraftStatsService.applyStats).toHaveBeenCalled();
    expect(shipBuildQueueRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 100,
        status: 'COMPLETED',
        retrofitSnapshot: expect.objectContaining({
          returnedModuleCommodityIds: [10701],
        }),
      }),
    );
  });
});

describe('shipyard queue cancellation', () => {
  it('refunds consumed modules for retrofit cancellation', async () => {
    const { service, colonyRepo, shipBuildQueueRepo, storageRepo } =
      createColonyService();
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      storageMax: 100,
      fields: [],
      storage: [],
      stats: { maxStorage: 100 },
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    shipBuildQueueRepo.findOne.mockResolvedValue({
      id: 77,
      colonyId: 1,
      userId: 1,
      mode: 'RETROFIT',
      status: 'QUEUED',
      retrofitSnapshot: {
        oldModuleCommodityIds: [],
        newModuleCommodityIds: [10701],
        newModuleTypes: ['Laser Cannon'],
        returnedModuleCommodityIds: [],
        consumedModuleCommodityIds: [10701],
      },
    });
    const storage: Record<number, any> = {};
    storageRepo.findOne.mockImplementation(
      async ({ where }: any) => storage[where.commodityId] ?? null,
    );
    storageRepo.create.mockImplementation((value: any) => {
      storage[value.commodityId] = { ...value };
      return storage[value.commodityId];
    });

    const queue = await service.cancelShipyardQueue(1, 1, 77);

    expect(storage[10701].amount).toBe(1);
    expect(queue.status).toBe('CANCELLED');
    expect(shipBuildQueueRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 77, status: 'CANCELLED' }),
    );
  });

  it('cancels repair queue without refunding repair costs', async () => {
    const { service, colonyRepo, shipBuildQueueRepo, storageRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      fields: [],
      storage: [],
      stats: { maxStorage: 100 },
    });
    shipBuildQueueRepo.findOne.mockResolvedValue({
      id: 78,
      colonyId: 1,
      userId: 1,
      mode: 'REPAIR',
      status: 'QUEUED',
      repairSnapshot: { costs: [{ commodityId: 10001, amount: 1 }] },
    });

    const queue = await service.cancelShipyardQueue(1, 1, 78);

    expect(storageRepo.create).not.toHaveBeenCalled();
    expect(queue.status).toBe('CANCELLED');
  });
});

describe('airfield hangar loop', () => {
  const airfieldColony = () => ({
    id: 1,
    userId: 1,
    starSystemId: 10,
    celestialObjectId: 20,
    colonyClassId: 999,
    energy: 100,
    energyMax: 100,
    storageMax: 100,
    fields: [
      {
        id: 1,
        fieldIndex: 1,
        buildingId: 81130100,
        isBuilding: false,
        isActive: true,
      },
    ],
    storage: [],
    stats: { workless: 0, trainedCrew: 0, maxStorage: 100, maxEnergy: 100 },
  });

  const hangarShipClass = {
    id: 1,
    key: 'REBEL_STARTER_CORVETTE',
    name: 'Rebel Starter Corvette',
    category: 'CORVETTE',
    isNpc: false,
    crewMin: 2,
    crewMax: 5,
    hullBase: 100,
    shieldBase: 50,
    epsBase: 80,
    warpBase: 2,
    cargoCapacity: 20,
    batteryBase: 0,
  };

  it('builds hangar rump commodities with airfield, energy and costs', async () => {
    const { service, colonyRepo, shipClassRepo, storageRepo } =
      createColonyService();
    const colony = airfieldColony();
    colonyRepo.findOne.mockResolvedValue(colony);
    shipClassRepo.findOneBy.mockResolvedValue(hangarShipClass);
    const storage: Record<number, any> = {
      2: { colonyId: 1, commodityId: 2, amount: 100 },
      4: { colonyId: 1, commodityId: 4, amount: 100 },
    };
    storageRepo.findOne.mockImplementation(
      async ({ where }: any) => storage[where.commodityId] ?? null,
    );
    storageRepo.create.mockImplementation((value: any) => {
      storage[value.commodityId] = { ...value };
      return storage[value.commodityId];
    });

    await service.buildAirfieldRump(1, 1, 1, 2);

    expect(colony.energy).toBe(30);
    expect(storage[2].amount).toBe(60);
    expect(storage[4].amount).toBe(80);
    expect(storage[21601].amount).toBe(2);
  });

  it('rejects hangar rump construction without active airfield', async () => {
    const { service, colonyRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({ ...airfieldColony(), fields: [] });
    await expect(service.buildAirfieldRump(1, 1, 1, 1)).rejects.toThrow(
      'Active airfield required',
    );
  });

  it('starts a hangar ship by consuming rump, energy and assigning crew', async () => {
    const {
      service,
      colonyRepo,
      shipClassRepo,
      storageRepo,
      shipRepo,
      colonyCrewService,
      spacecraftStatsService,
    } = createColonyService();
    const colony = airfieldColony();
    colonyRepo.findOne.mockResolvedValue(colony);
    shipClassRepo.findOneBy.mockResolvedValue(hangarShipClass);
    const storage: Record<number, any> = {
      21601: { colonyId: 1, commodityId: 21601, amount: 1 },
    };
    storageRepo.findOne.mockImplementation(
      async ({ where }: any) => storage[where.commodityId] ?? null,
    );
    shipRepo.save.mockImplementation(async (value: any) => ({
      id: 77,
      ...value,
    }));

    await service.startHangarShip(1, 1, 1, 'Launched Ship');

    expect(storage[21601].amount).toBe(0);
    expect(colony.energy).toBe(75);
    expect(shipRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Launched Ship',
        shipClassId: 1,
        starSystemId: 10,
        celestialObjectId: 20,
        status: 'DOCKED',
      }),
    );
    expect(colonyCrewService.assignCrewToShip).toHaveBeenCalledWith(
      1,
      77,
      [1, 2],
    );
    expect(spacecraftStatsService.applyStats).toHaveBeenCalled();
  });

  it('lands ships into the hangar and returns the rump commodity', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      cargoRepo,
      storageRepo,
      colonyCrewService,
    } = createColonyService();
    const colony = airfieldColony();
    colonyRepo.findOne.mockResolvedValue(colony);
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      crew: 2,
      cargoUsed: 0,
      cargoMax: 20,
    });
    shipClassRepo.findOneBy.mockResolvedValue(hangarShipClass);
    cargoRepo.find.mockResolvedValue([]);
    const storage: Record<number, any> = {};
    storageRepo.findOne.mockImplementation(
      async ({ where }: any) => storage[where.commodityId] ?? null,
    );
    storageRepo.create.mockImplementation((value: any) => {
      storage[value.commodityId] = { ...value };
      return storage[value.commodityId];
    });

    await service.landShip(1, 1, 7);

    expect(storage[21601].amount).toBe(1);
    expect(colonyCrewService.transferCrewFromShipToColony).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ id: 7 }),
      2,
    );
    expect(shipRepo.remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
    );
  });

  it('requires active airfield for landing but keeps disassembly separate', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      cargoRepo,
      storageRepo,
    } = createColonyService();
    const colony = { ...airfieldColony(), fields: [], energy: 50 };
    colonyRepo.findOne.mockResolvedValue(colony);
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      crew: 0,
      cargoUsed: 0,
      cargoMax: 20,
    });
    shipClassRepo.findOneBy.mockResolvedValue(hangarShipClass);
    cargoRepo.find.mockResolvedValue([]);
    storageRepo.findOne.mockResolvedValue(null);

    await expect(service.landShip(1, 1, 7)).rejects.toThrow(
      'Active airfield required',
    );
    await expect(service.disassembleShip(1, 1, 7)).resolves.toBeDefined();
  });
});
