import type { EntityManager, Repository } from 'typeorm';
import { AwardService } from './award.service';
import { Award } from './entities/award.entity';
import { UserAward } from './entities/user-award.entity';

function createService() {
  const award = {
    key: 'LOTTERY_WINNER',
    description: 'Gewinner der Hutten-Lotterie',
    image: '/favicon.ico',
    prestige: 5,
    isNpc: false,
  } as Award;
  let userAward: UserAward | null = null;
  const manager = {
    transaction: jest.fn(async (work) => work(manager)),
    getRepository: jest.fn((entity) => {
      if (entity === Award)
        return { findOneBy: jest.fn().mockResolvedValue(award) };
      if (entity === UserAward) {
        return {
          createQueryBuilder: jest.fn(() => ({
            insert: jest.fn().mockReturnThis(),
            into: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            orIgnore: jest.fn().mockReturnThis(),
            returning: jest.fn().mockReturnThis(),
            execute: jest.fn(async () => {
              if (userAward) return { identifiers: [], raw: [] };
              userAward = {
                id: 1,
                userId: 7,
                awardKey: award.key,
                count: 1,
              } as UserAward;
              return { identifiers: [{ id: 1 }], raw: [{ id: 1 }] };
            }),
          })),
          findOneBy: jest.fn(async () => userAward),
          increment: jest.fn(async (_where, _field, by) => {
            if (userAward) userAward.count += by;
          }),
        };
      }
      throw new Error('Unexpected repository');
    }),
  } as unknown as EntityManager;
  const repo = { manager } as Repository<UserAward>;
  const prestige = { change: jest.fn() };
  const messaging = { sendSystem: jest.fn() };
  return {
    service: new AwardService(repo, prestige as never, messaging as never),
    prestige,
    messaging,
    getUserAward: () => userAward,
  };
}

describe('AwardService', () => {
  it('grants once and books prestige with the STU text', async () => {
    const { service, prestige, messaging, getUserAward } = createService();

    expect(await service.grant(7, 'LOTTERY_WINNER')).toEqual({
      granted: true,
      count: 1,
    });
    expect(getUserAward()?.count).toBe(1);
    expect(prestige.change).toHaveBeenCalledWith(
      7,
      5,
      '5 Prestige erhalten für den Erhalt des Awards "Gewinner der Hutten-Lotterie"',
      expect.anything(),
    );
    expect(messaging.sendSystem).toHaveBeenCalledWith(
      7,
      'Award erhalten',
      'Du hast den Award Gewinner der Hutten-Lotterie erhalten',
      'award:LOTTERY_WINNER:7',
    );
  });

  it('is idempotent unless incrementExisting is requested', async () => {
    const { service, prestige, getUserAward } = createService();
    await service.grant(7, 'LOTTERY_WINNER');
    prestige.change.mockClear();

    expect(await service.grant(7, 'LOTTERY_WINNER')).toEqual({
      granted: false,
      count: 1,
    });
    expect(prestige.change).not.toHaveBeenCalled();

    expect(
      await service.grant(7, 'LOTTERY_WINNER', { incrementExisting: true }),
    ).toEqual({ granted: true, count: 2 });
    expect(getUserAward()?.count).toBe(2);
    expect(prestige.change).toHaveBeenCalledTimes(1);
  });

  it('concurrent grants rely on the unique insert and award only once', async () => {
    const { service, prestige, getUserAward } = createService();

    await Promise.all([
      service.grant(7, 'LOTTERY_WINNER'),
      service.grant(7, 'LOTTERY_WINNER'),
    ]);

    expect(getUserAward()?.count).toBe(1);
    expect(prestige.change).toHaveBeenCalledTimes(1);
  });
});
