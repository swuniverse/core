import { PlayerDeletionService } from './player-deletion.service';
import type { PlayerDeletionHandler } from './player-deletion-handler';

function setup(user: { id: number } | null, handlers: PlayerDeletionHandler[] = []) {
  const userRepo = {
    findOne: jest.fn(async () => user),
    delete: jest.fn(async () => undefined),
  };
  const manager = { getRepository: jest.fn(() => userRepo) };
  const dataSource = { transaction: jest.fn(async (work) => work(manager)) };
  return { service: new PlayerDeletionService(dataSource as never, handlers), userRepo, manager };
}

describe('PlayerDeletionService', () => {
  it('runs handlers in order and deletes the user in one transaction', async () => {
    const calls: number[] = [];
    const handlers = [20, 10].map((order) => ({
      order,
      delete: jest.fn(async () => {
        calls.push(order);
      }),
    }));
    const { service, userRepo, manager } = setup({ id: 7 }, handlers);

    await service.delete(7);

    expect(calls).toEqual([10, 20]);
    expect(handlers[0].delete).toHaveBeenCalledWith(manager, 7);
    expect(userRepo.delete).toHaveBeenCalledWith(7);
  });

  it('is a no-op for an unknown user', async () => {
    const handler = { order: 1, delete: jest.fn() };
    const { service, userRepo } = setup(null, [handler]);

    await service.delete(404);

    expect(handler.delete).not.toHaveBeenCalled();
    expect(userRepo.delete).not.toHaveBeenCalled();
  });
});
