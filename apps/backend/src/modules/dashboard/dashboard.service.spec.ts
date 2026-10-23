jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: { IN_FLIGHT: 'IN_FLIGHT' },
}));
jest.mock('../holonet/entities/holonet-post.entity', () => ({
  HolonetPost: class HolonetPost {},
}));
jest.mock('../messaging/entities/message.entity', () => ({
  Message: class Message {},
}));
jest.mock('../research/entities/research.entity', () => ({
  Research: class Research {},
  ResearchStatus: { IN_PROGRESS: 'IN_PROGRESS' },
}));

jest.mock('../alliance/alliance.service', () => ({
  AllianceService: class AllianceService {},
}));

jest.mock('../alliance/forum.service', () => ({
  ForumService: class ForumService {},
}));

import { DashboardService } from './dashboard.service';

describe('DashboardService header', () => {
  it('separates personal and system messages in one compact response', async () => {
    const userRepo = {
      findOneByOrFail: jest.fn(async () => ({
        id: 4,
        username: 'nuriud',
        displayName: 'Nuriud',
        faction: 'REBEL_ALLIANCE',
        prestige: 385,
        avatar: null,
      })),
    };
    const colonyRepo = {
      find: jest.fn(async () => [
        {
          id: 9,
          name: 'Alpha',
          fields: [{ id: 1, buildingId: 12, isBuilding: false, isActive: true }],
        },
      ]),
    };
    const messageRepo = {
      count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1),
    };
    const researchRepo = {
      findOne: jest.fn(async (options: { where: { status: string } }) =>
        options.where.status === 'IN_PROGRESS'
          ? {
              techId: 7,
              progress: 40,
              remainingPoints: 60,
              blockedReason: null,
            }
          : { techId: 8, queuePosition: 1 },
      ),
    };
    const service = new DashboardService(
      userRepo as never,
      colonyRepo as never,
      {} as never,
      {} as never,
      {} as never,
      messageRepo as never,
      researchRepo as never,
      {} as never,
      {
        getTech: jest.fn((id: number) =>
          id === 7
            ? { name: 'Hyperraumtheorie', mappedCommodityId: 4 }
            : { name: 'Sprungnavigation' },
        ),
      } as never,
      { getRef: jest.fn(async () => null) } as never,
      {} as never,
      {
        calculateSummary: jest.fn(() => ({
          productionDelta: new Map([[4, 6]]),
        })),
      } as never,
    );

    await expect(service.getHeader(4)).resolves.toMatchObject({
      user: { name: 'Nuriud', prestige: 385 },
      alliance: null,
      notifications: { messages: 3, system: 1 },
      research: {
        techId: 7,
        imageId: 7,
        name: 'Hyperraumtheorie',
        commodityId: 4,
        progress: 40,
        pointsRequired: 100,
        productionPerTick: 6,
        queuedCount: 1,
        nextQueuedName: 'Sprungnavigation',
      },
      colonies: [{ id: 9, name: 'Alpha' }],
    });
    expect(messageRepo.count).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ isSystem: false }),
      }),
    );
    expect(messageRepo.count).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ isSystem: true }),
      }),
    );
  });

  it('includes the player’s alliance reference', async () => {
    const alliance = { id: 3, name: 'Rogue Squadron', color: '#ff0000' };
    const allianceService = { getRef: jest.fn(async () => alliance) };
    const service = new DashboardService(
      {
        findOneByOrFail: jest.fn(async () => ({
          id: 4,
          username: 'nuriud',
          displayName: null,
          faction: 'REBEL_ALLIANCE',
          prestige: 0,
          avatar: null,
        })),
      } as never,
      { find: jest.fn(async () => []) } as never,
      {} as never,
      {} as never,
      {} as never,
      { count: jest.fn(async () => 0) } as never,
      { findOne: jest.fn(async () => null) } as never,
      {} as never,
      { getTech: jest.fn() } as never,
      allianceService as never,
      {} as never,
      {} as never,
    );

    await expect(service.getHeader(4)).resolves.toMatchObject({ alliance });
    expect(allianceService.getRef).toHaveBeenCalledWith(4);
  });
});

describe('DashboardService forum topics', () => {
  it('delegates to the forum service for the requesting player', async () => {
    const topics = [
      {
        topicId: 7,
        title: 'Plan',
        boardId: 2,
        boardName: 'Allgemein',
        allianceId: 1,
        lastActivityAt: '2026-10-09T10:00:00.000Z',
        linkTo: '/alliances/1/forum/topics/7',
      },
    ];
    const forum = { listRecentTopics: jest.fn(async () => topics) };
    const service = new DashboardService(
      ...(Array(10).fill({}) as [never, never, never, never, never, never, never, never, never, never]),
      forum as never,
      {} as never,
    );
    await expect(service.getForumTopics(4)).resolves.toEqual(topics);
    expect(forum.listRecentTopics).toHaveBeenCalledWith(4);
  });
});
