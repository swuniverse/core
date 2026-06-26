jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: {
    DOCKED: 'DOCKED',
    IN_FLIGHT: 'IN_FLIGHT',
    IN_COMBAT: 'IN_COMBAT',
    DESTROYED: 'DESTROYED',
  },
}));
jest.mock('../spacecraft/entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../colony/entities/colony-stats.entity', () => ({
  ColonyStats: class ColonyStats {},
}));
jest.mock('../spacecraft/spacecraft-crew.service', () => ({
  SpacecraftCrewService: class SpacecraftCrewService {},
}));

import { CombatService } from './combat.service';
import { SpacecraftStatus } from '../spacecraft/entities/spacecraft.entity';
import { ColonyDefenseService } from '../colony/colony-defense.service';

function createService() {
  const shipRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const moduleRepo = {
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    save: jest.fn(async (value) => value),
  };
  const colonyRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const colonyStatsRepo = { save: jest.fn(async (value) => value) };
  const colonyFieldRepo = { save: jest.fn(async (value) => value) };
  const engine = { resolveCombat: jest.fn() };
  const gateway = { emitToUser: jest.fn() };
  const spacecraftCrewService = { hasEnoughCrew: jest.fn(async () => true) };
  const storageService = { lowerStorage: jest.fn(async () => 1) };
  const colonyDefenseService = new ColonyDefenseService(
    storageService as any,
    {
      getTorpedoType: jest.fn((id: number) =>
        id === 81 ? { id: 81, commodityId: 81, baseDamage: 90 } : undefined,
      ),
    } as any,
  );
  const gameData = {
    getTorpedoType: jest.fn((id: number) =>
      id === 81
        ? { id: 81, commodityId: 81, name: 'Micro', baseDamage: 90 }
        : undefined,
    ),
    getBuildingFunctions: jest.fn((buildingId: number) => {
      if (buildingId === 100010100) return [24];
      if (buildingId === 100020100) return [25];
      if (buildingId === 100030100) return [26];
      if (buildingId === 100040100) return [27];
      if (buildingId === 100050100) return [28];
      return [];
    }),
  };
  const colonyEventService = {
    createActionEvent: jest.fn(async (value) => value),
  };
  const colonyDamageService = {
    applyIncomingDamage: jest.fn<any, any[]>(() => []),
  };
  const service = new CombatService(
    shipRepo as any,
    moduleRepo as any,
    colonyRepo as any,
    colonyStatsRepo as any,
    colonyFieldRepo as any,
    engine as any,
    gateway as any,
    spacecraftCrewService as any,
    colonyDefenseService as any,
    gameData as any,
    colonyEventService as any,
    colonyDamageService as any,
  );
  return {
    service,
    shipRepo,
    moduleRepo,
    colonyRepo,
    colonyStatsRepo,
    spacecraftCrewService,
    storageService,
    colonyEventService,
    colonyDamageService,
    colonyFieldRepo,
  };
}

describe('CombatService attackColony', () => {
  const attacker = () => ({
    id: 7,
    userId: 1,
    status: SpacecraftStatus.DOCKED,
    starSystemId: 10,
    celestialObjectId: 20,
    hull: 500,
    shields: 0,
  });

  const colony = (fields: any[] = []): any => ({
    id: 5,
    userId: 2,
    starSystemId: 10,
    celestialObjectId: 20,
    energy: 100,
    fields,
    stats: {
      shields: 300,
      maxShields: 4000,
      shieldFrequency: null,
      torpedoTypeId: null,
    },
  });

  it('absorbs incoming damage with colony shields', async () => {
    const {
      service,
      shipRepo,
      colonyRepo,
      moduleRepo,
      colonyStatsRepo,
      colonyEventService,
      colonyDamageService,
    } = createService();
    shipRepo.findOne.mockResolvedValue(attacker());
    colonyRepo.findOne.mockResolvedValue(
      colony([{ buildingId: 100010100, isActive: true, isBuilding: false }]),
    );
    moduleRepo.find.mockResolvedValue([
      {
        spacecraftId: 7,
        category: 'WEAPONS',
        level: 1,
        integrity: 100,
        isActive: true,
      },
    ]);

    const result = await service.attackColony(7, 5, 1);

    expect(result.defenderType).toBe('COLONY');
    expect(result.colonyShields).toBe(200);
    expect(result.damagedFields).toEqual([]);
    expect(colonyDamageService.applyIncomingDamage).toHaveBeenCalledWith(
      expect.any(Object),
      0,
    );
    expect(colonyStatsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ shields: 200 }),
    );
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        colonyId: 5,
        userId: 2,
        type: 'COLONY_ATTACKED',
      }),
    );
  });

  it('damages colony fields when shields are down', async () => {
    const {
      service,
      shipRepo,
      colonyRepo,
      moduleRepo,
      colonyDamageService,
      colonyFieldRepo,
    } = createService();
    const target = colony([
      {
        fieldIndex: 2,
        buildingId: 100030100,
        isActive: true,
        isBuilding: false,
      },
    ]);
    target.stats.shields = 0;
    const damaged = [
      {
        fieldIndex: 2,
        buildingId: 100030100,
        integrityBefore: 100,
        integrityAfter: 0,
        damage: 100,
        status: 'DESTROYED',
      },
    ];
    colonyDamageService.applyIncomingDamage.mockReturnValue(damaged);
    shipRepo.findOne.mockResolvedValue(attacker());
    colonyRepo.findOne.mockResolvedValue(target);
    moduleRepo.find.mockResolvedValue([
      {
        spacecraftId: 7,
        category: 'WEAPONS',
        level: 1,
        integrity: 100,
        isActive: true,
      },
    ]);

    const result = await service.attackColony(7, 5, 1);

    expect(result.damagedFields).toEqual(damaged);
    expect(colonyFieldRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ fieldIndex: 2 }),
    );
    expect(result.rounds[0].log).toContainEqual(
      expect.objectContaining({ action: 'COLONY_SHIELD_ABSORB', value: 0 }),
    );
  });

  it('fires energy phalanx and consumes colony energy', async () => {
    const { service, shipRepo, colonyRepo } = createService();
    const ship = attacker();
    const target = colony([
      { buildingId: 100010100, isActive: true, isBuilding: false },
      { buildingId: 100030100, isActive: true, isBuilding: false },
    ]);
    target.stats.shields = 0;
    shipRepo.findOne.mockResolvedValue(ship);
    colonyRepo.findOne.mockResolvedValue(target);

    const result = await service.attackColony(7, 5, 1);

    expect(ship.hull).toBe(250);
    expect(target.energy).toBe(75);
    expect(result.rounds[0].log).toContainEqual(
      expect.objectContaining({ action: 'ENERGY_PHALANX_HIT', value: 250 }),
    );
  });

  it('fires particle phalanx when torpedoes are configured and stored', async () => {
    const { service, shipRepo, colonyRepo, storageService } = createService();
    const ship = attacker();
    const target = colony([
      { buildingId: 100040100, isActive: true, isBuilding: false },
    ]);
    target.stats.shields = 0;
    target.stats.torpedoTypeId = 81;
    shipRepo.findOne.mockResolvedValue(ship);
    colonyRepo.findOne.mockResolvedValue(target);

    const result = await service.attackColony(7, 5, 1);

    expect(storageService.lowerStorage).toHaveBeenCalledWith(target, 81, 1);
    expect(ship.hull).toBe(410);
    expect(target.energy).toBe(85);
    expect(result.rounds[0].log).toContainEqual(
      expect.objectContaining({ action: 'PARTICLE_PHALANX_HIT', value: 90 }),
    );
  });

  it('reduces projectile damage with anti-particle defense', async () => {
    const { service, shipRepo, colonyRepo, moduleRepo } = createService();
    shipRepo.findOne.mockResolvedValue(attacker());
    colonyRepo.findOne.mockResolvedValue(
      colony([
        { buildingId: 100010100, isActive: true, isBuilding: false },
        { buildingId: 100050100, isActive: true, isBuilding: false },
      ]),
    );
    moduleRepo.find.mockResolvedValue([
      {
        spacecraftId: 7,
        category: 'PROJECTILE',
        level: 2,
        integrity: 100,
        isActive: true,
      },
    ]);

    const result = await service.attackColony(7, 5, 1);

    expect(result.colonyShields).toBe(200);
  });

  it('rejects attacks from ships outside colony orbit', async () => {
    const { service, shipRepo, colonyRepo } = createService();
    shipRepo.findOne.mockResolvedValue({
      ...attacker(),
      celestialObjectId: 99,
    });
    colonyRepo.findOne.mockResolvedValue(colony());

    await expect(service.attackColony(7, 5, 1)).rejects.toThrow(
      'Colony must be in same orbit',
    );
  });
});
