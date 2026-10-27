import { UserLockService } from './user-lock.service';

describe('UserLockService', () => {
  it('reduces active locks and deletes them at zero', async () => {
    const locks = [
      { id: 1, userId: 7, remainingTicks: 2, reason: 'a' },
      { id: 2, userId: 8, remainingTicks: 1, reason: 'b' },
    ];
    const repo = {
      find: jest.fn(async () => locks),
      save: jest.fn(async (lock) => lock),
      delete: jest.fn(async () => undefined),
    };
    const service = new UserLockService(repo as never);

    await service.reduceActiveLocks();

    expect(locks.map((lock) => lock.remainingTicks)).toEqual([1, 0]);
    expect(repo.save).toHaveBeenCalledWith(locks[0]);
    expect(repo.delete).toHaveBeenCalledWith(2);
  });
});
