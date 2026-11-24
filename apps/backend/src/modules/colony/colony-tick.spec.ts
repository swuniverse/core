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
  SpacecraftStatus: {
    IDLE: 'IDLE',
    DESTROYED: 'DESTROYED',
  },
  SpacecraftKind: { SHIP: 'SHIP', STATION: 'STATION' },
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

import { ColonyService, type ColonyTickEvent } from './colony.service';
import {
  ColonyStatsService,
  getColonyChangeable,
} from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import { BuildingLifecycleService } from './building-lifecycle.service';
import { ColonyDefenseService } from './colony-defense.service';
import { ColonyBuildingManagementService } from './colony-building-management.service';
import { ColonySocialService } from './colony-social.service';
import { ColonyEconomyService } from './colony-economy.service';
import { ColonyAbandonmentService } from './colony-abandonment.service';
import { ColonySettingsService } from './colony-settings.service';
import { ColonyTimingService } from './colony-timing.service';
import { ColonyFabricationService } from './colony-fabrication.service';
import { ColonyOrbitService } from './colony-orbit.service';
import { ColonyProjectionService } from './colony-projection.service';
import { ShipbuildingCoreService } from '../spacecraft/shipbuilding-core.service';
import { ColonyShipyardService } from './colony-shipyard.service';
import { ColonyConstructionService } from './colony-construction.service';
import { ColonyTickProcessorService } from './colony-tick-processor.service';
import { TickService } from '../tick/tick.service';
import {
  GameTickStatus,
  GameTickType,
} from '../tick/entities/game-tick-state.entity';
import { ResearchService } from '../research/research.service';
import { ResearchStatus } from '../research/entities/research.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WsEventType } from '@swuniverse/shared';

function createColonyService(overrides: Partial<Record<string, unknown>> = {}) {
  const colonyRepo = {
    save: jest.fn(async (value) => value),
    update: jest.fn(async () => ({ affected: 1 })),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    findOne: jest.fn(),
    manager: {
      save: jest.fn(async (value) => value),
      // Orbit orders run in one transaction over colony, fleet and assignments.
      transaction: jest.fn(
        async (work: (manager: unknown) => unknown): Promise<unknown> =>
          work(orbitTransactionManager),
      ),
    },
  };
  const fleetRepo = { findOne: jest.fn(async () => null) };
  const fieldRepo = {
    save: jest.fn(async (value) => value),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const statsRepo = { save: jest.fn(async (value) => value) };
  const userRepo = {
    findOneBy: jest.fn(),
    findOne: jest.fn(async () => ({ id: 1, faction: 'REBEL_ALLIANCE' })),
  };
  const shipRepo = {
    find: jest.fn(async () => []),
    findOne: jest.fn(),
    count: jest.fn(async () => 0),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    remove: jest.fn(async (value) => value),
    createQueryBuilder: jest.fn(() => {
      const qb: any = {};
      for (const m of ['select', 'addSelect', 'where', 'andWhere', 'groupBy']) qb[m] = () => qb;
      qb.getRawMany = async () => [];
      return qb;
    }),
  };
  const systemFieldRepo = {
    findOneByOrFail: jest.fn(async () => ({ id: 301 })),
  };
  const locationRepo = {
    findOneByOrFail: jest.fn(async () => ({ id: 401, systemFieldId: 301 })),
  };
  const cargoRepo = {
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
    create: jest.fn((value) => value),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(async () => ({ total: 0 })),
    })),
  };
  const shipClassRepo = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(async () => []),
    findBy: jest.fn(async () => []),
  };
  const shipBuildQueueRepo = {
    create: jest.fn((value) => value),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    // Locked shipyard steps re-read their job by id; default to the jobs `find` returned last.
    findOne: jest.fn(async (options?: any) => {
      const last = shipBuildQueueRepo.find.mock.results.at(-1);
      const jobs: any[] = last ? await last.value : [];
      return jobs.find((job) => job.id === options?.where?.id) ?? null;
    }),
    count: jest.fn(async () => 0),
    save: jest.fn(async (value) => value),
    delete: jest.fn(async () => ({ affected: 1 })),
  };
  const shipBuildplanRepo = {
    create: jest.fn((value) => value),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    findOne: jest.fn(),
    save: jest.fn(async (value) => ({ id: 1, ...value })),
    delete: jest.fn(async () => ({ affected: 1 })),
  };
  const orbitAssignmentRepo = {
    create: jest.fn((value) => value),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    findOne: jest.fn(),
    count: jest.fn(async () => 0),
    save: jest.fn(async (value) => ({ id: 1, ...value })),
    remove: jest.fn(async (value) => value),
    delete: jest.fn(async () => ({ affected: 1 })),
  };
  const orbitTransactionManager: {
    save: unknown;
    getRepository: jest.Mock<unknown, [{ name?: string }]>;
  } = {
    save: colonyRepo.manager.save,
    getRepository: jest.fn((entity: { name?: string }) => {
      switch (entity?.name) {
        case 'Colony':
          return colonyRepo;
        case 'Fleet':
          return fleetRepo;
        case 'ColonyOrbitAssignment':
          return orbitAssignmentRepo;
        case 'Spacecraft':
          return shipRepo;
        default:
          return statsRepo;
      }
    }),
  };
  const spacecraftModuleRepo = {
    create: jest.fn((value) => value),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    save: jest.fn(async (value) => value),
    remove: jest.fn(async (value) => value),
  };
  const crewAssignmentRepo = {
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    delete: jest.fn(async () => ({ affected: 1 })),
  };
  const crewRepo = {
    delete: jest.fn(async () => ({ affected: 1 })),
  };
  const fabricationQueueRepo = {
    create: jest.fn((value) => value),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
    delete: jest.fn(async () => ({ affected: 1 })),
  };
  const crewTrainingQueueRepo = {
    create: jest.fn((value) => value),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    save: jest.fn(async (value) => value),
    delete: jest.fn(async () => ({ affected: 1 })),
  };
  const depositMiningRepo = {
    find: jest.fn(async () => []),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
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
  const gameData: any = {
    getBuilding: jest.fn((id: number) => {
      const buildings: Record<number, any> = {
        72010100: {
          id: 72010100,
          name: 'Forschungszentrum Stufe I',
          epsProc: 3,
          researchPoints: 0,
          bevUse: 2,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [101],
          isUnique: false,
          costs: { buildTime: 120 },
          resourceCosts: [],
          production: [],
          functions: [],
        },
        73010100: {
          id: 73010100,
          name: 'Forschungszentrum Stufe II',
          epsProc: 6,
          researchPoints: 0,
          bevUse: 3,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [],
          isUnique: false,
          costs: { buildTime: 180 },
          resourceCosts: [],
          production: [],
          functions: [],
        },
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
          functions: [1],
        },
        81110100: {
          id: 81110100,
          name: 'Landeplattform',
          epsProc: 0,
          epsCost: 100,
          researchPoints: 0,
          bevUse: 0,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [101],
          isUnique: false,
          costs: { buildTime: 60 },
          resourceCosts: [
            { commodityId: 2, amount: 100 },
            { commodityId: 4, amount: 36 },
          ],
          production: [],
          functions: [4],
        },
        81120100: {
          id: 81120100,
          name: 'Raumbahnhof',
          epsProc: -5,
          epsCost: 170,
          researchPoints: 0,
          bevUse: 12,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [101],
          isUnique: false,
          costs: { buildTime: 7200 },
          resourceCosts: [
            { commodityId: 2, amount: 170 },
            { commodityId: 4, amount: 56 },
            { commodityId: 21, amount: 40 },
          ],
          production: [{ commodityId: 1801, amount: 14 }],
          functions: [4],
        },
        81130100: {
          id: 81130100,
          name: 'Raumhafen',
          epsProc: -7,
          epsCost: 240,
          researchPoints: 0,
          bevUse: 18,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [101],
          isUnique: false,
          costs: { buildTime: 14400 },
          resourceCosts: [
            { commodityId: 2, amount: 71 },
            { commodityId: 4, amount: 96 },
            { commodityId: 21, amount: 62 },
          ],
          production: [{ commodityId: 1801, amount: 20 }],
          functions: [4],
        },
        85130100: {
          id: 85130100,
          name: 'Korvettenwerft',
          epsProc: -5,
          researchPoints: 0,
          bevUse: 2,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [],
          isUnique: false,
          costs: { buildTime: 60 },
          resourceCosts: [],
          production: [],
          functions: [6],
        },
        81810100: {
          id: 81810100,
          name: 'Waffenmodulfertigung',
          epsProc: -5,
          researchPoints: 0,
          bevUse: 2,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [],
          isUnique: false,
          costs: { buildTime: 60 },
          resourceCosts: [],
          production: [],
          functions: [10],
        },
        81910100: {
          id: 81910100,
          name: 'Schildmodulfertigung',
          epsProc: -5,
          researchPoints: 0,
          bevUse: 2,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
          allowedFieldTypes: [],
          isUnique: false,
          costs: { buildTime: 60 },
          resourceCosts: [],
          production: [],
          functions: [13],
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
        550: {
          id: 550,
          name: 'Orbital Support',
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
          production: [{ commodityId: 1801, amount: 1 }],
        },
        650: {
          id: 650,
          name: 'Independent Effect Producer',
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
          production: [{ commodityId: 1201, amount: 1 }],
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
        401: {
          id: 401,
          name: 'Big Worker Building',
          epsProc: 0,
          researchPoints: 0,
          bevUse: 6,
          bevPro: 0,
          lager: 0,
          bonuses: { population: 0, storage: 0 },
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
      buildingId === 82010100
        ? [1]
        : buildingId === 81110100
          ? [4]
          : buildingId === 81120100
            ? [4]
            : buildingId === 81130100
              ? [4]
              : buildingId === 85110100
                ? [5]
                : buildingId === 85130100
                  ? [6]
                  : buildingId === 550
                    ? [4]
                    : buildingId === 85190100
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
                                  : buildingId === 84800100
                                    ? [29]
                                    : buildingId === 51010100
                                      ? [20]
                                      : buildingId === 100010100
                                        ? [24]
                                        : buildingId === 100020100
                                          ? [25]
                                          : buildingId === 100030100
                                            ? [26]
                                            : buildingId === 100040100
                                              ? [27]
                                              : buildingId === 100050100
                                                ? [28]
                                                : [],
    ),
    getBuildingFunction: jest.fn((id: number) => ({
      id,
      key: `FUNCTION_${id}`,
      name: `Function ${id}`,
    })),
    getAllBuildingFunctions: jest.fn(() =>
      [
        1, 2, 4, 5, 6, 7, 8, 9, 10, 13, 16, 20, 21, 22, 23, 24, 25, 26, 27, 28,
        29,
      ].map((id) => ({ id, key: `FUNCTION_${id}`, name: `Function ${id}` })),
    ),
    buildingHasFunction: jest.fn(
      (buildingId: number, functionId: number) =>
        (buildingId === 81810100 && functionId === 10) ||
        (buildingId === 81910100 && functionId === 13) ||
        (buildingId === 82010101 && functionId === 16) ||
        (buildingId === 81710100 && functionId === 9) ||
        (buildingId === 84800100 && functionId === 29) ||
        (buildingId === 51010100 && functionId === 20) ||
        ([81110100, 81120100, 81130100].includes(buildingId) &&
          functionId === 4) ||
        (buildingId === 85110100 && functionId === 5) ||
        (buildingId === 85190100 && functionId === 22) ||
        (buildingId === 85210100 && functionId === 6) ||
        (buildingId === 100010100 && functionId === 24) ||
        (buildingId === 100020100 && functionId === 25),
    ),
    getBuildingsForFieldType: jest.fn(() => []),
    getBuildingsForFieldTypes: jest.fn(() => []),
    getFieldBuildRule: jest.fn(
      (_buildingId: number, _fieldType: number) => null,
    ),
    getFieldBuildRuleForFieldTypes: jest.fn(),
    getCategoriesForTerrainTile: jest.fn(() => []),
    isCategoryOpenToAnyBuilding: jest.fn(() => false),
    getFieldCategoriesSummary: jest.fn(() => ({
      tiles: {},
      anyCategories: [],
    })),
    getTerraforming: jest.fn((id: string | number) =>
      String(id) === '101201' ||
      String(id) === '111101' ||
      String(id) === '11110103'
        ? String(id) === '101201'
          ? {
              id: 101201,
              fromFieldType: '101',
              toFieldType: '201',
              energyCost: 5,
              duration: 60,
              researchId: null,
              costs: [{ commodityId: 2, amount: 4 }],
            }
          : {
              id: Number(id),
              fromFieldType: String(id) === '11110103' ? '11103' : '111',
              toFieldType: String(id) === '11110103' ? '10103' : '101',
              energyCost: 5,
              duration: 60,
              researchId: null,
              costs: [{ commodityId: 2, amount: 4 }],
            }
        : undefined,
    ),
    getTerraformingForFieldType: jest.fn((fieldType: string | number) =>
      String(fieldType) === '11103'
        ? [
            {
              id: 11110103,
              fromFieldType: '11103',
              toFieldType: '10103',
              energyCost: 5,
              duration: 60,
              researchId: null,
              costs: [{ commodityId: 2, amount: 4 }],
            },
          ]
        : [],
    ),
    getAllTerraforming: jest.fn(() => [
      {
        id: 101201,
        fromFieldType: 101,
        toFieldType: 201,
        energyCost: 5,
        duration: 60,
        researchId: null,
        costs: [{ commodityId: 2, amount: 4 }],
      },
      {
        id: 201231,
        fromFieldType: 201,
        toFieldType: 231,
        energyCost: 50,
        duration: 9000,
        researchId: 101300,
        costs: [{ commodityId: 2, amount: 30 }],
      },
    ]),
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
    getBuildingUpgradesForBuilding: jest.fn((buildingId: number) =>
      buildingId === 72010100
        ? [
            {
              id: 7201010073,
              fromBuildingId: 72010100,
              toBuildingId: 73010100,
              researchId: 200201,
              description: 'Ausbau auf FZ II',
              energyCost: 7,
              costs: [{ commodityId: 1, amount: 4 }],
            },
          ]
        : [],
    ),
    getColonyClass: jest.fn(() => ({
      classId: 201,
      bevGrowthRate: 100,
      baseProduction: [{ commodityId: 1505, amount: 12 }],
    })),
    getColonyClassDeposits: jest.fn(() => [
      { commodityId: 1505, minAmount: 12, maxAmount: 12 },
    ]),
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
          shipyardGroup: 'OFFENSE_SYSTEMS',
          shipyardType: 'ENERGY_WEAPON',
          moduleLevel: 1,
          buildingFunctionIds: [10],
          energyCost: 20,
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
          shipyardGroup: 'DEFENSE_SYSTEMS',
          shipyardType: 'SHIELDS',
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
          energyCost: 4,
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
          faction: 'REBEL_ALLIANCE',
          shipyardType: 'ENERGY_WEAPON',
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
          shipyardGroup: 'DEFENSE_SYSTEMS',
          shipyardType: 'SHIELDS',
          moduleLevel: 1,
          buildingFunctionIds: [13],
          durationSeconds: 60,
          costs: [{ commodityId: 2, amount: 8 }],
        },
        10301: {
          itemKey: 'module.eps.k1',
          queueType: 'MODULE',
          displayName: 'Energieverteiler (Klasse 1)',
          outputCommodityId: 10301,
          moduleType: 'Energieverteiler',
          moduleCategory: 'SPECIAL',
          shipyardType: 'EPS',
          moduleLevel: 1,
        },
        10401: {
          itemKey: 'module.sublight.k1',
          queueType: 'MODULE',
          displayName: 'Sublight-Antrieb (Klasse 1)',
          outputCommodityId: 10401,
          moduleType: 'Ion-Triebwerk',
          moduleCategory: 'SUBLIGHT_ENGINE',
          shipyardType: 'SUBLIGHT_DRIVE',
          moduleLevel: 1,
        },
        10501: {
          itemKey: 'module.reactor.k1',
          queueType: 'MODULE',
          displayName: 'Hypermaterie-Reaktor (Klasse 1)',
          outputCommodityId: 10501,
          moduleType: 'Hypermaterie-Reaktor',
          moduleCategory: 'SPECIAL',
          shipyardType: 'REACTOR',
          moduleLevel: 1,
        },
        10801: {
          itemKey: 'module.torpedo.k1',
          queueType: 'MODULE',
          displayName: 'Protonentorpedo-Werfer (Klasse 1)',
          outputCommodityId: 10801,
          moduleType: 'Protonenraketen-System',
          moduleCategory: 'WEAPONS',
          shipyardType: 'TORPEDO_BANK',
          moduleLevel: 1,
        },
      } as Record<number, any>;
      return byOutput[commodityId];
    }),
    getShipClassDefByKey: jest.fn((key: string) => ({ key, buildCosts: [] })),
    hasFullyLoadedStart: jest.fn(() => false),
    getShipyardRumpStats: jest.fn(() => null),
    getShipClassSlotRule: jest.fn((category: string) => {
      const rules = [
        {
          category: 'CORVETTE',
          allowedBuildingFunctionIds: [5, 6, 22],
          moduleSlots: { ENERGY_WEAPON: 2, SHIELDS: 1 },
          layoutKey: 'corvette-layout',
          imageKey: 'corvette-layout',
          slots: [
            {
              slotId: 'corvette-weapons-1',
              moduleCategory: 'ENERGY_WEAPON',
              label: 'W1',
              anchorX: 10,
              anchorY: 10,
              calloutSide: 'left',
              order: 0,
            },
            {
              slotId: 'corvette-weapons-2',
              moduleCategory: 'ENERGY_WEAPON',
              label: 'W2',
              anchorX: 20,
              anchorY: 10,
              calloutSide: 'right',
              order: 1,
            },
            {
              slotId: 'corvette-shields-1',
              moduleCategory: 'SHIELDS',
              label: 'S1',
              anchorX: 15,
              anchorY: 20,
              calloutSide: 'top',
              order: 2,
            },
          ],
        },
        {
          category: 'FRIGATE',
          allowedBuildingFunctionIds: [7, 22],
          moduleSlots: { ENERGY_WEAPON: 4, SHIELDS: 2 },
          layoutKey: 'frigate-layout',
          imageKey: 'frigate-layout',
          slots: [
            {
              slotId: 'frigate-weapons-1',
              moduleCategory: 'ENERGY_WEAPON',
              label: 'W1',
              anchorX: 10,
              anchorY: 10,
              calloutSide: 'left',
              order: 0,
            },
            {
              slotId: 'frigate-weapons-2',
              moduleCategory: 'ENERGY_WEAPON',
              label: 'W2',
              anchorX: 20,
              anchorY: 10,
              calloutSide: 'right',
              order: 1,
            },
            {
              slotId: 'frigate-weapons-3',
              moduleCategory: 'ENERGY_WEAPON',
              label: 'W3',
              anchorX: 30,
              anchorY: 10,
              calloutSide: 'left',
              order: 2,
            },
            {
              slotId: 'frigate-weapons-4',
              moduleCategory: 'ENERGY_WEAPON',
              label: 'W4',
              anchorX: 40,
              anchorY: 10,
              calloutSide: 'right',
              order: 3,
            },
            {
              slotId: 'frigate-shields-1',
              moduleCategory: 'SHIELDS',
              label: 'S1',
              anchorX: 15,
              anchorY: 20,
              calloutSide: 'top',
              order: 4,
            },
            {
              slotId: 'frigate-shields-2',
              moduleCategory: 'SHIELDS',
              label: 'S2',
              anchorX: 25,
              anchorY: 20,
              calloutSide: 'bottom',
              order: 5,
            },
          ],
        },
      ];
      return rules.find((rule) => rule.category === category);
    }),
    getAllHangarShipDefs: jest.fn(() => [
      {
        shipClassKey: 'REBEL_SHUTTLE_LAAT',
        crewRequired: 5,
        hangarCommodityId: 21401,
        displayName: 'LAAT Shuttle Rumpf',
        airfieldFunctionId: 4,
        startEnergyCost: 90,
        buildEnergyCost: 90,
        buildCosts: [],
        defaultModuleCommodityIds: [10201, 10301, 10401, 10501, 10701, 10801],
        defaultTorpedoCommodityId: null,
        defaultTorpedoAmount: 0,
      },
    ]),
    getHangarShipDef: jest.fn((shipClassKey: string) =>
      shipClassKey === 'REBEL_SHUTTLE_LAAT'
        ? {
            shipClassKey: 'REBEL_SHUTTLE_LAAT',
            crewRequired: 5,
            hangarCommodityId: 21401,
            displayName: 'LAAT Shuttle Rumpf',
            airfieldFunctionId: 4,
            startEnergyCost: 90,
            buildEnergyCost: 90,
            buildCosts: [],
            defaultModuleCommodityIds: [
              10201, 10301, 10401, 10501, 10701, 10801,
            ],
            defaultTorpedoCommodityId: null,
            defaultTorpedoAmount: 0,
          }
        : undefined,
    ),
    getHangarShipDefByCommodity: jest.fn((commodityId: number) =>
      commodityId === 21401
        ? {
            shipClassKey: 'REBEL_SHUTTLE_LAAT',
            crewRequired: 5,
            hangarCommodityId: 21401,
            displayName: 'LAAT Shuttle Rumpf',
            airfieldFunctionId: 4,
            startEnergyCost: 90,
            buildEnergyCost: 90,
            buildCosts: [],
            defaultModuleCommodityIds: [
              10201, 10301, 10401, 10501, 10701, 10801,
            ],
            defaultTorpedoCommodityId: null,
            defaultTorpedoAmount: 0,
          }
        : undefined,
    ),
    getAllShipClassSlotRules: jest.fn(() => [
      {
        category: 'CORVETTE',
        allowedBuildingFunctionIds: [5, 6, 22],
        layoutKey: 'corvette-layout',
        imageKey: 'corvette-layout',
        moduleSlots: { ENERGY_WEAPON: 2, SHIELDS: 1 },
        slots: [
          {
            slotId: 'corvette-weapons-1',
            moduleCategory: 'ENERGY_WEAPON',
            label: 'W1',
            anchorX: 0,
            anchorY: 0,
            calloutSide: 'left',
            order: 0,
          },
          {
            slotId: 'corvette-weapons-2',
            moduleCategory: 'ENERGY_WEAPON',
            label: 'W2',
            anchorX: 0,
            anchorY: 0,
            calloutSide: 'right',
            order: 1,
          },
          {
            slotId: 'corvette-shields-1',
            moduleCategory: 'SHIELDS',
            label: 'S1',
            anchorX: 0,
            anchorY: 0,
            calloutSide: 'top',
            order: 2,
          },
        ],
      },
    ]),
    isShipyardModuleAllowedForShipClass: jest.fn(() => true),
    getAllFabricationItems: jest.fn(() => [
      {
        itemKey: 'module.weapon.turbolaser-k1',
        queueType: 'MODULE',
        displayName: 'Turbolaser (Klasse 1)',
        outputCommodityId: 10701,
        moduleType: 'Laser Cannon',
        moduleCategory: 'WEAPONS',
        shipyardGroup: 'OFFENSE_SYSTEMS',
        faction: 'REBEL_ALLIANCE',
        moduleLevel: 1,
        buildingFunctionIds: [10],
      },
      {
        itemKey: 'module.shield.particle-k1',
        queueType: 'MODULE',
        displayName: 'Partikelschild (Klasse 1)',
        outputCommodityId: 10201,
        moduleType: 'Shield Generator',
        moduleCategory: 'SHIELDS',
        shipyardGroup: 'DEFENSE_SYSTEMS',
        shipyardType: 'SHIELDS',
        moduleLevel: 1,
        buildingFunctionIds: [13],
      },
    ]),
    getSocialEffects: jest.fn(() => ({
      lifeStandardCommodityId: 1300,
      fallback: {
        primaryEffectCommodityId: 1001,
        secondaryEffectCommodityId: 1601,
      },
      factions: {},
    })),
    getTorpedoType: jest.fn((id: number) =>
      id === 81
        ? { id: 81, commodityId: 81, name: 'Micro', baseDamage: 90 }
        : undefined,
    ),
    getAllTorpedoTypes: jest.fn(() => [
      { id: 81, commodityId: 81, name: 'Micro', baseDamage: 90 },
    ]),
    getTorpedoTypeByCommodity: jest.fn((commodityId: number) =>
      commodityId === 81
        ? { id: 81, commodityId: 81, name: 'Micro', baseDamage: 90 }
        : undefined,
    ),
    getAllCommodities: jest.fn(() => [
      { id: 2, name: 'Doonium', nameShort: 'DOO' },
      { id: 3, name: 'Tibanna-Gas', nameShort: 'TIB' },
      { id: 7, name: 'Plasma', nameShort: 'PLA' },
      { id: 81, name: 'Micro-Protonentorpedo', nameShort: 'MPT' },
      { id: 10001, name: 'Ersatzteil', nameShort: 'ERS' },
      { id: 10002, name: 'Systemkomponente', nameShort: 'SYS' },
      {
        id: 21601,
        name: 'GR-75 Transportschiff Rumpf',
        nameShort: 'GR75',
        isShuttle: true,
      },
    ]),
    getCommodity: jest.fn((id: number) => ({
      id,
      name: String(id),
      isTradeOnly: id >= 1000,
      isEffect: id >= 1000,
      isSaveable: id < 1000,
      isDeposit: id === 1505,
      isShuttle: id >= 21600 && id < 21700,
    })),
  };

  gameData.getFieldBuildRuleForFieldTypes.mockImplementation(
    (buildingId: number, fieldTypes: number[]) => {
      for (const fieldType of fieldTypes) {
        const rule = gameData.getFieldBuildRule(buildingId, fieldType);
        if (rule) return rule;
      }
      return null;
    },
  );

  const statsService = new ColonyStatsService(gameData as any);
  const colonyEconomyService = new ColonyEconomyService(
    statsService as any,
    gameData as any,
  );
  const colonySocialService = new ColonySocialService(gameData as any);
  const colonyStorageService = new ColonyStorageService(storageRepo as any);
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'GAME_BUILD_TIME_MULTIPLIER') return undefined;
      if (key === 'GAME_MAIN_TICK_SCHEDULE_HOURS') return undefined;
      return undefined;
    }),
    ...(overrides.config as object | undefined),
  };
  const buildingLifecycleService = new BuildingLifecycleService(
    fieldRepo as any,
    statsRepo as any,
    config as any,
  );
  const colonyDefenseService = Object.assign(
    new ColonyDefenseService(colonyStorageService as any, gameData as any),
    {
      hasEnergyPhalanx: jest.fn(() => false),
      hasParticlePhalanx: jest.fn(() => false),
      hasAntiParticle: jest.fn(() => false),
    },
  );
  const colonyEventService = {
    createActionEvent: jest.fn(async (value) => value),
    listForColony: jest.fn(async () => []),
    markRead: jest.fn(async (value) => value),
    markAllRead: jest.fn(async () => ({ updated: 0 })),
    getUnreadCountForColony: jest.fn(async () => 0),
    getLatestForColony: jest.fn(async () => []),
  };
  const spacecraftStatsService = {
    applyStats: jest.fn((ship) => ship),
    fillResources: jest.fn((ship) => ship),
  };
  const buildingManagementService = new ColonyBuildingManagementService(
    fieldRepo as any,
    gameData as any,
    buildingLifecycleService as any,
    statsService as any,
    colonyStorageService as any,
  );
  const spacecraftTorpedoService = {
    getStorage: jest.fn<Promise<any[]>, any[]>(async () => []),
    loadFromColony: jest.fn(async () => undefined),
  };
  const colonyCrewService = {
    getRemainingCount: jest.fn(async () => 999),
    getTrainableCount: jest.fn(async () => 999),
    getInTrainingCount: jest.fn(async () => 0),
    getFreeAssignmentCount: jest.fn(async () => 999),
    getAssignedCount: jest.fn(async () => 0),
    getAssignedToShipCount: jest.fn(async () => 0),
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
    transferCrewFromColonyToShip: jest.fn(async () => undefined),
    transferCrewFromShipToColony: jest.fn(async () => undefined),
    landCrewWithShip: jest.fn(async () => undefined),
    removeExcessColonyCrew: jest.fn(async () => 0),
    createCrewOnColony: jest.fn(async () => []),
    getAssignedToColonyCount: jest.fn(async () => 0),
    getLocalCrewLimit: jest.fn(() => 10),
    getGlobalCrewLimit: jest.fn(async () => 100),
    getCrewCountsByColonyIds: jest.fn(async () => new Map<number, number>()),
  };
  const unlockResolver = {
    isBuildingUnlocked: jest.fn(async () => true),
    hasTech: jest.fn(async () => true),
    hasTechByName: jest.fn(async () => true),
    getCompletedTechIds: jest.fn(async () => new Set<number>()),
    isShipClassUnlocked: jest.fn(async () => true),
  };
  const ownershipService = {
    findOwnedColony: jest.fn(async (colonyId: number, userId: number) => {
      const colony = await colonyRepo.findOne({
        where: { id: colonyId, userId },
        relations: [
          'fields',
          'storage',
          'stats',
          'starSystem',
          'celestialObject',
        ],
      });
      if (!colony) throw new NotFoundException('Colony not found');
      return colony;
    }),
    findOwnedColonyWithStats: jest.fn(
      async (colonyId: number, userId: number) => {
        const colony = await colonyRepo.findOne({
          where: { id: colonyId, userId },
          relations: ['stats'],
        });
        if (!colony) throw new NotFoundException('Colony not found');
        if (!colony.stats)
          throw new BadRequestException('Colony stats missing');
        return colony;
      },
    ),
    findOwnedColonyWithChangeable: jest.fn(
      async (colonyId: number, userId: number) => {
        const colony = await colonyRepo.findOne({
          where: { id: colonyId, userId },
          relations: ['changeable', 'stats'],
        });
        if (!colony) throw new NotFoundException('Colony not found');
        getColonyChangeable(colony as any);
        return colony;
      },
    ),
  };
  const abandonmentService = new ColonyAbandonmentService(
    colonyRepo as any,
    userRepo as any,
    colonyEventService as any,
  );
  const settingsService = new ColonySettingsService(
    colonyRepo as any,
    statsRepo as any,
    storageRepo as any,
    ownershipService as any,
    gameData as any,
    colonyEventService as any,
    colonyStorageService,
  );
  const timingService = new ColonyTimingService(config as any);
  const fabricationService = new ColonyFabricationService(
    fabricationQueueRepo as any,
    userRepo as any,
    gameData as any,
    statsService,
    colonyStorageService,
    ownershipService as any,
    unlockResolver as any,
    colonyRepo as any,
  );
  const interactionContext = {
    load: jest.fn(async () => ({ targetOnVacation: false })),
  };
  const orbitService = new ColonyOrbitService(
    colonyRepo as any,
    statsRepo as any,
    orbitAssignmentRepo as any,
    shipRepo as any,
    cargoRepo as any,
    crewAssignmentRepo as any,
    storageRepo as any,
    shipClassRepo as any,
    ownershipService as any,
    gameData as any,
    statsService,
    colonyStorageService,
    colonyDefenseService as any,
    colonyEventService as any,
    spacecraftTorpedoService as any,
    interactionContext as any,
  );
  const projectionService = new ColonyProjectionService(
    colonyRepo as any,
    depositMiningRepo as any,
    storageRepo as any,
    shipRepo as any,
    cargoRepo as any,
    shipBuildQueueRepo as any,
    shipBuildplanRepo as any,
    orbitAssignmentRepo as any,
    spacecraftModuleRepo as any,
    fabricationQueueRepo as any,
    crewTrainingQueueRepo as any,
    shipClassRepo as any,
    userRepo as any,
    gameData as any,
    unlockResolver as any,
    colonyEconomyService,
    colonyCrewService as any,
    colonyDefenseService as any,
    colonySocialService as any,
    orbitService as any,
    spacecraftTorpedoService as any,
    timingService,
  );
  const messagingService = { sendSystem: jest.fn() };
  // Occupied BUILD/RETROFIT slots seen by the transactional slot check.
  const shipyardSlotCount = jest.fn(async (..._args: unknown[]) => 0);
  const entityRepo = (entity: { name?: string }) => {
    switch (entity?.name) {
      case 'ColonyStorage':
        return storageRepo;
      case 'ColonyShipBuildQueue':
        return shipBuildQueueRepo;
      case 'ColonyShipBuildplan':
        return shipBuildplanRepo;
      case 'Spacecraft':
        return shipRepo;
      case 'SpacecraftModule':
        return spacecraftModuleRepo;
      case 'ShipClassDef':
        return shipClassRepo;
      case 'User':
        return userRepo;
      case 'SystemField':
        return systemFieldRepo;
      case 'SpaceLocation':
        return locationRepo;
      case 'Colony':
        return colonyRepo;
      default:
        return { update: jest.fn(async () => ({ affected: 1 })) };
    }
  };
  const transactionManager = {
    findOne: jest.fn(async (entity: any, options: any) => {
      if (entity.name === 'ColonyChangeable') return null;
      if (entity.name === 'ShipClassDef')
        return (
          (await shipClassRepo.findOneBy(options.where)) ??
          (await shipBuildQueueRepo.find()).find(
            (job: any) => job.shipClassId === options.where.id,
          )?.shipClass
        );
      if (entity.name === 'Colony') return colonyRepo.findOne(options);
      return (entityRepo(entity) as any).findOne(options);
    }),
    findOneOrFail: jest.fn(async (entity: any, options: any) =>
      (entityRepo(entity) as any).findOneByOrFail(options.where),
    ),
    find: jest.fn(async (entity: any, options: any) => {
      if (entity.name === 'ColonyStorage') {
        const ids = new Set([
          ...(gameData.getShipClassDefByKey('CORVETTE')?.buildCosts ?? []).map(
            (cost: any) => cost.commodityId,
          ),
          ...gameData
            .getAllFabricationItems()
            .map((item: any) => item.outputCommodityId),
        ]);
        return (
          await Promise.all(
            [...ids].map(async (commodityId) => {
              const item = await storageRepo.findOne({
                where: { colonyId: options.where.colonyId, commodityId },
              });
              return item ? { ...item, commodityId } : null;
            }),
          )
        ).filter(Boolean);
      }
      return (entityRepo(entity) as any).find(options);
    }),
    create: jest.fn((entity: any, value: any) =>
      (entityRepo(entity) as any).create(value),
    ),
    count: shipyardSlotCount,
    save: jest.fn(async (entity: any, value: any) =>
      (entityRepo(entity) as any).save(value),
    ),
    update: jest.fn(async () => ({ affected: 1 })),
    remove: jest.fn(async (entity: any, value: any) => (entityRepo(entity) as any).remove(value)),
    getRepository: jest.fn(entityRepo),
  };
  const dataSource = {
    transaction: jest.fn(async (work: (manager: unknown) => unknown) =>
      work(transactionManager),
    ),
  };
  const shipbuildingCore = new ShipbuildingCoreService(
    gameData as any,
    unlockResolver as any,
    dataSource as any,
    spacecraftStatsService as any,
    timingService,
  );
  const shipyardService = new ColonyShipyardService(
    storageRepo as any,
    shipRepo as any,
    shipBuildQueueRepo as any,
    shipBuildplanRepo as any,
    spacecraftModuleRepo as any,
    shipClassRepo as any,
    gameData as any,
    ownershipService as any,
    colonyStorageService as any,
    statsService,
    orbitService as any,
    colonyEventService as any,
    messagingService as any,
    spacecraftStatsService as any,
    unlockResolver as any,
    timingService,
    userRepo as never,
    dataSource as never,
    shipbuildingCore,
  );
  const constructionService = new ColonyConstructionService(
    colonyRepo as any,
    fieldRepo as any,
    storageRepo as any,
    gameData as any,
    unlockResolver as any,
    statsService,
    colonyStorageService,
    buildingLifecycleService,
    buildingManagementService as any,
    colonyEventService as any,
    ownershipService as any,
    timingService,
  );

  const tickProcessorService = new ColonyTickProcessorService(
    colonyRepo as any,
    statsRepo as any,
    fieldRepo as any,
    storageRepo as any,
    depositMiningRepo as any,
    crewTrainingQueueRepo as any,
    userRepo as any,
    gameData as any,
    statsService,
    colonyStorageService,
    buildingLifecycleService,
    colonyCrewService as any,
    colonyEconomyService,
    colonyEventService as any,
    colonyDefenseService as any,
    fabricationService as any,
  );

  const flightSignatures = {
    countVisibleAt: jest.fn(async () => new Map<number, number>()),
  };
  const service = new ColonyService(
    colonyRepo as any,
    storageRepo as any,
    statsRepo as any,
    shipRepo as any,
    cargoRepo as any,
    {} as any,
    spacecraftModuleRepo as any,
    crewTrainingQueueRepo as any,
    shipClassRepo as any,
    systemFieldRepo as any,
    locationRepo as any,
    gameData as any,
    unlockResolver as any,
    statsService,
    colonyEconomyService,
    colonyStorageService,
    spacecraftStatsService as any,
    colonyCrewService as any,
    colonyDefenseService as any,
    colonyEventService as any,
    spacecraftTorpedoService as any,
    ownershipService as any,
    abandonmentService as any,
    settingsService as any,
    fabricationService as any,
    orbitService as any,
    projectionService as any,
    shipyardService as any,
    constructionService as any,
    tickProcessorService as any,
    undefined,
    flightSignatures as any,
  );

  return Object.assign(
    {
      service,
      colonyRepo,
      fieldRepo,
      storageRepo,
      statsRepo,
      userRepo,
      shipRepo,
      systemFieldRepo,
      locationRepo,
      cargoRepo,
      shipClassRepo,
      shipBuildQueueRepo,
      shipBuildplanRepo,
      orbitAssignmentRepo,
      flightSignatures,
      fleetRepo,
      spacecraftModuleRepo,
      crewAssignmentRepo,
      crewRepo,
      fabricationQueueRepo,
      crewTrainingQueueRepo,
      depositMiningRepo,
      gameData,
      unlockResolver,
      statsService,
      colonyEconomyService,
      colonyStorageService,
      buildingLifecycleService,
      buildingManagementService,
      colonySocialService,
      spacecraftStatsService,
      spacecraftTorpedoService,
      colonyCrewService,
      colonyDefenseService,
      colonyEventService,
      messagingService,
      ownershipService,
      abandonmentService,
      settingsService,
      timingService,
      fabricationService,
      orbitService,
      interactionContext,
      projectionService,
      shipyardService,
      shipyardSlotCount,
      transactionManager,
      dataSource,
      constructionService,
      tickProcessorService,
      config,
    },
    overrides,
  );
}

describe('colony give up', () => {
  it('abandons a non-starter colony while keeping storage and deactivating buildings', async () => {
    const { service, colonyRepo, userRepo, colonyEventService } = createColonyService();
    const field = {
      id: 1,
      buildingId: 82010100,
      isBuilding: false,
      isActive: true,
      activateAfterBuild: true,
      terraformingId: 101300,
      terraformingFinishesAt: new Date(),
    };
    const stats = {
      colonyId: 1,
      workers: 10,
      trainedCrew: 5,
      isBlockaded: true,
      shields: 50,
      shieldFrequency: 123,
      torpedoTypeId: 81,
      immigrationEnabled: true,
    };
    const colony = {
      id: 1,
      name: 'Ruinenwelt',
      userId: 1,
      isAbandoned: false,
      fields: [field],
      stats,
      changeable: getColonyChangeable({ id: 1, stats } as any),
      storage: [{ commodityId: 2, amount: 500 }],
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    userRepo.findOneBy.mockResolvedValue({ id: 1, starterColonyId: 99 });

    const removed: Array<[string, unknown]> = [];
    const tx = {
      delete: jest.fn(async (entity: { name: string }, criteria: unknown) => {
        removed.push([entity.name, criteria]);
      }),
      find: jest.fn(async () => [{ crewId: 7, colonyId: 1 }]),
      save: jest.fn(async (value) => value),
      getRepository: jest.fn(() => ({ save: jest.fn(async (value) => value) })),
    };
    colonyRepo.manager.transaction.mockImplementationOnce(async (work: (manager: unknown) => unknown) => work(tx));

    await expect(service.giveUpColony(1, 1, 'Ruinenwelt')).resolves.toEqual({
      abandoned: true,
      colonyId: 1,
    });

    expect(removed.map(([entity]) => entity)).toEqual([
      'ColonyFabricationQueue',
      'ColonyCrewTrainingQueue',
      'ColonyShipBuildQueue',
      'ColonyOrbitAssignment',
      'ColonySandbox',
      'CrewAssignment',
      'Crew',
    ]);
    expect(removed.slice(0, 4).every(([, criteria]) => (criteria as { colonyId: number }).colonyId === 1)).toBe(true);
    expect(removed[4][1]).toEqual({ sourceColonyId: 1 });
    expect(tx.find).toHaveBeenCalledWith(expect.anything(), { where: { colonyId: 1, userId: 1 } });
    expect(tx.save).toHaveBeenCalledWith([
      expect.objectContaining({
        buildingId: 82010100,
        isBuilding: false,
        isActive: false,
        terraformingId: null,
        terraformingFinishesAt: null,
      }),
    ]);
    expect(tx.save).toHaveBeenCalledWith(
      expect.objectContaining({
        workers: 0,
        trainedCrew: 0,
        isBlockaded: false,
        shields: 0,
        torpedoTypeId: null,
        immigrationEnabled: false,
      }),
    );
    expect(tx.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        previousUserId: 1,
        isAbandoned: true,
        abandonedAt: expect.any(Date),
      }),
    );
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'COLONY_ABANDONED' }),
    );
  });

  it('blocks starter colony give up and wrong confirmation', async () => {
    const { service, colonyRepo, userRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      name: 'Home',
      userId: 1,
      isAbandoned: false,
      fields: [],
      stats: null,
    });
    userRepo.findOneBy.mockResolvedValueOnce({ id: 1, starterColonyId: 1 });
    await expect(service.giveUpColony(1, 1, 'Home')).rejects.toThrow(
      'Starter colony cannot be abandoned',
    );

    userRepo.findOneBy.mockResolvedValueOnce({ id: 1, starterColonyId: 99 });
    await expect(service.giveUpColony(1, 1, 'Wrong')).rejects.toThrow(
      'Confirmation does not match colony name',
    );
  });
});

describe('colony tick shortage priority', () => {
  const field = (id: number, fieldIndex: number, buildingId = id) => ({
    id, fieldIndex, buildingId, isActive: true, isBuilding: false,
  });
  function setup(
    definitions: Record<number, Record<string, unknown>>,
    fields: ReturnType<typeof field>[],
    housing = 20,
  ) {
    const fixture = createColonyService();
    const originalBuilding = fixture.gameData.getBuilding.getMockImplementation();
    const base = fixture.gameData.getBuilding(401);
    fixture.gameData.getBuilding.mockImplementation((id: number) =>
      definitions[id]
        ? { ...base, bevUse: 0, bevPro: 0, production: [], ...definitions[id] }
        : originalBuilding(id),
    );
    fixture.gameData.getColonyClass.mockReturnValue({ baseProduction: [] });
    const workers = fields.reduce((sum, entry) =>
      sum + (fixture.gameData.getBuilding(entry.buildingId).bevUse || 0), 0);
    const colony = {
      id: 1, userId: 1, colonyClassId: 999,
      energy: 0, energyMax: 100, population: 20, populationMax: housing,
      storageMax: 100, storageUsed: 0, fields,
      stats: { workers, workless: 20 - workers, maxPopulation: housing },
    };
    const events: ColonyTickEvent[] = [];
    return { ...fixture, colony, events,
      run: () => fixture.tickProcessorService.balanceAndProduce(colony as never, events) };
  }

  it('handles a commodity shortage before simultaneous energy shortage', async () => {
    const { run, events } = setup({
      1: { name: 'Energieverbraucher', epsProc: -1 },
      2: { name: 'Warenverbraucher', epsProc: -1, production: [{ commodityId: 2, amount: -1 }] },
    }, [field(1, 0), field(2, 10)]);
    await run();
    expect(events.map((event) => event.fieldIndex)).toEqual([10, 0]);
    expect(events[0]).toMatchObject({ buildingName: 'Warenverbraucher', commodityId: 2 });
    expect(events[1]).toMatchObject({ buildingName: 'Energieverbraucher', reason: 'Energie' });
  });

  it('deactivates employers after housing is lost, before checking energy', async () => {
    const { run, colony, events } = setup({
      1: { name: 'Energieverbraucher', epsProc: -1 },
      2: { name: 'Arbeitgeber', bevUse: 6 },
      3: { name: 'Wohngebäude', bevPro: 10, production: [{ commodityId: 2, amount: -1 }] },
    }, [field(1, 0), field(2, 10), field(3, 20)], 10);
    await run();
    expect(events.map((event) => event.fieldIndex)).toEqual([20, 10, 0]);
    expect(events[1]).toMatchObject({ buildingName: 'Arbeitgeber', reason: 'Wohnraum' });
    expect(colony.stats).toMatchObject({ workers: 0, workless: 20, maxPopulation: 0 });
  });

  it('checks every commodity once per round before energy and then repeats', async () => {
    const { run, events } = setup({
      1: { name: 'Verbraucher A1', production: [{ commodityId: 2, amount: -1 }] },
      2: { name: 'Verbraucher A2', production: [{ commodityId: 2, amount: -1 }] },
      3: { name: 'Verbraucher B', production: [{ commodityId: 3, amount: -1 }] },
      4: { name: 'Energieverbraucher', epsProc: -1 },
    }, [field(4, 4), field(3, 3), field(2, 2), field(1, 1)]);
    await run();
    expect(events.map((event) => event.fieldIndex)).toEqual([1, 3, 4, 2]);
  });

  it('recalculates later commodity balances after a multi-commodity consumer is removed', async () => {
    const { run, colony, events } = setup({
      1: { name: 'Mehrfachverbraucher', production: [{ commodityId: 2, amount: -1 }, { commodityId: 3, amount: -1 }] },
      2: { name: 'Verbraucher B', production: [{ commodityId: 3, amount: -1 }] },
      3: { name: 'Erzeuger B', production: [{ commodityId: 3, amount: 1 }] },
    }, [field(1, 1), field(2, 2), field(3, 3)]);
    await run();
    expect(events.map((event) => event.fieldIndex)).toEqual([1]);
    expect(colony.fields[1].isActive).toBe(true);
  });

  it.each(['commodity', 'housing', 'energy'] as const)(
    'allows the colony central to deactivate for %s shortage', async (shortage) => {
      const { run, colony, events } = setup({
        82010100: { name: 'Koloniezentrale',
          ...(shortage === 'commodity' ? { production: [{ commodityId: 2, amount: -1 }] } : {}),
          ...(shortage === 'housing' ? { bevUse: 1 } : {}),
          ...(shortage === 'energy' ? { epsProc: -1 } : {}),
        },
      }, [field(1, 1, 82010100)], shortage === 'housing' ? 0 : 20);
      await run();
      expect(colony.fields[0].isActive).toBe(false);
      expect(events).toEqual([expect.objectContaining({ buildingName: 'Koloniezentrale' })]);
    },
  );

  it('treats an exhausted deposit as a commodity shortage before energy', async () => {
    const { run, depositMiningRepo, events } = setup({
      1: { name: 'Energieverbraucher', epsProc: -1 },
      2: { name: 'Förderanlage', production: [{ commodityId: 1505, amount: -3 }] },
    }, [field(1, 1), field(2, 2)]);
    depositMiningRepo.findOne.mockResolvedValue({ amountLeft: 0 });
    await run();
    expect(events.map((event) => event.fieldIndex)).toEqual([2, 1]);
    expect(events[0]).toMatchObject({ buildingName: 'Förderanlage', commodityId: 1505 });
  });

  it('continues until energy is balanced even when more than 100 removals are needed', async () => {
    const fields = Array.from({ length: 105 }, (_, index) => field(index + 1, index, 1));
    const { run, events } = setup({ 1: { name: 'Energieverbraucher', epsProc: -1 } }, fields);
    await run();
    expect(fields.every((entry) => !entry.isActive)).toBe(true);
    expect(events).toHaveLength(105);
  });
});

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
    expect(summary.researchPoints).toBe(2);
    expect(summary.effectivePopulationMax).toBe(100);
    expect(summary.effectiveStorageMax).toBe(4000);
  });

  it.each(['REBEL_ALLIANCE', 'GALACTIC_EMPIRE'])(
    'grows a %s colony by STU getGrowth without a faction factor',
    async (faction) => {
      const { service, userRepo } = createColonyService();
      userRepo.findOneBy.mockResolvedValue({ id: 7, faction });
      const colony = {
        id: 1,
        userId: 7,
        colonyClassId: 201,
        population: 84,
        populationMax: 168,
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

      await service.growPopulation(colony as never);

      // ceil((168 - 84) / 3 / 100 * bevGrowthRate * lifeStandard / 50) for both factions.
      expect(colony.population).toBe(141);
    },
  );

  it('lets workless emigrate in the same tick when housing is lost (STU ProceedMigration)', async () => {
    const { service } = createColonyService();
    const colony = {
      id: 1,
      userId: 7,
      colonyClassId: 201,
      population: 84,
      populationMax: 60,
      storageMax: 3000,
      stats: {
        workers: 24,
        workless: 60,
        maxPopulation: 60,
        populationLimit: 0,
        immigrationEnabled: true,
      },
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
      ],
    };

    await service.growPopulation(colony as never);

    expect(colony.stats.workless).toBeLessThan(60);
    expect(colony.stats.workers).toBe(24);
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
      stats: { workers: 24, workless: 60, maxPopulation: 168 },
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
      ],
    };

    const summary = statsService.calculateSummary(colony as any);

    expect(summary.housingBonus).toBe(84);
    expect(summary.effectivePopulationMax).toBe(168);
    expect(summary.freeHousing).toBe(84);
  });

  it('uses stats population for STU-style full housing numbers', () => {
    const { service, statsService } = createColonyService();
    const colony = {
      id: 1,
      colonyClassId: 201,
      population: 999,
      populationMax: 0,
      storageMax: 3000,
      stats: {
        workers: 450,
        workless: 180,
        maxPopulation: 630,
        populationLimit: 0,
        immigrationEnabled: true,
      },
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
      ],
    };

    const summary = statsService.calculateSummary(colony as any);

    expect(summary.maxHousing).toBe(630);
    expect(summary.freeHousing).toBe(0);
    expect((service as any).calculatePopulationGrowth(colony, summary)).toBe(0);
  });

  it('guards drifted colony population and housing with STU changeable stats', () => {
    const { service, statsService } = createColonyService();
    const colony = {
      id: 1,
      colonyClassId: 201,
      population: 184,
      populationMax: 100,
      storageMax: 3000,
      stats: {
        workers: 20,
        workless: 132,
        maxPopulation: 100,
        populationLimit: 0,
        immigrationEnabled: true,
      },
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
      ],
    };

    const summary = statsService.calculateSummary(colony as any);

    expect(colony.stats.workers + colony.stats.workless).toBe(152);
    expect(summary.maxHousing).toBe(152);
    expect(summary.freeHousing).toBe(0);
    expect((service as any).calculatePopulationGrowth(colony, summary)).toBe(0);
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

  it('uses authoritative changeable state to disable immigration', () => {
    const { service, statsService } = createColonyService();
    const colony = {
      id: 1,
      colonyClassId: 201,
      population: 84,
      populationMax: 168,
      storageMax: 3000,
      stats: {
        workers: 24,
        workless: 60,
        maxPopulation: 168,
        populationLimit: 0,
        immigrationEnabled: true,
      },
      changeable: {
        workers: 24,
        workless: 60,
        maxPopulation: 168,
        populationLimit: 0,
        immigrationEnabled: false,
        maxEnergy: 100,
        maxStorage: 3000,
      },
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
      ],
    };

    expect(
      service.calculatePopulationGrowth(
        colony as never,
        statsService.calculateSummary(colony as never),
      ),
    ).toBe(0);
  });

  it('uses the authoritative changeable population limit to cap immigration', () => {
    const { service, statsService } = createColonyService();
    const colony = {
      id: 1,
      colonyClassId: 201,
      population: 84,
      populationMax: 168,
      storageMax: 3000,
      stats: {
        workers: 24,
        workless: 60,
        maxPopulation: 168,
        populationLimit: 0,
        immigrationEnabled: true,
      },
      changeable: {
        workers: 24,
        workless: 60,
        maxPopulation: 168,
        populationLimit: 100,
        immigrationEnabled: true,
        maxEnergy: 100,
        maxStorage: 3000,
      },
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
      ],
    };

    expect(
      service.calculatePopulationGrowth(
        colony as never,
        statsService.calculateSummary(colony as never),
      ),
    ).toBe(16);
  });

  it('emigrates a deterministic number of unemployed residents when housing is exceeded and skips growth', async () => {
    const { service, colonyEventService, tickProcessorService } =
      createColonyService();
    (tickProcessorService as any).randomInt = jest.fn(() => 4);
    const colony = {
      id: 1,
      userId: 7,
      colonyClassId: 201,
      population: 30,
      populationMax: 20,
      storageMax: 3000,
      stats: {
        workers: 18,
        workless: 12,
        maxPopulation: 20,
        populationLimit: 0,
        immigrationEnabled: true,
      },
      changeable: {
        workers: 18,
        workless: 12,
        maxPopulation: 20,
        populationLimit: 0,
        immigrationEnabled: true,
        maxEnergy: 100,
        maxStorage: 3000,
      },
      fields: [],
    };

    jest
      .spyOn((service as any).colonyStatsService, 'calculateSummary')
      .mockReturnValue({
        maxHousing: 20,
        effectivePopulationMax: 20,
        productionDelta: new Map([[1300, 30]]),
      });

    await service.growPopulation(colony as never);

    expect(colony.changeable).toMatchObject({ workers: 18, workless: 8 });
    expect(colony.population).toBe(26);
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        colonyId: 1,
        userId: 7,
        type: 'EMIGRATION',
        message: '4 Einwohner sind ausgewandert',
        payload: { amount: 4, reason: 'HOUSING' },
      }),
    );
  });

  it('removes only unemployed residents above the population limit and then grows', async () => {
    const { service, colonyEventService } = createColonyService();
    const colony = {
      id: 1,
      userId: 7,
      colonyClassId: 201,
      population: 30,
      populationMax: 60,
      storageMax: 3000,
      stats: {
        workers: 20,
        workless: 10,
        maxPopulation: 60,
        populationLimit: 25,
        immigrationEnabled: true,
      },
      fields: [],
    };

    await service.growPopulation(colony as never);

    expect(colony.stats).toMatchObject({ workers: 20, workless: 5 });
    expect(colony.population).toBe(25);
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EMIGRATION',
        message: 'Es sind 5 Arbeitslose ausgewandert',
        payload: { amount: 5, reason: 'POPULATION_LIMIT' },
      }),
    );
  });

  it('removes all unemployed residents when workers fill the population limit', async () => {
    const { service, colonyEventService } = createColonyService();
    const colony = {
      id: 1,
      userId: 7,
      colonyClassId: 201,
      population: 30,
      populationMax: 60,
      storageMax: 3000,
      stats: {
        workers: 25,
        workless: 5,
        maxPopulation: 60,
        populationLimit: 20,
        immigrationEnabled: true,
      },
      fields: [],
    };

    await service.growPopulation(colony as never);

    expect(colony.stats).toMatchObject({ workers: 25, workless: 0 });
    expect(colony.population).toBe(25);
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EMIGRATION',
        message: 'Es sind alle Arbeitslosen ausgewandert',
        payload: { amount: 5, reason: 'POPULATION_LIMIT' },
      }),
    );
  });

  it('does not emigrate workers when no unemployed residents exist', async () => {
    const { service, colonyEventService } = createColonyService();
    const colony = {
      id: 1,
      userId: 7,
      colonyClassId: 201,
      population: 30,
      populationMax: 20,
      storageMax: 3000,
      stats: {
        workers: 30,
        workless: 0,
        maxPopulation: 20,
        populationLimit: 0,
        immigrationEnabled: true,
      },
      fields: [],
    };

    await service.growPopulation(colony as never);

    expect(colony.stats).toMatchObject({ workers: 30, workless: 0 });
    expect(colonyEventService.createActionEvent).not.toHaveBeenCalled();
  });

  it('admits population after due housing completes in the same main tick', async () => {
    const { service, fieldRepo } = createColonyService();
    const field = {
      id: 1,
      fieldIndex: 4,
      buildingId: 82010100,
      isBuilding: true,
      isActive: false,
      activateAfterBuild: true,
      buildProgress: 0,
      buildFinishesAt: new Date(Date.now() - 1),
      integrity: 0,
      maxIntegrity: 0,
    };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 201,
      population: 84,
      populationMax: 84,
      energy: 0,
      energyMax: 100,
      storageMax: 3000,
      storageUsed: 0,
      stats: {
        workers: 24,
        workless: 60,
        maxPopulation: 84,
        populationLimit: 84,
        immigrationEnabled: false,
      },
      changeable: {
        workers: 24,
        workless: 60,
        maxPopulation: 84,
        populationLimit: 0,
        immigrationEnabled: true,
        energy: 0,
        maxEnergy: 100,
        maxStorage: 3000,
      },
      fields: [field],
      storage: [],
    };

    const result = await service.processTick(colony as never);

    expect(field).toMatchObject({
      isBuilding: false,
      isActive: true,
      buildProgress: 100,
      buildFinishesAt: null,
    });
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
    expect(colony.changeable.maxPopulation).toBe(168);
    expect(colony.changeable.workless).toBe(117);
    expect(colony.population).toBe(141);
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: 'BUILDING_FINISHED',
        fieldIndex: 4,
        buildingId: 82010100,
        activated: true,
      }),
    );
  });

  it('reports why a completed building could not be activated', async () => {
    const { service } = createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      buildingId: 400,
      isBuilding: true,
      isActive: false,
      activateAfterBuild: true,
      buildProgress: 0,
      buildFinishesAt: new Date(Date.now() - 1),
      integrity: 0,
      maxIntegrity: 0,
    };
    const colony = {
      stats: { workers: 10, workless: 0 },
      changeable: { workers: 10, workless: 0, maxPopulation: 10 },
      fields: [field],
    };
    const events: ColonyTickEvent[] = [];

    await service.checkBuildingCompletions(colony as never, events);

    expect(field.isActive).toBe(false);
    expect(events).toContainEqual({
      type: 'BUILDING_FINISHED',
      fieldIndex: 5,
      buildingId: 400,
      buildingName: 'Worker Building',
      activated: false,
      reason: 'Nicht genug freie Arbeiter',
    });
  });

  it('auto-activates completed passive buildings when workers are available', async () => {
    const { service, gameData } = createColonyService();
    const definition = gameData.getBuilding(400);
    definition.isActivateable = false;
    const field = {
      id: 1,
      fieldIndex: 5,
      buildingId: 400,
      isBuilding: true,
      isActive: false,
      activateAfterBuild: true,
      buildProgress: 0,
      buildFinishesAt: new Date(Date.now() - 1),
      integrity: 0,
      maxIntegrity: 0,
    };
    const colony = {
      stats: { workers: 0, workless: 4 },
      changeable: { workers: 0, workless: 4, maxPopulation: 10 },
      fields: [field],
    };
    const events: ColonyTickEvent[] = [];

    await service.checkBuildingCompletions(colony as never, events);

    expect(field.isActive).toBe(true);
    expect(colony.changeable).toMatchObject({ workers: 4, workless: 0 });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'BUILDING_FINISHED',
        fieldIndex: 5,
        activated: true,
      }),
    );
  });

  it('updates colony options with owner validation', async () => {
    const { service, colonyRepo } = createColonyService();
    const stats = {
      colonyId: 1,
      populationLimit: 0,
      immigrationEnabled: true,
      colonyMessage: null,
    };
    colonyRepo.findOne.mockResolvedValue({ id: 1, userId: 1, stats });

    await expect(service.setPopulationLimit(1, 1, -1)).rejects.toThrow(
      'Population limit must be zero or higher',
    );

    await expect(service.setPopulationLimit(1, 1, 42)).resolves.toEqual({
      populationLimit: 42,
    });
    expect(colonyRepo.manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ populationLimit: 42 }),
    );

    await expect(service.setPopulationLimit(1, 1, 0)).resolves.toEqual({
      populationLimit: 0,
    });
    await expect(service.setImmigration(1, 1, false)).resolves.toEqual({
      immigrationEnabled: false,
    });
    await expect(
      service.setColonyMessage(1, 1, ' Willkommen in der Randkolonie '),
    ).resolves.toEqual({
      colonyMessage: 'Willkommen in der Randkolonie',
    });
    await expect(service.setColonyMessage(1, 1, '')).resolves.toEqual({
      colonyMessage: null,
    });
  });

  it('rejects invalid colony names', async () => {
    const { service } = createColonyService();

    await expect(service.rename(1, 1, '  ')).rejects.toThrow(
      'Colony name is too short',
    );
    await expect(service.rename(1, 1, 'ab')).rejects.toThrow(
      'Colony name is too short',
    );
  });

  it('keeps colony population and workless stats synchronized during immigration', async () => {
    const { service, colonyRepo } = createColonyService();
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
    expect(colonyRepo.save).toHaveBeenCalledWith(colony);
    expect(colonyRepo.save).toHaveBeenCalledWith(colony);
  });

  it('builds effective economy state with active functions and production categories', () => {
    const { statsService } = createColonyService();
    const colony = {
      id: 1,
      colonyClassId: 201,
      population: 84,
      populationMax: 0,
      storageMax: 3000,
      storageUsed: 100,
      energy: 50,
      energyMax: 100,
      stats: {
        workers: 24,
        workless: 60,
        maxPopulation: 168,
        maxEnergy: 100,
        maxStorage: 3000,
      },
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
      ],
    };

    const state = statsService.calculateSummary(colony as any).effectiveState;

    expect(state.population).toMatchObject({
      current: 84,
      workers: 24,
      available: 60,
      freeHousing: 84,
      maxHousing: 168,
    });
    expect(state.energy).toMatchObject({
      current: 50,
      max: 100,
      delta: 16,
      production: 16,
      consumption: 0,
    });
    expect(state.storage.free).toBe(3900);
    expect(state.functions.active).toContainEqual(
      expect.objectContaining({ id: 1, name: 'Function 1' }),
    );
    expect(state.production.storage).toContainEqual({
      commodityId: 2,
      amount: 5,
    });
    expect(state.production.effects).toContainEqual({
      commodityId: 1300,
      amount: 84,
    });
    expect(state.production.deposits).toContainEqual({
      commodityId: 1505,
      amount: 12,
    });
  });

  it('builds feature access from present buildings and active functions', () => {
    const { colonyEconomyService } = createColonyService();
    const base = {
      id: 1,
      colonyClassId: 999,
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
      ],
    };

    let access = colonyEconomyService.buildFeatureAccess(base as any);
    expect(access.tabs.info.visible).toBe(true);
    expect(access.tabs.build.visible).toBe(true);
    expect(access.tabs.events.visible).toBe(true);
    expect(access.tabs.crew.visible).toBe(true);
    expect(access.tabs.shipyard.visible).toBe(false);
    expect(access.tabs.fabrication.visible).toBe(false);

    access = colonyEconomyService.buildFeatureAccess({
      ...base,
      fields: [
        ...base.fields,
        { id: 2, buildingId: 84800100, isBuilding: false, isActive: false },
        { id: 3, buildingId: 85110100, isBuilding: false, isActive: false },
        { id: 4, buildingId: 85190100, isBuilding: false, isActive: false },
      ],
    } as any);
    expect(access.tabs.fabrication.visible).toBe(true);
    expect(access.tabs.fabrication.presentFunctionIds).toContain(29);
    expect(access.tabs.fabrication.activeFunctionIds).not.toContain(29);
    expect(access.tabs.shipyard.visible).toBe(true);
    expect(access.tabs.shipyard.presentFunctionIds).toEqual(
      expect.arrayContaining([5]),
    );
    expect(access.tabs.shipyard.presentFunctionIds).not.toContain(22);
    expect(access.tabs.shipyard.activeFunctionIds).toHaveLength(0);
    expect(access.tabs.hangar.visible).toBe(true);
    expect(access.tabs.hangar.presentFunctionIds).toEqual([5]);
    expect(access.tabs.hangar.activeFunctionIds).toHaveLength(0);
    expect(access.functions.groups.fighterShipyards.presentFunctionIds).toEqual(
      [5],
    );
    expect(access.functions.groups.shipyards.presentFunctionIds).toEqual([]);
    expect(access.functions.groups.repairShipyards.presentFunctionIds).toEqual([
      22,
    ]);
    expect(access.functions.groups.fabrication.presentFunctionIds).toEqual([]);
    expect(
      access.functions.groups.fabricationSupport.presentFunctionIds,
    ).toEqual([29]);

    access = colonyEconomyService.buildFeatureAccess({
      ...base,
      fields: [
        ...base.fields,
        { id: 2, buildingId: 84800100, isBuilding: false, isActive: true },
        { id: 3, buildingId: 85110100, isBuilding: false, isActive: true },
        { id: 4, buildingId: 85190100, isBuilding: false, isActive: true },
      ],
    } as any);
    expect(access.tabs.fabrication.activeFunctionIds).toContain(29);
    expect(access.tabs.shipyard.activeFunctionIds).toEqual(
      expect.arrayContaining([5]),
    );
    expect(access.tabs.shipyard.activeFunctionIds).not.toContain(22);
    expect(access.tabs.hangar.activeFunctionIds).toEqual([5]);
    expect(access.functions.groups.fighterShipyards.activeFunctionIds).toEqual([
      5,
    ]);
    expect(access.functions.groups.shipyards.activeFunctionIds).toEqual([]);
    expect(access.functions.groups.repairShipyards.activeFunctionIds).toEqual([
      22,
    ]);
    expect(access.functions.groups.fabrication.activeFunctionIds).toEqual([]);
    expect(
      access.functions.groups.fabricationSupport.activeFunctionIds,
    ).toEqual([29]);
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
  "researchPoints": 2,
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

  it('returns effective population in colony overview summaries', async () => {
    const { service, colonyRepo, colonyCrewService } = createColonyService();
    colonyRepo.find.mockResolvedValue([
      {
        id: 1,
        userId: 1,
        name: 'Home',
        colonyClassId: 201,
        population: 84,
        populationMax: 100,
        energy: 50,
        energyMax: 100,
        storageUsed: 25,
        storageMax: 3000,
        stats: {
          workers: 24,
          workless: 252,
          maxPopulation: 312,
          maxEnergy: 100,
          maxStorage: 3000,
          immigrationEnabled: true,
          isBlockaded: true,
        },
        fields: [],
        posX: 5,
        posY: 19,
        starSystem: {
          name: 'Kelaris VI',
          cx: 116,
          cy: 76,
          systemTypeId: 1001,
        },
        celestialObject: null,
      } as any,
    ]);
    (colonyCrewService.getCrewCountsByColonyIds as jest.Mock).mockResolvedValue(
      new Map([[1, 0]]),
    );

    const result = await service.findAllByUser(1);

    expect(colonyRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: [
          'starSystem',
          'systemField',
          'celestialObject',
          'storage',
          'fields',
          'stats',
          'changeable',
        ],
      }),
    );
    expect(result[0]).toMatchObject({
      population: 276,
      populationMax: 312,
      energyMax: 100,
      storageMax: 3000,
      locationLabel: 'Kelaris VI',
      signatureCount: 0,
      overview: {
        location: {
          x: 5,
          y: 19,
          systemName: 'Kelaris VI',
          systemX: 116,
          systemY: 76,
          systemTypeId: 1001,
        },
        status: { blocked: true, defended: false },
        population: { current: 276, max: 312, immigration: 0 },
        energy: { current: 50, max: 100, production: 0 },
        storage: { current: 25, max: 3000, production: 0 },
      },
    });
    expect(result[0].fields).toBeUndefined();
  });

  it('filters terraforming catalog by completed research', async () => {
    const { service, unlockResolver } = createColonyService();

    unlockResolver.getCompletedTechIds.mockResolvedValueOnce(new Set());
    await expect(service.getAvailableTerraforming(1)).resolves.toEqual([
      expect.objectContaining({ id: 101201 }),
    ]);

    unlockResolver.getCompletedTechIds.mockResolvedValueOnce(new Set([101300]));
    await expect(service.getAvailableTerraforming(1)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 101201 }),
        expect.objectContaining({ id: 201231 }),
      ]),
    );
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

    await expect(service.terraformField(1, 1, 5, '101201')).rejects.toThrow(
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

    await expect(service.terraformField(1, 1, 5, '999')).rejects.toThrow(
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

    await service.terraformField(1, 1, 5, '101201');

    expect(storage.amount).toBe(6);
    expect(colony.energy).toBe(45);
    expect(field.terraformingId).toBe(101201);
    expect(field.terraformingFinishesAt).toBeInstanceOf(Date);

    field.terraformingFinishesAt = new Date(Date.now() - 1000);
    await service.checkBuildingCompletions(colony as any);

    expect(field.fieldType).toBe(201);
    expect(field.terrainTileId).toBe('201');
    expect(field.terraformingId).toBeNull();
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
  });

  it('preserves a bonus field through terraforming completion', async () => {
    const { service, colonyRepo, storageRepo, fieldRepo } =
      createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 111,
      terrainTileId: 11103,
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
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue({
      colonyId: 1,
      commodityId: 2,
      amount: 10,
    });

    await service.terraformField(1, 1, 5, '111101');
    expect(field.terraformingId).toBe(11110103);

    field.terraformingFinishesAt = new Date(Date.now() - 1000);
    await service.checkBuildingCompletions(colony as any);

    expect(field.fieldType).toBe(101);
    expect(field.terrainTileId).toBe('10103');
    expect(field.terraformingId).toBeNull();
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
  });

  it('scales terraforming finish time with the configured alpha multiplier', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    try {
      const { service, colonyRepo, storageRepo } = createColonyService({
        config: {
          get: jest.fn((key: string) =>
            key === 'GAME_BUILD_TIME_MULTIPLIER' ? '0.5' : undefined,
          ),
        },
      });
      const field = {
        id: 1,
        fieldIndex: 5,
        fieldType: 101,
        terrainTileId: 101,
        buildingId: null,
        isBuilding: false,
        isActive: true,
      };
      colonyRepo.findOne.mockResolvedValue({
        id: 1,
        userId: 1,
        colonyClassId: 999,
        energy: 50,
        energyMax: 100,
        storageMax: 100,
        fields: [field],
        storage: [],
      });
      storageRepo.findOne.mockResolvedValue({
        colonyId: 1,
        commodityId: 2,
        amount: 10,
      });

      await service.terraformField(1, 1, 5, '101201');

      expect(field).toMatchObject({
        terraformingId: 101201,
        terraformingFinishesAt: new Date('2026-07-03T10:00:30.000Z'),
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('upgrades a building into a new build job and preserves activation preference', async () => {
    const { service, colonyRepo, storageRepo, fieldRepo, gameData } =
      createColonyService();
    // Echte Upgrade-Ziele (z.B. Forschungszentrum II) sind nicht direkt baubar.
    const getBuilding = gameData.getBuilding.getMockImplementation()!;
    gameData.getBuilding.mockImplementation((id: number) =>
      id === 101 ? { ...getBuilding(101), allowedFieldTypes: [] } : getBuilding(id),
    );
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
    expect(field.reactivateAfterUpgrade).toBeNull();
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
  });

  it('updates changeable energy when starting an upgrade job', async () => {
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
      fields: [field],
      storage: [],
      changeable: {
        colonyId: 1,
        energy: 50,
        maxEnergy: 100,
        workers: 0,
        workless: 10,
        maxPopulation: 100,
        maxStorage: 100,
        populationLimit: 0,
        immigrationEnabled: true,
        shields: 0,
        maxShields: 0,
        shieldFrequency: null,
        torpedoTypeId: null,
        colonyMessage: null,
        isBlockaded: false,
        trainedCrew: 0,
      },
    };
    const storage = { colonyId: 1, commodityId: 2, amount: 10 };
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);

    await service.upgradeBuilding(1, 1, 5, 100101);

    expect(colony.changeable.energy).toBe(45);
    expect(colony.energy).toBe(45);
    expect(storage.amount).toBe(6);
    expect(field.buildingId).toBe(101);
    expect(field.isBuilding).toBe(true);
    expect(field.activateAfterBuild).toBe(true);
    expect(field.reactivateAfterUpgrade).toBeNull();
    expect(fieldRepo.save).toHaveBeenCalledWith(field);

    const detail = (await service.findOne(1, 1)) as {
      detailV2?: { energy?: { current: number; max: number } };
    };
    expect(detail.detailV2?.energy?.current).toBe(45);
    expect(detail.detailV2?.energy?.max).toBe(100);
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

  it('demolishes a building and recycles half build costs', async () => {
    const { service, colonyRepo, storageRepo, fieldRepo, colonyEventService } =
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
    };
    const storage = { colonyId: 1, commodityId: 2, amount: 0 };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      storageUsed: 0,
      stats: { workers: 0, workless: 10, maxStorage: 100 },
      fields: [field],
      storage: [],
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);

    const saved = await service.demolish(1, 1, 5);

    expect(saved.buildingId).toBeNull();
    expect(storage.amount).toBe(3);
    expect(colony.storageUsed).toBe(3);
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          recycled: [{ commodityId: 2, amount: 3 }],
        }),
      }),
    );
  });

  it('caps demolition recycling by free storage', async () => {
    const { service, colonyRepo, storageRepo, colonyEventService } =
      createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      buildingId: 101,
      isBuilding: false,
      isActive: false,
      integrity: 1200,
      maxIntegrity: 1200,
    };
    const storage = { colonyId: 1, commodityId: 2, amount: 99 };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      storageUsed: 99,
      stats: { workers: 0, workless: 10, maxStorage: 1 },
      fields: [field],
      storage: [],
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);

    await service.demolish(1, 1, 5);

    expect(storage.amount).toBe(100);
    expect(colony.storageUsed).toBe(1);
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          recycled: [{ commodityId: 2, amount: 1 }],
        }),
      }),
    );
  });

  it('blocks orbit construction while colony is blockaded', async () => {
    const { service, colonyRepo, orbitAssignmentRepo } = createColonyService();
    orbitAssignmentRepo.count.mockResolvedValue(1);
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
      activateAfterBuild: true,
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

    await service.build(1, 1, 5, 100, false);

    expect(storage.amount).toBe(5);
    expect(field.buildingId).toBe(100);
    expect(field.isBuilding).toBe(true);
    expect(field.isActive).toBe(false);
    expect(field.activateAfterBuild).toBe(false);
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
  });

  it('updates changeable energy when starting a building job', async () => {
    const { service, colonyRepo, storageRepo, fieldRepo, gameData } =
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
      changeable: {
        colonyId: 1,
        energy: 50,
        maxEnergy: 100,
        workers: 0,
        workless: 10,
        maxPopulation: 100,
        maxStorage: 100,
        populationLimit: 0,
        immigrationEnabled: true,
        shields: 0,
        maxShields: 0,
        shieldFrequency: null,
        torpedoTypeId: null,
        colonyMessage: null,
        isBlockaded: false,
        trainedCrew: 0,
      },
    };
    const storage = { colonyId: 1, commodityId: 2, amount: 10 };
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);
    const building = { ...gameData.getBuilding(100), epsCost: 5 };
    gameData.getBuilding.mockImplementation((id: number) =>
      id === 100 ? building : undefined,
    );

    await service.build(1, 1, 5, 100);

    expect(colony.changeable.energy).toBe(45);
    expect(colony.energy).toBe(45);
    expect(storage.amount).toBe(5);
    expect(field.buildingId).toBe(100);
    expect(field.isBuilding).toBe(true);
    expect(fieldRepo.save).toHaveBeenCalledWith(field);

    const detail = (await service.findOne(1, 1)) as {
      detailV2?: { energy?: { current: number; max: number } };
    };
    expect(detail.detailV2?.energy?.current).toBe(45);
    expect(detail.detailV2?.energy?.max).toBe(100);
  });

  it('rejects a building job before charging resources when energy is insufficient', async () => {
    const { service, colonyRepo, storageRepo, fieldRepo, gameData } =
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
      energy: 4,
      fields: [field],
      storage: [],
      changeable: { energy: 4 },
    };
    const storage = { colonyId: 1, commodityId: 2, amount: 10 };
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);
    const building = { ...gameData.getBuilding(100), epsCost: 5 };
    gameData.getBuilding.mockImplementation((id: number) =>
      id === 100 ? building : undefined,
    );

    await expect(service.build(1, 1, 5, 100)).rejects.toThrow(
      'Not enough energy: need 5, have 4',
    );

    expect(storage.amount).toBe(10);
    expect(field.buildingId).toBeNull();
    expect(fieldRepo.save).not.toHaveBeenCalled();
  });

  it('replaces a completed building and uses its recycling for the new build', async () => {
    const { service, colonyRepo, storageRepo, fieldRepo, colonyEventService } =
      createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      buildingId: 100,
      isBuilding: false,
      isActive: false,
      integrity: 1000,
      maxIntegrity: 1000,
    };
    const storage = { colonyId: 1, commodityId: 2, amount: 8 };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 50,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      storageUsed: 8,
      fields: [field],
      storage: [storage],
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);

    await service.build(1, 1, 5, 101);

    expect(storage.amount).toBe(1);
    expect(field).toMatchObject({
      buildingId: 101,
      isBuilding: true,
      isActive: false,
      buildProgress: 0,
    });
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'BUILDING_DESTROYED',
        payload: expect.objectContaining({
          buildingId: 100,
          recycled: [{ commodityId: 2, amount: 3 }],
        }),
      }),
    );
  });

  it('replaces a building job and recycles half its costs', async () => {
    const { service, colonyRepo, storageRepo } = createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      buildingId: 100,
      isBuilding: true,
      isActive: false,
      buildProgress: 20,
      buildFinishesAt: new Date(Date.now() + 60_000),
    };
    const storage = { colonyId: 1, commodityId: 2, amount: 8 };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 50,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      storageUsed: 8,
      fields: [field],
      storage: [storage],
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);

    await service.build(1, 1, 5, 101);

    expect(storage.amount).toBe(1);
    expect(field.buildingId).toBe(101);
    expect(field.isBuilding).toBe(true);
    expect(field.buildProgress).toBe(0);
  });

  it('keeps the existing building when replacement resources are insufficient', async () => {
    const { service, colonyRepo, storageRepo, fieldRepo } =
      createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      buildingId: 100,
      isBuilding: false,
      isActive: false,
      integrity: 1000,
      maxIntegrity: 1000,
    };
    const storage = { colonyId: 1, commodityId: 2, amount: 6 };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 50,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      storageUsed: 7,
      fields: [field],
      storage: [storage],
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);

    await expect(service.build(1, 1, 5, 101)).rejects.toThrow(
      'Not enough 2: need 10, have 9',
    );

    expect(field).toMatchObject({
      buildingId: 100,
      isBuilding: false,
      isActive: false,
    });
    expect(storage.amount).toBe(6);
    expect(fieldRepo.save).not.toHaveBeenCalled();
  });

  it('rejects replacement before demolition when energy storage would be lost', async () => {
    const { service, colonyRepo, storageRepo, fieldRepo, gameData } =
      createColonyService();
    const currentBuilding = {
      ...gameData.getBuilding(100),
      bonuses: { population: 0, storage: 0, energy: 10 },
    };
    const targetBuilding = {
      ...gameData.getBuilding(101),
      epsCost: 5,
      resourceCosts: [],
    };
    gameData.getBuilding.mockImplementation((id: number) => {
      if (id === 100) return currentBuilding;
      if (id === 101) return targetBuilding;
      return undefined;
    });
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      buildingId: 100,
      isBuilding: false,
      isActive: true,
      integrity: 1000,
      maxIntegrity: 1000,
    };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 10,
      energyMax: 0,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      storageUsed: 0,
      fields: [field],
      storage: [],
      changeable: {
        energy: 10,
        maxEnergy: 0,
        workers: 0,
        workless: 10,
        maxPopulation: 100,
        maxStorage: 100,
      },
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(null);

    await expect(service.build(1, 1, 5, 101)).rejects.toThrow(
      'Not enough energy remains after demolishing the existing building',
    );

    expect(field.buildingId).toBe(100);
    expect(field.isBuilding).toBe(false);
    expect(fieldRepo.save).not.toHaveBeenCalled();
  });

  it('does not replace headquarters or build on a terraforming field', async () => {
    const { service, colonyRepo } = createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      buildingId: 82010100 as number | null,
      isBuilding: false,
      isActive: true,
      terraformingId: null as number | null,
    };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      fields: [field],
      storage: [],
    };
    colonyRepo.findOne.mockResolvedValue(colony);

    await expect(service.build(1, 1, 5, 100)).rejects.toThrow(
      'Cannot replace headquarters',
    );

    field.buildingId = null;
    field.terraformingId = 101201;
    await expect(service.build(1, 1, 5, 100)).rejects.toThrow(
      'Cannot build on a field being terraformed',
    );
  });

  it('allows bonus-field buildings and prefers exact bonus alternatives', async () => {
    const { service, colonyRepo, storageRepo, fieldRepo, gameData } =
      createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      terrainTileId: 10103,
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
    const bonusBuilding = {
      ...gameData.getBuilding(100),
      allowedFieldTypes: [10103],
      fieldAlternatives: [{ fieldtype: 10103, alternateBuildingId: 100050100 }],
    };

    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);
    gameData.getBuilding.mockImplementation((id: number) => {
      if (id === 100) return bonusBuilding;
      if (id === 100050100) {
        return { ...bonusBuilding, id: 100050100, fieldAlternatives: [] };
      }
      return undefined;
    });
    gameData.getFieldBuildRule.mockImplementation(((
      id: number,
      fieldType: number,
    ) =>
      id === 100 && fieldType === 10103
        ? { buildingsId: 100, type: 10103, researchId: 9999 }
        : id === 100 && fieldType === 101
          ? { buildingsId: 100, type: 101, researchId: 5555 }
          : null) as any);

    await service.build(1, 1, 5, 100);

    expect(gameData.getFieldBuildRule).toHaveBeenNthCalledWith(1, 100, 10103);
    expect(field.buildingId).toBe(100050100);
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
  });

  it('falls back to base field type when bonus field has no exact match', async () => {
    const { service, colonyRepo, storageRepo, gameData } =
      createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      terrainTileId: 10103,
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
    const baseBuilding = {
      ...gameData.getBuilding(100),
      allowedFieldTypes: [101],
      fieldAlternatives: [],
    };

    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);
    gameData.getBuilding.mockImplementation((id: number) =>
      id === 100 ? baseBuilding : undefined,
    );

    await service.build(1, 1, 5, 100);

    expect(field.buildingId).toBe(100);
  });

  it('rejects bonus fields when neither exact nor base type matches', async () => {
    const { service, colonyRepo, gameData } = createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      terrainTileId: 10103,
      buildingId: null,
      isBuilding: false,
      isActive: true,
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
      fields: [field],
      storage: [],
    });
    const defaultBuilding = gameData.getBuilding(100);
    gameData.getBuilding.mockImplementation((id: number) =>
      id === 100
        ? {
            ...defaultBuilding,
            allowedFieldTypes: [201],
            fieldAlternatives: [],
          }
        : undefined,
    );

    await expect(service.build(1, 1, 5, 100)).rejects.toThrow(
      'Building cannot be placed on this terrain',
    );
  });

  it('enforces limits on exact bonus alternate buildings', async () => {
    const { service, colonyRepo, storageRepo, gameData } =
      createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      terrainTileId: 10103,
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
      fields: [
        field,
        {
          id: 2,
          fieldIndex: 6,
          fieldType: 101,
          terrainTileId: 10103,
          buildingId: 100050100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
    };
    const storage = { colonyId: 1, commodityId: 2, amount: 10 };
    const bonusBuilding = {
      ...gameData.getBuilding(100),
      allowedFieldTypes: [10103],
      fieldAlternatives: [{ fieldtype: 10103, alternateBuildingId: 100050100 }],
      colonyLimit: 0,
      bclimit: 0,
    };
    const alternateBuilding = {
      ...bonusBuilding,
      id: 100050100,
      fieldAlternatives: [],
      colonyLimit: 1,
      bclimit: 1,
    };

    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue(storage);
    gameData.getBuilding.mockImplementation((id: number) => {
      if (id === 100) return bonusBuilding;
      if (id === 100050100) return alternateBuilding;
      return undefined;
    });

    await expect(service.build(1, 1, 5, 100)).rejects.toThrow(
      'limited to 1 per colony',
    );
  });

  it('returns base-field buildings for exact bonus field queries', async () => {
    const { service, unlockResolver, gameData } = createColonyService();
    const baseBuilding = {
      ...gameData.getBuilding(100),
      id: 100,
      allowedFieldTypes: [101],
      visible: true,
    };
    const bonusOnlyBuilding = {
      ...gameData.getBuilding(100),
      id: 101,
      allowedFieldTypes: [10103],
      visible: true,
    };

    gameData.getBuildingsForFieldTypes.mockReturnValue([
      baseBuilding,
      bonusOnlyBuilding,
    ] as any);
    unlockResolver.isBuildingUnlocked.mockResolvedValue(true);

    const result = await service.getAvailableBuildings(1, 10103);

    expect(gameData.getBuildingsForFieldTypes).toHaveBeenCalledWith([
      10103, 101,
    ]);
    expect(result).toEqual([baseBuilding, bonusOnlyBuilding]);
  });

  it('sets activateAfterBuild on an own construction site in both directions', async () => {
    const { service, colonyRepo, fieldRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      fields: [{ id: 77, fieldIndex: 5, buildingId: 300, isBuilding: true }],
    });

    await service.setActivateAfterBuild(1, 1, 5, false);
    await service.setActivateAfterBuild(1, 1, 5, true);

    expect(fieldRepo.update).toHaveBeenNthCalledWith(
      1,
      { id: 77, isBuilding: true },
      { activateAfterBuild: false },
    );
    expect(fieldRepo.update).toHaveBeenNthCalledWith(
      2,
      { id: 77, isBuilding: true },
      { activateAfterBuild: true },
    );
  });

  it('rejects activateAfterBuild for finished buildings, empty fields and foreign colonies', async () => {
    const { service, colonyRepo, fieldRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      fields: [{ id: 77, fieldIndex: 5, buildingId: 300, isBuilding: false }],
    });
    // finished meanwhile (or never a site): the conditional update matches 0 rows
    fieldRepo.update.mockResolvedValue({ affected: 0 });
    await expect(service.setActivateAfterBuild(1, 1, 5, false)).rejects.toThrow(
      'Auf diesem Feld wird nicht gebaut',
    );
    await expect(service.setActivateAfterBuild(1, 1, 9, false)).rejects.toThrow(
      'Field not found',
    );
    colonyRepo.findOne.mockResolvedValue(null);
    await expect(service.setActivateAfterBuild(1, 2, 5, false)).rejects.toThrow();
  });

  it('completes a site with the last set activateAfterBuild value', async () => {
    const { service } = createColonyService();
    const field = {
      id: 1,
      fieldIndex: 4,
      buildingId: 82010100,
      isBuilding: true,
      isActive: false,
      activateAfterBuild: false,
      buildProgress: 0,
      buildFinishesAt: new Date(Date.now() - 1),
      integrity: 0,
      maxIntegrity: 0,
    };
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 201,
      population: 84,
      populationMax: 84,
      energy: 0,
      energyMax: 100,
      storageMax: 3000,
      storageUsed: 0,
      stats: { workers: 24, workless: 60, maxPopulation: 84 },
      changeable: {
        workers: 24,
        workless: 60,
        maxPopulation: 84,
        populationLimit: 0,
        immigrationEnabled: true,
        energy: 0,
        maxEnergy: 100,
        maxStorage: 3000,
      },
      fields: [field],
      storage: [],
    };

    await service.processTick(colony as never);

    expect(field).toMatchObject({ isBuilding: false, isActive: false });
  });

  it('derives the construction progress percent from the scaled build time', () => {
    const { projectionService, gameData } = createColonyService();
    const buildTime = gameData.getBuilding(300).costs.buildTime;
    const field = {
      id: 1,
      fieldIndex: 5,
      buildingId: 300,
      isBuilding: true,
      activateAfterBuild: false,
      buildFinishesAt: new Date(Date.now() + (buildTime * 1000) / 2),
    };
    const summary = projectionService.toColonySummary({
      id: 1,
      fields: [field],
    } as never) as any;

    expect(summary.fields[0].activateAfterBuild).toBe(false);
    expect(Math.abs(summary.fields[0].buildProgressPercent - 50)).toBeLessThanOrEqual(1);
  });

  it('enforces formalized per-colony building limits', async () => {
    const { constructionService, gameData } = createColonyService();
    const colony = {
      id: 1,
      fields: [{ id: 1, buildingId: 300, isBuilding: false }],
    };
    const building = gameData.getBuilding(300);

    await expect(
      (constructionService as any).checkBuildingLimits(colony, 1, building),
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

  it('rejects activation when workers are missing despite stale population', async () => {
    const { service, colonyRepo } = createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      buildingId: 401,
      isBuilding: false,
      isActive: false,
      integrity: 1000,
      maxIntegrity: 1000,
    };
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      energy: 50,
      energyMax: 100,
      population: 99,
      populationMax: 100,
      storageMax: 100,
      stats: { workers: 5, workless: 1, maxPopulation: 100 },
      fields: [field],
      storage: [],
    });

    await expect(service.toggleBuilding(1, 1, 5)).rejects.toThrow(
      'Nicht genug freie Arbeiter',
    );
  });

  it('rejects activation when orbital maintenance is missing', async () => {
    const { service, colonyRepo } = createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 900,
      buildingId: 600,
      isBuilding: false,
      isActive: false,
      integrity: 1000,
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
      stats: { workers: 0, workless: 10, maxPopulation: 100 },
      fields: [field],
      storage: [],
    });

    await expect(service.toggleBuilding(1, 1, 5)).rejects.toThrow(
      'Nicht genug 1801 verfügbar',
    );
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

  it('books production in commodity sort order and fills the first overflowing commodity up to the limit', async () => {
    const upperStorage = jest.fn(async (_colony, _commodityId, amount: number) => amount);
    const processor = Object.assign(Object.create(ColonyTickProcessorService.prototype), {
      colonyStatsService: {
        calculateSummary: () => ({
          // Production map order is the opposite of the STU sort order.
          productionDelta: new Map([[20, 30], [10, 30], [30, 5]]),
          depositConsumption: new Map(),
          depositDelta: new Map(),
          activeFields: [],
          workersUsed: 0,
          energyDelta: 0,
          effectiveStorageMax: 40,
          effectiveState: { energy: { max: 0 } },
        }),
      },
      gameData: {
        getCommodity: (id: number) => ({ id, name: String(id), sort: { 10: 1, 20: 2, 30: 3 }[id], isSaveable: true }),
      },
      colonyStorageService: {
        getStorageUsed: async () => 0,
        capToMax: (amount: number, free: number) => Math.min(amount, free),
        upperStorage,
        lowerStorage: jest.fn(),
      },
      storageRepo: { findOne: async () => ({ amount: 1000 }) },
      colonyRepo: { save: jest.fn() },
      applyDepositConsumption: jest.fn(),
    });
    const events: Array<{ type: string; commodityId?: number }> = [];

    await processor.balanceAndProduce(
      { id: 1, stats: { maxPopulation: 100, energy: 0 }, fields: [] },
      events,
    );

    expect(upperStorage.mock.calls.map(([, id, amount]) => [id, amount])).toEqual([
      [10, 30],
      [20, 10],
    ]);
    expect(events).toEqual([{ type: 'STORAGE_FULL', commodityId: 20 }]);
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

  it('does not deactivate when deposit reserve covers the shortfall', async () => {
    const { service, depositMiningRepo, gameData } = createColonyService();
    gameData.getColonyClass.mockReturnValue({
      classId: 999,
      bevGrowthRate: 100,
      baseProduction: [{ commodityId: 1505, amount: 10 }],
    });
    depositMiningRepo.findOne.mockResolvedValue({
      userId: 1,
      colonyId: 1,
      commodityId: 1505,
      amountLeft: 5,
    });
    const fields = Array.from({ length: 13 }, (_, i) => ({
      id: i + 1,
      buildingId: 500,
      isBuilding: false,
      isActive: true,
    }));
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
      fields,
    };

    await (service as any).balanceAndProduce(colony);

    // netDelta = 10 - 13*3 = -29, shortfall = 29, amountLeft(5) < 29 → deactivate ONE mine
    // After removing one mine: netDelta = 10 - 12*3 = -26, shortfall = 26, 5 < 26 → deactivate another
    // This cascades until balance is restored
    const activeCount = fields.filter((f) => f.isActive).length;
    expect(activeCount).toBeLessThan(13);
  });

  it('auto-creates deposit mining row when missing and skips deactivation if reserve covers shortfall', async () => {
    const { service, depositMiningRepo, gameData, fieldRepo } =
      createColonyService();
    gameData.getColonyClass.mockReturnValue({
      classId: 999,
      bevGrowthRate: 100,
      baseProduction: [{ commodityId: 1505, amount: 2 }],
    });
    gameData.getColonyClassDeposits.mockReturnValue([
      { commodityId: 1505, minAmount: 12, maxAmount: 12 },
    ]);
    depositMiningRepo.findOne.mockResolvedValue(null);
    depositMiningRepo.create.mockReturnValue({
      userId: 1,
      colonyId: 1,
      commodityId: 1505,
      amountLeft: 12,
    });
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

    // netDelta = 2 - 3 = -1, shortfall = 1, auto-created amountLeft(12) >= 1 → no deactivation
    expect(depositMiningRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ commodityId: 1505, amountLeft: 12 }),
    );
    expect(colony.fields[0].isActive).toBe(true);
    expect(fieldRepo.save).not.toHaveBeenCalled();
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
        reason: 'Energie',
      }),
    );
  });

  it('exposes airfield progression orbital maintenance values', () => {
    const { statsService, gameData } = createColonyService();
    const raumbahnhof = gameData.getBuilding(81120100);
    const raumhafen = gameData.getBuilding(81130100);

    expect(gameData.buildingHasFunction(81110100, 4)).toBe(true);
    expect(gameData.buildingHasFunction(81120100, 4)).toBe(true);
    expect(gameData.buildingHasFunction(81130100, 4)).toBe(true);
    expect(raumhafen).toMatchObject({
      epsProc: -7,
      bevUse: 18,
      epsCost: 240,
      costs: { buildTime: 14400 },
      resourceCosts: [
        { commodityId: 2, amount: 71 },
        { commodityId: 4, amount: 96 },
        { commodityId: 21, amount: 62 },
      ],
    });

    const raumbahnhofState = statsService.calculateSummary({
      id: 1,
      colonyClassId: 999,
      energy: 50,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      fields: [
        { id: 1, buildingId: 81120100, isBuilding: false, isActive: true },
      ],
    } as any).effectiveState;
    expect(raumbahnhofState.orbitalMaintenance).toEqual({
      production: 14,
      consumption: 0,
      balance: 14,
    });

    const raumhafenState = statsService.calculateSummary({
      id: 1,
      colonyClassId: 999,
      energy: 50,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageMax: 100,
      fields: [
        { id: 1, buildingId: 81130100, isBuilding: false, isActive: true },
      ],
    } as any).effectiveState;
    expect(raumhafenState.orbitalMaintenance).toEqual({
      production: 20,
      consumption: 0,
      balance: 20,
    });
    expect(raumbahnhof).toBeDefined();
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

  it('deactivates dependent consumers when support building is toggled off', async () => {
    const { service, colonyRepo, fieldRepo, statsRepo } = createColonyService();
    const support = {
      id: 1,
      fieldIndex: 1,
      fieldType: 101,
      buildingId: 550,
      isBuilding: false,
      isActive: true,
      integrity: 1000,
      maxIntegrity: 1000,
    };
    const consumer = {
      id: 2,
      fieldIndex: 2,
      fieldType: 900,
      buildingId: 600,
      isBuilding: false,
      isActive: true,
      integrity: 1000,
      maxIntegrity: 1000,
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
      stats: { workers: 0, workless: 10, maxPopulation: 100 },
      fields: [support, consumer],
      storage: [],
    };
    colonyRepo.findOne.mockResolvedValue(colony);

    await service.toggleBuilding(1, 1, 1);

    expect(support.isActive).toBe(false);
    expect(consumer.isActive).toBe(false);
    expect(fieldRepo.save).toHaveBeenCalledWith(consumer);
    expect(statsRepo.save).toHaveBeenCalledTimes(2);
  });

  it('keeps unrelated effect consumers active when a producer of another effect is toggled off', async () => {
    const { service, colonyRepo, fieldRepo } = createColonyService();
    const unrelatedBuilding = {
      id: 1,
      fieldIndex: 1,
      fieldType: 101,
      buildingId: 650,
      isBuilding: false,
      isActive: true,
      integrity: 1000,
      maxIntegrity: 1000,
    };
    const unsupportedConsumer = {
      id: 2,
      fieldIndex: 2,
      fieldType: 900,
      buildingId: 600,
      isBuilding: false,
      isActive: true,
      integrity: 1000,
      maxIntegrity: 1000,
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
      stats: { workers: 0, workless: 10, maxPopulation: 100 },
      fields: [unrelatedBuilding, unsupportedConsumer],
      storage: [],
    };
    colonyRepo.findOne.mockResolvedValue(colony);

    await service.toggleBuilding(1, 1, 1);

    expect(unrelatedBuilding.isActive).toBe(false);
    expect(unsupportedConsumer.isActive).toBe(true);
    expect(fieldRepo.save).not.toHaveBeenCalledWith(unsupportedConsumer);
  });

  it('keeps orbital maintenance consumers active when maintenance is sufficient', async () => {
    const { service, fieldRepo } = createColonyService();
    const consumer = {
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
      population: 20,
      populationMax: 100,
      storageMax: 100,
      stats: { workers: 12, workless: 8, maxPopulation: 100 },
      fields: [
        {
          id: 2,
          fieldIndex: 2,
          buildingId: 81120100,
          isBuilding: false,
          isActive: true,
        },
        consumer,
      ],
    };

    await (service as any).balanceAndProduce(colony);

    expect(consumer.isActive).toBe(true);
    expect(fieldRepo.save).not.toHaveBeenCalledWith(consumer);
  });

  it('keeps employers active when housing is sufficient despite low current population', async () => {
    const { service, fieldRepo } = createColonyService();
    const workerField = {
      id: 2,
      fieldIndex: 8,
      buildingId: 401,
      isBuilding: false,
      isActive: true,
    };
    const colony = {
      id: 1,
      colonyClassId: 999,
      energy: 16,
      energyMax: 100,
      population: 999,
      populationMax: 100,
      storageMax: 100,
      storageUsed: 0,
      stats: { workers: 3, workless: 2, maxPopulation: 100 },
      fields: [
        { id: 1, buildingId: 82010100, isBuilding: false, isActive: true },
        workerField,
      ],
    };

    await (service as any).balanceAndProduce(colony);

    // STU compares employment to housing capacity, rather than current population.
    expect(workerField.isActive).toBe(true);
    expect(fieldRepo.save).not.toHaveBeenCalledWith(workerField);
    expect(colony.stats).toMatchObject({ workers: 3, workless: 2 });
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
  it('allows researched and unrestricted defense torpedo types', async () => {
    const { service, colonyRepo, gameData, unlockResolver } =
      createColonyService();
    const colony = {
      id: 1,
      userId: 1,
      colonyClassId: 999,
      stats: { torpedoTypeId: null },
      fields: [
        { id: 1, buildingId: 100040100, isBuilding: false, isActive: true },
      ],
      storage: [],
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    gameData.getTorpedoType.mockImplementation((id: number) =>
      id === 81
        ? {
            id: 81,
            commodityId: 81,
            name: 'Micro',
            baseDamage: 90,
            researchId: 501100,
          }
        : {
            id: 82,
            commodityId: 82,
            name: 'Photon',
            baseDamage: 100,
            researchId: null,
          },
    );
    unlockResolver.hasTech.mockResolvedValueOnce(true);

    await service.setDefenseTorpedoType(1, 1, 81);
    await service.setDefenseTorpedoType(1, 1, 82);
    await service.setDefenseTorpedoType(1, 1, null);

    expect(unlockResolver.hasTech).toHaveBeenCalledWith(1, 501100);
    expect(colony.stats.torpedoTypeId).toBeNull();
  });

  it.each([
    [
      'unresearched',
      {
        id: 81,
        commodityId: 81,
        name: 'Micro',
        baseDamage: 90,
        researchId: 501100,
      },
    ],
    ['unknown', undefined],
  ])('rejects an %s defense torpedo type', async (_label, torpedoType) => {
    const { service, colonyRepo, gameData, unlockResolver } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      stats: { torpedoTypeId: null },
      fields: [
        { id: 1, buildingId: 100040100, isBuilding: false, isActive: true },
      ],
      storage: [],
    });
    gameData.getTorpedoType.mockReturnValueOnce(torpedoType);
    unlockResolver.hasTech.mockResolvedValueOnce(false);

    await expect(service.setDefenseTorpedoType(1, 1, 81)).rejects.toThrow(
      'Unerlaubter Torpedo-Typ',
    );
  });

  it('sets shield frequency and loads shield battery using energy', async () => {
    const { service, colonyRepo, colonyRepo: repo } = createColonyService();
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
    await service.loadShields(1, 1, 70);

    expect(colony.stats.shieldFrequency).toBe(12345);
    expect(colony.stats.maxShields).toBe(14000);
    expect(colony.stats.shields).toBe(70);
    expect(colony.energy).toBe(43);
    expect(repo.save).toHaveBeenCalledWith(colony);
    expect(repo.save).toHaveBeenCalledWith(colony);
  });
});

describe('crew training queues', () => {
  it('queues limited crew training from colony central before academy', async () => {
    const { service, colonyRepo, crewTrainingQueueRepo } =
      createColonyService();
    const stats = { workless: 5, trainedCrew: 0 };
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      fields: [
        {
          id: 1,
          buildingId: 82010100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
      stats,
    });

    const queue = await service.queueCrewTraining(1, 1, 5);

    expect(crewTrainingQueueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2, userId: 1, colonyId: 1 }),
    );
    expect(stats.workless).toBe(3);
    expect(colonyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
    );
    expect(queue).toMatchObject({ amount: 2 });
  });

  it('queues crew training when academy is active', async () => {
    const { service, colonyRepo, crewTrainingQueueRepo } =
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
    expect(colonyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
    );
    expect(queue).toMatchObject({ amount: 2 });
  });

  const queuedTraining = (amount = 2) => ({
    id: 1,
    colonyId: 1,
    userId: 1,
    amount,
    finishesAt: null,
    status: 'QUEUED',
  });
  const academyColony = (active = true) => ({
    id: 1,
    userId: 1,
    stats: { trainedCrew: 0 },
    fields: [
      {
        buildingId: 51010100,
        isBuilding: false,
        isActive: active,
      },
    ],
  });

  it('leaves crew training queued while the academy is inactive', async () => {
    const { service, crewTrainingQueueRepo, colonyCrewService } =
      createColonyService();
    const job = queuedTraining();
    crewTrainingQueueRepo.find.mockResolvedValue([job]);

    await (service as any).processCrewTrainingQueue(academyColony(false));

    expect(colonyCrewService.createCrewOnColony).not.toHaveBeenCalled();
    expect(crewTrainingQueueRepo.save).not.toHaveBeenCalled();
    expect(job.status).toBe('QUEUED');
  });

  it.each([
    ['local', 'LOCAL_CREW_LIMIT', { freeLocal: 0 }],
    ['global', 'GLOBAL_CREW_LIMIT', { assigned: 10, globalLimit: 10 }],
  ])(
    'cancels crew training at the %s crew limit and creates a colony message',
    async (
      _label,
      reason,
      limits: {
        freeLocal?: number;
        assigned?: number;
        globalLimit?: number;
      },
    ) => {
      const {
        service,
        crewTrainingQueueRepo,
        colonyCrewService,
        colonyEventService,
      } = createColonyService();
      const job = queuedTraining();
      crewTrainingQueueRepo.find.mockResolvedValue([job]);
      colonyCrewService.getFreeAssignmentCount.mockResolvedValue(
        limits.freeLocal ?? 10,
      );
      colonyCrewService.getAssignedCount.mockResolvedValue(
        limits.assigned ?? 0,
      );
      colonyCrewService.getGlobalCrewLimit.mockResolvedValue(
        limits.globalLimit ?? 10,
      );

      await (service as any).processCrewTrainingQueue(academyColony());

      expect(colonyCrewService.createCrewOnColony).not.toHaveBeenCalled();
      expect(job.status).toBe('CANCELLED');
      expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          colonyId: 1,
          userId: 1,
          type: 'CREW_TRAINING_CANCELLED',
          payload: { amount: 2, reason },
        }),
      );
    },
  );

  it('limits partial crew training to remaining capacity and per-tick throughput', async () => {
    const { service, crewTrainingQueueRepo, colonyCrewService } =
      createColonyService();
    const job = queuedTraining(5);
    crewTrainingQueueRepo.find.mockResolvedValue([job]);
    colonyCrewService.getFreeAssignmentCount.mockResolvedValue(3);
    colonyCrewService.getAssignedCount.mockResolvedValue(7);
    colonyCrewService.getGlobalCrewLimit.mockResolvedValue(10);
    colonyCrewService.getTrainableCount.mockResolvedValue(2);

    await (service as any).processCrewTrainingQueue(academyColony());

    expect(colonyCrewService.createCrewOnColony).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      2,
    );
    expect(job.amount).toBe(2);
    expect(job.status).toBe('COMPLETED');
  });

  it('completes crew training and creates colony crew assignments', async () => {
    const { service, crewTrainingQueueRepo, colonyCrewService } =
      createColonyService();
    const job = queuedTraining();
    crewTrainingQueueRepo.find.mockResolvedValue([job]);

    await (service as any).processCrewTrainingQueue(academyColony());

    expect(colonyCrewService.createCrewOnColony).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
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

  const storedCommodity2 = (amount: number) => [
    { id: 1, colonyId: 1, commodityId: 2, amount },
  ];
  const fabColony = (energy: number, stored: number) => ({
    ...activeWeaponFabColony,
    energy,
    energyMax: 500,
    storage: storedCommodity2(stored),
  });

  it('queues module fabrication, charging materials and EPS per unit', async () => {
    const { service, colonyRepo, fabricationQueueRepo, storageRepo } =
      createColonyService();
    const colony = fabColony(100, 999);
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue({
      id: 1,
      colonyId: 1,
      commodityId: 2,
      amount: 999,
    });
    fabricationQueueRepo.findOne.mockResolvedValue(null);

    const result = await service.queueFabrication(
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
    expect(colony.energy).toBe(60);
    expect(fabricationQueueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        queueType: 'MODULE',
        itemKey: 'module.weapon.turbolaser-k1',
        amount: 2,
        buildingFunctionId: 10,
      }),
    );
    expect(result).toMatchObject({ requested: 2, accepted: 2 });
    expect(result.queue).toMatchObject({ amount: 2 });
  });

  it('clamps the module amount to available EPS and reports X of Y', async () => {
    const { service, colonyRepo, fabricationQueueRepo, storageRepo } =
      createColonyService();
    const colony = fabColony(45, 999);
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue({ commodityId: 2, amount: 999 });
    fabricationQueueRepo.findOne.mockResolvedValue(null);

    const result = await service.queueFabrication(
      1,
      1,
      'MODULE' as any,
      'module.weapon.turbolaser-k1',
      5,
      10,
    );

    expect(result).toMatchObject({ requested: 5, accepted: 2 });
    expect(result.message).toContain('2 von 5 Modulen in Auftrag gegeben');
    expect(colony.energy).toBe(5);
  });

  it('clamps the module amount to stored materials', async () => {
    const { service, colonyRepo, fabricationQueueRepo, storageRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue(fabColony(500, 25));
    storageRepo.findOne.mockResolvedValue({ commodityId: 2, amount: 25 });
    fabricationQueueRepo.findOne.mockResolvedValue(null);

    const result = await service.queueFabrication(
      1,
      1,
      'MODULE' as any,
      'module.weapon.turbolaser-k1',
      5,
      10,
    );

    expect(result.accepted).toBe(2);
  });

  it('queues nothing when neither EPS nor materials suffice', async () => {
    const { service, colonyRepo, fabricationQueueRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue(fabColony(5, 999));

    const result = await service.queueFabrication(
      1,
      1,
      'MODULE' as any,
      'module.weapon.turbolaser-k1',
      3,
      10,
    );

    expect(result).toMatchObject({ queue: null, accepted: 0 });
    expect(fabricationQueueRepo.save).not.toHaveBeenCalled();
  });

  it('tops up an existing queued job for the same module and function', async () => {
    const { service, colonyRepo, fabricationQueueRepo, storageRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue(fabColony(100, 999));
    storageRepo.findOne.mockResolvedValue({ commodityId: 2, amount: 999 });
    const existing = { id: 5, amount: 3, legacyAmount: 0, status: 'QUEUED' };
    fabricationQueueRepo.findOne.mockResolvedValue(existing);

    const result = await service.queueFabrication(
      1,
      1,
      'MODULE' as any,
      'module.weapon.turbolaser-k1',
      2,
      10,
    );

    expect(existing.amount).toBe(5);
    expect(fabricationQueueRepo.create).not.toHaveBeenCalled();
    expect(result.queue).toBe(existing);
  });

  it('produces torpedoes immediately against materials and EPS without a queue', async () => {
    const { service, colonyRepo, fabricationQueueRepo, storageRepo } =
      createColonyService();
    const colony = {
      ...fabColony(30, 999),
      fields: [
        { id: 2, buildingId: 81710100, isBuilding: false, isActive: true },
      ],
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    const rows: Record<number, any> = {
      2: { commodityId: 2, amount: 999 },
    };
    storageRepo.findOne.mockImplementation(async ({ where }: any) =>
      rows[where.commodityId] ?? null,
    );

    const result = await service.queueFabrication(
      1,
      1,
      'TORPEDO' as any,
      'torpedo.micro-proton',
      10,
      9,
    );

    expect(result.queue).toBeNull();
    expect(fabricationQueueRepo.save).not.toHaveBeenCalled();
    expect(result.accepted).toBe(7);
    expect(colony.energy).toBe(2);
    expect(storageRepo.create).toHaveBeenCalledWith({
      colonyId: 1,
      commodityId: 81,
      amount: 7,
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

  it('requires fabrication item research when configured', async () => {
    const { service, gameData, unlockResolver } = createColonyService();
    gameData.getFabricationItem.mockReturnValueOnce({
      itemKey: 'torpedo.proton',
      queueType: 'TORPEDO',
      outputCommodityId: 83,
      outputAmount: 1,
      researchId: 500300,
      researchRequired: 'Protonentorpedo',
      buildingFunctionIds: [9],
      durationSeconds: 60,
      costs: [],
    });
    unlockResolver.hasTech.mockResolvedValueOnce(false);

    await expect(
      service.queueFabrication(1, 1, 'TORPEDO' as any, 'torpedo.proton', 1, 9),
    ).rejects.toThrow('Research required: Protonentorpedo');
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

  it('completes queued module jobs into storage with cap at the next tick', async () => {
    const { service, fabricationQueueRepo, storageRepo } =
      createColonyService();
    const job = {
      id: 1,
      colonyId: 1,
      userId: 1,
      queueType: 'MODULE',
      itemKey: 'module.weapon.turbolaser-k1',
      amount: 2,
      legacyAmount: 0,
      buildingFunctionId: 10,
      finishesAt: new Date(Date.now() + 60_000),
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
      fields: [
        {
          buildingId: 81810100,
          isBuilding: false,
          isActive: true,
        },
      ],
    });

    expect(storageRepo.create).toHaveBeenCalledWith({
      colonyId: 1,
      commodityId: 10701,
      amount: 1,
    });
    expect(job.status).toBe('COMPLETED');
    expect(fabricationQueueRepo.save).toHaveBeenCalledWith(job);
  });

  it('keeps queued module jobs while the fabrication function is inactive', async () => {
    const { service, fabricationQueueRepo } = createColonyService();
    const job = {
      id: 1,
      colonyId: 1,
      itemKey: 'module.weapon.turbolaser-k1',
      amount: 2,
      buildingFunctionId: 10,
      status: 'QUEUED',
    };
    fabricationQueueRepo.find.mockResolvedValue([job]);

    await (service as any).processFabricationQueue({
      id: 1,
      colonyClassId: 999,
      storageMax: 100,
      fields: [
        { buildingId: 81810100, isBuilding: false, isActive: false },
      ],
    });

    expect(job.status).toBe('QUEUED');
    expect(fabricationQueueRepo.save).not.toHaveBeenCalled();
  });

  const queuedJob = (overrides = {}) => ({
    id: 7,
    colonyId: 1,
    userId: 1,
    queueType: 'MODULE',
    itemKey: 'module.weapon.turbolaser-k1',
    amount: 3,
    legacyAmount: 0,
    buildingFunctionId: 10,
    finishesAt: new Date(),
    status: 'QUEUED',
    ...overrides,
  });

  it('cancels a partial amount with a full material and EPS refund', async () => {
    const { service, colonyRepo, fabricationQueueRepo, storageRepo } =
      createColonyService();
    const colony = fabColony(10, 0);
    colonyRepo.findOne.mockResolvedValue(colony);
    const job = queuedJob();
    fabricationQueueRepo.findOne.mockResolvedValue(job);
    storageRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(async () => ({ total: 0 })),
    });
    storageRepo.findOne.mockResolvedValue(null);

    await service.cancelFabricationQueue(1, 1, 7, 2);

    expect(storageRepo.create).toHaveBeenCalledWith({
      colonyId: 1,
      commodityId: 2,
      amount: 20,
    });
    expect(colony.energy).toBe(50);
    expect(job.amount).toBe(1);
    expect(job.status).toBe('QUEUED');
  });

  it('cancels the whole job by default and refunds no EPS for legacy amounts', async () => {
    const { service, colonyRepo, fabricationQueueRepo, storageRepo } =
      createColonyService();
    const colony = fabColony(10, 0);
    colonyRepo.findOne.mockResolvedValue(colony);
    const job = queuedJob({ amount: 3, legacyAmount: 2 });
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
      amount: 30,
    });
    expect(colony.energy).toBe(30);
    expect(job.status).toBe('CANCELLED');
    expect(job.amount).toBe(0);
  });
});

const weaponSelection = { slotId: 'corvette-weapons-1', commodityId: 10701 };
const shieldSelection = { slotId: 'corvette-shields-1', commodityId: 10201 };
const orbitColonyLocation = {
  systemFieldId: 301,
  systemField: { id: 301, starSystemId: 10, sx: 3, sy: 4 },
};
const orbitShipLocation = {
  locationId: 401,
  location: {
    id: 401,
    kind: 'SYSTEM_FIELD',
    systemField: { id: 301, starSystemId: 10, sx: 3, sy: 4 },
  },
};
describe('ship building compatibility', () => {
  it('creates deterministic buildplan signatures independent of slot order', () => {
    const { shipyardService } = createColonyService();
    expect(
      (shipyardService as any).createBuildplanSignature(1, [
        weaponSelection,
        shieldSelection,
      ]),
    ).toBe(
      (shipyardService as any).createBuildplanSignature(1, [
        shieldSelection,
        weaponSelection,
      ]),
    );
    expect(
      (shipyardService as any).createBuildplanSignature(2, [
        weaponSelection,
        shieldSelection,
      ]),
    ).not.toBe(
      (shipyardService as any).createBuildplanSignature(1, [
        weaponSelection,
        shieldSelection,
      ]),
    );
  });

  it('rejects opposing faction modules for builds, retrofits, and buildplans', async () => {
    const { service, colonyRepo, shipRepo, shipClassRepo, gameData } =
      createColonyService();
    const colony = {
      id: 1,
      userId: 1,
      ...orbitColonyLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      colonyClassId: 999,
      fields: [
        {
          id: 1,
          fieldIndex: 1,
          buildingId: 85130100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
    };
    const shipClass = {
      id: 1,
      key: 'TEST_CORVETTE',
      name: 'Test Corvette',
      category: 'CORVETTE',
      isNpc: false,
      crewMin: 0,
    };
    const imperialSelection = {
      slotId: 'corvette-weapons-1',
      commodityId: 10731,
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      ...orbitShipLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      name: 'Corvette',
    });
    shipClassRepo.findOneBy.mockResolvedValue(shipClass);
    gameData.getFabricationItemByOutputCommodity.mockReturnValue({
      itemKey: 'module.weapons.turbolaser-k1',
      queueType: 'MODULE',
      displayName: 'Turbolaser (Klasse 1)',
      outputCommodityId: 10731,
      moduleType: 'Laser Cannon',
      shipyardType: 'ENERGY_WEAPON',
      faction: 'GALACTIC_EMPIRE',
    });

    await expect(
      service.buildShip(1, 1, 1, 'Imperial Build', [imperialSelection], undefined, undefined, 6),
    ).rejects.toThrow('Ship module is faction-locked');
    await expect(
      service.queueShipRetrofit(1, 1, 7, [imperialSelection], undefined, 6),
    ).rejects.toThrow('Ship module is faction-locked');
    await expect(
      service.createShipBuildplan(1, 1, 1, 'Imperial Plan', [
        imperialSelection,
      ]),
    ).rejects.toThrow('Ship module is faction-locked');
    gameData.getFabricationItemByOutputCommodity.mockReturnValue({
      itemKey: 'module.neutral.eps-k1',
      queueType: 'MODULE',
      displayName: 'Neutral System',
      outputCommodityId: 10301,
      moduleType: 'Neutral System',
      shipyardType: 'ENERGY_WEAPON',
    });
    await expect(
      service.createShipBuildplan(1, 1, 1, 'Neutral Plan', [
        { slotId: 'corvette-weapons-1', commodityId: 10301 },
      ]),
    ).resolves.toEqual(
      expect.objectContaining({ moduleCommodityIds: [10301] }),
    );
  });

  it('rejects blockaded builds and retrofits', async () => {
    const { service, colonyRepo, shipRepo, shipClassRepo } =
      createColonyService();
    const colony = {
      id: 1,
      userId: 1,
      stats: { isBlockaded: true },
      ...orbitColonyLocation,
      colonyClassId: 999,
      fields: [
        {
          id: 1,
          buildingId: 85130100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
    };
    const shipClass = {
      id: 1,
      key: 'TEST_CORVETTE',
      name: 'Test Corvette',
      category: 'CORVETTE',
      isNpc: false,
      crewMin: 0,
      crewMax: 5,
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      ...orbitShipLocation,
    });
    shipClassRepo.findOneBy.mockResolvedValue(shipClass);

    await expect(service.buildShip(1, 1, 1, 'Blocked', [])).rejects.toThrow(
      'Ship construction is not possible while the colony is blockaded',
    );
    await expect(service.queueShipRetrofit(1, 1, 7, [])).rejects.toThrow(
      'Ship retrofit is not possible while the colony is blockaded',
    );
  });

  it('rejects crew requirements above the hull maximum for builds, buildplans, and retrofits', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      storageRepo,
      gameData,
    } = createColonyService();
    const colony = {
      id: 1,
      userId: 1,
      ...orbitColonyLocation,
      colonyClassId: 999,
      fields: [
        {
          id: 1,
          buildingId: 85130100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
    };
    const shipClass = {
      id: 1,
      key: 'TEST_CORVETTE',
      name: 'Test Corvette',
      category: 'CORVETTE',
      isNpc: false,
      crewMin: 4,
      crewMax: 4,
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      ...orbitShipLocation,
    });
    shipClassRepo.findOneBy.mockResolvedValue(shipClass);
    storageRepo.findOne.mockResolvedValue({
      colonyId: 1,
      commodityId: 10701,
      amount: 1,
    });
    gameData.getFabricationItemByOutputCommodity.mockReturnValue({
      itemKey: 'module.weapon.crew-heavy',
      queueType: 'MODULE',
      outputCommodityId: 10701,
      moduleType: 'Laser Cannon',
      moduleLevel: 1,
      shipyardType: 'ENERGY_WEAPON',
      shipyardModuleStats: { crew: 1 },
    });
    gameData.getAllFabricationItems.mockReturnValue([
      {
        itemKey: 'module.weapon.crew-heavy',
        queueType: 'MODULE',
        outputCommodityId: 10701,
        moduleType: 'Laser Cannon',
        moduleLevel: 1,
        shipyardType: 'ENERGY_WEAPON',
        shipyardModuleStats: { crew: 1 },
      },
    ]);

    await expect(
      service.buildShip(1, 1, 1, 'Overcrewed', [weaponSelection], undefined, undefined, 6),
    ).rejects.toThrow('Crew maximum exceeded');
    await expect(
      service.createShipBuildplan(1, 1, 1, 'Overcrewed', [weaponSelection]),
    ).rejects.toThrow('Crew maximum exceeded');
    await expect(
      service.queueShipRetrofit(1, 1, 7, [weaponSelection], undefined, 6),
    ).rejects.toThrow('Crew maximum exceeded');
  });

  it('rejects special modules beyond the hull slot limit for builds, buildplans, and retrofits', async () => {
    const { service, colonyRepo, shipRepo, shipClassRepo, gameData } =
      createColonyService();
    const colony = {
      id: 1,
      userId: 1,
      ...orbitColonyLocation,
      colonyClassId: 999,
      fields: [
        {
          id: 1,
          buildingId: 85130100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
    };
    const shipClass = {
      id: 1,
      key: 'TEST_CORVETTE',
      name: 'Test Corvette',
      category: 'CORVETTE',
      isNpc: false,
      crewMin: 0,
      crewMax: 5,
    };
    const selections = [
      { slotId: 'corvette-special-1', commodityId: 10801 },
      { slotId: 'corvette-special-2', commodityId: 10802 },
    ];
    colonyRepo.findOne.mockResolvedValue(colony);
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      ...orbitShipLocation,
    });
    shipClassRepo.findOneBy.mockResolvedValue(shipClass);
    gameData.getShipClassSlotRule.mockReturnValue({
      category: 'CORVETTE',
      moduleSlots: { SPECIAL: 1 },
      slots: [
        {
          slotId: 'corvette-special-1',
          moduleCategory: 'SPECIAL',
          label: 'Special I',
        },
        {
          slotId: 'corvette-special-2',
          moduleCategory: 'SPECIAL',
          label: 'Special II',
        },
      ],
    });
    gameData.getFabricationItemByOutputCommodity.mockImplementation(
      (commodityId: number) => ({
        itemKey: `module.special.${commodityId}`,
        queueType: 'MODULE',
        outputCommodityId: commodityId,
        moduleType: `Special ${commodityId}`,
        moduleLevel: 1,
        shipyardType: 'SPECIAL',
      }),
    );

    await expect(
      service.buildShip(1, 1, 1, 'Too Special', selections, undefined, undefined, 6),
    ).rejects.toThrow('More special modules selected than the hull allows');
    await expect(
      service.createShipBuildplan(1, 1, 1, 'Too Special', selections),
    ).rejects.toThrow('More special modules selected than the hull allows');
    await expect(
      service.queueShipRetrofit(1, 1, 7, selections, undefined, 6),
    ).rejects.toThrow('More special modules selected than the hull allows');
  });

  it('finishes queued ship builds through the explicit queue processor', async () => {
    const {
      service,
      shipBuildQueueRepo,
      shipRepo,
      systemFieldRepo,
      locationRepo,
      colonyRepo,
    } = createColonyService();
    const job = {
      id: 1,
      source: 'COLONY',
      mode: 'BUILD',
      colonyId: 1,
      userId: 1,
      shipClassId: 1,
      buildPlanId: 7,
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
    shipBuildQueueRepo.findOne.mockResolvedValue(job);
    const colony = {
      id: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      posX: 3,
      posY: 4,
      starSystem: { layerId: 1 },
    };

    colonyRepo.findOne.mockResolvedValue(colony);
    await (service as any).processShipBuildQueue(colony);

    expect(shipRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Queued Ship',
        shipClassId: 1,
        buildPlanId: 7,
        locationId: 401,
      }),
    );
    expect(systemFieldRepo.findOneByOrFail).toHaveBeenCalledWith({
      starSystemId: 10,
      sx: 3,
      sy: 4,
    });
    expect(locationRepo.findOneByOrFail).toHaveBeenCalledWith({
      systemFieldId: 301,
    });
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
      colonyRepo,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({ id: 1, userId: 1 });
    const job = {
      id: 1,
      source: 'COLONY',
      mode: 'BUILD',
      colonyId: 1,
      userId: 1,
      shipClassId: 1,
      moduleSelections: [weaponSelection],
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
    shipBuildQueueRepo.findOne.mockResolvedValue(job);
    shipRepo.save.mockResolvedValueOnce({ id: 55, name: 'Module Ship' });

    await (service as any).processShipBuildQueue({
      id: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      posX: 3,
      posY: 4,
      starSystem: { layerId: 1 },
    });

    expect(spacecraftModuleRepo.save).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        spacecraftId: 55,
        category: 'ENERGY_WEAPON',
        level: 1,
      }),
    ]));
    expect(spacecraftStatsService.applyStats).toHaveBeenCalledWith(
      expect.objectContaining({ id: 55 }),
      job.shipClass,
      expect.arrayContaining([
        expect.objectContaining({ category: 'ENERGY_WEAPON' }),
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
      unlockResolver,
    } = createColonyService();
    unlockResolver.hasTechByName.mockResolvedValue(false);
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      ...orbitColonyLocation,
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
          buildingId: 85130100,
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
      key: 'TEST_FIGHTER',
      category: 'CORVETTE',
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
      buildTimeTicks: 60,
    });

    const beforeBuild = Date.now();
    const queue = await service.buildShip(
      1,
      1,
      1,
      'Red One',
      [],
      'Starter Plan',
      undefined,
      6,
    );

    expect(gameData.getBuildingFunctions).toHaveBeenCalledWith(85130100);
    expect(shipBuildQueueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Red One',
        shipClassId: 1,
        userId: 1,
        buildPlanName: 'Starter Plan',
        moduleSelections: [],
      }),
    );
    expect(shipRepo.save).not.toHaveBeenCalled();
    expect(queue).toMatchObject({
      name: 'Red One',
      shipClassId: 1,
      buildPlanName: 'Starter Plan',
    });
    expect(queue.finishesAt.getTime()).toBeGreaterThanOrEqual(
      beforeBuild + 60_000,
    );
  });

  it('scales ship build queue finish time with the configured alpha multiplier (build time is in seconds)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    try {
      const {
        service,
        colonyRepo,
        storageRepo,
        shipClassRepo,
        shipBuildQueueRepo,
      } = createColonyService({
        config: {
          get: jest.fn((key: string) =>
            key === 'GAME_BUILD_TIME_MULTIPLIER' ? '0.5' : undefined,
          ),
        },
      });
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
            buildingId: 85130100,
            isBuilding: false,
            isActive: true,
          },
        ],
        storage: [],
        starSystem: { layerId: 1 },
      });
      storageRepo.findOne.mockResolvedValue({ amount: 999 });
      shipClassRepo.findOneBy.mockResolvedValue({
        id: 1,
        key: 'TEST_FIGHTER',
        category: 'CORVETTE',
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
        buildTimeTicks: 9600,
      });

      await service.buildShip(1, 1, 1, 'Red One', [], undefined, undefined, 6);

      expect(shipBuildQueueRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          finishesAt: new Date('2026-07-03T11:20:00.000Z'),
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses ship class buildTimeTicks as seconds without a multiplier', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    try {
      const {
        service,
        colonyRepo,
        storageRepo,
        shipClassRepo,
        shipBuildQueueRepo,
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
            buildingId: 85130100,
            isBuilding: false,
            isActive: true,
          },
        ],
        storage: [],
        starSystem: { layerId: 1 },
      });
      storageRepo.findOne.mockResolvedValue({ amount: 999 });
      shipClassRepo.findOneBy.mockResolvedValue({
        id: 1,
        key: 'TEST_FIGHTER',
        category: 'CORVETTE',
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
        buildTimeTicks: 9600,
      });

      await service.buildShip(1, 1, 1, 'Red One', [], undefined, undefined, 6);

      expect(shipBuildQueueRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          finishesAt: new Date('2026-07-03T12:40:00.000Z'),
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects ship classes that do not match the active shipyard function', async () => {
    const { service, colonyRepo, storageRepo, shipClassRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      ...orbitColonyLocation,
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
    ).rejects.toThrow('Active matching shipyard required');
  });

  it('rejects duplicate module selections for the same shipyard type', async () => {
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
          buildingId: 85130100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
    });
    storageRepo.findOne.mockResolvedValue({ amount: 999 });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      key: 'TEST_CORVETTE',
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
        [weaponSelection, { slotId: 'corvette-weapons-2', commodityId: 10701 }],
        'Plan',
        undefined,
        6,
      ),
    ).rejects.toThrow('Duplicate module selection for ENERGY_WEAPON');
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
      ...orbitColonyLocation,
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
          buildingId: 85130100,
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
      key: 'TEST_FIGHTER',
      category: 'CORVETTE',
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

    await service.buildShip(
      1,
      1,
      1,
      'Module Red',
      [weaponSelection],
      'Module Plan',
      undefined,
      6,
    );

    expect(shipBuildplanRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleSelections: [weaponSelection],
        moduleCommodityIds: [10701],
        moduleTypes: ['Laser Cannon'],
      }),
    );
    expect(storageRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ commodityId: 10701, amount: 0 }),
    );
    expect(shipBuildQueueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleSelections: [weaponSelection],
        moduleCommodityIds: [10701],
        moduleTypes: ['Laser Cannon'],
        buildPlanName: 'Module Plan',
      }),
    );
  });

  it('rejects module commodities without completed research', async () => {
    const { service, colonyRepo, shipClassRepo, gameData, unlockResolver } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      fields: [
        { id: 1, buildingId: 85130100, isBuilding: false, isActive: true },
      ],
      storage: [],
    });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      key: 'TEST_CORVETTE',
      isNpc: false,
      name: 'Test Corvette',
      category: 'CORVETTE',
      crewMin: 0,
    });
    gameData.getFabricationItemByOutputCommodity.mockReturnValue({
      itemKey: 'module.weapon.locked',
      queueType: 'MODULE',
      displayName: 'Laser Cannon',
      outputCommodityId: 10701,
      moduleType: 'Laser Cannon',
      moduleCategory: 'WEAPONS',
      shipyardType: 'ENERGY_WEAPON',
      researchId: 700100,
      researchRequired: 'Lasertechnik',
    });
    unlockResolver.hasTech.mockResolvedValueOnce(false);

    await expect(
      service.buildShip(1, 1, 1, 'Locked Module', [weaponSelection], 'Plan', undefined, 6),
    ).rejects.toThrow('Research required: Lasertechnik');
  });

  it('validates colony ownership before creating buildplans', async () => {
    const { service, colonyRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue(null);

    await expect(
      service.createShipBuildplan(99, 1, 1, 'Scout Plan', []),
    ).rejects.toThrow('Colony not found');
  });

  it('rejects invalid, duplicate, and overlong buildplan names', async () => {
    const { service, colonyRepo, shipClassRepo, shipBuildplanRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      fields: [],
      storage: [],
    });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      isNpc: false,
      category: 'CORVETTE',
      crewMax: 2,
    });

    await expect(
      service.createShipBuildplan(1, 1, 1, '   ', []),
    ).rejects.toThrow('Der Bauplanname darf nicht leer sein.');
    await expect(
      service.createShipBuildplan(1, 1, 1, 'Plan\u0000Name', []),
    ).rejects.toThrow('Der Bauplanname enthält unzulässige Steuerzeichen.');
    await expect(
      service.createShipBuildplan(1, 1, 1, 'Ä'.repeat(256), []),
    ).rejects.toThrow('Der Bauplanname ist zu lang (maximal 255 Zeichen).');

    shipBuildplanRepo.findOne.mockResolvedValue({
      id: 4,
      colonyId: 1,
      userId: 1,
      name: 'Scout Plan',
    });
    await expect(
      service.createShipBuildplan(1, 1, 1, 'Scout Plan', []),
    ).rejects.toThrow('Ein Bauplan mit diesem Namen existiert bereits.');
  });

  it('rejects duplicate buildplan signatures and rename collisions', async () => {
    const { service, colonyRepo, shipClassRepo, shipBuildplanRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      fields: [],
      storage: [],
    });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      isNpc: false,
      category: 'CORVETTE',
      crewMax: 2,
    });
    shipBuildplanRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 4, name: 'Existing Plan' });

    await expect(
      service.createShipBuildplan(1, 1, 1, 'Duplicate Layout', [
        weaponSelection,
      ]),
    ).rejects.toThrow(
      'Ein Bauplan mit dieser Konfiguration existiert bereits: Existing Plan',
    );

    shipBuildplanRepo.findOne
      .mockResolvedValueOnce({
        id: 7,
        userId: 1,
        name: 'Original',
      })
      .mockResolvedValueOnce({
        id: 8,
        userId: 1,
        name: 'Existing Name',
      });
    await expect(
      service.renameShipBuildplan(1, 1, 7, 'Existing Name'),
    ).rejects.toThrow('Ein Bauplan mit diesem Namen existiert bereits.');
  });

  it('blocks deleting buildplans used by active queues or spacecraft', async () => {
    const { service, colonyRepo, shipRepo, shipBuildQueueRepo, shipBuildplanRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      fields: [],
      storage: [],
    });
    const buildplan = { id: 7, userId: 1, name: 'Used Plan' };
    shipBuildplanRepo.findOne.mockResolvedValue(buildplan);
    shipBuildQueueRepo.count.mockResolvedValueOnce(1);

    await expect(service.deleteShipBuildplan(1, 1, 7)).rejects.toThrow(
      'Der Bauplan wird von einem Auftrag oder Schiff verwendet.',
    );

    shipBuildQueueRepo.count.mockResolvedValueOnce(0);
    shipRepo.count.mockResolvedValueOnce(1);
    await expect(service.deleteShipBuildplan(1, 1, 7)).rejects.toThrow(
      'Der Bauplan wird von einem Auftrag oder Schiff verwendet.',
    );
    expect(shipBuildplanRepo.delete).not.toHaveBeenCalled();
  });

  it('creates, renames, and deletes colony-local buildplans', async () => {
    const { service, colonyRepo, shipClassRepo, shipBuildplanRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      fields: [],
      storage: [],
    });
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
    shipBuildplanRepo.findOne.mockResolvedValueOnce(null);

    const created = await service.createShipBuildplan(1, 1, 1, 'Scout Plan', [
      weaponSelection,
    ]);

    expect(created).toMatchObject({
      id: 1,
      shipClassId: 1,
      name: 'Scout Plan',
      moduleSelections: [weaponSelection],
      moduleCommodityIds: [10701],
      moduleTypes: ['Laser Cannon'],
    });
    expect(shipBuildplanRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, name: 'Scout Plan' }),
    );

    shipBuildplanRepo.findOne
      .mockResolvedValueOnce({
        id: 1,
        colonyId: 1,
        userId: 1,
        shipClassId: 1,
        name: 'Scout Plan',
        signature: created.signature,
        moduleSelections: [weaponSelection],
        moduleCommodityIds: [10701],
      })
      .mockResolvedValueOnce(null);

    const renamed = await service.renameShipBuildplan(1, 1, 1, 'Scout II');
    expect(renamed).toMatchObject({ id: 1, name: 'Scout II' });

    shipBuildplanRepo.findOne.mockResolvedValueOnce({
      id: 1,
      colonyId: 1,
      userId: 1,
      shipClassId: 1,
      name: 'Scout II',
      signature: created.signature,
      moduleSelections: [weaponSelection],
      moduleCommodityIds: [10701],
    });

    await expect(service.deleteShipBuildplan(1, 1, 1)).resolves.toEqual({
      deleted: true,
      id: 1,
    });
    expect(shipBuildplanRepo.delete).toHaveBeenCalledWith({ id: 1 });
  });

  it('builds from a plan using a queue snapshot and blocks plan deletion', async () => {
    const {
      service,
      colonyRepo,
      storageRepo,
      shipClassRepo,
      shipBuildQueueRepo,
      shipBuildplanRepo,
    } = createColonyService();
    const colony = {
      id: 1,
      userId: 1,
      ...orbitColonyLocation,
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
          buildingId: 85130100,
          isBuilding: false,
          isActive: true,
        },
      ],
      storage: [],
      starSystem: { layerId: 1 },
    };
    const buildplan = {
      id: 7,
      colonyId: 1,
      userId: 1,
      shipClassId: 1,
      ...orbitShipLocation,
      name: 'Snapshot Plan',
      signature: 'stable-signature',
      moduleSelections: [weaponSelection],
      moduleCommodityIds: [10701],
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue({ amount: 999 });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      isNpc: false,
      name: 'Test Fighter',
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
    shipBuildplanRepo.findOne.mockResolvedValue(buildplan);

    const queue = await service.buildShipFromBuildplan(1, 1, 7, 'Planned Ship', 6);

    expect(shipBuildQueueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Planned Ship',
        buildPlanName: 'Snapshot Plan',
        buildPlanId: 7,
        buildPlanSignature: expect.any(String),
        moduleSelections: [weaponSelection],
        moduleCommodityIds: [10701],
      }),
    );
    expect(queue).toMatchObject({
      name: 'Planned Ship',
      buildPlanName: 'Snapshot Plan',
      buildPlanId: 7,
      moduleSelections: [weaponSelection],
      moduleCommodityIds: [10701],
    });

    shipBuildplanRepo.findOne.mockResolvedValueOnce(buildplan);
    shipBuildQueueRepo.count.mockResolvedValueOnce(1);
    await expect(service.deleteShipBuildplan(1, 1, 7)).rejects.toThrow(
      'Der Bauplan wird von einem Auftrag oder Schiff verwendet.',
    );

    expect(shipBuildplanRepo.delete).not.toHaveBeenCalled();
    expect(queue).toMatchObject({
      buildPlanName: 'Snapshot Plan',
      buildPlanId: 7,
      moduleSelections: [weaponSelection],
      moduleCommodityIds: [10701],
    });
    expect(shipBuildQueueRepo.save).toHaveBeenCalledTimes(1);
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
      ...orbitColonyLocation,
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
      ...orbitShipLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      crew: 2,
      cargoUsed: 5,
      cargoMax: 20,
    }));
    cargoRepo.find.mockResolvedValue([{ commodityId: 2, amount: 5 }]);
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      key: 'REBEL_SHUTTLE_LAAT',
    });
    storageRepo.findOne.mockResolvedValue(null);

    await service.landShip(1, 1, 7);

    expect(colonyCrewService.landCrewWithShip).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ id: 7 }),
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
      ...orbitColonyLocation,
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
      ...orbitShipLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      crew: 3,
      cargoUsed: 0,
      cargoMax: 20,
    }));
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      key: 'REBEL_SHUTTLE_LAAT',
    });
    colonyCrewService.getFreeAssignmentCount.mockResolvedValue(1);
    colonyCrewService.getAssignedToShipCount.mockResolvedValue(3);

    await expect(service.landShip(1, 1, 7)).rejects.toThrow(
      'Not enough colony crew capacity',
    );
  });

  describe('disassembly returns', () => {
    function setup(storageMax = 100) {
      const context = createColonyService();
      const colony = {
        id: 1,
        userId: 1,
        ...orbitColonyLocation,
        colonyClassId: 999,
        energy: 50,
        storageMax,
        fields: [{ id: 1, buildingId: 85130100, isBuilding: false, isActive: true }],
        storage: [],
        stats: { workless: 0, trainedCrew: 0 },
      };
      context.colonyRepo.findOne.mockResolvedValue(colony);
      context.shipRepo.findOne.mockResolvedValue({
        id: 8,
        userId: 1,
        shipClassId: 1,
        ...orbitShipLocation,
        crew: 1,
        cargoUsed: 4,
        reactorFuel: 61,
      });
      context.shipClassRepo.findOneBy.mockResolvedValue({
        id: 1,
        category: 'CORVETTE',
      });
      context.spacecraftModuleRepo.find.mockResolvedValue([
        { moduleType: 'good', category: 'HULL', level: 1, integrity: 100 },
        { moduleType: 'damaged', category: 'HULL', level: 1, integrity: 20 },
        { moduleType: 'broken', category: 'HULL', level: 1, integrity: 0 },
        { moduleType: 'unknown', category: 'HULL', level: 1, integrity: 100 },
      ]);
      context.gameData.getAllFabricationItems.mockReturnValue(
        ['good', 'damaged', 'broken'].map((moduleType, index) => ({
          queueType: 'MODULE',
          moduleType,
          shipyardType: 'HULL',
          moduleLevel: 1,
          outputCommodityId: 100 + index,
          buildingFunctionIds: [],
        })),
      );
      context.spacecraftTorpedoService.getStorage.mockResolvedValue([
        { commodityId: 81, amount: 3 },
        { commodityId: 82, amount: 5 },
      ]);
      context.cargoRepo.find.mockResolvedValue([{ commodityId: 2, amount: 4 }]);
      const stored = new Map<number, number>();
      context.storageRepo.findOne.mockImplementation(async ({ where }) =>
        stored.has(where.commodityId)
          ? {
              commodityId: where.commodityId,
              amount: stored.get(where.commodityId),
            }
          : null,
      );
      context.storageRepo.save.mockImplementation(async (item) => {
        stored.set(item.commodityId, item.amount);
        return item;
      });
      context.storageRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(async () => ({
          total: [...stored.values()].reduce((a, b) => a + b, 0),
        })),
      });
      return { ...context, colony, stored };
    }

    afterEach(() => jest.restoreAllMocks());

    it('recovers modules by integrity, whole reactor loads and every torpedo type, destroying cargo without hull refunds', async () => {
      const { service, colony, stored, shipRepo, cargoRepo } = setup();
      jest.spyOn(Math, 'random').mockReturnValue(0.49);
      await service.disassembleShip(1, 1, 8);
      // STU SpacecraftRemover: cargo goes down with the ship, never into the colony.
      expect(cargoRepo.save).not.toHaveBeenCalled();
      expect([...stored]).toEqual([
        [100, 1],
        [8, 2],
        [6, 4],
        [5, 4],
        [81, 3],
        [82, 5],
      ]);
      expect(colony.energy).toBe(30);
      expect(shipRepo.remove).toHaveBeenCalled();
    });

    it('previews the same whole reactor loads and all loaded torpedo commodities', async () => {
      const { service, shipRepo, shipClassRepo, spacecraftModuleRepo } = setup();
      shipRepo.find.mockResolvedValue([{ id: 8, userId: 1, shipClassId: 1, ...orbitShipLocation, reactorFuel: 61, crew: 1 } as never]);
      shipClassRepo.findBy.mockResolvedValue([{ id: 1, category: 'CORVETTE' } as never]);
      spacecraftModuleRepo.find.mockResolvedValue([]);
      const detail = await service.findOne(1, 1);
      expect((detail as unknown as { detailV2: { orbitShips: Array<{ disassemblyReturns: unknown }> } }).detailV2.orbitShips[0].disassemblyReturns).toEqual({
        reactorFuel: [{ commodityId: 8, amount: 2 }, { commodityId: 6, amount: 4 }, { commodityId: 5, amount: 4 }],
        torpedoes: [{ commodityId: 81, amount: 3 }, { commodityId: 82, amount: 5 }],
        lostCargo: [],
      });
    });

    it('previews the cargo that the disassembly destroys', async () => {
      const { service, shipRepo, shipClassRepo, spacecraftModuleRepo, cargoRepo } = setup();
      shipRepo.find.mockResolvedValue([{ id: 8, userId: 1, shipClassId: 1, ...orbitShipLocation, reactorFuel: 0, crew: 1 } as never]);
      shipClassRepo.findBy.mockResolvedValue([{ id: 1, category: 'CORVETTE' } as never]);
      spacecraftModuleRepo.find.mockResolvedValue([]);
      cargoRepo.find.mockResolvedValue([{ spacecraftId: 8, commodityId: 2, amount: 4 }] as never);
      const detail = await service.findOne(1, 1);
      const ship = (detail as unknown as { detailV2: { orbitShips: Array<{ disassemblyReturns: { lostCargo: unknown } }> } }).detailV2.orbitShips[0];
      expect(ship.disassemblyReturns.lostCargo).toEqual([{ commodityId: 2, amount: 4 }]);
    });

    it('caps all recovered supplies together to the remaining colony storage', async () => {
      const { service, stored } = setup(8);
      jest.spyOn(Math, 'random').mockReturnValue(0.49);
      await service.disassembleShip(1, 1, 8);
      expect([...stored]).toEqual([
        [100, 1],
        [8, 2],
        [6, 4],
        [5, 1],
      ]);
    });

    it('returns only whole light reactor loads and allows every module roll to fail', async () => {
      const { service, shipRepo, spacecraftModuleRepo, stored } = setup();
      shipRepo.findOne.mockResolvedValue({
        id: 8,
        userId: 1,
        shipClassId: 1,
        ...orbitShipLocation,
        crew: 0,
        reactorFuel: 5,
      });
      spacecraftModuleRepo.find.mockResolvedValue([
        {
          moduleType: 'Leichter Hypermaterie-Reaktor',
          isActive: true,
          integrity: 100,
        },
      ]);
      jest.spyOn(Math, 'random').mockReturnValue(0.99);
      await service.disassembleShip(1, 1, 8);
      expect(stored.get(5)).toBe(2);
      expect(stored.has(100)).toBe(false);
    });

    it('accepts a deactivated shipyard building (STU ColonySurface::hasShipyard)', async () => {
      const { service, colony, gameData, shipRepo } = setup();
      colony.fields[0].isActive = false;
      gameData.getShipClassSlotRule.mockReturnValue({
        allowedBuildingFunctionIds: gameData.getBuildingFunctions(85130100),
        slots: [],
      });
      await service.disassembleShip(1, 1, 8);
      expect(shipRepo.remove).toHaveBeenCalled();
    });

    it('rejects a hull without a matching shipyard function before moving crew', async () => {
      const { service, gameData, colonyCrewService, shipRepo } = setup();
      gameData.getShipClassSlotRule.mockReturnValue({
        allowedBuildingFunctionIds: [-1],
        slots: [],
      });
      await expect(service.disassembleShip(1, 1, 8)).rejects.toThrow();
      expect(
        colonyCrewService.transferCrewFromShipToColony,
      ).not.toHaveBeenCalled();
      expect(shipRepo.remove).not.toHaveBeenCalled();
    });
  });

  it('disassembles ships with energy cost and recovered supplies', async () => {
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
      ...orbitColonyLocation,
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
      ...orbitShipLocation,
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

describe('faction shipyard visibility', () => {
  it('excludes opposing faction modules while retaining neutral modules', async () => {
    const { service, colonyRepo, shipClassRepo, gameData, userRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      ...orbitColonyLocation,
      name: 'Faction Test',
      energy: 100,
      energyMax: 100,
      population: 5,
      populationMax: 10,
      storageMax: 100,
      colonyClassId: 999,
      fields: [],
      storage: [],
      stats: { workless: 5, trainedCrew: 0, maxStorage: 100 },
    });
    userRepo.findOne.mockResolvedValue({ id: 1, faction: 'REBEL_ALLIANCE' });
    shipClassRepo.find.mockResolvedValue([
      { id: 1, category: 'CORVETTE', isNpc: false } as never,
    ]);
    gameData.getAllFabricationItems.mockReturnValue([
      {
        itemKey: 'module.rebel-blaster',
        queueType: 'MODULE',
        displayName: 'Blasterkanone',
        moduleType: 'Blasterkanone',
        moduleCategory: 'WEAPONS',
        shipyardGroup: 'WEAPONS',
        moduleLevel: 1,
        outputCommodityId: 10701,
        shipyardType: 'ENERGY_WEAPON',
        buildingFunctionIds: [10],
        faction: 'REBEL_ALLIANCE',
      },
      {
        itemKey: 'module.empire-turbolaser',
        queueType: 'MODULE',
        displayName: 'Turbolaser',
        moduleType: 'Turbolaser',
        moduleCategory: 'WEAPONS',
        shipyardGroup: 'WEAPONS',
        moduleLevel: 1,
        outputCommodityId: 10731,
        shipyardType: 'ENERGY_WEAPON',
        buildingFunctionIds: [10],
        faction: 'GALACTIC_EMPIRE',
      },
      {
        itemKey: 'module.neutral-system',
        queueType: 'MODULE',
        displayName: 'Neutral System',
        moduleType: 'Neutral System',
        moduleCategory: 'SPECIAL',
        shipyardGroup: 'UTILITY',
        moduleLevel: 1,
        outputCommodityId: 10301,
        shipyardType: 'EPS',
        buildingFunctionIds: [10],
      },
    ] as never);

    const detail = (await service.findOne(1, 1)) as {
      detailV2?: { availableShipModules?: Array<{ commodityId: number }> };
    };

    expect(
      detail.detailV2?.availableShipModules?.map((item) => item.commodityId),
    ).toEqual([10701, 10301]);
  });
});

describe('orbit dto blockers', () => {
  it('exposes orbit blocker metadata when no station or shuttle model exists', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      spacecraftModuleRepo,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      name: 'Orbit Test',
      energy: 100,
      energyMax: 120,
      population: 5,
      populationMax: 10,
      storageUsed: 0,
      storageMax: 500,
      ...orbitColonyLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      colonyClassId: 999,
      fields: [
        {
          id: 1,
          fieldIndex: 1,
          fieldType: 900,
          buildingId: 81130100,
          isBuilding: false,
          isActive: true,
          integrity: 100,
          maxIntegrity: 100,
        },
      ],
      storage: [],
      stats: {
        workers: 3,
        workless: 2,
        trainedCrew: 0,
        maxStorage: 500,
        maxEnergy: 120,
        isBlockaded: true,
        immigrationEnabled: true,
        colonyMessage: null,
        populationLimit: 0,
        shields: 0,
        shieldFrequency: null,
        torpedoTypeId: null,
      },
    });
    shipRepo.find.mockResolvedValue([
      {
        id: 7,
        userId: 1,
        name: 'Solo Ship',
        shipClassId: 1,
        ...orbitShipLocation,
        starSystemId: 10,
        celestialObjectId: 20,
        hull: 80,
        hullMax: 100,
        shields: 40,
        shieldsMax: 50,
        energy: 70,
        energyMax: 100,
        warpdrive: 24,
        warpdriveMax: 40,
        crew: 2,
        crewMax: 5,
        cargoUsed: 3,
        cargoMax: 20,
        status: 'IDLE',
        fleetId: null,
      },
    ] as unknown as never[]);
    spacecraftModuleRepo.find.mockResolvedValue([]);
    Object.assign(shipClassRepo, {
      findBy: jest.fn(async () => [
        {
          id: 1,
          key: 'NON_HANGAR_FRIGATE',
          name: 'Non Hangar Frigate',
          category: 'FRIGATE',
          role: 'ESCORT',
          crewMin: 2,
        },
      ]),
    });

    const colony = (await service.findOne(1, 1)) as {
      detailV2?: Record<string, unknown>;
    };
    const detail = colony.detailV2 as {
      orbitBlockers?: Record<string, string | null>;
      orbitShips?: Array<Record<string, unknown>>;
    };

    expect(detail?.orbitBlockers).toMatchObject({
      shuttleManagement: null,
      station: expect.stringContaining('no station entity attached'),
      defense: null,
    });
    expect(detail?.orbitShips).toEqual([
      expect.objectContaining({
        id: 7,
        shipClassKey: 'NON_HANGAR_FRIGATE',
        shipClassName: 'Non Hangar Frigate',
        shipCategory: 'FRIGATE',
        shipRole: 'ESCORT',
        warpdrive: 24,
        warpdriveMax: 40,
        canManage: true,
        canLand: false,
        canDefend: false,
        canBlock: false,
        canManageShuttle: false,
        orbitGroup: 'SINGLE',
        orbitGroupLabel: 'Einzelschiff',
        fleetId: null,
        station: null,
        actionBlockers: expect.objectContaining({
          shuttleManagement: expect.stringContaining('keine Shuttle-Kapazität'),
          station: expect.stringContaining('No station entity is linked'),
        }),
        shuttleCapacity: 0,
        shuttleStored: 0,
      }),
    ]);
  });
});

describe('foreign orbit ships (STU OrbitShipWrappersRetriever)', () => {
  it('lists uncloaked foreign ships with owner and fleet, without their state', async () => {
    const { service, colonyRepo, shipRepo, shipClassRepo, spacecraftModuleRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1, userId: 1, name: 'Orbit Test', ...orbitColonyLocation, starSystemId: 10,
      celestialObjectId: 20, colonyClassId: 999, fields: [], storage: [],
      stats: { workers: 0, workless: 0, maxStorage: 500, maxEnergy: 120, isBlockaded: false },
    });
    const foreign = (id: number, overrides = {}) => ({
      id, userId: 2, name: `Fremd ${id}`, shipClassId: 1, ...orbitShipLocation, status: 'IDLE',
      hull: 80, hullMax: 100, crew: 4, fleetId: 9, fleet: { id: 9, name: 'Rot' },
      user: { id: 2, username: 'Rivale' }, runtimeSystems: {}, ...overrides,
    });
    shipRepo.find.mockImplementation((async (options: any) =>
      typeof options?.where?.userId === 'number'
        ? []
        : [foreign(8), foreign(9, { runtimeSystems: { CLOAK: { active: true } } })]) as never,
    );
    spacecraftModuleRepo.find.mockResolvedValue([]);
    Object.assign(shipClassRepo, {
      findBy: jest.fn(async () => [{ id: 1, key: 'FRIGATE_KEY', name: 'Fregatte' }]),
    });

    const colony = (await service.findOne(1, 1)) as { detailV2?: Record<string, unknown> };
    const detail = colony.detailV2 as { foreignOrbitShips?: Array<Record<string, unknown>> };

    expect(detail.foreignOrbitShips).toEqual([
      {
        id: 8, name: 'Fremd 8', shipClassId: 1, shipClassKey: 'FRIGATE_KEY',
        shipClassName: 'Fregatte', ownerId: 2, ownerName: 'Rivale', fleetId: 9, fleetName: 'Rot',
      },
    ]);
  });
});

describe('colony projection upgrades', () => {
  it('projects FZ II upgrades only when the required research is completed', async () => {
    const { service, colonyRepo, unlockResolver } = createColonyService();
    const field = {
      id: 1,
      fieldIndex: 5,
      fieldType: 101,
      terrainTileId: null,
      layer: 'SURFACE',
      buildingId: 72010100,
      isBuilding: false,
      isActive: true,
      integrity: 100,
      maxIntegrity: 100,
      buildProgress: 100,
      buildFinishesAt: null,
      terraformingId: null,
      terraformingFinishesAt: null,
    };
    const colony = {
      id: 1,
      userId: 1,
      name: 'Forschungswelt',
      energy: 100,
      energyMax: 200,
      storageUsed: 0,
      storageMax: 100,
      population: 5,
      populationMax: 20,
      starSystemId: 10,
      celestialObjectId: 20,
      celestialObject: { name: 'Testwelt', classId: 1 },
      starSystem: { name: 'Testsystem' },
      fields: [field],
      storage: [],
      stats: {
        workers: 0,
        workless: 5,
        food: 0,
        morale: 0,
        workersPercent: 0,
      },
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    unlockResolver.getCompletedTechIds.mockResolvedValue(new Set([200201]));

    const withResearch = (await service.findOne(1, 1)) as {
      detailV2?: {
        buildingManagement?: { fields?: Array<Record<string, unknown>> };
      };
    };
    const withResearchFields =
      withResearch.detailV2?.buildingManagement?.fields ?? [];

    expect(withResearchFields[0]).toEqual(
      expect.objectContaining({
        buildingId: 72010100,
        availableUpgrades: [
          expect.objectContaining({
            id: 7201010073,
            fromBuildingId: 72010100,
            toBuildingId: 73010100,
            researchId: 200201,
          }),
        ],
      }),
    );

    unlockResolver.getCompletedTechIds.mockResolvedValue(new Set());
    const withoutResearch = (await service.findOne(1, 1)) as {
      detailV2?: {
        buildingManagement?: { fields?: Array<Record<string, unknown>> };
      };
    };
    const withoutResearchFields =
      withoutResearch.detailV2?.buildingManagement?.fields ?? [];

    expect(withoutResearchFields[0]).toEqual(
      expect.objectContaining({
        buildingId: 72010100,
        availableUpgrades: [],
      }),
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
      { get: jest.fn(() => undefined) } as any,
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

  it('scales build job finish time with the configured alpha multiplier', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    try {
      const fieldRepo = { save: jest.fn(async (value) => value) };
      const statsRepo = { save: jest.fn(async (value) => value) };
      const service = new BuildingLifecycleService(
        fieldRepo as any,
        statsRepo as any,
        { get: jest.fn(() => '0.5') } as any,
      );
      const field = {} as any;

      service.prepareBuildJob(field, 400, 60);

      expect(field.buildFinishesAt).toEqual(
        new Date('2026-07-03T10:00:30.000Z'),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('finishes a building and activates it when workers are available', async () => {
    const fieldRepo = { save: jest.fn(async (value) => value) };
    const statsRepo = { save: jest.fn(async (value) => value) };
    const service = new BuildingLifecycleService(
      fieldRepo as any,
      statsRepo as any,
      { get: jest.fn(() => undefined) } as any,
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
  it('blocks non-commodity research without produced research commodity points', async () => {
    const research = {
      userId: 1,
      techId: 210103,
      status: ResearchStatus.IN_PROGRESS,
      remainingPoints: 10,
      spentPoints: 0,
      progress: 0,
      blockedReason: null,
    };
    const researchRepo = {
      findOne: jest.fn(async () => research),
      save: jest.fn(async (value) => value),
    };
    const gameData = {
      getTech: jest.fn(() => ({
        id: 210103,
        effort: 10,
        commodityId: 1702,
        mappedCommodityId: 1702,
        dependencies: [],
      })),
    };
    const service = new ResearchService(
      researchRepo as any,
      gameData as any,
      { sendSystem: jest.fn() } as any,
      { emitToUser: jest.fn() } as any,
    );

    await service.processTick(1, 3, new Map());

    expect(research.spentPoints).toBe(0);
    expect(research.remainingPoints).toBe(10);
    expect(research.status).toBe(ResearchStatus.IN_PROGRESS);
    expect(research.blockedReason).toBe('NO_RESEARCH_PRODUCTION');
  });

  it('advances non-commodity research by produced research commodity points', async () => {
    const research = {
      userId: 1,
      techId: 210103,
      status: ResearchStatus.IN_PROGRESS,
      remainingPoints: 10,
      spentPoints: 0,
      progress: 0,
      blockedReason: null,
    };
    const researchRepo = {
      findOne: jest.fn(async () => research),
      save: jest.fn(async (value) => value),
    };
    const gameData = {
      getTech: jest.fn(() => ({
        id: 210103,
        effort: 10,
        commodityId: 1702,
        mappedCommodityId: 1702,
        dependencies: [],
      })),
    };
    const service = new ResearchService(
      researchRepo as any,
      gameData as any,
      { sendSystem: jest.fn() } as any,
      { emitToUser: jest.fn() } as any,
    );

    await service.processTick(1, 0, new Map([[1702, 3]]));

    expect(research.spentPoints).toBe(3);
    expect(research.remainingPoints).toBe(7);
    expect(research.status).toBe(ResearchStatus.IN_PROGRESS);
    expect(research.blockedReason).toBeNull();
  });

  it('does not apply research overflow to a queued tech with another commodity', async () => {
    const current = {
      userId: 1,
      techId: 1,
      status: ResearchStatus.IN_PROGRESS,
      remainingPoints: 2,
      spentPoints: 0,
      progress: 0,
      blockedReason: null,
    };
    const queued = {
      userId: 1,
      techId: 2,
      status: ResearchStatus.QUEUED,
      queuePosition: 1,
      remainingPoints: 10,
      spentPoints: 0,
      progress: 0,
      blockedReason: null,
    };
    const researchRepo = {
      findOne: jest.fn(async () => current),
      find: jest.fn(async () => [queued]),
      save: jest.fn(async (value) => value),
    };
    const gameData = {
      getTech: jest.fn((techId) => ({
        id: techId,
        effort: 10,
        commodityId: techId === 1 ? 1701 : 1702,
        mappedCommodityId: techId === 1 ? 1701 : 1702,
        dependencies: [],
      })),
    };
    const service = new ResearchService(
      researchRepo as any,
      gameData as any,
      { sendSystem: jest.fn() } as any,
      { emitToUser: jest.fn() } as any,
    );

    await service.processTick(1, 0, new Map([[1701, 3]]));

    expect(current.status).toBe(ResearchStatus.COMPLETED);
    expect(queued.status).toBe(ResearchStatus.IN_PROGRESS);
    expect(queued.spentPoints).toBe(0);
  });

  it('advances commodity research only from matching produced commodity', async () => {
    const research = {
      userId: 1,
      techId: 220101,
      status: ResearchStatus.IN_PROGRESS,
      remainingPoints: 10,
      spentPoints: 0,
      progress: 0,
      blockedReason: null,
    };
    const researchRepo = {
      findOne: jest.fn(async () => research),
      save: jest.fn(async (value) => value),
    };
    const gameData = {
      getTech: jest.fn(() => ({
        id: 220101,
        effort: 10,
        commodityId: 2,
        mappedCommodityId: 2,
        researchMode: 'commodity',
        dependencies: [],
      })),
    };
    const service = new ResearchService(
      researchRepo as any,
      gameData as any,
      { sendSystem: jest.fn() } as any,
      { emitToUser: jest.fn() } as any,
    );

    await service.processTick(1, 99, new Map([[4, 5]]));

    expect(research.spentPoints).toBe(0);
    expect(research.remainingPoints).toBe(10);
    expect(research.blockedReason).toBe('NO_COMMODITY_PRODUCTION');

    await service.processTick(1, 0, new Map([[2, 4]]));

    expect(research.spentPoints).toBe(4);
    expect(research.remainingPoints).toBe(6);
    expect(research.blockedReason).toBeNull();
  });
});

describe('main tick idempotency', () => {
  const createTickService = (config: Record<string, string | undefined> = {}) =>
    new TickService(
      { find: jest.fn(async () => []) } as any,
      {} as any,
      { find: jest.fn(async () => []) } as any,
      { find: jest.fn(async () => []) } as any,
      {
        findOne: jest.fn(async () => null),
        create: jest.fn((value) => value),
        save: jest.fn(async (value) => value),
      } as any,
      {} as any,
      { createTickEvents: jest.fn(async () => []) } as any,
      {} as any,
      { processTick: jest.fn(async () => undefined) } as any,
      { emitToAll: jest.fn(), emitToUser: jest.fn() } as any,
      { get: jest.fn((key: string) => config[key]) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
    );

  it('mails the failure from an actual main tick runner without masking the original error', async () => {
    const service = createTickService();
    const notify = jest.fn(async () => undefined);
    const failure = new Error('main worker failed');
    Object.assign(service, { failureMail: { notify }, userRepo: { find: jest.fn(async () => { throw failure; }) } });
    await expect(service.handleTick(1234)).rejects.toBe(failure);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ tickType: GameTickType.MAIN, status: GameTickStatus.FAILED, error: expect.stringContaining('main worker failed') }));
  });

  it('mails a failure from the actual minute completion runner', async () => {
    const service = createTickService();
    const notify = jest.fn(async () => undefined);
    const failure = new Error('completion failed');
    Object.assign(service, {
      failureMail: { notify },
      fieldRepo: { find: jest.fn(async () => [{ colonyId: 4 }]) },
      colonyRepo: { find: jest.fn(async () => [{ id: 4, userId: 7 }]) },
      colonyService: { checkBuildingCompletions: jest.fn(async () => { throw failure; }) },
    });
    await expect(service.checkBuildingCompletions()).rejects.toBe(failure);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ tickType: GameTickType.BUILDING_COMPLETION, status: GameTickStatus.FAILED, error: expect.stringContaining('completion failed') }));
  });

  it.each(['state', 'game-status', 'minute-query'])('mails early %s failures even before a run can be recorded', async stage => {
    const service = createTickService();
    const failure = new Error('database unavailable');
    const reject = jest.fn(async () => { throw failure; });
    const notify = jest.fn(async () => undefined);
    Object.assign(service, { failureMail: { notify } });
    if (stage === 'state') Object.assign(service, { tickStateRepo: { findOne: reject } });
    if (stage === 'game-status') Object.assign(service, { gameStatusService: { beginMainTick: reject } });
    if (stage === 'minute-query') Object.assign(service, { fieldRepo: { find: reject } });
    const run = stage === 'minute-query' ? service.checkBuildingCompletions() : service.handleTick(1234);
    await expect(run).rejects.toBe(failure);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ status: GameTickStatus.FAILED, error: expect.stringContaining('database unavailable') }));
  });

  it('suppresses storage-full events when the user disabled storage notifications', async () => {
    const colony = { id: 4, userId: 7, isAbandoned: false };
    const colonyRepo = {
      find: jest.fn()
        .mockResolvedValueOnce([{ id: colony.id }])
        .mockResolvedValueOnce([colony]),
    };
    const shipRepo = { find: jest.fn(async () => []) };
    const userRepo = { find: jest.fn(async () => []) };
    const tickStateRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const colonyEventService = { createTickEvents: jest.fn(async () => []) };
    const service = new TickService(
      colonyRepo as any,
      {} as any,
      shipRepo as any,
      userRepo as any,
      tickStateRepo as any,
      {
        processTick: jest.fn(async () => ({
          researchPoints: 0,
          productionDelta: new Map(),
          events: [
            { type: 'STORAGE_FULL' },
            { type: 'BUILDING_DEACTIVATED', buildingName: 'Mine' },
          ],
        })),
      } as any,
      colonyEventService as any,
      {} as any,
      { processTick: jest.fn(async () => undefined) } as any,
      { emitToAll: jest.fn(), emitToUser: jest.fn() } as any,
      { get: jest.fn() } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
      undefined,
      undefined,
      undefined,
      { getBoolean: jest.fn(async () => false) } as any,
    );

    await service.handleTick(1234);

    expect(colonyEventService.createTickEvents).toHaveBeenCalledWith(
      colony.id,
      colony.userId,
      [{ type: 'BUILDING_DEACTIVATED', buildingName: 'Mine' }],
      1234,
    );
  });

  it('enforces global crew limits for active users but skips vacationers', async () => {
    const colonyRepo = { find: jest.fn(async () => []) };
    const shipRepo = { find: jest.fn(async () => []) };
    const users = [
      { id: 1, vacationMode: false },
      { id: 2, vacationMode: true, vacationStartedAt: new Date(Date.now() - 49 * 60 * 60 * 1000) },
    ];
    const userRepo = { find: jest.fn(async () => users) };
    const tickStateRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const colonyCrewService = { enforceGlobalCrewLimit: jest.fn(async () => 0) };
    const messagingService = { sendSystem: jest.fn(async () => undefined) };
    const service = new TickService(
      colonyRepo as any,
      {} as any,
      shipRepo as any,
      userRepo as any,
      tickStateRepo as any,
      {} as any,
      { createTickEvents: jest.fn(async () => []) } as any,
      {} as any,
      { processTick: jest.fn(async () => undefined) } as any,
      { emitToAll: jest.fn(), emitToUser: jest.fn() } as any,
      { get: jest.fn() } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
      undefined,
      colonyCrewService as any,
      messagingService as any,
    );

    await service.handleTick(1234);

    expect(colonyCrewService.enforceGlobalCrewLimit).toHaveBeenCalledTimes(1);
    expect(colonyCrewService.enforceGlobalCrewLimit).toHaveBeenCalledWith(1);
  });

  it('calculates hourly tick slots when schedule is wildcard', () => {
    const service = createTickService({ GAME_MAIN_TICK_SCHEDULE_HOURS: '*' });
    const slot = new Date(2026, 6, 3, 13, 0, 0, 0).getTime();

    expect(
      (service as any).getMainTickNumber(new Date(2026, 6, 3, 13, 42, 12, 123)),
    ).toBe(slot);
  });

  it('calculates configured tick slots for explicit hour lists', () => {
    const service = createTickService({
      GAME_MAIN_TICK_SCHEDULE_HOURS: '0,12,15,18,21',
    });
    const slot = new Date(2026, 6, 3, 12, 0, 0, 0).getTime();

    expect(
      (service as any).getMainTickNumber(new Date(2026, 6, 3, 14, 30)),
    ).toBe(slot);
  });

  it.each([
    ['2026-01-15T11:00:00.000Z'],
    ['2026-07-15T10:00:00.000Z'],
  ])('uses the default Berlin tick schedule at %s', async (iso) => {
    jest.useFakeTimers().setSystemTime(new Date(iso));
    try {
      const service = createTickService();
      const handleTick = jest
        .spyOn(service, 'handleTick')
        .mockResolvedValue({ tickNumber: 1, status: GameTickStatus.COMPLETED });

      await service.handleScheduledMainTick();

      expect(handleTick).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('runs the scheduled wrapper only for active configured hours', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 3, 13, 0, 0, 0));
    try {
      const service = createTickService({
        GAME_MAIN_TICK_SCHEDULE_HOURS: '0,12,15,18,21',
      });
      const handleTick = jest
        .spyOn(service, 'handleTick')
        .mockResolvedValue({ tickNumber: 1, status: GameTickStatus.COMPLETED });

      await service.handleScheduledMainTick();

      expect(handleTick).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('runs the scheduled wrapper hourly for wildcard schedules', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 3, 13, 0, 0, 0));
    try {
      const service = createTickService({ GAME_MAIN_TICK_SCHEDULE_HOURS: '*' });
      const handleTick = jest
        .spyOn(service, 'handleTick')
        .mockResolvedValue({ tickNumber: 1, status: GameTickStatus.COMPLETED });

      await service.handleScheduledMainTick();

      expect(handleTick).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('returns previous and next configured boundaries around a midday interval', () => {
    const service = createTickService({
      GAME_MAIN_TICK_SCHEDULE_HOURS: '0,12,15,18,21',
    });
    const now = new Date(2026, 6, 3, 14, 30, 15, 250);

    expect(service.getTickStatus(now)).toEqual({
      serverTime: now.toISOString(),
      previousTickAt: new Date(2026, 6, 3, 12, 0, 0, 0).toISOString(),
      nextTickAt: new Date(2026, 6, 3, 15, 0, 0, 0).toISOString(),
      currentTickIndex: 1,
      totalTicks: 5,
    });
  });

  it('sorts explicit schedules before computing previous, next, and index', () => {
    const service = createTickService({
      GAME_MAIN_TICK_SCHEDULE_HOURS: '21,0,15,12,18',
    });
    const now = new Date(2026, 6, 3, 14, 30, 15, 250);

    expect(service.getTickStatus(now)).toEqual({
      serverTime: now.toISOString(),
      previousTickAt: new Date(2026, 6, 3, 12, 0, 0, 0).toISOString(),
      nextTickAt: new Date(2026, 6, 3, 15, 0, 0, 0).toISOString(),
      currentTickIndex: 1,
      totalTicks: 5,
    });
  });

  it('crosses from the 21:00 slot to next-day 00:00 for configured schedules', () => {
    const service = createTickService({
      GAME_MAIN_TICK_SCHEDULE_HOURS: '0,12,15,18,21',
    });
    const now = new Date(2026, 6, 3, 21, 0, 0, 0);

    expect(service.getTickStatus(now)).toEqual({
      serverTime: now.toISOString(),
      previousTickAt: new Date(2026, 6, 3, 21, 0, 0, 0).toISOString(),
      nextTickAt: new Date(2026, 6, 4, 0, 0, 0, 0).toISOString(),
      currentTickIndex: 4,
      totalTicks: 5,
    });
  });

  it('expands wildcard schedules to hourly previous and next boundaries', () => {
    const service = createTickService({ GAME_MAIN_TICK_SCHEDULE_HOURS: '*' });
    const now = new Date(2026, 6, 3, 13, 42, 12, 123);

    expect(service.getTickStatus(now)).toEqual({
      serverTime: now.toISOString(),
      previousTickAt: new Date(2026, 6, 3, 13, 0, 0, 0).toISOString(),
      nextTickAt: new Date(2026, 6, 3, 14, 0, 0, 0).toISOString(),
      currentTickIndex: 13,
      totalTicks: 24,
    });
  });

  it('returns the documented tick status response shape with iso strings', () => {
    const service = createTickService({
      GAME_MAIN_TICK_SCHEDULE_HOURS: '0,12,15,18,21',
    });
    const now = new Date(2026, 6, 3, 0, 5, 6, 789);
    const status = service.getTickStatus(now);

    expect(status).toStrictEqual({
      serverTime: now.toISOString(),
      previousTickAt: new Date(2026, 6, 3, 0, 0, 0, 0).toISOString(),
      nextTickAt: new Date(2026, 6, 3, 12, 0, 0, 0).toISOString(),
      currentTickIndex: 0,
      totalTicks: 5,
    });
    expect(Object.keys(status)).toEqual([
      'serverTime',
      'previousTickAt',
      'nextTickAt',
      'currentTickIndex',
      'totalTicks',
    ]);
  });

  it('sets the tick status during processing and restores the previous status', async () => {
    const gameStatus = {
      beginMainTick: jest.fn().mockResolvedValue({ status: 'ONLINE', message: '' }),
      endMainTick: jest.fn().mockResolvedValue(undefined),
    };
    const service = new TickService(
      { find: jest.fn(async () => []) } as any,
      {} as any,
      { find: jest.fn(async () => []) } as any,
      { find: jest.fn(async () => []) } as any,
      {
        findOne: jest.fn(async () => null),
        create: jest.fn((value) => value),
        save: jest.fn(async (value) => value),
      } as any,
      {} as any,
      { createTickEvents: jest.fn() } as any,
      {} as any,
      {} as any,
      { emitToAll: jest.fn(), emitToUser: jest.fn() } as any,
      { get: jest.fn(() => undefined) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      gameStatus as any,
    );

    await service.handleTick(1234);

    expect(gameStatus.beginMainTick).toHaveBeenCalledTimes(1);
    expect(gameStatus.endMainTick).toHaveBeenCalledWith({ status: 'ONLINE', message: '' });
  });

  it('restores the previous status when main tick processing fails', async () => {
    const gameStatus = {
      beginMainTick: jest.fn().mockResolvedValue({ status: 'MAINTENANCE_ANNOUNCED', message: 'Später.' }),
      endMainTick: jest.fn().mockResolvedValue(undefined),
    };
    const service = new TickService(
      { find: jest.fn(async () => [{ id: 1, userId: 7, isAbandoned: false }]) } as any,
      {} as any,
      { find: jest.fn(async () => []) } as any,
      { find: jest.fn(async () => []) } as any,
      {
        findOne: jest.fn(async () => null),
        create: jest.fn((value) => value),
        save: jest.fn(async (value) => value),
      } as any,
      { processTick: jest.fn(async () => { throw new Error('tick failed'); }) } as any,
      { createTickEvents: jest.fn() } as any,
      {} as any,
      {} as any,
      { emitToAll: jest.fn(), emitToUser: jest.fn() } as any,
      { get: jest.fn(() => undefined) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      gameStatus as any,
    );

    await expect(service.handleTick(1234)).rejects.toThrow('tick failed');
    expect(gameStatus.endMainTick).toHaveBeenCalledWith({
      status: 'MAINTENANCE_ANNOUNCED',
      message: 'Später.',
    });
  });

  it('does not replace an active maintenance status with TICK', async () => {
    const gameStatus = {
      beginMainTick: jest.fn().mockResolvedValue(null),
      endMainTick: jest.fn(),
    };
    const service = new TickService(
      { find: jest.fn(async () => []) } as any,
      {} as any,
      { find: jest.fn(async () => []) } as any,
      { find: jest.fn(async () => []) } as any,
      {
        findOne: jest.fn(async () => null),
        create: jest.fn((value) => value),
        save: jest.fn(async (value) => value),
      } as any,
      {} as any,
      { createTickEvents: jest.fn() } as any,
      {} as any,
      {} as any,
      { emitToAll: jest.fn(), emitToUser: jest.fn() } as any,
      { get: jest.fn(() => undefined) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      gameStatus as any,
    );

    await service.handleTick(1234);

    expect(gameStatus.endMainTick).not.toHaveBeenCalled();
  });

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
      { createTickEvents: jest.fn(async () => []) } as any,
      {} as any,
      {} as any,
      { emitToAll: jest.fn(), emitToUser: jest.fn() } as any,
      { get: jest.fn(() => undefined) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
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
      { createTickEvents: jest.fn(async () => []) } as any,
      {} as any,
      { processTick: jest.fn(async () => undefined) } as any,
      { emitToAll: jest.fn(), emitToUser: jest.fn() } as any,
      { get: jest.fn(() => undefined) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
    );

    const result = await service.triggerManualTick();

    expect(result.status).toBe(GameTickStatus.COMPLETED);
    expect(tickStateRepo.findOne).toHaveBeenCalledWith({
      where: { tickType: GameTickType.MAIN, tickNumber: result.tickNumber },
    });
    expect(colonyRepo.find).toHaveBeenCalled();
  });

  it('loads canonical ship locations and emits them in movement payloads', async () => {
    const location = {
      id: 91,
      kind: 'SYSTEM_FIELD',
      systemField: { starSystemId: 3, sx: 8, sy: 12 },
    };
    const ship = {
      id: 7,
      userId: 4,
      locationId: 90,
      location: null,
      inSystem: false,
      currentLayerId: 2,
      posX: 1,
      posY: 1,
    };
    const shipRepo = { find: jest.fn(async () => [ship]) };
    const spacecraftService = {
      processTick: jest.fn(async () => {
        ship.locationId = location.id;
        ship.location = location as any;
      }),
    };
    const gateway = { emitToAll: jest.fn(), emitToUser: jest.fn() };
    const service = new TickService(
      { find: jest.fn(async () => []) } as any,
      {} as any,
      shipRepo as any,
      { find: jest.fn(async () => []) } as any,
      {
        findOne: jest.fn(async () => null),
        create: jest.fn((value) => value),
        save: jest.fn(async (value) => value),
      } as any,
      {} as any,
      { createTickEvents: jest.fn() } as any,
      spacecraftService as any,
      { processTick: jest.fn() } as any,
      gateway as any,
      { get: jest.fn(() => undefined) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
    );

    await service.handleTick(1);

    expect(shipRepo.find).toHaveBeenNthCalledWith(2, {
      where: { id: expect.anything() },
      order: { id: 'ASC' },
      relations: [
        'location',
        'location.galaxyField',
        'location.systemField',
      ],
    });
    expect(gateway.emitToUser).toHaveBeenCalledWith(4, WsEventType.SHIP_MOVED, {
      shipId: 7,
      locationId: 91,
      location: {
        scope: 'SYSTEM',
        locationId: 91,
        systemId: 3,
        x: 8,
        y: 12,
      },
    });
  });

  it('always emits colony updates after processing even without report events', async () => {
    const colony = { id: 1, userId: 7 };
    const colonyRepo = { find: jest.fn(async () => [colony]) };
    const shipRepo = { find: jest.fn(async () => []) };
    const userRepo = { find: jest.fn(async () => [{ id: 7 }]) };
    const tickStateRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    let signalProcessingStarted!: () => void;
    const processingStarted = new Promise<void>((resolve) => {
      signalProcessingStarted = resolve;
    });
    let resolveProcessing!: () => void;
    const processing = new Promise<void>((resolve) => {
      resolveProcessing = resolve;
    });
    const colonyService = {
      processTick: jest.fn(() => {
        signalProcessingStarted();
        return processing.then(() => ({
          researchPoints: 1,
          productionDelta: new Map<number, number>(),
          events: [],
        }));
      }),
    };
    const colonyEventService = { createTickEvents: jest.fn() };
    const researchService = { processTick: jest.fn(async () => undefined) };
    const gateway = { emitToAll: jest.fn(), emitToUser: jest.fn() };
    const service = new TickService(
      colonyRepo as any,
      {} as any,
      shipRepo as any,
      userRepo as any,
      tickStateRepo as any,
      colonyService as any,
      colonyEventService as any,
      {} as any,
      researchService as any,
      gateway as any,
      { get: jest.fn(() => undefined) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
    );

    const handling = service.handleTick();
    await processingStarted;
    expect(gateway.emitToUser).not.toHaveBeenCalled();

    resolveProcessing();
    await handling;

    expect(gateway.emitToUser).toHaveBeenCalledTimes(1);
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      7,
      WsEventType.COLONY_UPDATED,
      { colonyId: 1 },
    );
    expect(colonyEventService.createTickEvents).not.toHaveBeenCalled();
  });

  it('waits for colony processing and event persistence before emitting reports', async () => {
    const colony = { id: 1, userId: 7 };
    const colonyRepo = { find: jest.fn(async () => [colony]) };
    const shipRepo = { find: jest.fn(async () => []) };
    const userRepo = { find: jest.fn(async () => [{ id: 7 }]) };
    const tickStateRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const tickEvent = {
      type: 'BUILDING_DEACTIVATED' as const,
      fieldIndex: 7,
      reason: 'Energie',
    };
    const tickResult = {
      researchPoints: 1,
      productionDelta: new Map<number, number>(),
      events: [tickEvent],
    };
    let signalProcessingStarted!: () => void;
    const processingStarted = new Promise<void>((resolve) => {
      signalProcessingStarted = resolve;
    });
    let resolveProcessing!: (result: typeof tickResult) => void;
    const processing = new Promise<typeof tickResult>((resolve) => {
      resolveProcessing = resolve;
    });
    const colonyService = {
      processTick: jest.fn(() => {
        signalProcessingStarted();
        return processing;
      }),
    };
    let signalEventPersistenceStarted!: () => void;
    const eventPersistenceStarted = new Promise<void>((resolve) => {
      signalEventPersistenceStarted = resolve;
    });
    let resolveEventPersistence!: () => void;
    const eventPersistence = new Promise<void>((resolve) => {
      resolveEventPersistence = resolve;
    });
    const colonyEventService = {
      createTickEvents: jest.fn(() => {
        signalEventPersistenceStarted();
        return eventPersistence;
      }),
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
      colonyEventService as any,
      {} as any,
      researchService as any,
      gateway as any,
      { get: jest.fn(() => undefined) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
    );

    const handling = service.handleTick();
    await processingStarted;
    expect(gateway.emitToUser).not.toHaveBeenCalled();

    resolveProcessing(tickResult);
    await eventPersistenceStarted;
    expect(gateway.emitToUser).toHaveBeenCalledTimes(1);
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      7,
      WsEventType.COLONY_UPDATED,
      { colonyId: 1 },
    );
    expect(colonyEventService.createTickEvents).toHaveBeenCalledWith(
      1,
      7,
      tickResult.events,
      expect.any(Number),
    );
    expect(gateway.emitToUser).not.toHaveBeenCalledWith(
      7,
      WsEventType.COLONY_TICK_REPORT,
      expect.anything(),
    );

    resolveEventPersistence();
    await handling;
    expect(gateway.emitToUser).toHaveBeenNthCalledWith(
      2,
      7,
      WsEventType.COLONY_TICK_REPORT,
      {
        colonyId: 1,
        tick: expect.any(Number),
        events: tickResult.events,
      },
    );
  });

  it('persists and emits minute completion events only for the owning colony with a real completion', async () => {
    const colonies = [
      { id: 1, userId: 7 },
      { id: 2, userId: 8, isAbandoned: true },
      { id: 3, userId: null },
    ];
    const colonyRepo = {
      find: jest.fn(async () => colonies),
    };
    const fieldRepo = {
      find: jest.fn(async () =>
        colonies.map((colony) => ({ colonyId: colony.id, colony })),
      ),
    };
    const tickStateRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const completionEvent = {
      type: 'BUILDING_FINISHED' as const,
      fieldIndex: 4,
      buildingId: 101,
      buildingName: 'Habitat',
    };
    const colonyService = {
      checkBuildingCompletions: jest.fn(
        async (colony: { id: number }, events: ColonyTickEvent[]) => {
          if (colony.id !== 2) events.push(completionEvent);
        },
      ),
    };
    let resolvePersistenceGate!: () => void;
    const persistenceGate = new Promise<void>((resolve) => {
      resolvePersistenceGate = resolve;
    });
    let resolvePersistenceStarted!: () => void;
    const persistenceStarted = new Promise<void>((resolve) => {
      resolvePersistenceStarted = resolve;
    });
    const colonyEventService = {
      createTickEvents: jest.fn(() => {
        resolvePersistenceStarted();
        return persistenceGate;
      }),
    };
    const gateway = { emitToAll: jest.fn(), emitToUser: jest.fn() };
    const service = new TickService(
      colonyRepo as any,
      fieldRepo as any,
      {} as any,
      {} as any,
      tickStateRepo as any,
      colonyService as any,
      colonyEventService as any,
      {} as any,
      {} as any,
      gateway as any,
      { get: jest.fn(() => undefined) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
    );

    const handling = service.checkBuildingCompletions();
    await persistenceStarted;
    resolvePersistenceGate();
    await handling;

    expect(colonyService.checkBuildingCompletions).toHaveBeenCalledTimes(1);
    expect(
      colonyService.checkBuildingCompletions.mock.calls.map((call) => call[0]),
    ).toEqual([expect.objectContaining({ id: 1, userId: 7 })]);
    expect(colonyEventService.createTickEvents).toHaveBeenCalledTimes(1);
    expect(colonyEventService.createTickEvents).toHaveBeenCalledWith(
      1,
      7,
      [completionEvent],
      expect.any(Number),
    );
    expect(gateway.emitToUser).toHaveBeenCalledTimes(2);
    expect(gateway.emitToUser).toHaveBeenNthCalledWith(
      1,
      7,
      WsEventType.COLONY_UPDATED,
      { colonyId: 1 },
    );
    expect(gateway.emitToUser).toHaveBeenNthCalledWith(
      2,
      7,
      WsEventType.COLONY_TICK_REPORT,
      {
        colonyId: 1,
        tick: expect.any(Number),
        events: [completionEvent],
      },
    );
  });
  it('emits no minute completion events when the scan is a no-op', async () => {
    const colonyRepo = { find: jest.fn(async () => [{ id: 1, userId: 7 }]) };
    const fieldRepo = {
      find: jest.fn(async () => [{ colonyId: 1 }]),
    };
    const tickStateRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const colonyService = {
      checkBuildingCompletions: jest.fn(async () => undefined),
    };
    const colonyEventService = { createTickEvents: jest.fn() };
    const gateway = { emitToAll: jest.fn(), emitToUser: jest.fn() };
    const service = new TickService(
      colonyRepo as any,
      fieldRepo as any,
      {} as any,
      {} as any,
      tickStateRepo as any,
      colonyService as any,
      colonyEventService as any,
      {} as any,
      {} as any,
      gateway as any,
      { get: jest.fn(() => undefined) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
    );

    await service.checkBuildingCompletions();

    expect(colonyService.checkBuildingCompletions).toHaveBeenCalledTimes(1);
    expect(colonyEventService.createTickEvents).not.toHaveBeenCalled();
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('waits for research and completed persistence before broadcasting TICK', async () => {
    let signalResearchStarted!: () => void;
    const researchStarted = new Promise<void>((resolve) => {
      signalResearchStarted = resolve;
    });
    let resolveResearch!: () => void;
    const research = new Promise<void>((resolve) => {
      resolveResearch = resolve;
    });
    let signalCompletionSaveStarted!: () => void;
    const completionSaveStarted = new Promise<void>((resolve) => {
      signalCompletionSaveStarted = resolve;
    });
    let resolveCompletionSave!: () => void;
    const completionSave = new Promise<void>((resolve) => {
      resolveCompletionSave = resolve;
    });
    const tickStateRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((value) => value),
      save: jest.fn((value) => {
        if (value.status === GameTickStatus.COMPLETED) {
          signalCompletionSaveStarted();
          return completionSave.then(() => value);
        }
        return Promise.resolve(value);
      }),
    };
    const researchService = {
      processTick: jest.fn(() => {
        signalResearchStarted();
        return research;
      }),
    };
    const gateway = { emitToUser: jest.fn(), emitToAll: jest.fn() };
    const service = new TickService(
      { find: jest.fn(async () => []) } as any,
      {} as any,
      { find: jest.fn(async () => []) } as any,
      { find: jest.fn(async () => [{ id: 7 }]) } as any,
      tickStateRepo as any,
      {} as any,
      { createTickEvents: jest.fn() } as any,
      {} as any,
      researchService as any,
      gateway as any,
      { get: jest.fn(() => undefined) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
    );

    const handling = service.handleTick();
    await researchStarted;
    expect(gateway.emitToAll).not.toHaveBeenCalled();

    resolveResearch();
    await completionSaveStarted;
    expect(gateway.emitToAll).not.toHaveBeenCalled();

    resolveCompletionSave();
    await handling;
    expect(gateway.emitToAll).toHaveBeenCalledWith(WsEventType.TICK, {
      tick: expect.any(Number),
    });
  });

  it('does not broadcast TICK when COMPLETED persistence fails', async () => {
    const completionError = new Error('completion save failed');
    const savedStatuses: GameTickStatus[] = [];
    const tickStateRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        savedStatuses.push(value.status);
        if (value.status === GameTickStatus.COMPLETED) throw completionError;
        return value;
      }),
    };
    const gateway = { emitToAll: jest.fn(), emitToUser: jest.fn() };
    const service = new TickService(
      { find: jest.fn(async () => []) } as any,
      {} as any,
      { find: jest.fn(async () => []) } as any,
      { find: jest.fn(async () => []) } as any,
      tickStateRepo as any,
      {} as any,
      { createTickEvents: jest.fn() } as any,
      {} as any,
      {} as any,
      gateway as any,
      { get: jest.fn(() => undefined) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
    );

    await expect(service.handleTick()).rejects.toBe(completionError);

    expect(gateway.emitToAll).not.toHaveBeenCalled();
    expect(savedStatuses).toEqual([
      GameTickStatus.STARTED,
      GameTickStatus.COMPLETED,
      GameTickStatus.FAILED,
    ]);
    expect(tickStateRepo.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: GameTickStatus.FAILED,
        error: expect.stringContaining('Error: completion save failed'),
      }),
    );
  });

  it('does not broadcast TICK when main tick processing fails', async () => {
    const tickStateRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const gateway = { emitToAll: jest.fn(), emitToUser: jest.fn() };
    const service = new TickService(
      { find: jest.fn(async () => [{ id: 1, userId: 7 }]) } as any,
      {} as any,
      {} as any,
      { find: jest.fn(async () => []) } as any,
      tickStateRepo as any,
      {
        processTick: jest.fn(async () => {
          throw new Error('tick failed');
        }),
      } as any,
      { createTickEvents: jest.fn() } as any,
      {} as any,
      {} as any,
      gateway as any,
      { get: jest.fn(() => undefined) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
    );

    await expect(service.handleTick()).rejects.toThrow('tick failed');

    expect(gateway.emitToAll).not.toHaveBeenCalled();
    expect(tickStateRepo.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: GameTickStatus.FAILED,
        error: expect.stringContaining('Error: tick failed'),
      }),
    );
  });

  it('does not downgrade a completed tick when TICK broadcasting throws', async () => {
    const savedStatuses: GameTickStatus[] = [];
    const tickStateRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        savedStatuses.push(value.status);
        return value;
      }),
    };
    const gateway = {
      emitToUser: jest.fn(),
      emitToAll: jest.fn(() => {
        throw new Error('socket failed');
      }),
    };
    const service = new TickService(
      { find: jest.fn(async () => []) } as any,
      {} as any,
      { find: jest.fn(async () => []) } as any,
      { find: jest.fn(async () => []) } as any,
      tickStateRepo as any,
      {} as any,
      { createTickEvents: jest.fn() } as any,
      {} as any,
      {} as any,
      gateway as any,
      { get: jest.fn(() => undefined) } as any,
      { recordSnapshot: jest.fn() } as any,
      { recordSnapshots: jest.fn() } as any,
    );

    await expect(service.handleTick()).resolves.toEqual({
      tickNumber: expect.any(Number),
      status: GameTickStatus.COMPLETED,
    });
    expect(savedStatuses).toEqual([
      GameTickStatus.STARTED,
      GameTickStatus.COMPLETED,
    ]);
  });
});

describe('ship repair queues', () => {
  const repairColony = () => ({
    id: 1,
    userId: 1,
    ...orbitColonyLocation,
    starSystemId: 10,
    celestialObjectId: 20,
    colonyClassId: 999,
    energy: 100,
    storageMax: 100,
    fields: [
      {
        id: 1,
        fieldIndex: 1,
        buildingId: 85110100,
        isBuilding: false,
        isActive: true,
      },
      {
        id: 2,
        fieldIndex: 2,
        buildingId: 85190100,
        isBuilding: false,
        isActive: true,
      },
    ],
    storage: [],
    stats: { workless: 0, trainedCrew: 0, maxStorage: 100 },
  });

  it('queues repair without charging parts before the first repair step', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      spacecraftModuleRepo,
      storageRepo,
      shipBuildQueueRepo,
      messagingService,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue(repairColony());
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      ...orbitShipLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      name: 'Damaged Corvette',
      hull: 50,
      hullMax: 250,
    });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      key: 'TEST_CORVETTE',
      category: 'CORVETTE',
      isNpc: false,
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

    expect(storage[10001].amount).toBe(5);
    expect(storage[10002].amount).toBe(5);
    expect(shipBuildQueueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'REPAIR',
        spacecraftId: 7,
        repairSnapshot: expect.objectContaining({
          hullBefore: 50,
          hullAfter: 250,
          costs: [
            { commodityId: 10001, amount: 2 },
            { commodityId: 10002, amount: 1 },
          ],
        }),
      }),
    );
    expect(queue.mode).toBe('REPAIR');
    expect(messagingService.sendSystem).toHaveBeenCalledWith(
      1,
      expect.stringContaining('Damaged Corvette'),
      expect.stringMatching(/^colony-ship-repair-started:/),
      'SHIP',
    );
  });

  it('pauses a due repair step when required parts are unavailable', async () => {
    const {
      shipRepo,
      shipClassRepo,
      spacecraftModuleRepo,
      shipBuildQueueRepo,
      storageRepo,
      shipyardService,
      colonyRepo,
    } = createColonyService();
    const colony = repairColony();
    // The locked repair step reloads its colony.
    colonyRepo.findOne.mockResolvedValue(colony);
    const ship = {
      id: 7,
      userId: 1,
      shipClassId: 1,
      name: 'Damaged Corvette',
      hull: 20,
      hullMax: 100,
    };
    shipRepo.findOne.mockResolvedValue(ship);
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      key: 'TEST_CORVETTE',
      category: 'CORVETTE',
      isNpc: false,
    });
    spacecraftModuleRepo.find.mockResolvedValue([]);
    storageRepo.findOne.mockResolvedValue(null);
    const job = {
      id: 99,
      colonyId: 1,
      colony,
      userId: 1,
      shipClassId: 1,
      spacecraftId: 7,
      mode: 'REPAIR',
      status: 'QUEUED',
      finishesAt: new Date(Date.now() - 1000),
      stoppedAt: null,
    };
    shipBuildQueueRepo.find.mockResolvedValue([job]);
    shipBuildQueueRepo.findOne.mockResolvedValue(job);

    // Shipyard repairs run in the minute runner (sh-AUD-07b).
    await shipyardService.processShipBuildQueue(colony as any, true);

    expect(ship.hull).toBe(20);
    expect(job.status).toBe('PAUSED');
    expect(job.stoppedAt).toBeInstanceOf(Date);
  });

  it('rejects repair without active matching shipyard or without damage', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      spacecraftModuleRepo,
      storageRepo,
    } = createColonyService();
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      ...orbitShipLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      name: 'Damaged Corvette',
      hull: 50,
      hullMax: 250,
    });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      key: 'TEST_CORVETTE',
      category: 'CORVETTE',
      isNpc: false,
    });
    colonyRepo.findOne.mockResolvedValue({ ...repairColony(), fields: [] });
    await expect(service.queueShipRepair(1, 1, 7)).rejects.toThrow(
      'Active matching shipyard required',
    );

    const repairStorage: Record<number, any> = {
      10001: { colonyId: 1, commodityId: 10001, amount: 5 },
      10002: { colonyId: 1, commodityId: 10002, amount: 5 },
    };
    storageRepo.findOne.mockImplementation(
      async ({ where }: any) => repairStorage[where.commodityId] ?? null,
    );
    colonyRepo.findOne.mockResolvedValue(repairColony());
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      ...orbitShipLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      name: 'Fine Corvette',
      hull: 100,
      hullMax: 100,
    });
    spacecraftModuleRepo.find.mockResolvedValue([
      { id: 11, spacecraftId: 7, integrity: 100, moduleType: 'Laser Cannon' },
    ]);
    await expect(service.queueShipRepair(1, 1, 7)).resolves.toMatchObject({
      mode: 'REPAIR',
      repairSnapshot: expect.objectContaining({
        hullBefore: 100,
        hullAfter: 100,
      }),
    });
  });

  it('repairs hull and systems one funded step per colony tick', async () => {
    const {
      colonyRepo,
      shipRepo,
      shipClassRepo,
      shipBuildQueueRepo,
      spacecraftModuleRepo,
      spacecraftStatsService,
      storageRepo,
      messagingService,
      shipyardService,
    } = createColonyService();
    const colony = repairColony();
    colonyRepo.findOne.mockResolvedValue(colony);
    const ship = {
      id: 7,
      userId: 1,
      shipClassId: 1,
      hull: 20,
      hullMax: 250,
      shields: 0,
      shieldsMax: 10,
      energy: 0,
      energyMax: 10,
      name: 'Damaged Corvette',
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
    const storage: Record<number, any> = {
      10001: { colonyId: 1, commodityId: 10001, amount: 5 },
      10002: { colonyId: 1, commodityId: 10002, amount: 5 },
    };
    storageRepo.findOne.mockImplementation(
      async ({ where }: any) => storage[where.commodityId] ?? null,
    );
    shipBuildQueueRepo.find.mockResolvedValue([
      {
        id: 99,
        colonyId: 1,
        userId: 1,
        shipClassId: 1,
        spacecraftId: 7,
        mode: 'REPAIR',
        colony,
        status: 'QUEUED',
        finishesAt: new Date(Date.now() - 1000),
      },
    ]);

    // Shipyard repairs run in the minute runner (sh-AUD-07b).
    await shipyardService.processShipBuildQueue(colony as any, true);

    expect(shipBuildQueueRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'QUEUED',
        finishesAt: expect.any(Date),
      }),
    );
    expect(module).toMatchObject({
      integrity: 100,
      cooldown: 0,
      isActive: true,
    });
    expect(ship.hull).toBe(220);
    expect(storage[10001].amount).toBe(4);
    expect(storage[10002].amount).toBe(4);
    expect(spacecraftStatsService.applyStats).toHaveBeenCalled();
    expect(messagingService.sendSystem).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'SHIP',
    );

    shipBuildQueueRepo.find.mockResolvedValue([
      {
        id: 99,
        colonyId: 1,
        userId: 1,
        shipClassId: 1,
        spacecraftId: 7,
        mode: 'REPAIR',
        colony,
        status: 'QUEUED',
        finishesAt: new Date(Date.now() - 1000),
      },
    ]);
    // Shipyard repairs run in the minute runner (sh-AUD-07b).
    await shipyardService.processShipBuildQueue(colony as any, true);

    expect(ship.hull).toBe(250);
    expect(messagingService.sendSystem).toHaveBeenCalledWith(
      1,
      expect.stringContaining('Damaged Corvette'),
      'colony-ship-repair-completed:99',
      'SHIP',
    );
  });
});

describe('ship retrofit queues', () => {
  const retrofitColony = () => ({
    id: 1,
    userId: 1,
    ...orbitColonyLocation,
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
    key: 'TEST_CORVETTE',
    name: 'Test Corvette',
    category: 'CORVETTE',
    isNpc: false,
    buildTimeTicks: 1,
    hullBase: 100,
    shieldBase: 10,
    epsBase: 10,
    warpBase: 1,
    crewMin: 1,
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
      ...orbitShipLocation,
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

    const queue = await service.queueShipRetrofit(
      1,
      1,
      7,
      [weaponSelection],
      'Retro',
      6,
    );

    expect(storage[10701].amount).toBe(1);
    expect(shipBuildQueueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'RETROFIT',
        spacecraftId: 7,
        buildPlanName: 'Retro',
        moduleSelections: [weaponSelection],
        moduleCommodityIds: [10701],
        retrofitSnapshot: expect.objectContaining({
          oldModuleSelections: [],
          newModuleSelections: [weaponSelection],
          consumedModuleCommodityIds: [10701],
        }),
      }),
    );
    expect(queue.mode).toBe('RETROFIT');
  });

  it('rejects retrofit module commodities without completed research', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      gameData,
      unlockResolver,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue(retrofitColony());
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      ...orbitShipLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      name: 'Corvette',
    });
    shipClassRepo.findOneBy.mockResolvedValue(shipClass);
    gameData.getFabricationItemByOutputCommodity.mockReturnValue({
      itemKey: 'module.weapon.locked',
      queueType: 'MODULE',
      displayName: 'Laser Cannon',
      outputCommodityId: 10701,
      moduleType: 'Laser Cannon',
      moduleCategory: 'WEAPONS',
      shipyardType: 'ENERGY_WEAPON',
      researchId: 700100,
      researchRequired: 'Lasertechnik',
    });
    unlockResolver.hasTech.mockResolvedValueOnce(false);

    await expect(
      service.queueShipRetrofit(1, 1, 7, [weaponSelection], undefined, 6),
    ).rejects.toThrow('Research required: Lasertechnik');
  });

  it('rejects unchanged retrofit selection', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      spacecraftModuleRepo,
      storageRepo,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue(retrofitColony());
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      ...orbitShipLocation,
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
        category: 'ENERGY_WEAPON',
        level: 1,
        integrity: 100,
      },
    ]);
    storageRepo.findOne.mockResolvedValue({
      colonyId: 1,
      commodityId: 10701,
      amount: 1,
    });

    await expect(
      service.queueShipRetrofit(1, 1, 7, [weaponSelection], undefined, 6),
    ).rejects.toThrow('No retrofit changes selected');
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
      statsService,
    } = createColonyService();
    const colony = retrofitColony();
    colonyRepo.findOne.mockResolvedValue(colony);
    (statsService as any).calculateSummary = jest.fn(() => ({
      effectiveStorageMax: 100,
    }));
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
    const retrofitJob = {
      id: 100,
      colonyId: 1,
      userId: 1,
      shipClassId: 1,
      spacecraftId: 7,
      mode: 'RETROFIT',
      shipClass,
      moduleSelections: [shieldSelection],
      moduleCommodityIds: [10201],
      moduleTypes: ['Shield Generator'],
      retrofitSnapshot: {
        oldModuleSelections: [weaponSelection],
        newModuleSelections: [shieldSelection],
        newModuleTypes: ['Shield Generator'],
        returnedModuleCommodityIds: [],
        consumedModuleCommodityIds: [10201],
      },
      status: 'QUEUED',
      finishesAt: new Date('2000-01-01T00:00:00.000Z'),
    };
    shipBuildQueueRepo.find.mockReset();
    shipBuildQueueRepo.find.mockResolvedValue([retrofitJob]);
    shipBuildQueueRepo.findOne.mockResolvedValue(retrofitJob);
    shipBuildQueueRepo.save.mockClear();
    spacecraftModuleRepo.remove.mockClear();
    spacecraftModuleRepo.save.mockClear();
    spacecraftStatsService.applyStats.mockClear();

    await (service as any).processShipBuildQueue(colony as any);

    expect(spacecraftModuleRepo.remove).toHaveBeenCalledWith([oldModule]);
    expect(spacecraftModuleRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        spacecraftId: 7,
        category: 'SHIELDS',
        integrity: 100,
      }),
    );
    expect(storage[10701]?.amount ?? 1).toBe(1);
    expect(spacecraftStatsService.applyStats).toHaveBeenCalled();
    expect(shipBuildQueueRepo.save).toHaveBeenCalled();
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
        oldModuleSelections: [],
        newModuleSelections: [weaponSelection],
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
    ...orbitColonyLocation,
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
    storage: [] as Array<{ commodityId: number; amount: number }>,
    stats: { workless: 0, trainedCrew: 0, maxStorage: 100, maxEnergy: 100 },
  });

  const hangarShipClass = {
    id: 1,
    key: 'REBEL_SHUTTLE_LAAT',
    name: 'LAAT Shuttle',
    category: 'FIGHTER',
    isNpc: false,
    crewMin: 0,
    crewMax: 2,
    hullBase: 100,
    shieldBase: 50,
    epsBase: 80,
    warpBase: 2,
    cargoCapacity: 20,
    batteryBase: 0,
  };

  it('builds hangar rump commodities only when default modules are available', async () => {
    const { service, colonyRepo, shipClassRepo, storageRepo } =
      createColonyService();
    const colony = airfieldColony();
    colonyRepo.findOne.mockResolvedValue(colony);
    shipClassRepo.findOneBy.mockResolvedValue(hangarShipClass);
    const storage: Record<number, any> = Object.fromEntries(
      [10201, 10301, 10401, 10501, 10701, 10801].map((commodityId) => [
        commodityId,
        { colonyId: 1, commodityId, amount: 1 },
      ]),
    );
    storageRepo.findOne.mockImplementation(
      async ({ where }: any) => storage[where.commodityId] ?? null,
    );
    storageRepo.create.mockImplementation((value: any) => {
      storage[value.commodityId] = { ...value };
      return storage[value.commodityId];
    });

    await service.buildAirfieldRump(1, 1, 1, 1);

    expect(colony.energy).toBe(10);
    expect(storage[10201].amount).toBe(0);
    expect(storage[10301].amount).toBe(0);
    expect(storage[10401].amount).toBe(0);
    expect(storage[10501].amount).toBe(0);
    expect(storage[10701].amount).toBe(0);
    expect(storage[10801].amount).toBe(0);
    expect(storage[21401].amount).toBe(1);
  });

  it('builds STU colonizer rumps from resources and installs their modules on start', async () => {
    const {
      service,
      colonyRepo,
      shipClassRepo,
      storageRepo,
      shipRepo,
      spacecraftModuleRepo,
      gameData,
    } = createColonyService();
    const colony = { ...airfieldColony(), energy: 500 };
    const colonizerClass = {
      ...hangarShipClass,
      key: 'REBEL_COLONIZER_ICARUS',
      name: 'GR-75 Kolonietransporter',
      crewMax: 0,
    };
    const hangarDef = {
      shipClassKey: colonizerClass.key,
      crewRequired: 0,
      hangarCommodityId: 21501,
      displayName: 'GR-75 Kolonietransporter Rumpf',
      airfieldFunctionId: 4,
      startEnergyCost: 125,
      buildEnergyCost: 90,
      buildCosts: [
        { commodityId: 2, amount: 30 },
        { commodityId: 21, amount: 12 },
        { commodityId: 5, amount: 100 },
        { commodityId: 4, amount: 12 },
      ],
      defaultModuleCommodityIds: [
        10101, 10201, 10301, 10401, 10501, 10601, 10901,
      ],
      defaultTorpedoCommodityId: null,
      defaultTorpedoAmount: 0,
    };
    const storage: Record<number, any> = Object.fromEntries(
      hangarDef.buildCosts.map(({ commodityId, amount }) => [
        commodityId,
        { colonyId: 1, commodityId, amount },
      ]),
    );
    colonyRepo.findOne.mockResolvedValue(colony);
    shipClassRepo.findOneBy.mockResolvedValue(colonizerClass);
    gameData.getHangarShipDef.mockReturnValue(hangarDef as any);
    gameData.getFabricationItemByOutputCommodity.mockImplementation(
      (commodityId: number) => ({
        outputCommodityId: commodityId,
        moduleType: `Module ${commodityId}`,
        moduleCategory: 'SPECIAL',
        shipyardType: 'SPECIAL',
        moduleLevel: 1,
      }),
    );
    storageRepo.findOne.mockImplementation(
      async ({ where }: any) => storage[where.commodityId] ?? null,
    );
    storageRepo.create.mockImplementation((value: any) => {
      storage[value.commodityId] = { ...value };
      return storage[value.commodityId];
    });
    shipRepo.save.mockImplementation(async (value: any) => ({
      id: 77,
      ...value,
    }));

    await service.buildAirfieldRump(1, 1, 1, 1);

    expect(storage[2].amount).toBe(0);
    expect(storage[21].amount).toBe(0);
    expect(storage[5].amount).toBe(0);
    expect(storage[4].amount).toBe(0);
    expect(storage[10101]).toBeUndefined();
    expect(storage[21501].amount).toBe(1);

    await service.startHangarShip(1, 1, 1, 'Icarus');

    expect(storage[21501].amount).toBe(0);
    expect(spacecraftModuleRepo.create).toHaveBeenCalledTimes(7);
  });

  it('stores four built hangar rumps exactly once', async () => {
    const { service, colonyRepo, shipClassRepo, storageRepo } =
      createColonyService();
    const colony = { ...airfieldColony(), energy: 500 };
    colonyRepo.findOne.mockResolvedValue(colony);
    shipClassRepo.findOneBy.mockResolvedValue(hangarShipClass);
    const storage: Record<number, any> = Object.fromEntries(
      [10201, 10301, 10401, 10501, 10701, 10801].map((commodityId) => [
        commodityId,
        { colonyId: 1, commodityId, amount: 4 },
      ]),
    );
    storageRepo.findOne.mockImplementation(
      async ({ where }: any) => storage[where.commodityId] ?? null,
    );
    storageRepo.create.mockImplementation((value: any) => {
      storage[value.commodityId] = { ...value };
      return storage[value.commodityId];
    });

    await service.buildAirfieldRump(1, 1, 1, 4);

    expect(storage[21401].amount).toBe(4);
    expect(
      colony.storage.find(
        (item: { commodityId: number; amount: number }) =>
          item.commodityId === 21401,
      )?.amount,
    ).toBe(4);
  });

  describe('hangar piecewise build and colony ship limit (col-AUD-10a)', () => {
    const rumpSetup = (energy: number, amounts: Record<number, number>) => {
      const ctx = createColonyService();
      const colony = { ...airfieldColony(), energy };
      ctx.colonyRepo.findOne.mockResolvedValue(colony);
      ctx.shipClassRepo.findOneBy.mockResolvedValue(hangarShipClass);
      const storage: Record<number, any> = Object.fromEntries(
        Object.entries(amounts).map(([id, amount]) => [
          id,
          { colonyId: 1, commodityId: Number(id), amount },
        ]),
      );
      ctx.storageRepo.findOne.mockImplementation(
        async ({ where }: any) => storage[where.commodityId] ?? null,
      );
      ctx.storageRepo.create.mockImplementation((value: any) => {
        storage[value.commodityId] = { ...value };
        return storage[value.commodityId];
      });
      return { ...ctx, colony, storage };
    };
    const goods = (amount: number) =>
      Object.fromEntries(
        [10201, 10301, 10401, 10501, 10701, 10801].map((id) => [id, amount]),
      );

    it('builds only what the energy allows and reports it', async () => {
      const { service, colony, storage } = rumpSetup(200, goods(4));
      const result = await service.buildAirfieldRump(1, 1, 1, 4);
      expect(result.message).toContain('Es wurden daher nur 2 Stück gebaut');
      expect(storage[21401].amount).toBe(2);
      expect(storage[10201].amount).toBe(2);
      expect(colony.energy).toBe(20);
    });

    it('builds only what the goods allow and reports it', async () => {
      const { service, colony, storage } = rumpSetup(500, {
        ...goods(4),
        10301: 3,
      });
      const result = await service.buildAirfieldRump(1, 1, 1, 4);
      expect(result.message).toContain('Es wurden daher nur 3 Stück gebaut');
      expect(storage[21401].amount).toBe(3);
      expect(storage[10301].amount).toBe(0);
      expect(storage[10201].amount).toBe(1);
      expect(colony.energy).toBe(230);
    });

    it('rejects with the reason and changes nothing when zero can be built', async () => {
      const { service, colony, storage } = rumpSetup(50, goods(4));
      await expect(service.buildAirfieldRump(1, 1, 1, 2)).rejects.toThrow(
        'Nicht genug Energie',
      );
      expect(colony.energy).toBe(50);
      expect(storage[10201].amount).toBe(4);
      const goodsShort = rumpSetup(500, { ...goods(4), 10301: 0 });
      await expect(
        goodsShort.service.buildAirfieldRump(1, 1, 1, 2),
      ).rejects.toThrow('Nicht genug');
      expect(goodsShort.colony.energy).toBe(500);
    });

    const startColonizer = async (existingColonizers: number) => {
      const ctx = createColonyService();
      ctx.colonyRepo.findOne.mockResolvedValue(airfieldColony());
      ctx.shipClassRepo.findOneBy.mockResolvedValue({
        ...hangarShipClass,
        isColonizer: true,
      });
      ctx.shipRepo.count.mockResolvedValue(existingColonizers);
      const storage: Record<number, any> = {
        21401: { colonyId: 1, commodityId: 21401, amount: 1 },
      };
      ctx.storageRepo.findOne.mockImplementation(
        async ({ where }: any) => storage[where.commodityId] ?? null,
      );
      ctx.shipRepo.save.mockImplementation(async (value: any) => ({
        id: 77,
        ...value,
      }));
      return { ...ctx, storage };
    };

    it('rejects starting a colony ship while the player owns one', async () => {
      const { service, storage, shipRepo } = await startColonizer(1);
      await expect(service.startHangarShip(1, 1, 1, 'Second')).rejects.toThrow(
        'Es kann nur ein Schiff mit Kolonisierungsfunktion genutzt werden',
      );
      expect(storage[21401].amount).toBe(1);
      const where = (shipRepo.count.mock.calls[0] as any[])[0].where;
      expect(where.shipClass).toEqual({ isColonizer: true });
      expect(where.userId).toBe(1);
    });

    it('starts a colony ship when the player owns none', async () => {
      const { service, storage } = await startColonizer(0);
      await service.startHangarShip(1, 1, 1, 'First');
      expect(storage[21401].amount).toBe(0);
    });
  });

  it('rejects hangar rump construction without default modules', async () => {
    const { service, colonyRepo, shipClassRepo, storageRepo } =
      createColonyService();
    const colony = airfieldColony();
    colonyRepo.findOne.mockResolvedValue(colony);
    shipClassRepo.findOneBy.mockResolvedValue(hangarShipClass);
    storageRepo.findOne.mockResolvedValue(null);

    await expect(service.buildAirfieldRump(1, 1, 1, 1)).rejects.toThrow(
      'Nicht genug',
    );
  });

  it('rejects normal build queues when only the fighter shipyard is active', async () => {
    const { service, colonyRepo, gameData } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      ...airfieldColony(),
      fields: [
        {
          id: 2,
          fieldIndex: 2,
          buildingId: 85020100,
          isBuilding: false,
          isActive: true,
        },
      ],
    });
    gameData.getBuildingFunctions.mockImplementation((buildingId: number) =>
      buildingId === 85020100 ? [5] : [],
    );

    await expect(service.buildShip(1, 1, 1, 'Queued fighter')).rejects.toThrow(
      'Colony needs a completed Shipyard',
    );
  });

  it('builds fighter rumps with an active fighter shipyard', async () => {
    const { service, colonyRepo, shipClassRepo, storageRepo, gameData } =
      createColonyService();
    const colony = {
      ...airfieldColony(),
      fields: [
        {
          id: 2,
          fieldIndex: 2,
          buildingId: 85020100,
          isBuilding: false,
          isActive: true,
        },
      ],
    };
    colonyRepo.findOne.mockResolvedValue(colony);
    shipClassRepo.findOneBy.mockResolvedValue(hangarShipClass);
    gameData.getBuildingFunctions.mockImplementation((buildingId: number) =>
      buildingId === 85020100 ? [5] : [],
    );
    const storage: Record<number, any> = Object.fromEntries(
      [10201, 10301, 10401, 10501, 10701, 10801].map((commodityId) => [
        commodityId,
        { colonyId: 1, commodityId, amount: 1 },
      ]),
    );
    storageRepo.findOne.mockImplementation(
      async ({ where }: any) => storage[where.commodityId] ?? null,
    );
    storageRepo.create.mockImplementation((value: any) => {
      storage[value.commodityId] = { ...value };
      return storage[value.commodityId];
    });

    await service.buildAirfieldRump(1, 1, 1, 1);

    expect(storage[21401].amount).toBe(1);
  });

  it('rejects hangar rump construction without an active production facility', async () => {
    const { service, colonyRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({ ...airfieldColony(), fields: [] });
    await expect(service.buildAirfieldRump(1, 1, 1, 1)).rejects.toThrow(
      'Active airfield or fighter shipyard required',
    );
  });

  it('starts a hangar ship by consuming rump, energy and fixed default modules', async () => {
    const {
      service,
      colonyRepo,
      shipClassRepo,
      storageRepo,
      shipRepo,
      spacecraftStatsService,
      colonyCrewService,
      spacecraftModuleRepo,
    } = createColonyService();
    const colony = airfieldColony();
    colonyRepo.findOne.mockResolvedValue(colony);
    shipClassRepo.findOneBy.mockResolvedValue(hangarShipClass);
    const storage: Record<number, any> = {
      21401: { colonyId: 1, commodityId: 21401, amount: 1 },
    };
    storageRepo.findOne.mockImplementation(
      async ({ where }: any) => storage[where.commodityId] ?? null,
    );
    shipRepo.save.mockImplementation(async (value: any) => ({
      id: 77,
      ...value,
    }));

    await service.startHangarShip(1, 1, 1, 'Launched Ship');

    expect(storage[21401].amount).toBe(0);
    expect(colony.energy).toBe(10);
    expect(shipRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Launched Ship',
        shipClassId: 1,
        locationId: 401,
        location: { id: 401, systemFieldId: 301 },
        status: 'IDLE',
      }),
    );
    expect(colonyCrewService.transferCrewFromColonyToShip).toHaveBeenCalledWith(
      colony,
      expect.objectContaining({ id: 77 }),
      5,
    );
    expect(spacecraftModuleRepo.create).toHaveBeenCalledTimes(6);
    expect(spacecraftModuleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        spacecraftId: 77,
        category: 'SHIELDS',
        level: 1,
      }),
    );
    expect(spacecraftModuleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ spacecraftId: 77, category: 'EPS', level: 1 }),
    );
    expect(spacecraftModuleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        spacecraftId: 77,
        category: 'SUBLIGHT_DRIVE',
        level: 1,
      }),
    );
    expect(spacecraftModuleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        spacecraftId: 77,
        category: 'REACTOR',
        level: 1,
      }),
    );
    expect(spacecraftModuleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        spacecraftId: 77,
        category: 'ENERGY_WEAPON',
        level: 1,
      }),
    );
    expect(spacecraftModuleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        spacecraftId: 77,
        category: 'TORPEDO_BANK',
        level: 1,
      }),
    );
    expect(spacecraftStatsService.applyStats).toHaveBeenCalled();
  });

  it('fully loads STU airfield ships with the fully-loaded-start ability', async () => {
    const {
      service,
      colonyRepo,
      shipClassRepo,
      storageRepo,
      shipRepo,
      gameData,
      spacecraftStatsService,
    } = createColonyService();
    const colony = airfieldColony();
    colonyRepo.findOne.mockResolvedValue(colony);
    shipClassRepo.findOneBy.mockResolvedValue(hangarShipClass);
    gameData.getShipClassDefByKey.mockReturnValue({
      key: hangarShipClass.key,
      buildCosts: [],
    });
    gameData.hasFullyLoadedStart.mockReturnValue(true);
    storageRepo.findOne.mockResolvedValue({
      colonyId: 1,
      commodityId: 21401,
      amount: 1,
    });
    shipRepo.save.mockImplementation(async (value: any) => ({
      id: 77,
      ...value,
    }));

    await service.startHangarShip(1, 1, 1, 'Icarus');

    expect(spacecraftStatsService.fillResources).toHaveBeenCalledWith(
      expect.objectContaining({ id: 77 }),
    );
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
      ...orbitShipLocation,
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

    expect(storage[21401].amount).toBe(1);
    expect(colonyCrewService.landCrewWithShip).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ id: 7 }),
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
      ...orbitShipLocation,
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

describe('colony waste discard', () => {
  it('requires warehouse function', async () => {
    const { service, colonyRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      fields: [],
      storage: [{ id: 1, colonyId: 1, commodityId: 2, amount: 5 }],
      stats: {},
    });

    await expect(
      service.discardStorage(1, 1, [{ commodityId: 2, amount: 1 }]),
    ).rejects.toThrow('Warehouse required');
  });

  it('clamps discarded amount to stored amount and creates event', async () => {
    const { service, colonyRepo, storageRepo, colonyEventService, gameData } =
      createColonyService();
    gameData.getBuildingFunctions.mockImplementation((buildingId: number) =>
      buildingId === 9000 ? [23] : [],
    );
    gameData.getCommodity.mockImplementation((id: number) => ({
      id,
      name: `Ware ${id}`,
      isTradeOnly: false,
      isEffect: false,
      isSaveable: true,
      isDeposit: false,
      isShuttle: false,
    }));
    const storage = { id: 1, colonyId: 1, commodityId: 2, amount: 5 };
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      fields: [{ id: 1, buildingId: 9000, isBuilding: false, isActive: false }],
      storage: [storage],
      stats: {},
    });
    storageRepo.findOne.mockResolvedValue(storage);

    const result = await service.discardStorage(1, 1, [
      { commodityId: 2, amount: 99 },
    ]);

    expect(result.discarded).toEqual([
      { commodityId: 2, amount: 5, name: 'Ware 2' },
    ]);
    expect(storageRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 0 }),
    );
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'WASTE_DISCARDED' }),
    );
  });

  it('rejects discard requests without valid positive amounts', async () => {
    const { service, colonyRepo, gameData } = createColonyService();
    gameData.getBuildingFunctions.mockImplementation((buildingId: number) =>
      buildingId === 9000 ? [23] : [],
    );
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      fields: [{ id: 1, buildingId: 9000, isBuilding: false, isActive: false }],
      storage: [{ id: 1, colonyId: 1, commodityId: 2, amount: 5 }],
      stats: {},
    });

    await expect(
      service.discardStorage(1, 1, [{ commodityId: 2, amount: 0 }]),
    ).rejects.toThrow('No valid commodity amounts selected');
  });
});

describe('ship repair queue reactivation', () => {
  it('queues repair as paused when active repair slots are occupied', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      spacecraftModuleRepo,
      storageRepo,
      shipBuildQueueRepo,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      ...orbitColonyLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      fields: [
        { id: 1, buildingId: 85110100, isBuilding: false, isActive: true },
      ],
      storage: [],
      stats: {},
    });
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      ...orbitShipLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      hull: 50,
      hullMax: 100,
    });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      key: 'TEST_CORVETTE',
      category: 'CORVETTE',
      isNpc: false,
    });
    spacecraftModuleRepo.find.mockResolvedValue([]);
    storageRepo.findOne.mockResolvedValue({ amount: 999 });
    shipBuildQueueRepo.findOne.mockResolvedValueOnce(null);
    shipBuildQueueRepo.count.mockResolvedValue(2);
    shipBuildQueueRepo.create.mockImplementation((value: any) => value);
    shipBuildQueueRepo.save.mockImplementation(async (value: any) => value);

    const queue = await service.queueShipRepair(1, 1, 7);

    expect(queue.status).toBe('PAUSED');
    expect(queue.stoppedAt).toBeInstanceOf(Date);
  });

  it('reactivates paused repair when a repair slot is available', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      spacecraftModuleRepo,
      shipBuildQueueRepo,
      colonyEventService,
    } = createColonyService();
    const stoppedAt = new Date(Date.now() - 60_000);
    const finishesAt = new Date(Date.now() + 60_000);
    const queue = {
      id: 9,
      colonyId: 1,
      userId: 1,
      mode: 'REPAIR',
      status: 'PAUSED',
      stoppedAt,
      finishesAt,
      name: 'Reparatur: Test',
      spacecraftId: 7,
    };
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      fields: [
        { id: 1, buildingId: 85110100, isBuilding: false, isActive: true },
      ],
      storage: [],
      stats: { isBlockaded: false },
    });
    shipBuildQueueRepo.findOne.mockResolvedValue(queue);
    shipBuildQueueRepo.count.mockResolvedValue(0);
    shipBuildQueueRepo.save.mockImplementation(async (value: any) => value);
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      hull: 50,
      hullMax: 100,
      status: 'IDLE',
    });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      key: 'TEST_CORVETTE',
      category: 'CORVETTE',
      isNpc: false,
    });
    spacecraftModuleRepo.find.mockResolvedValue([]);

    const result = await service.reactivateShipyardQueue(1, 1, 9);

    expect(result.status).toBe('QUEUED');
    expect(result.stoppedAt).toBeNull();
    expect(result.finishesAt.getTime()).toBeGreaterThan(finishesAt.getTime());
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SHIP_REPAIR_REACTIVATED' }),
    );
  });

  it('rejects reactivation for non-repair jobs', async () => {
    const { service, colonyRepo, shipBuildQueueRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      fields: [
        { id: 1, buildingId: 85110100, isBuilding: false, isActive: true },
      ],
      storage: [],
      stats: { isBlockaded: false },
    });
    shipBuildQueueRepo.findOne.mockResolvedValue({
      id: 11,
      colonyId: 1,
      userId: 1,
      mode: 'BUILD',
      status: 'PAUSED',
    });

    await expect(service.reactivateShipyardQueue(1, 1, 11)).rejects.toThrow(
      'Only repair jobs can be reactivated',
    );
  });

  it('rejects reactivation when repair target is already fully repaired', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      spacecraftModuleRepo,
      shipBuildQueueRepo,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      fields: [
        { id: 1, buildingId: 85110100, isBuilding: false, isActive: true },
      ],
      storage: [],
      stats: { isBlockaded: false },
    });
    shipBuildQueueRepo.findOne.mockResolvedValue({
      id: 12,
      colonyId: 1,
      userId: 1,
      mode: 'REPAIR',
      status: 'PAUSED',
      stoppedAt: new Date(Date.now() - 1000),
      finishesAt: new Date(Date.now() + 1000),
      name: 'Reparatur: Test',
      spacecraftId: 7,
    });
    shipBuildQueueRepo.count.mockResolvedValue(0);
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      starSystemId: 10,
      celestialObjectId: 20,
      hull: 100,
      hullMax: 100,
      status: 'IDLE',
    });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      key: 'TEST_CORVETTE',
      category: 'CORVETTE',
      isNpc: false,
    });
    spacecraftModuleRepo.find.mockResolvedValue([]);

    await expect(service.reactivateShipyardQueue(1, 1, 12)).rejects.toThrow(
      'Ship is no longer damaged',
    );
  });

  it('automatically requeues paused repair jobs when a slot becomes free', async () => {
    const { shipyardService, shipBuildQueueRepo, shipClassRepo } =
      createColonyService();
    const colony = {
      id: 1,
      userId: 1,
      fields: [
        { id: 1, buildingId: 85110100, isBuilding: false, isActive: true },
      ],
      storage: [],
      stats: { isBlockaded: false },
    };
    const pausedJob = {
      id: 15,
      colonyId: 1,
      userId: 1,
      shipClassId: 1,
      spacecraftId: 7,
      mode: 'REPAIR',
      status: 'PAUSED',
      stoppedAt: new Date(Date.now() - 60_000),
      finishesAt: new Date(Date.now() + 60_000),
    };
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 1,
      key: 'TEST_CORVETTE',
      category: 'CORVETTE',
      isNpc: false,
    });
    shipBuildQueueRepo.find.mockResolvedValue([]);
    shipBuildQueueRepo.save.mockImplementation(async (value: any) => value);
    shipBuildQueueRepo.find.mockImplementationOnce(async () => []);
    shipBuildQueueRepo.find.mockImplementationOnce(async () => [pausedJob]);

    // Shipyard repairs run in the minute runner (sh-AUD-07b).
    await shipyardService.processShipBuildQueue(colony as any, true);

    expect(pausedJob.status).toBe('QUEUED');
    expect(pausedJob.stoppedAt).toBeNull();
  });
});

describe('colony orbit assignments', () => {
  function arrangeOrbitOrder(
    setup: ReturnType<typeof createColonyService>,
    {
      colony = {},
      ship = {},
      fleet = {},
      assignments = [],
    }: {
      colony?: Record<string, unknown>;
      ship?: Record<string, unknown>;
      fleet?: Record<string, unknown> | null;
      assignments?: Array<Record<string, unknown>>;
    } = {},
  ) {
    const target = {
      id: 1,
      name: 'Kashyyyk',
      userId: 2,
      isAbandoned: false,
      ...orbitColonyLocation,
      starSystemId: 10,
      fields: [],
      stats: { isBlockaded: false },
      ...colony,
    };
    const leader = {
      id: 7,
      userId: 1,
      fleetId: 99,
      ...orbitShipLocation,
      status: 'IDLE',
      ...ship,
    };
    const fleetRow =
      fleet === null ? null : { id: 99, name: 'Rogue', leaderId: 7, ...fleet };
    setup.colonyRepo.find.mockResolvedValue([target]);
    setup.colonyRepo.findOne.mockResolvedValue(target);
    setup.shipRepo.findOne.mockResolvedValue({ ...leader, fleet: fleetRow });
    setup.fleetRepo.findOne.mockResolvedValue(fleetRow as never);
    setup.orbitAssignmentRepo.find.mockImplementation(async (options: any) =>
      assignments.filter(
        (assignment) =>
          options?.where?.colonyId == null ||
          assignment.colonyId === options.where.colonyId,
      ),
    );
    setup.orbitAssignmentRepo.findOne.mockImplementation(
      async (options: any) => {
        const clauses = Array.isArray(options?.where)
          ? options.where
          : [options?.where ?? {}];
        return (
          assignments.find((assignment) =>
            clauses.some((clause: Record<string, unknown>) =>
              Object.entries(clause).every(
                ([key, value]) => assignment[key] === value,
              ),
            ),
          ) ?? null
        );
      },
    );
    return { target, leader };
  }

  it('starts a fleet-led defense order for a foreign colony with STU feedback', async () => {
    const setup = createColonyService();
    arrangeOrbitOrder(setup);

    const result = await setup.orbitService.startOrbitOrder(
      7,
      1,
      'DEFEND' as any,
    );

    expect(result).toEqual({
      order: { colonyId: 1, fleetId: 99, mode: 'DEFEND' },
      message: 'Die Kolonie Kashyyyk wird nun von der Flotte Rogue verteidigt',
    });
    expect(setup.orbitAssignmentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ colonyId: 1, spacecraftId: 7, fleetId: 99 }),
    );
    expect(setup.colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        colonyId: 1,
        userId: 2,
        type: 'ORBIT_DEFENSE_STARTED',
        message: 'Die Kolonie Kashyyyk wird nun von der Flotte Rogue verteidigt',
      }),
    );
  });

  it('keeps the colony-based alias on the same policy and returns the assignment', async () => {
    const setup = createColonyService();
    arrangeOrbitOrder(setup);

    await expect(
      setup.service.setOrbitAssignment(1, 1, 7, 'DEFEND' as any),
    ).resolves.toEqual(
      expect.objectContaining({ colonyId: 1, fleetId: 99, mode: 'DEFEND' }),
    );
    await expect(
      setup.service.setOrbitAssignment(5, 1, 7, 'DEFEND' as any),
    ).rejects.toThrow('Das Schiff befindet sich nicht im Orbit dieser Kolonie.');
  });

  it.each([
    ['effective vacation', true, true],
    ['pending vacation', false, false],
    ['no vacation', false, false],
  ])('protects a colony from both orders during %s', async (_label, effective, rejected) => {
    for (const mode of ['DEFEND', 'BLOCKADE']) {
      const setup = createColonyService();
      arrangeOrbitOrder(setup);
      setup.interactionContext.load.mockResolvedValue({
        targetOnVacation: effective,
      });

      const action = setup.orbitService.startOrbitOrder(7, 1, mode as any);

      if (rejected) {
        await expect(action).rejects.toThrow(
          'Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!',
        );
        expect(setup.orbitAssignmentRepo.save).not.toHaveBeenCalled();
      } else {
        await expect(action).resolves.toEqual(
          expect.objectContaining({ order: expect.objectContaining({ mode }) }),
        );
      }
    }
  });

  it.each([
    ['a free colony', { colony: { userId: null } }, 'Die Kolonie ist unbewohnt.'],
    ['an abandoned colony', { colony: { isAbandoned: true } }, 'Die Kolonie ist unbewohnt.'],
    ['a ship outside the orbit', { ship: { location: { id: 9, kind: 'SYSTEM_FIELD', systemField: { id: 9, starSystemId: 10, sx: 9, sy: 9 } } } }, 'Das Schiff befindet sich nicht im Orbit dieser Kolonie.'],
    ['a ship without fleet', { ship: { fleetId: null }, fleet: null }, 'Nur Flottenführer können Orbitaufträge erteilen.'],
    ['a fleet member', { fleet: { leaderId: 8 } }, 'Nur Flottenführer können Orbitaufträge erteilen.'],
    ['a ship in flight', { ship: { status: 'IN_FLIGHT' } }, 'Das Schiff ist nicht einsatzbereit.'],
    ['a destroyed ship', { ship: { status: 'DESTROYED' } }, 'Das Schiff ist zerstört.'],
    ['a fleet ordered elsewhere', { assignments: [{ id: 3, colonyId: 4, fleetId: 99, spacecraftId: 7, mode: 'DEFEND' }] }, 'Die Flotte hat bereits einen Orbitauftrag.'],
    ['an opposing blockade', { assignments: [{ id: 3, colonyId: 1, fleetId: 50, spacecraftId: 70, mode: 'BLOCKADE' }] }, 'Aktion nicht möglich, die Kolonie wird blockiert!'],
  ] as const)('rejects defense for %s', async (_label, arrangement, reason) => {
    const setup = createColonyService();
    arrangeOrbitOrder(setup, arrangement as never);

    await expect(
      setup.orbitService.startOrbitOrder(7, 1, 'DEFEND' as any),
    ).rejects.toThrow(reason);
    expect(setup.orbitAssignmentRepo.save).not.toHaveBeenCalled();
  });

  it('rejects blockade on defended colonies and active orbital defense only', async () => {
    const defended = createColonyService();
    arrangeOrbitOrder(defended, {
      assignments: [
        { id: 3, colonyId: 1, fleetId: 50, spacecraftId: 70, mode: 'DEFEND' },
      ],
    });
    await expect(
      defended.orbitService.startOrbitOrder(7, 1, 'BLOCKADE' as any),
    ).rejects.toThrow('Aktion nicht möglich, die Kolonie wird verteidigt!');

    for (const phalanx of [
      'hasEnergyPhalanx',
      'hasParticlePhalanx',
      'hasAntiParticle',
    ] as const) {
      const setup = createColonyService();
      arrangeOrbitOrder(setup);
      setup.colonyDefenseService[phalanx].mockReturnValue(true);
      await expect(
        setup.orbitService.startOrbitOrder(7, 1, 'BLOCKADE' as any),
      ).rejects.toThrow(
        'Aktion nicht möglich, die Kolonie verfügt über aktive Orbitalverteidigung',
      );
      await expect(
        setup.orbitService.startOrbitOrder(7, 1, 'DEFEND' as any),
      ).resolves.toEqual(
        expect.objectContaining({ order: expect.objectContaining({ mode: 'DEFEND' }) }),
      );
    }
  });

  it('starts blockade and syncs colony blockade flag', async () => {
    const setup = createColonyService();
    const { target } = arrangeOrbitOrder(setup);
    setup.orbitAssignmentRepo.count.mockResolvedValue(1);

    await setup.orbitService.startOrbitOrder(7, 1, 'BLOCKADE' as any);

    expect(target.stats.isBlockaded).toBe(true);
    expect(setup.colonyRepo.manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ isBlockaded: true }),
    );
    expect(setup.colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ORBIT_BLOCKADE_STARTED',
        message: 'Die Kolonie Kashyyyk wird nun von der Flotte Rogue blockiert',
      }),
    );
  });

  it('clears the fleet orbit order from the ship and syncs blockade flag', async () => {
    const setup = createColonyService();
    const assignment = {
      id: 5,
      colonyId: 1,
      spacecraftId: 7,
      fleetId: 99,
      mode: 'BLOCKADE',
    };
    const { target } = arrangeOrbitOrder(setup, {
      colony: { stats: { isBlockaded: true } },
      assignments: [assignment],
    });
    setup.orbitAssignmentRepo.count.mockResolvedValue(0);

    const result = await setup.orbitService.stopOrbitOrder(7, 1);

    expect(result).toEqual({
      cleared: true,
      order: { colonyId: 1, fleetId: 99, mode: 'BLOCKADE' },
      message: 'Die Flotte Rogue hat die Blockierung der Kolonie Kashyyyk aufgehoben',
    });
    expect(setup.orbitAssignmentRepo.remove).toHaveBeenCalledWith(assignment);
    expect(target.stats.isBlockaded).toBe(false);
    expect(setup.colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ORBIT_BLOCKADE_STOPPED' }),
    );
  });

  it('reports stop without order or for a non-leader without mutating', async () => {
    const idle = createColonyService();
    arrangeOrbitOrder(idle);
    await expect(idle.orbitService.stopOrbitOrder(7, 1)).resolves.toEqual({
      cleared: false,
      order: null,
      message: 'Die Flotte hat keinen Orbitauftrag.',
    });
    await expect(idle.service.clearOrbitAssignment(1, 1, 7)).resolves.toEqual({
      cleared: false,
    });

    const member = createColonyService();
    arrangeOrbitOrder(member, {
      fleet: { leaderId: 8 },
      assignments: [
        { id: 5, colonyId: 1, fleetId: 99, spacecraftId: 8, mode: 'DEFEND' },
      ],
    });
    await expect(member.orbitService.stopOrbitOrder(7, 1)).rejects.toThrow(
      'Nur Flottenführer können Orbitaufträge erteilen.',
    );
    expect(member.orbitAssignmentRepo.remove).not.toHaveBeenCalled();
  });

  it('keeps the colony-based clear alias scoped to its colony', async () => {
    const setup = createColonyService();
    arrangeOrbitOrder(setup, {
      assignments: [
        { id: 5, colonyId: 1, fleetId: 99, spacecraftId: 7, mode: 'DEFEND' },
      ],
    });

    await expect(setup.service.clearOrbitAssignment(4, 1, 7)).resolves.toEqual({
      cleared: false,
    });
    expect(setup.orbitAssignmentRepo.remove).not.toHaveBeenCalled();
    await expect(setup.service.clearOrbitAssignment(1, 1, 7)).resolves.toEqual({
      cleared: true,
    });
  });
  it('transfers shuttles from colony storage to orbit ship cargo within shuttle capacity', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      storageRepo,
      cargoRepo,
      colonyEventService,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      ...orbitColonyLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      colonyClassId: 999,
      fields: [],
      stats: { isBlockaded: false, maxStorage: 100 },
      storage: [{ id: 1, colonyId: 1, commodityId: 21601, amount: 3 }],
    });
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      ...orbitShipLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      cargoUsed: 0,
      cargoMax: 20,
    });
    shipClassRepo.findOneBy.mockResolvedValue({ id: 1, shuttleSlots: 2 });
    storageRepo.findOne.mockResolvedValue({
      id: 1,
      colonyId: 1,
      commodityId: 21601,
      amount: 3,
    });
    cargoRepo.find.mockResolvedValue([]);
    cargoRepo.findOne.mockResolvedValue(null);
    cargoRepo.create.mockImplementation((value: any) => value);
    cargoRepo.save.mockImplementation(async (value: any) => ({
      id: 9,
      ...value,
    }));

    await service.transferShuttles(1, 1, 7, [
      { commodityId: 21601, amount: 2 },
    ]);

    expect(cargoRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        spacecraftId: 7,
        commodityId: 21601,
        amount: 2,
      }),
    );
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SHUTTLES_TRANSFERRED' }),
    );
  });

  it('rejects shuttle transfer beyond ship shuttle capacity', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
      storageRepo,
      cargoRepo,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      ...orbitColonyLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      colonyClassId: 999,
      fields: [],
      stats: { isBlockaded: false, maxStorage: 100 },
      storage: [{ id: 1, colonyId: 1, commodityId: 21601, amount: 3 }],
    });
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      ...orbitShipLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      cargoUsed: 0,
      cargoMax: 20,
    });
    shipClassRepo.findOneBy.mockResolvedValue({ id: 1, shuttleSlots: 1 });
    storageRepo.findOne.mockResolvedValue({
      id: 1,
      colonyId: 1,
      commodityId: 21601,
      amount: 3,
    });
    cargoRepo.find.mockResolvedValue([]);

    await expect(
      service.transferShuttles(1, 1, 7, [{ commodityId: 21601, amount: 2 }]),
    ).rejects.toThrow('Shuttle capacity exceeded');
  });
});

describe('shipyard EPS cost and one job per shipyard function', () => {
  const corvette = {
    id: 1,
    key: 'TEST_CORVETTE',
    name: 'Test Corvette',
    category: 'CORVETTE',
    isNpc: false,
    buildTimeTicks: 1,
    hullBase: 100,
    shieldBase: 10,
    epsBase: 10,
    warpBase: 1,
    crewMin: 0,
    crewMax: 5,
    cargoCapacity: 10,
    batteryBase: 0,
  };
  const yardColony = (energy: number) => ({
    id: 1,
    userId: 1,
    ...orbitColonyLocation,
    starSystemId: 10,
    celestialObjectId: 20,
    colonyClassId: 999,
    energy,
    energyMax: 500,
    storageMax: 100,
    fields: [
      {
        id: 1,
        fieldIndex: 1,
        buildingId: 85130100,
        isBuilding: false,
        isActive: true,
      },
    ],
    storage: [],
    stats: { workless: 0, trainedCrew: 0, maxStorage: 100 },
  });
  const setup = (energy: number, epsCost = 50) => {
    const ctx = createColonyService();
    ctx.colonyRepo.findOne.mockResolvedValue(yardColony(energy));
    ctx.shipClassRepo.findOneBy.mockResolvedValue(corvette);
    ctx.storageRepo.findOne.mockImplementation(async ({ where }: any) => ({
      colonyId: 1,
      commodityId: where.commodityId,
      amount: 999,
    }));
    ctx.gameData.getShipClassDefByKey.mockImplementation((key: string) => ({
      key,
      buildCosts: [],
      stuRumpId: 6501,
    }));
    ctx.gameData.getShipyardRumpStats.mockImplementation((id: number) =>
      id === 6501 ? { epsCost } : null,
    );
    ctx.shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 1,
      ...orbitShipLocation,
      starSystemId: 10,
      celestialObjectId: 20,
      name: 'Corvette',
    });
    ctx.spacecraftModuleRepo.find.mockResolvedValue([]);
    return ctx;
  };
  const weaponSelection = {
    slotId: 'corvette-weapons-1',
    commodityId: 10701,
  };

  it('deducts the hull EPS cost when a build is queued', async () => {
    const { service, transactionManager } = setup(120);

    const queue = await service.buildShip(
      1,
      1,
      1,
      'Red One',
      [],
      undefined,
      undefined,
      6,
    );

    expect(queue.buildingFunctionId).toBe(6);
    expect(transactionManager.update).toHaveBeenCalledWith(
      expect.anything(),
      { colonyId: 1 },
      { energy: 70 },
    );
  });

  it('rejects a build without enough EPS and queues nothing', async () => {
    const { service, shipBuildQueueRepo, transactionManager } = setup(30);

    await expect(
      service.buildShip(1, 1, 1, 'Red One', [], undefined, undefined, 6),
    ).rejects.toThrow('need 50 energy, have 30');
    expect(transactionManager.save).not.toHaveBeenCalled();
    expect(shipBuildQueueRepo.save).not.toHaveBeenCalled();
  });

  it('rejects a retrofit without enough EPS before consuming modules', async () => {
    const { service, storageRepo } = setup(10);
    storageRepo.save.mockClear();

    await expect(
      service.queueShipRetrofit(1, 1, 7, [weaponSelection], 'Retro', 6),
    ).rejects.toThrow('need 50 energy, have 10');
    expect(storageRepo.save).not.toHaveBeenCalled();
  });

  it('deducts the hull EPS cost for a retrofit and persists the function', async () => {
    const { service, transactionManager } = setup(100);

    const queue = await service.queueShipRetrofit(
      1,
      1,
      7,
      [weaponSelection],
      'Retro',
      6,
    );

    expect(queue.buildingFunctionId).toBe(6);
    expect(queue.mode).toBe('RETROFIT');
    expect(transactionManager.update).toHaveBeenCalledWith(
      expect.anything(),
      { colonyId: 1 },
      { energy: 50 },
    );
  });

  it('requires an explicit active, compatible shipyard function', async () => {
    const { service } = setup(500);

    await expect(service.buildShip(1, 1, 1, 'Red One')).rejects.toThrow(
      'Shipyard function required',
    );
    await expect(
      service.buildShip(1, 1, 1, 'Red One', [], undefined, undefined, 7),
    ).rejects.toThrow('Selected shipyard function is not active');
  });

  it('rejects a build when the selected function already has a build or retrofit job', async () => {
    const { service, shipyardSlotCount, shipBuildQueueRepo } = setup(500);
    shipyardSlotCount.mockResolvedValue(1);

    await expect(
      service.buildShip(1, 1, 1, 'Red One', [], undefined, undefined, 6),
    ).rejects.toThrow('already building or retrofitting');
    await expect(
      service.queueShipRetrofit(1, 1, 7, [weaponSelection], 'Retro', 6),
    ).rejects.toThrow('already building or retrofitting');
    expect(shipBuildQueueRepo.save).not.toHaveBeenCalled();
  });

  it('counts only active BUILD/RETROFIT jobs bound to the function', async () => {
    const { service, shipyardSlotCount } = setup(500);

    await service.buildShip(1, 1, 1, 'Red One', [], undefined, undefined, 6);

    const where = (shipyardSlotCount.mock.calls[0][1] as any).where;
    expect(where.colonyId).toBe(1);
    expect(where.buildingFunctionId).toBe(6);
    // REPAIR jobs and unbound legacy jobs (NULL function) never match.
    expect(where.mode.value).toEqual(['BUILD', 'RETROFIT']);
    expect(where.status.value).toEqual(['QUEUED', 'PAUSED']);
  });

  it('leaves the loaded colony inventory and EPS unchanged when queue persistence fails', async () => {
    const { service, colonyRepo, storageRepo, shipBuildQueueRepo, gameData } =
      setup(120);
    const colony = yardColony(120);
    const loadedStorage = { colonyId: 1, commodityId: 1, amount: 20 };
    colony.storage = [loadedStorage] as never;
    colonyRepo.findOne.mockResolvedValue(colony);
    storageRepo.findOne.mockResolvedValue({
      colonyId: 1,
      commodityId: 1,
      amount: 20,
    });
    gameData.getShipClassDefByKey.mockReturnValue({
      stuRumpId: 6501,
      buildCosts: [{ commodityId: 1, amount: 5 }],
    });
    shipBuildQueueRepo.save.mockRejectedValueOnce(
      new Error('Queue persistence failed'),
    );
    await expect(
      service.buildShip(1, 1, 1, 'Red One', [], undefined, undefined, 6),
    ).rejects.toThrow('Queue persistence failed');
    expect(colony.energy).toBe(120);
    expect(loadedStorage.amount).toBe(20);
  });

  it('does not charge EPS when the resource reservation fails', async () => {
    const { service, storageRepo, gameData, transactionManager } = setup(500);
    gameData.getShipClassDefByKey.mockImplementation((key: string) => ({
      key,
      stuRumpId: 6501,
      buildCosts: [{ commodityId: 1, amount: 5 }],
    }));
    storageRepo.findOne.mockResolvedValue({
      colonyId: 1,
      commodityId: 1,
      amount: 0,
    });

    await expect(
      service.buildShip(1, 1, 1, 'Red One', [], undefined, undefined, 6),
    ).rejects.toThrow('Not enough');
    expect(transactionManager.update).not.toHaveBeenCalled();
  });
});

describe('findAllByUser colony list values (col-AUD-02a)', () => {
  const listColony = (id: number, systemFieldId: number | null) =>
    ({
      id,
      userId: 1,
      name: `C${id}`,
      colonyClassId: 201,
      population: 10,
      populationMax: 100,
      energy: 0,
      energyMax: 100,
      storageUsed: 0,
      storageMax: 100,
      systemFieldId,
      stats: {
        workers: 5,
        workless: 5,
        maxPopulation: 100,
        immigrationEnabled: true,
      },
      fields: [],
      posX: 1,
      posY: 1,
      starSystem: null,
      celestialObject: null,
    }) as any;

  it('loads signatures, defense and growth in batched queries', async () => {
    const {
      service,
      colonyRepo,
      colonyCrewService,
      flightSignatures,
      orbitAssignmentRepo,
    } = createColonyService();
    colonyRepo.find.mockResolvedValue([
      listColony(1, 40),
      listColony(2, 41),
      listColony(3, null),
    ]);
    (colonyCrewService.getCrewCountsByColonyIds as jest.Mock).mockResolvedValue(
      new Map(),
    );
    flightSignatures.countVisibleAt.mockResolvedValue(new Map([[40, 3]]));
    orbitAssignmentRepo.find.mockResolvedValue([
      { colonyId: 2, mode: 'DEFEND' },
    ]);
    const growth = jest
      .spyOn(service, 'calculatePopulationGrowth')
      .mockReturnValue(7);

    const result: any[] = await service.findAllByUser(1);

    expect(flightSignatures.countVisibleAt).toHaveBeenCalledTimes(1);
    expect(flightSignatures.countVisibleAt).toHaveBeenCalledWith([40, 41], 1);
    expect(orbitAssignmentRepo.find).toHaveBeenCalledTimes(1);
    expect(result.map((c) => c.signatureCount)).toEqual([3, 0, 0]);
    expect(result.map((c) => c.overview.status.defended)).toEqual([
      false,
      true,
      false,
    ]);
    expect(growth).toHaveBeenCalledTimes(3);
    expect(result.map((c) => c.overview.population.immigration)).toEqual([
      7, 7, 7,
    ]);
  });

  it('lists consumption ranges, terraforming and module jobs (col-AUD-02b)', async () => {
    const { service, colonyRepo, colonyCrewService, fabricationQueueRepo, gameData, statsService } =
      createColonyService();
    const commodities: Record<number, any> = {
      1: { isSaveable: true, sort: 20 },
      2: { isSaveable: true, sort: 10 },
      3: { isSaveable: true, sort: 30 },
      4: { isSaveable: true, sort: 40 },
      5: { isSaveable: false, sort: 5 },
    };
    gameData.getCommodity.mockImplementation((id: number) => commodities[id]);
    gameData.getTerraforming.mockReturnValue({ description: 'Wueste zu Wiese' });
    gameData.getFabricationItem.mockReturnValue({ displayName: 'Huelle Mk1' });
    const colony = {
      ...listColony(1, null),
      storage: [
        { commodityId: 1, amount: 25 },
        { commodityId: 2, amount: 0 },
        { commodityId: 4, amount: 50 },
      ],
      fields: [
        { fieldIndex: 7, terraformingId: 'T1', terraformingFinishesAt: new Date('2026-11-20T10:00:00Z') },
        { fieldIndex: 8, terraformingId: null },
      ],
    };
    colonyRepo.find.mockResolvedValue([colony, listColony(2, null)]);
    (colonyCrewService.getCrewCountsByColonyIds as jest.Mock).mockResolvedValue(new Map());
    fabricationQueueRepo.find.mockResolvedValue([
      { colonyId: 1, itemKey: 'hull', amount: 3 },
    ]);
    jest.spyOn(service, 'calculatePopulationGrowth').mockReturnValue(0);
    const real = statsService.calculateSummary.bind(statsService);
    jest.spyOn(statsService, 'calculateSummary').mockImplementation((c: any) => ({
      ...real(c),
      productionDelta: new Map([
        [1, -10],
        [2, -4],
        [3, 6],
        [4, -2],
        [5, -9],
      ]),
    }));

    const result: any[] = await service.findAllByUser(1);

    // sort order 2,1,4; stock 0 -> 0 rounds; 25/10 -> 2; positive and unsaveable skipped
    expect(result[0].consumption).toEqual([
      { commodityId: 2, amount: -4, rounds: 0 },
      { commodityId: 1, amount: -10, rounds: 2 },
      { commodityId: 4, amount: -2, rounds: 25 },
    ]);
    expect(result[0].terraformingJobs).toEqual([
      // Without a timing service the duration is unknown.
      { fieldIndex: 7, name: 'Wueste zu Wiese', finishesAt: '2026-11-20T10:00:00.000Z', progress: null },
    ]);
    expect(result[0].moduleJobs).toEqual([{ name: 'Huelle Mk1', amount: 3 }]);
    expect(result[1].terraformingJobs).toEqual([]);
    expect(result[1].moduleJobs).toEqual([]);
    expect(fabricationQueueRepo.find).toHaveBeenCalledTimes(1);
  });

  it('derives terraforming progress from the finish time and the scaled duration (col-AUD-02b)', async () => {
    const { service, colonyRepo, colonyCrewService, fabricationQueueRepo, gameData } = createColonyService();
    gameData.getTerraforming.mockReturnValue({ description: 'Wueste zu Wiese', duration: 1800 });
    // Build time multiplier 2: 1800 s become 60 min; 15 min remain → 75 %.
    Object.assign(service, { timing: { scaleBuildTimeSeconds: (seconds: number) => seconds * 2 } });
    colonyRepo.find.mockResolvedValue([
      {
        ...listColony(1, null),
        fields: [
          { fieldIndex: 7, terraformingId: 'T1', terraformingFinishesAt: new Date(Date.now() + 15 * 60_000) },
        ],
      },
    ]);
    (colonyCrewService.getCrewCountsByColonyIds as jest.Mock).mockResolvedValue(new Map());
    fabricationQueueRepo.find.mockResolvedValue([]);
    jest.spyOn(service, 'calculatePopulationGrowth').mockReturnValue(0);

    const [colony]: any[] = await service.findAllByUser(1);

    expect(colony.terraformingJobs[0].progress).toBe(75);
  });
});
