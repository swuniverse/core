import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { User } from '../auth/user.entity';
import type { IgnoreList } from './entities/ignore-list.entity';
import { IgnoreListService } from './ignore-list.service';

describe('IgnoreListService', () => {
  const owner = { id: 1, username: 'Leia' } as User;
  const target = { id: 2, username: 'Han' } as User;
  let entries: Map<number, IgnoreList>;
  let users: Repository<User>;
  let repository: Repository<IgnoreList>;
  let service: IgnoreListService;

  beforeEach(() => {
    entries = new Map();
    users = {
      findOneBy: jest.fn(async ({ id }: { id: number }) =>
        id === owner.id ? owner : id === target.id ? target : null,
      ),
    } as unknown as Repository<User>;
    repository = {
      findOne: jest.fn(async ({ where }: { where: Partial<IgnoreList> }) =>
        [...entries.values()].find((entry) =>
          Object.entries(where).every(([key, value]) => entry[key as keyof IgnoreList] === value),
        ) ?? null,
      ),
      find: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        [...entries.values()].filter((entry) =>
          Object.entries(where).every(([key, value]) => {
            if (key === 'id' && typeof value === 'object') {
              return (value as { _value: number[] })._value.includes(entry.id);
            }
            return entry[key as keyof IgnoreList] === value;
          }),
        ),
      ),
      create: jest.fn((value: Partial<IgnoreList>) => ({
        id: entries.size + 1,
        createdAt: new Date('2026-10-27T12:00:00Z'),
        ...value,
      }) as IgnoreList),
      save: jest.fn(async (entry: IgnoreList) => {
        entries.set(entry.id, entry);
        return entry;
      }),
      remove: jest.fn(async (value: IgnoreList[]) => {
        for (const entry of value) entries.delete(entry.id);
        return value;
      }),
      delete: jest.fn(async ({ ownerId }: { ownerId: number }) => {
        let affected = 0;
        for (const entry of [...entries.values()]) {
          if (entry.ownerId === ownerId) {
            entries.delete(entry.id);
            affected += 1;
          }
        }
        return { affected, raw: [] };
      }),
    } as unknown as Repository<IgnoreList>;
    service = new IgnoreListService(repository, users);
  });

  it('creates and lists an ignored player', async () => {
    const created = await service.create(owner.id, target.id);

    expect(created).toMatchObject({ ignoredUserId: target.id, ignoredUsername: 'Han' });
    expect(await service.list(owner.id)).toEqual([created]);
    await expect(service.isIgnored(owner.id, target.id)).resolves.toBe(true);
  });

  it.each([
    ['unknown player', 99, NotFoundException, 'Dieser Spieler existiert nicht'],
    ['own account', owner.id, BadRequestException, 'Du kannst Dich nicht selbst ignorieren'],
  ])('rejects %s', async (_case, playerId, errorType, message) => {
    await expect(service.create(owner.id, playerId)).rejects.toMatchObject({ constructor: errorType, message });
  });

  it('rejects a duplicate ignored player', async () => {
    await service.create(owner.id, target.id);
    await expect(service.create(owner.id, target.id)).rejects.toThrow(
      'Dieser Spieler befindet sich bereits auf Deiner Ignorierliste',
    );
  });

  it('lists who ignores the player and removes only owned entries', async () => {
    const received = repository.create({
      ownerId: target.id,
      owner: target,
      ignoredUserId: owner.id,
      ignoredUser: owner,
    });
    entries.set(received.id, received);
    expect(await service.listIgnoredBy(owner.id)).toEqual([
      expect.objectContaining({ ownerId: target.id, ownerUsername: 'Han' }),
    ]);

    const owned = await service.create(owner.id, target.id);
    await service.removeSelected(owner.id, [owned.id, received.id]);
    expect(entries.has(owned.id)).toBe(false);
    expect(entries.has(received.id)).toBe(true);
    await service.create(owner.id, target.id);
    await expect(service.removeAll(owner.id)).resolves.toEqual({ deleted: 1 });
  });
});
