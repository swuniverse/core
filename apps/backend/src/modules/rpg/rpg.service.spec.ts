import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RpgService } from './rpg.service';

describe('RpgService', () => {
  const repo = { find: jest.fn(), findOneBy: jest.fn(), countBy: jest.fn(), create: jest.fn((v) => v), save: jest.fn(), remove: jest.fn() };
  const users = { exist: jest.fn() };
  const service = new RpgService(repo as never, users as never);

  beforeEach(() => jest.clearAllMocks());

  it('creates and lists a validated character', async () => {
    users.exist.mockResolvedValue(true);
    repo.countBy.mockResolvedValue(0);
    repo.save.mockImplementation(async (value) => ({ id: 1, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), ...value }));
    const result = await service.create(7, { name: 'Leia', description: '[b]General[/b]', avatar: null });
    expect(result.name).toBe('Leia');
    expect(repo.save).toHaveBeenCalled();
  });

  it('rejects invalid avatars and too many characters', async () => {
    await expect(service.create(7, { name: 'Leia', description: '', avatar: 'data:text/plain;base64,QQ==' })).rejects.toBeInstanceOf(BadRequestException);
    repo.countBy.mockResolvedValue(20);
    await expect(service.create(7, { name: 'Leia', description: '', avatar: null })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forbids changing or deleting another player character', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, userId: 8 });
    await expect(service.update(7, 1, { name: 'X', description: '' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove(7, 1)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
