jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('./entities/colony-field.entity', () => ({
  ColonyField: class ColonyField {},
}));
jest.mock('./entities/colony-storage.entity', () => ({
  ColonyStorage: class ColonyStorage {},
}));
jest.mock('./entities/colony-stats.entity', () => ({
  ColonyStats: class ColonyStats {},
}));
jest.mock('./entities/colony-changeable.entity', () => ({
  ColonyChangeable: class ColonyChangeable {},
}));
jest.mock('./entities/colony-deposit-mining.entity', () => ({
  ColonyDepositMining: class ColonyDepositMining {},
}));
jest.mock('./entities/colony-orbit-assignment.entity', () => ({
  ColonyOrbitAssignment: class ColonyOrbitAssignment {},
  ColonyOrbitAssignmentMode: { DEFEND: 'DEFEND', BLOCKADE: 'BLOCKADE' },
}));
jest.mock('../starmap/entities/celestial-object.entity', () => ({
  CelestialObject: class CelestialObject {},
  CelestialObjectType: { PLANET: 1 },
}));
jest.mock('../spacecraft/entities/cargo-item.entity', () => ({
  CargoItem: class CargoItem {},
}));
jest.mock('../spacecraft/entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));
jest.mock('../spacecraft/entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
}));
jest.mock('../research/unlock-resolver.service', () => ({
  UnlockResolverService: class UnlockResolverService {},
}));
jest.mock('../auth/user.entity', () => ({
  User: class User {},
}));
jest.mock('./colony-orbit.service', () => ({
  ColonyOrbitService: class ColonyOrbitService {},
}));

import { ColonySeedService } from './colony-seed.service';
import { ColonyProjectionService } from './colony-projection.service';

function repo(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    find: jest.fn(async () => []),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    ...overrides,
  };
}

function createSeedService() {
  const colonyRepo = repo({
    create: jest.fn((value) => ({ id: 99, ...value })),
  });
  const fieldRepo = repo();
  const storageRepo = repo();
  const statsRepo = repo();
  const changeableRepo = repo();
  const depositMiningRepo = repo();
  const objectRepo = repo();
  const gameData = {
    getBuilding: jest.fn(() => ({ bevPro: 84 })),
    getColonyClassDeposits: jest.fn(() => []),
  };
  const service = new ColonySeedService(
    colonyRepo as any,
    fieldRepo as any,
    storageRepo as any,
    statsRepo as any,
    changeableRepo as any,
    depositMiningRepo as any,
    objectRepo as any,
    gameData as never,
  );
  return {
    service,
    colonyRepo,
    fieldRepo,
    statsRepo,
    changeableRepo,
    objectRepo,
  };
}

describe('Colony surface snapshots', () => {
  it('creates a base64 surface mask with layer metadata', () => {
    const { service } = createSeedService();

    const snapshot = service.generateSurfaceSnapshot(201, 'same-seed', 2);
    const mask = JSON.parse(Buffer.from(snapshot.mask, 'base64').toString());

    expect(snapshot.width).toBe(10);
    expect(snapshot.rotationFactor).toBe(1);
    expect(snapshot.fields).toHaveLength(mask.length);
    expect(mask[0]).toEqual(
      expect.objectContaining({
        fieldIndex: expect.any(Number),
        fieldType: expect.any(Number),
        terrainTileId: expect.any(Number),
        layer: expect.stringMatching(/^(ORBIT|SURFACE|UNDERGROUND)$/),
      }),
    );
    expect(mask.some((field: { layer: string }) => field.layer === 'UNDERGROUND')).toBe(
      true,
    );
  });

  it('seeds starter colonies from the generated surface snapshot', async () => {
    const { service, colonyRepo, fieldRepo, objectRepo } = createSeedService();
    objectRepo.createQueryBuilder.mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 7,
          systemId: 3,
          posX: 4,
          posY: 5,
          classId: 201,
          starSystem: { bonusFields: 2 },
        },
      ]),
    });

    const colony = await service.createStarterColony(1, 'Leia', 7, 1);
    const savedFields = fieldRepo.save.mock.calls[0][0];
    expect(colony.surfaceMask).toEqual(expect.any(String));
    const decodedMask = JSON.parse(
      Buffer.from(colony.surfaceMask as string, 'base64').toString(),
    );

    expect(colonyRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        surfaceMask: expect.any(String),
        surfaceWidth: 10,
        rotationFactor: 1,
      }),
    );
    expect(savedFields).toHaveLength(decodedMask.length);
    expect(savedFields.some((field: { layer: string }) => field.layer === 'UNDERGROUND')).toBe(
      true,
    );
  });

  it('projects surface metadata from colony fields', () => {
    const projection = Object.create(ColonyProjectionService.prototype) as {
      buildSurfaceInfo: (
        colony: { surfaceWidth: number; rotationFactor: number },
        fields: Array<{ layer: 'ORBIT' | 'SURFACE' | 'UNDERGROUND' }>,
      ) => unknown;
    };

    const surface = projection.buildSurfaceInfo(
      { surfaceWidth: 10, rotationFactor: 1 },
      [
        { layer: 'ORBIT' },
        { layer: 'SURFACE' },
        { layer: 'UNDERGROUND' },
      ],
    );

    expect(surface).toEqual({
      width: 10,
      rotationFactor: 1,
      layers: ['ORBIT', 'SURFACE', 'UNDERGROUND'],
      hasUnderground: true,
    });
  });

  it('describes shield effects from runtime module strength', () => {
    const projection = Object.create(ColonyProjectionService.prototype) as {
      gameData: { getAllModules: () => unknown[] };
      describeShipyardModuleEffects: (item: unknown) => string[];
    };
    projection.gameData = {
      getAllModules: () => [
        {
          name: 'Standard-Deflektorschild',
          category: 'SHIELDS',
          public: { baseCrewCapacity: 1 },
          secret: { baseShieldStrength: 20 },
        },
        {
          name: 'Militär-Deflektorschild',
          category: 'SHIELDS',
          public: { baseCrewCapacity: 3 },
          secret: { baseShieldStrength: 50 },
        },
      ],
    };

    expect(
      projection.describeShipyardModuleEffects({
        moduleType: 'Militär-Deflektorschild',
        moduleLevel: 2,
        shipyardType: 'SHIELDS',
        shipyardModuleStats: {
          level: 2,
          crew: 4,
          defaultFactor: 0,
          energyCost: 70,
        },
      }),
    ).toEqual([
      'Schildkapazität: 60 (+150% ggü. Standard)',
      'Crew: +4',
      'Energiekosten: 70',
    ]);
  });

  it('describes weapon effects from runtime module damage', () => {
    const projection = Object.create(ColonyProjectionService.prototype) as {
      gameData: { getAllModules: () => unknown[] };
      describeShipyardModuleEffects: (item: unknown) => string[];
    };
    projection.gameData = {
      getAllModules: () => [
        {
          name: 'Leichter Turbolaser',
          category: 'WEAPONS',
          public: { baseCrewCapacity: 1 },
          secret: { baseDamage: 15 },
        },
        {
          name: 'Ionenkanone',
          category: 'WEAPONS',
          public: { baseCrewCapacity: 1 },
          secret: { baseDamage: 10 },
        },
        {
          name: 'Schwerer Turbolaser',
          category: 'WEAPONS',
          public: { baseCrewCapacity: 2 },
          secret: { baseDamage: 25 },
        },
      ],
    };

    expect(
      projection.describeShipyardModuleEffects({
        moduleType: 'Schwerer Turbolaser',
        moduleLevel: 3,
        shipyardType: 'ENERGY_WEAPON',
        shipyardModuleStats: {
          level: 3,
          crew: 3,
          defaultFactor: 0,
          energyCost: 70,
        },
      }),
    ).toEqual([
      'Waffenschaden: 35 (+67% ggü. Leicht)',
      'Crew: +3',
      'Energiekosten: 70',
    ]);
    expect(
      projection.describeShipyardModuleEffects({
        moduleType: 'Ionenkanone',
        moduleLevel: 3,
        shipyardType: 'ENERGY_WEAPON',
        shipyardModuleStats: {
          level: 3,
          crew: 1,
          defaultFactor: 0,
          energyCost: 60,
        },
      }),
    ).toEqual([
      'Waffenschaden: 14 (-33% ggü. Leicht)',
      'Ioneneffekt',
      'Crew: +1',
      'Energiekosten: 60',
    ]);
  });

  it('describes hull projectile resistance effects', () => {
    const projection = Object.create(ColonyProjectionService.prototype) as {
      gameData: { getAllModules: () => unknown[] };
      describeShipyardModuleEffects: (item: unknown) => string[];
    };
    projection.gameData = {
      getAllModules: () => [
        {
          name: 'Durastahl-Panzerung',
          category: 'HULL',
          public: { baseHullPoints: 30, baseCrewCapacity: 0 },
          secret: { projectileResistances: { QUANTUM: 15 } },
        },
        {
          name: 'Ablative Durastahl-Panzerung',
          category: 'HULL',
          public: { baseHullPoints: 27, baseCrewCapacity: 0 },
          secret: {
            projectileResistances: {
              PROTON: 25,
              QUANTUM: 30,
              HEAVY_QUANTUM: 25,
              PLASMA: 15,
              HEAVY_PLASMA: 10,
            },
          },
        },
      ],
    };

    expect(
      projection.describeShipyardModuleEffects({
        moduleType: 'Ablative Durastahl-Panzerung',
        moduleLevel: 2,
        shipyardType: 'HULL',
        shipyardModuleStats: {
          level: 2,
          crew: 0,
          defaultFactor: 0,
          energyCost: 60,
        },
      }),
    ).toEqual([
      'Hüllenstärke: 32 (-11% ggü. Durastahl); Torpedoschutz: Proton -25%, Quantum -30%, Schweres Quantum -25%, Plasma -15%, Schweres Plasma -10%',
      'Energiekosten: 60',
    ]);
  });
});
