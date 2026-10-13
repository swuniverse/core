import { GameStatusService } from './game-status.service';

describe('GameStatusService', () => {
  it('returns the standard maintenance message when no message was configured', async () => {
    const repository = {
      findOneBy: jest
        .fn()
        .mockResolvedValue({ id: 1, status: 'MAINTENANCE', message: '' }),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = new GameStatusService(repository as never);

    await expect(service.getPublicStatus()).resolves.toEqual({
      status: 'MAINTENANCE',
      message: 'Das Spiel befindet sich derzeit in Wartung.',
    });
  });
});
