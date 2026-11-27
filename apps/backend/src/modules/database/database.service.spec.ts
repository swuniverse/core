jest.mock('../starmap/entities/space-location.entity', () => ({ SpaceLocation: class SpaceLocation {} }));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftKind: { SHIP: 'SHIP', STATION: 'STATION' },
}));
jest.mock('../research/entities/research.entity', () => ({
  Research: class Research {},
  ResearchStatus: { COMPLETED: 'COMPLETED' },
}));
jest.mock('../faction/faction.service', () => ({
  FactionService: class FactionService {},
}));
jest.mock('../alliance/alliance.service', () => ({
  AllianceService: class AllianceService {},
}));

import { NotFoundException } from '@nestjs/common';
import type { FindOperator } from 'typeorm';
import { DatabaseService } from './database.service';
import { ResearchStatus } from '../research/entities/research.entity';

function createService() {
  const userRepo = { find: jest.fn(), findOne: jest.fn(), count: jest.fn() };
  const colonyRepo = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  };
  const logbookQuery: Record<string, jest.Mock> = {
    getRawAndEntities: jest.fn().mockResolvedValue({ entities: [], raw: [] }),
  };
  for (const method of ['createQueryBuilder', 'innerJoinAndSelect', 'leftJoinAndSelect', 'where', 'orderBy', 'addOrderBy', 'innerJoin', 'addSelect', 'andWhere']) {
    logbookQuery[method] = jest.fn(() => logbookQuery);
  }
  const shipRepo = {
    count: jest.fn(),
    manager: { getRepository: jest.fn(() => logbookQuery) },
  };
  const researchRepo = { count: jest.fn(), createQueryBuilder: jest.fn() };
  const factionService = { findAll: jest.fn() };
  const gameData = { getAllCommodities: jest.fn() };
  const gameGateway = { onlineUserIds: [] as number[] };
  const prestigeHistoryRepo = { find: jest.fn() };
  const allianceService = {
    getRef: jest.fn().mockResolvedValue(null),
    getMemberIds: jest.fn().mockResolvedValue([]),
  };
  const contacts = { incomingFriendIds: jest.fn().mockResolvedValue([]) };
  const settingsReader = { getManyBoolean: jest.fn(async (ids: number[]) => new Map(ids.map(id => [id, true]))), getSettings: jest.fn().mockResolvedValue({ rpg_behavior: '0' }) };
  const rpgPlotService = { membershipsForUser: jest.fn().mockResolvedValue([]) };
  const userAwardRepo = { find: jest.fn().mockResolvedValue([]) };
  const profileVisitorService = { registerVisit: jest.fn() };
  const colonyScanProjection = {
    newestAccessibleForColonies: jest.fn().mockResolvedValue([]),
  };
  const service = new DatabaseService(
    userRepo as any,
    colonyRepo as any,
    shipRepo as any,
    researchRepo as any,
    {} as any,
    {} as any,
    {} as any,
    prestigeHistoryRepo as any,
    {} as any,
    {} as any,
    factionService as any,
    gameData as any,
    gameGateway as any,
    {} as any,
    allianceService as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    userAwardRepo as any,
    colonyScanProjection as any,
    {} as any,
    {} as never,
    {} as never,
    {} as never,
    profileVisitorService as never,
    {} as never,
    [],
    contacts as never,
    settingsReader as never,
    rpgPlotService as never,
  );
  return {
    service,
    userRepo,
    colonyRepo,
    shipRepo,
    researchRepo,
    factionService,
    settingsReader,
    rpgPlotService,
    prestigeHistoryRepo,
    allianceService,
    contacts,
    profileVisitorService,
  };
}

function rankingBuilder(result: unknown[]) {
  const builder = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(result),
  };
  return builder;
}

describe('DatabaseService rankings', () => {
  it('returns deterministic public colony worth rankings without private intel', async () => {
    const { service, userRepo, colonyRepo, researchRepo } = createService();
    const research = rankingBuilder([{ userId: 1, username: 'A', score: '2' }]);
    const colonyCount = rankingBuilder([
      { userId: 2, username: 'B', score: '3' },
    ]);
    const colonyWorth = rankingBuilder([
      {
        colonyId: 10,
        colonyName: 'Alpha',
        userId: 1,
        username: 'A',
        score: '4',
      },
    ]);
    const colonyProductionWorth = rankingBuilder([
      {
        colonyId: 11,
        colonyName: 'Beta',
        userId: 2,
        username: 'B',
        score: '2',
      },
    ]);
    researchRepo.createQueryBuilder.mockReturnValue(research);
    colonyRepo.createQueryBuilder
      .mockReturnValueOnce(colonyCount)
      .mockReturnValueOnce(colonyWorth)
      .mockReturnValueOnce(colonyProductionWorth);
    userRepo.find.mockResolvedValue([{ id: 3, username: 'C', prestige: 9 }]);

    const result = await service.getRankings();

    expect(result).toEqual({
      satisfiedWorkers: [],
      research: [{ userId: 1, username: 'A', score: '2' }],
      prestige: [{ userId: 3, username: 'C', score: 9 }],
      colonies: [{ userId: 2, username: 'B', score: '3' }],
      colonyWorth: [
        {
          colonyId: 10,
          colonyName: 'Alpha',
          userId: 1,
          username: 'A',
          score: '4',
        },
      ],
      colonyProductionWorth: [
        {
          colonyId: 11,
          colonyName: 'Beta',
          userId: 2,
          username: 'B',
          score: '2',
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('storage');
    expect(JSON.stringify(result)).not.toContain('shield');
    expect(JSON.stringify(result)).not.toContain('torpedo');

    expect(research.where).toHaveBeenCalledWith('research.status = :status', {
      status: ResearchStatus.COMPLETED,
    });
    expect(colonyWorth.orderBy).toHaveBeenCalledWith('score', 'DESC');
    expect(colonyWorth.addOrderBy).toHaveBeenCalledWith('colony.name', 'ASC');
    expect(colonyProductionWorth.orderBy).toHaveBeenCalledWith('score', 'DESC');
    expect(colonyProductionWorth.addOrderBy).toHaveBeenCalledWith(
      'colony.name',
      'ASC',
    );
  });
});


  it('excludes NPC accounts from the online list', async () => {
    const { service, userRepo, factionService } = createService();
    userRepo.find.mockResolvedValue([{ id: 1, username: 'Leia', isNpc: false, factionId: null }]);
    factionService.findAll.mockResolvedValue([]);
    const onlineIds = (service as any).gameGateway.onlineUserIds as number[];
    onlineIds.push(1, 9);

    await service.getOnlinePlayers();

    expect(userRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isNpc: false }) }),
    );
  });

  it('separates NPCs and administrators without exposing private fields', async () => {
    const { service, userRepo, factionService } = createService();
    userRepo.find.mockResolvedValue([
      {
        id: 9,
        username: 'Hutten-Kartell',
        displayName: 'Hutten-Kartell',
        avatar: 'npc.png',
        faction: null,
        factionId: null,
        isNpc: true,
        isAdmin: false,
        email: 'private@example.test',
      },
      {
        id: 2,
        username: 'admin',
        displayName: null,
        avatar: null,
        faction: 'EMPIRE',
        factionId: 4,
        isNpc: false,
        isAdmin: true,
        passwordHash: 'secret',
      },
    ]);
    factionService.findAll.mockResolvedValue([{ id: 4, name: 'Galaktisches Imperium' }]);

    const result = await service.getNpcsAndAdmins();

    expect(result).toEqual({
      npcs: [
        {
          id: 9,
          username: 'Hutten-Kartell',
          displayName: 'Hutten-Kartell',
          avatar: 'npc.png',
          faction: null,
          factionName: null,
        },
      ],
      administrators: [
        {
          id: 2,
          username: 'admin',
          displayName: null,
          avatar: null,
          faction: 'EMPIRE',
          factionName: 'Galaktisches Imperium',
        },
      ],
    });
    expect(userRepo.find).toHaveBeenCalledWith({
      where: [{ isNpc: true }, { isAdmin: true }],
      order: { username: 'ASC' },
    });
    expect(JSON.stringify(result)).not.toContain('private@example.test');
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('adds the central non-NPC predicate to query-backed rankings', async () => {
    const { service, userRepo, colonyRepo, researchRepo } = createService();
    const research = rankingBuilder([]);
    const colonies = rankingBuilder([]);
    const worth = rankingBuilder([]);
    const production = rankingBuilder([]);
    researchRepo.createQueryBuilder.mockReturnValue(research);
    colonyRepo.createQueryBuilder
      .mockReturnValueOnce(colonies)
      .mockReturnValueOnce(worth)
      .mockReturnValueOnce(production);
    userRepo.find.mockResolvedValue([]);

    await service.getRankings();

    for (const query of [research, colonies, worth, production]) {
      expect(query.andWhere).toHaveBeenCalledWith('user.isNpc = false');
    }
    expect(userRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isNpc: false } }),
    );
  });

describe('DatabaseService settlers', () => {
  it('returns a sorted, capped union of alliance members and inbound friends without private data', async () => {
    const { service, userRepo, colonyRepo, shipRepo, researchRepo, factionService, allianceService, contacts } = createService();
    userRepo.findOne.mockResolvedValue({ id: 10, username: 'owner', factionId: null, createdAt: new Date() });
    factionService.findAll.mockResolvedValue([]);
    colonyRepo.count.mockResolvedValue(0);
    shipRepo.count.mockResolvedValue(0);
    researchRepo.count.mockResolvedValue(0);
    allianceService.getMemberIds.mockResolvedValue([10, 52, 5, 2]);
    contacts.incomingFriendIds.mockResolvedValue([5, 3, ...Array.from({ length: 48 }, (_, i) => i + 11)]);
    userRepo.find.mockImplementation(async ({ where }: { where: { id: FindOperator<number> } }) =>
      (where.id.value as unknown as number[]).map((id: number) => ({ id, username: `login${id}`, displayName: id === 2 ? 'Leia' : null, avatar: id === 2 ? '/leia.png' : null, email: 'private', passwordHash: 'secret' })).reverse(),
    );

    const result = await service.getSettler(99, 10);

    expect(result.friends).toHaveLength(50);
    expect(result.friends.slice(0, 3)).toEqual([
      { id: 2, name: 'Leia', avatar: '/leia.png' },
      { id: 3, name: 'login3', avatar: null },
      { id: 5, name: 'login5', avatar: null },
    ]);
    expect(result.friends.at(-1)).toEqual({ id: 57, name: 'login57', avatar: null });
    expect(result.friends.map((friend) => friend.id)).not.toContain(10);
    expect(JSON.stringify(result.friends)).not.toMatch(/private|secret|email|password/);
    expect(allianceService.getMemberIds).toHaveBeenCalledWith(10);
    expect(contacts.incomingFriendIds).toHaveBeenCalledWith(10, 51);
  });

  it('returns RPG behavior and every target-player plot membership, active first', async () => {
    const { service, userRepo, colonyRepo, shipRepo, researchRepo, factionService, settingsReader, rpgPlotService } = createService();
    const active = { id: 11, title: 'Active plot', endedAt: null };
    const ended = { id: 12, title: 'Ended plot', endedAt: new Date('2026-10-01') };
    settingsReader.getSettings.mockResolvedValue({ rpg_behavior: '2' });
    rpgPlotService.membershipsForUser.mockResolvedValue([active, ended]);
    userRepo.findOne.mockResolvedValue({
      id: 9, username: 'leia', factionId: null, createdAt: new Date(),
      rpgBehavior: 2,
    });
    userRepo.find.mockResolvedValue([]);
    factionService.findAll.mockResolvedValue([]);
    colonyRepo.count.mockResolvedValue(0);
    shipRepo.count.mockResolvedValue(0);
    researchRepo.count.mockResolvedValue(0);

    const result = await service.getSettler(1, 9);

    expect(result.rpgBehavior).toBe(2);
    expect(result.plots).toEqual([active, ended]);
    expect(rpgPlotService.membershipsForUser).toHaveBeenCalledWith(9);
  });

  it('returns a single settler profile with public counts', async () => {
    const {
      service,
      userRepo,
      colonyRepo,
      shipRepo,
      researchRepo,
      factionService,
    } = createService();
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    userRepo.findOne.mockResolvedValue({
      id: 1,
      username: 'vader',
      displayName: 'Vader',
      avatar: '/vader.png',
      description: '[b]Böse[/b]',
      factionId: 10,
      faction: 'IMPERIUM',
      prestige: 10,
      onboardingCompleted: true,
      isAdmin: false,
      createdAt,
      passwordHash: 'secret',
      refreshToken: 'token',
      email: 'vader@example.test',
      notes: 'private',
      vacationMode: true,
      vacationStartedAt: new Date(Date.now() - 48 * 60 * 60 * 1000 - 1),
    });
    factionService.findAll.mockResolvedValue([{ id: 10, name: 'Imperium' }]);
    colonyRepo.count.mockResolvedValue(1);
    shipRepo.count.mockResolvedValue(2);
    researchRepo.count.mockResolvedValue(3);

    const result = await service.getSettler(1, 1);

    expect(result).toEqual({
      id: 1,
      username: 'vader',
      displayName: 'Vader',
      avatar: '/vader.png',
      description: '[b]Böse[/b]',
      faction: 'IMPERIUM',
      factionName: 'Imperium',
      prestige: 10,
      colonies: 1,
      ships: 2,
      completedResearch: 3,
      onboardingCompleted: true,
      isAdmin: false,
      createdAt,
      onVacation: true,
      alliance: null,
      friends: [],
      awards: [],
      rpgBehavior: 0,
      plots: [],
      logbooks: [],
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(JSON.stringify(result)).not.toContain('refreshToken');
    expect(JSON.stringify(result)).not.toContain('email');
    expect(JSON.stringify(result)).not.toContain('notes');
  });

  it('registers the authenticated viewer when requesting a foreign profile', async () => {
    const {
      service,
      userRepo,
      colonyRepo,
      shipRepo,
      researchRepo,
      factionService,
      profileVisitorService,
    } = createService();
    userRepo.findOne.mockResolvedValue({
      id: 9,
      username: 'leia',
      displayName: null,
      avatar: null,
      description: null,
      factionId: null,
      faction: 'REBEL_ALLIANCE',
      prestige: 0,
      onboardingCompleted: true,
      isAdmin: false,
      createdAt: new Date('2026-01-02T03:04:05.000Z'),
      vacationMode: false,
    });
    factionService.findAll.mockResolvedValue([]);
    colonyRepo.count.mockResolvedValue(0);
    shipRepo.count.mockResolvedValue(0);
    researchRepo.count.mockResolvedValue(0);

    await service.getSettler(4, 9);

    expect(profileVisitorService.registerVisit).toHaveBeenCalledWith(4, 9);
  });

  it('includes the settler’s alliance reference', async () => {
    const { service, userRepo, colonyRepo, shipRepo, researchRepo, factionService, allianceService } =
      createService();
    const alliance = { id: 3, name: 'Black Squadron', color: null };
    userRepo.findOne.mockResolvedValue({ id: 1, username: 'vader', factionId: null, createdAt: new Date() });
    factionService.findAll.mockResolvedValue([]);
    colonyRepo.count.mockResolvedValue(0);
    shipRepo.count.mockResolvedValue(0);
    researchRepo.count.mockResolvedValue(0);
    allianceService.getRef.mockResolvedValue(alliance);

    await expect(service.getSettler(1, 1)).resolves.toMatchObject({ alliance });
    expect(allianceService.getRef).toHaveBeenCalledWith(1);
  });

  it('throws NotFoundException for missing settler profile', async () => {
    const { service, userRepo, factionService } = createService();
    userRepo.findOne.mockResolvedValue(null);
    factionService.findAll.mockResolvedValue([]);

    await expect(service.getSettler(1, 404)).rejects.toThrow(NotFoundException);
  });
});


it('excludes opted-out accounts from the public online list', async () => {
  const { service, userRepo } = createService();
  (service as unknown as { gameGateway: { onlineUserIds: number[] } }).gameGateway.onlineUserIds.push(1, 2);
  userRepo.find.mockResolvedValue([{ id: 1, username: 'Leia' }, { id: 2, username: 'Han' }]);
  const reader = (service as unknown as { settingsReader: { getManyBoolean: jest.Mock } }).settingsReader;
  reader.getManyBoolean.mockResolvedValue(new Map([[1, true], [2, false]]));
  expect(await service.getOnlinePlayers()).toEqual([expect.objectContaining({ id: 1 })]);
});


it('returns only public name representations for the shared renderer', async () => {
  const { service, userRepo } = createService();
  userRepo.find.mockResolvedValue([{ id: 1, username: 'login', displayName: 'Leia', displayNameMarkup: '[b]Leia[/b]', email: 'private@example.test', passwordHash: 'secret' }]);
  expect(await service.getPlayerNames()).toEqual([{ id: 1, username: 'login', displayName: 'Leia', displayNameMarkup: '[b]Leia[/b]' }]);
});

describe('DatabaseService hull catalogue', () => {
  const definition = {
    id: 12, key: 'rebel_corvette', name: 'Korvette', isNpc: false, factionId: 1,
    category: 'CORVETTE', role: 'ESCORT', flightEnergyCost: 2, cargoCapacity: 150,
    sensorRangeBase: 3, torpedoStorageBase: 8, crewMin: 4, crewMax: 12, epsBase: 120,
    hullBase: 900, shieldBase: 400, buildTimeTicks: 3600,
  };
  function hullService(overrides: { discovered?: boolean; isStation?: boolean } = {}) {
    const gameData = {
      getShipClassDefByKey: jest.fn(() => ({
        stuRumpId: 7,
        buildCosts: [{ commodityId: 21, amount: 50 }],
        station: { requiredWorkbees: 3 },
      })),
      getShipyardRumpStats: jest.fn(() => ({ moduleLevel: 2, epsCost: 80 })),
      getShipyardRumpModuleRules: jest.fn(() => ({
        moduleRules: {
          HULL: { level: 2, mandatory: 1, min: 1, max: 3 },
          TORPEDO_BANK: { level: 0, mandatory: 0, min: 0, max: 0 },
          ENERGY_WEAPON: { level: 2, mandatory: 0, min: 2, max: 4 },
        },
      })),
      getCommodity: jest.fn(() => ({ name: 'Durastahl' })),
    };
    const service = Object.assign(Object.create(DatabaseService.prototype), {
      shipClassRepo: { findOne: jest.fn(async () => definition) },
      shipClassDiscoveryRepo: { exists: jest.fn(async () => overrides.discovered ?? true) },
      stationClassDiscoveryRepo: { exists: jest.fn(async () => overrides.discovered ?? true) },
      shipRepo: { exists: jest.fn(async () => overrides.isStation ?? true) },
      factionService: { findById: jest.fn(async () => ({ name: 'Rebellen' })) },
      gameData,
    }) as DatabaseService;
    return service;
  }

  it('returns a typed ship hull detail with modules, costs and build time', async () => {
    const detail = await hullService().getShipClassDetail(1, 'rebel_corvette');

    expect(detail).toEqual({
      id: 12, key: 'rebel_corvette', kind: 'SHIP', name: 'Korvette', factionName: 'Rebellen',
      category: 'CORVETTE', role: 'ESCORT', moduleLevel: 2,
      modules: [
        { type: 'HULL', minLevel: 1, maxLevel: 3, mandatory: true },
        { type: 'ENERGY_WEAPON', minLevel: 2, maxLevel: 4, mandatory: false },
      ],
      flightEnergyCost: 2, cargoCapacity: 150, sensorRange: 3, torpedoCapacity: 8,
      crewMin: 4, crewMax: 12, epsCapacity: 120, hull: 900, shield: 400,
      requiredWorkbees: null, buildEnergyCost: 80,
      buildCosts: [{ commodityId: 21, commodityName: 'Durastahl', amount: 50 }],
      buildTimeSeconds: 3600,
    });
  });

  it('adds the required workbees for station hulls', async () => {
    const detail = await hullService().getStationClassDetail(1, 'rebel_corvette');

    expect(detail).toMatchObject({ kind: 'STATION', requiredWorkbees: 3 });
  });

  it('hides undiscovered hulls and non-station classes', async () => {
    await expect(hullService({ discovered: false }).getShipClassDetail(1, 'rebel_corvette')).rejects.toThrow(NotFoundException);
    await expect(hullService({ discovered: false }).getStationClassDetail(1, 'rebel_corvette')).rejects.toThrow(NotFoundException);
    await expect(hullService({ isStation: false }).getStationClassDetail(1, 'rebel_corvette')).rejects.toThrow(NotFoundException);
  });

  it('hides NPC hulls', async () => {
    const service = hullService();
    (service as unknown as { shipClassRepo: { findOne: jest.Mock } }).shipClassRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.getShipClassDetail(1, 'npc_pirate')).rejects.toThrow(NotFoundException);
    expect((service as unknown as { shipClassRepo: { findOne: jest.Mock } }).shipClassRepo.findOne)
      .toHaveBeenCalledWith({ where: { key: 'npc_pirate', isNpc: false } });
  });
});
