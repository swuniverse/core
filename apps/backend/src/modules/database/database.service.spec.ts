jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
}));
jest.mock('../research/entities/research.entity', () => ({
  Research: class Research {},
  ResearchStatus: { COMPLETED: 'COMPLETED' },
}));
jest.mock('../faction/faction.service', () => ({
  FactionService: class FactionService {},
}));

import { NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ResearchStatus } from '../research/entities/research.entity';

function createService() {
  const userRepo = { find: jest.fn(), findOne: jest.fn(), count: jest.fn() };
  const colonyRepo = { count: jest.fn(), createQueryBuilder: jest.fn() };
  const shipRepo = { count: jest.fn() };
  const researchRepo = { count: jest.fn(), createQueryBuilder: jest.fn() };
  const factionService = { findAll: jest.fn() };
  const gameData = { getAllCommodities: jest.fn() };
  const gameGateway = { onlineUserIds: [] as number[] };
  const service = new DatabaseService(
    userRepo as any,
    colonyRepo as any,
    shipRepo as any,
    researchRepo as any,
    factionService as any,
    gameData as any,
    gameGateway as any,
  );
  return {
    service,
    userRepo,
    colonyRepo,
    shipRepo,
    researchRepo,
    factionService,
  };
}

function rankingBuilder(result: unknown[]) {
  const builder = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
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

describe('DatabaseService settlers', () => {
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
    });
    factionService.findAll.mockResolvedValue([{ id: 10, name: 'Imperium' }]);
    colonyRepo.count.mockResolvedValue(1);
    shipRepo.count.mockResolvedValue(2);
    researchRepo.count.mockResolvedValue(3);

    const result = await service.getSettler(1);

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
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(JSON.stringify(result)).not.toContain('refreshToken');
    expect(JSON.stringify(result)).not.toContain('email');
    expect(JSON.stringify(result)).not.toContain('notes');
  });

  it('throws NotFoundException for missing settler profile', async () => {
    const { service, userRepo, factionService } = createService();
    userRepo.findOne.mockResolvedValue(null);
    factionService.findAll.mockResolvedValue([]);

    await expect(service.getSettler(404)).rejects.toThrow(NotFoundException);
  });
});
