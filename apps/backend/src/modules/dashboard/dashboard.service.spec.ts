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
      find: jest.fn(async () => [{ id: 9, name: 'Alpha' }]),
    };
    const messageRepo = {
      count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1),
    };
    const researchRepo = {
      findOne: jest.fn(async () => ({
        techId: 7,
        progress: 40,
        remainingPoints: 60,
        blockedReason: null,
      })),
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
      { getTech: jest.fn(() => ({ name: 'Hyperraumtheorie' })) } as never,
    );

    await expect(service.getHeader(4)).resolves.toMatchObject({
      user: { name: 'Nuriud', prestige: 385 },
      notifications: { messages: 3, system: 1 },
      research: {
        name: 'Hyperraumtheorie',
        progress: 40,
        pointsRequired: 100,
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
});
