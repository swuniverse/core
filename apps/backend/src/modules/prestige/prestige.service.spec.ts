jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('./entities/prestige-history-entry.entity', () => ({
  PrestigeHistoryEntry: class PrestigeHistoryEntry {},
}));

import { PrestigeService } from './prestige.service';

describe('PrestigeService', () => {
  it('records the change and updates the total with the same manager', async () => {
    const entry = { userId: 7, amount: 5, description: 'Entdeckung' };
    const repository = {
      create: jest.fn().mockReturnValue(entry),
      save: jest.fn().mockResolvedValue(entry),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(repository),
      increment: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PrestigeService({ manager } as never);

    await service.change(7, 5, 'Entdeckung', manager as never);

    expect(repository.save).toHaveBeenCalledWith(entry);
    expect(manager.increment).toHaveBeenCalledWith(
      expect.anything(),
      { id: 7 },
      'prestige',
      5,
    );
  });
});
