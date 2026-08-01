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
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    findOne: jest.fn(),
    manager: { save: jest.fn(async (value) => value) },
  };
  const fieldRepo = { save: jest.fn(async (value) => value) };
  const statsRepo = { save: jest.fn(async (value) => value) };
  const userRepo = {
    findOneBy: jest.fn(),
    findOne: jest.fn(async () => ({ id: 1, faction: null })),
  };
  const shipRepo = {
    find: jest.fn(async () => []),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    remove: jest.fn(async (value) => value),
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
  };
  const shipBuildQueueRepo = {
    create: jest.fn((value) => value),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    findOne: jest.fn(),
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
  const gameData = {
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
          shipyardGroup: 'OFFENSE_SYSTEMS',
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
          moduleType: 'Energieverteiler',
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
    getAllFabricationItems: jest.fn(() => [
      {
        itemKey: 'module.weapon.turbolaser-k1',
        queueType: 'MODULE',
        displayName: 'Turbolaser (Klasse 1)',
        outputCommodityId: 10701,
        moduleType: 'Laser Cannon',
        moduleCategory: 'WEAPONS',
        shipyardGroup: 'OFFENSE_SYSTEMS',
        shipyardType: 'ENERGY_WEAPON',
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
  const colonyDefenseService = new ColonyDefenseService(
    colonyStorageService as any,
    gameData as any,
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
  };
  const buildingManagementService = new ColonyBuildingManagementService(
    fieldRepo as any,
    gameData as any,
    buildingLifecycleService as any,
    statsService as any,
    colonyStorageService as any,
  );
  const spacecraftTorpedoService = {
    loadFromColony: jest.fn(async () => undefined),
  };
  const colonyCrewService = {
    getRemainingCount: jest.fn(async () => 999),
    getTrainableCount: jest.fn(async () => 999),
    getInTrainingCount: jest.fn(async () => 0),
    getFreeAssignmentCount: jest.fn(async () => 999),
    getAssignedCount: jest.fn(async () => 0),
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
    fieldRepo as any,
    statsRepo as any,
    fabricationQueueRepo as any,
    crewTrainingQueueRepo as any,
    shipBuildQueueRepo as any,
    orbitAssignmentRepo as any,
    crewAssignmentRepo as any,
    crewRepo as any,
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
  );
  const timingService = new ColonyTimingService(config as any);
  const fabricationService = new ColonyFabricationService(
    fabricationQueueRepo as any,
    userRepo as any,
    gameData as any,
    statsService,
    colonyStorageService,
    timingService,
    ownershipService as any,
    unlockResolver as any,
  );
  const orbitService = new ColonyOrbitService(
    colonyRepo as any,
    statsRepo as any,
    orbitAssignmentRepo as any,
    shipRepo as any,
    cargoRepo as any,
    storageRepo as any,
    shipClassRepo as any,
    ownershipService as any,
    gameData as any,
    statsService,
    colonyStorageService,
    colonyDefenseService as any,
    colonyEventService as any,
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
    colonyEventService as any,
    colonySocialService as any,
    orbitService as any,
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
    colonyCrewService as any,
    colonyStorageService as any,
    statsService,
    orbitService as any,
    colonyEventService as any,
    spacecraftStatsService as any,
    unlockResolver as any,
    timingService,
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
    projectionService as any,
    timingService,
  );

  const tickProcessorService = new ColonyTickProcessorService(
    colonyRepo as any,
    statsRepo as any,
    fieldRepo as any,
    storageRepo as any,
    depositMiningRepo as any,
    crewTrainingQueueRepo as any,
    gameData as any,
    statsService,
    colonyStorageService,
    buildingLifecycleService,
    colonyCrewService as any,
    colonyDefenseService as any,
    fabricationService as any,
    shipyardService as any,
  );

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
      cargoRepo,
      shipClassRepo,
      shipBuildQueueRepo,
      shipBuildplanRepo,
      orbitAssignmentRepo,
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
      ownershipService,
      abandonmentService,
      settingsService,
      timingService,
      fabricationService,
      orbitService,
      projectionService,
      shipyardService,
      constructionService,
      tickProcessorService,
      config,
    },
    overrides,
  );
}

describe('colony give up', () => {
  it('abandons a non-starter colony while keeping storage and deactivating buildings', async () => {
    const {
      service,
      colonyRepo,
      fieldRepo,
      fabricationQueueRepo,
      crewTrainingQueueRepo,
      shipBuildQueueRepo,
      orbitAssignmentRepo,
      crewAssignmentRepo,
      crewRepo,
      userRepo,
      colonyEventService,
    } = createColonyService();
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
    crewAssignmentRepo.find.mockResolvedValue([{ crewId: 7, colonyId: 1 }]);

    await expect(service.giveUpColony(1, 1, 'Ruinenwelt')).resolves.toEqual({
      abandoned: true,
      colonyId: 1,
    });

    expect(fabricationQueueRepo.delete).toHaveBeenCalledWith({ colonyId: 1 });
    expect(crewTrainingQueueRepo.delete).toHaveBeenCalledWith({ colonyId: 1 });
    expect(shipBuildQueueRepo.delete).toHaveBeenCalledWith({ colonyId: 1 });
    expect(orbitAssignmentRepo.delete).toHaveBeenCalledWith({ colonyId: 1 });
    expect(crewAssignmentRepo.delete).toHaveBeenCalledWith([{ crewId: 7 }]);
    expect(crewRepo.delete).toHaveBeenCalledWith([{ id: 7 }]);
    expect(fieldRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({
        isActive: false,
        terraformingId: null,
        terraformingFinishesAt: null,
      }),
    ]);
    expect(colonyRepo.manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        workers: 0,
        trainedCrew: 0,
        isBlockaded: false,
        shields: 0,
        torpedoTypeId: null,
        immigrationEnabled: false,
      }),
    );
    expect(colonyRepo.save).toHaveBeenCalledWith(
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
        },
        fields: [],
        starSystem: { name: 'Kelaris VI' },
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
          'celestialObject',
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

      await service.terraformField(1, 1, 5, 101201);

      expect(field).toMatchObject({
        terraformingId: 101201,
        terraformingFinishesAt: new Date('2026-07-03T10:00:30.000Z'),
      });
    } finally {
      jest.useRealTimers();
    }
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
    expect(storage.amount).toBe(2);
    expect(colony.storageUsed).toBe(2);
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          recycled: [{ commodityId: 2, amount: 2 }],
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

  it('uses effective population stats for tick worker deactivation', async () => {
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

    expect(workerField.isActive).toBe(false);
    expect(fieldRepo.save).toHaveBeenCalledWith(workerField);
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

  it('completes crew training and creates colony crew assignments', async () => {
    const { service, crewTrainingQueueRepo, colonyCrewService } =
      createColonyService();
    const job = {
      id: 1,
      colonyId: 1,
      userId: 1,
      amount: 2,
      finishesAt: null,
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

  it('scales fabrication queue finish time with the configured alpha multiplier', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    try {
      const { service, colonyRepo, fabricationQueueRepo, storageRepo } =
        createColonyService({
          config: {
            get: jest.fn((key: string) =>
              key === 'GAME_BUILD_TIME_MULTIPLIER' ? '0.5' : undefined,
            ),
          },
        });
      colonyRepo.findOne.mockResolvedValue(activeWeaponFabColony);
      storageRepo.findOne.mockResolvedValue({
        id: 1,
        colonyId: 1,
        commodityId: 2,
        amount: 999,
      });

      await service.queueFabrication(
        1,
        1,
        'MODULE' as any,
        'module.weapon.turbolaser-k1',
        2,
        10,
      );

      expect(fabricationQueueRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          finishesAt: new Date('2026-07-03T10:01:00.000Z'),
        }),
      );
    } finally {
      jest.useRealTimers();
    }
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

  it('allows only one active queue per building function', async () => {
    const { service, colonyRepo, fabricationQueueRepo, storageRepo } =
      createColonyService();
    colonyRepo.findOne.mockResolvedValue(activeWeaponFabColony);
    fabricationQueueRepo.find.mockResolvedValueOnce([{ id: 99 }]);
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

const weaponSelection = { slotId: 'corvette-weapons-1', commodityId: 10701 };
const shieldSelection = { slotId: 'corvette-shields-1', commodityId: 10201 };
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
        category: 'ENERGY_WEAPON',
        level: 1,
      }),
    );
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
          buildingId: 85110100,
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
    });

    const beforeBuild = Date.now();
    const queue = await service.buildShip(
      1,
      1,
      1,
      'Red One',
      [],
      'Starter Plan',
    );

    expect(gameData.getBuildingFunctions).toHaveBeenCalledWith(85110100);
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

  it('scales ship build queue finish time with the configured alpha multiplier', async () => {
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
            buildingId: 85110100,
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
        buildTimeTicks: 4,
      });

      await service.buildShip(1, 1, 1, 'Red One', [], undefined);

      expect(shipBuildQueueRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          finishesAt: new Date('2026-07-03T10:02:00.000Z'),
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
          buildingId: 85110100,
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
          buildingId: 85110100,
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
        { id: 1, buildingId: 85110100, isBuilding: false, isActive: true },
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
      service.buildShip(1, 1, 1, 'Locked Module', [weaponSelection], 'Plan'),
    ).rejects.toThrow('Research required: Lasertechnik');
  });

  it('validates colony ownership before creating buildplans', async () => {
    const { service, colonyRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue(null);

    await expect(
      service.createShipBuildplan(99, 1, 1, 'Scout Plan', []),
    ).rejects.toThrow('Colony not found');
  });

  it('rejects empty and duplicate buildplan names', async () => {
    const { service, colonyRepo, shipBuildplanRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      colonyClassId: 999,
      fields: [],
      storage: [],
    });

    await expect(
      service.createShipBuildplan(1, 1, 1, '   ', []),
    ).rejects.toThrow('Buildplan name is required');

    shipBuildplanRepo.findOne.mockResolvedValue({
      id: 4,
      colonyId: 1,
      userId: 1,
      name: 'Scout Plan',
    });
    await expect(
      service.createShipBuildplan(1, 1, 1, 'Scout Plan', []),
    ).rejects.toThrow('Buildplan name already exists');
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
      colonyId: 1,
      shipClassId: 1,
      name: 'Scout Plan',
      moduleSelections: [weaponSelection],
      moduleCommodityIds: [10701],
      moduleTypes: ['Laser Cannon'],
    });
    expect(shipBuildplanRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ colonyId: 1, userId: 1, name: 'Scout Plan' }),
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

  it('builds from a plan using a queue snapshot that survives plan delete', async () => {
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
          buildingId: 85110100,
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
    shipBuildplanRepo.findOne.mockResolvedValueOnce(buildplan);

    const queue = await service.buildShipFromBuildplan(1, 1, 7, 'Planned Ship');

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
    await service.deleteShipBuildplan(1, 1, 7);

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
      key: 'REBEL_SHUTTLE_LAAT',
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
      key: 'REBEL_SHUTTLE_LAAT',
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
        starSystemId: 10,
        celestialObjectId: 20,
        hull: 80,
        hullMax: 100,
        shields: 40,
        shieldsMax: 50,
        energy: 70,
        energyMax: 100,
        crew: 2,
        crewMax: 5,
        cargoUsed: 3,
        cargoMax: 20,
        status: 'DOCKED',
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
      detailV2?: { buildingManagement?: { fields?: Array<Record<string, unknown>> } };
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
      detailV2?: { buildingManagement?: { fields?: Array<Record<string, unknown>> } };
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
    const service = new ResearchService(researchRepo as any, gameData as any);

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
    const service = new ResearchService(researchRepo as any, gameData as any);

    await service.processTick(1, 0, new Map([[1702, 3]]));

    expect(research.spentPoints).toBe(3);
    expect(research.remainingPoints).toBe(7);
    expect(research.status).toBe(ResearchStatus.IN_PROGRESS);
    expect(research.blockedReason).toBeNull();
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
    const service = new ResearchService(researchRepo as any, gameData as any);

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
    );

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
            reason: 'Energie',
          },
        ],
      })),
    };
    const researchService = { processTick: jest.fn(async () => undefined) };
    const colonyEventService = { createTickEvents: jest.fn(async () => []) };
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
    );

    await service.handleTick();

    expect(colonyEventService.createTickEvents).toHaveBeenCalledWith(
      1,
      7,
      expect.any(Array),
      expect.any(Number),
    );
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      7,
      WsEventType.COLONY_TICK_REPORT,
      expect.objectContaining({
        colonyId: 1,
        events: [
          expect.objectContaining({
            type: 'BUILDING_DEACTIVATED',
            reason: 'Energie',
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

  it('queues repair and deducts spare parts/system components', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      shipClassRepo,
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

    expect(storage[10001].amount).toBe(3);
    expect(storage[10002].amount).toBe(4);
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
      service.queueShipRetrofit(1, 1, 7, [weaponSelection]),
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
      service.queueShipRetrofit(1, 1, 7, [weaponSelection]),
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

  it('rejects hangar rump construction without default modules', async () => {
    const { service, colonyRepo, shipClassRepo, storageRepo } =
      createColonyService();
    const colony = airfieldColony();
    colonyRepo.findOne.mockResolvedValue(colony);
    shipClassRepo.findOneBy.mockResolvedValue(hangarShipClass);
    storageRepo.findOne.mockResolvedValue(null);

    await expect(service.buildAirfieldRump(1, 1, 1, 1)).rejects.toThrow(
      'Not enough',
    );
  });

  it('rejects hangar rump construction without active airfield', async () => {
    const { service, colonyRepo } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({ ...airfieldColony(), fields: [] });
    await expect(service.buildAirfieldRump(1, 1, 1, 1)).rejects.toThrow(
      'Active airfield required',
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
        starSystemId: 10,
        celestialObjectId: 20,
        status: 'DOCKED',
      }),
    );
    expect(colonyCrewService.assignCrewToShip).not.toHaveBeenCalled();
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

    expect(storage[21401].amount).toBe(1);
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
      status: 'DOCKED',
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
      status: 'DOCKED',
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
    const { service, shipBuildQueueRepo, shipClassRepo } =
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

    await service.processTick(colony as any);

    expect(pausedJob.status).toBe('QUEUED');
    expect(pausedJob.stoppedAt).toBeNull();
  });
});

describe('colony orbit assignments', () => {
  it('starts a fleet-led colony defense order', async () => {
    const {
      service,
      colonyRepo,
      shipRepo,
      orbitAssignmentRepo,
      colonyEventService,
    } = createColonyService();
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 2,
      starSystemId: 10,
      celestialObjectId: 20,
      fields: [],
      stats: { isBlockaded: false },
    });
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      fleetId: 99,
      fleet: { id: 99, leaderId: 7 },
      starSystemId: 10,
      celestialObjectId: 20,
      status: 'DOCKED',
    });
    orbitAssignmentRepo.find.mockResolvedValue([]);
    orbitAssignmentRepo.findOne.mockResolvedValue(null);
    orbitAssignmentRepo.count.mockResolvedValue(0);
    orbitAssignmentRepo.create.mockImplementation((value: any) => value);
    orbitAssignmentRepo.save.mockImplementation(async (value: any) => ({
      id: 1,
      ...value,
    }));

    const result = await service.setOrbitAssignment(1, 1, 7, 'DEFEND' as any);

    expect(result).toEqual(
      expect.objectContaining({
        colonyId: 1,
        spacecraftId: 7,
        fleetId: 99,
        mode: 'DEFEND',
      }),
    );
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ORBIT_DEFENSE_STARTED' }),
    );
  });

  it('starts blockade and syncs colony blockade flag', async () => {
    const { service, colonyRepo, shipRepo, orbitAssignmentRepo } =
      createColonyService();
    const stats = { isBlockaded: false };
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 2,
      starSystemId: 10,
      celestialObjectId: 20,
      fields: [],
      stats,
    });
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      fleetId: 99,
      fleet: { id: 99, leaderId: 7 },
      starSystemId: 10,
      celestialObjectId: 20,
      status: 'DOCKED',
    });
    orbitAssignmentRepo.find.mockResolvedValue([]);
    orbitAssignmentRepo.findOne.mockResolvedValue(null);
    orbitAssignmentRepo.count.mockResolvedValue(1);
    orbitAssignmentRepo.create.mockImplementation((value: any) => value);
    orbitAssignmentRepo.save.mockImplementation(async (value: any) => ({
      id: 1,
      ...value,
    }));

    await service.setOrbitAssignment(1, 1, 7, 'BLOCKADE' as any);

    expect(stats.isBlockaded).toBe(true);
    expect(colonyRepo.manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ isBlockaded: true }),
    );
  });

  it('clears fleet orbit order and syncs blockade flag', async () => {
    const { service, colonyRepo, shipRepo, orbitAssignmentRepo } =
      createColonyService();
    const stats = { isBlockaded: true };
    const assignment = {
      id: 5,
      colonyId: 1,
      spacecraftId: 7,
      fleetId: 99,
      mode: 'BLOCKADE',
    };
    colonyRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 2,
      stats,
    });
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      fleetId: 99,
      fleet: { id: 99, leaderId: 7 },
    });
    orbitAssignmentRepo.findOne.mockResolvedValue(assignment);
    orbitAssignmentRepo.count.mockResolvedValue(0);

    const result = await service.clearOrbitAssignment(1, 1, 7);

    expect(result).toEqual({ cleared: true });
    expect(orbitAssignmentRepo.remove).toHaveBeenCalledWith(assignment);
    expect(stats.isBlockaded).toBe(false);
    expect(colonyRepo.manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ isBlockaded: false }),
    );
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
