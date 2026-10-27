import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContactMode } from '@swuniverse/shared';
import type { Repository } from 'typeorm';
import type { User } from '../auth/user.entity';
import type { MessagingService } from '../messaging/messaging.service';
import type { Contact } from './entities/contact.entity';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  const owner = { id: 1, username: 'Leia' } as User;
  const target = { id: 2, username: 'Han' } as User;
  let contacts: Map<number, Contact>;
  let users: Repository<User>;
  let repository: Repository<Contact>;
  let messaging: Pick<MessagingService, 'sendSystem'>;
  let service: ContactService;

  beforeEach(() => {
    contacts = new Map();
    users = {
      findOneBy: jest.fn(async ({ id }: { id: number }) =>
        id === owner.id ? owner : id === target.id ? target : null,
      ),
    } as unknown as Repository<User>;
    repository = {
      findOne: jest.fn(async ({ where }: { where: { id?: number; userId?: number; contactUserId?: number } }) => {
        return [...contacts.values()].find((contact) =>
          where.id !== undefined
            ? contact.id === where.id
            : contact.userId === where.userId && contact.contactUserId === where.contactUserId,
        ) ?? null;
      }),
      find: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        [...contacts.values()].filter((contact) =>
          Object.entries(where).every(([key, value]) => {
            if (key === 'id' && typeof value === 'object') {
              return (value as { _value: number[] })._value.includes(contact.id);
            }
            return contact[key as keyof Contact] === value;
          }),
        ),
      ),
      create: jest.fn((value: Partial<Contact>) => ({ id: contacts.size + 1, comment: '', createdAt: new Date('2026-10-27T12:00:00Z'), ...value } as Contact)),
      save: jest.fn(async (contact: Contact) => {
        contacts.set(contact.id, contact);
        return contact;
      }),
      remove: jest.fn(async (value: Contact | Contact[]) => {
        for (const contact of Array.isArray(value) ? value : [value]) contacts.delete(contact.id);
        return value;
      }),
      delete: jest.fn(async ({ userId }: { userId: number }) => {
        for (const contact of contacts.values()) if (contact.userId === userId) contacts.delete(contact.id);
        return { affected: 1, raw: [] };
      }),
    } as unknown as Repository<Contact>;
    messaging = { sendSystem: jest.fn(async () => ({} as never)) };
    service = new ContactService(repository, users, messaging as MessagingService);
  });

  it('creates and lists a directed contact and notifies the recipient', async () => {
    const created = await service.create(owner.id, { playerId: target.id, mode: ContactMode.FRIEND });

    expect(created).toMatchObject({ userId: owner.id, contactUserId: target.id, contactUsername: 'Han', mode: ContactMode.FRIEND, comment: '' });
    expect(await service.list(owner.id)).toEqual([created]);
    expect(messaging.sendSystem).toHaveBeenCalledWith(target.id, 'Kontaktstatus geändert', 'Der Siedler betrachtet Dich von nun an als Freund');
  });

  it.each([
    ['unknown player', 99, NotFoundException, 'Dieser Spieler existiert nicht'],
    ['own account', owner.id, BadRequestException, 'Du kannst Dich nicht selbst auf die Kontaktliste setzen'],
  ])('rejects %s', async (_case, playerId, errorType, message) => {
    await expect(service.create(owner.id, { playerId, mode: ContactMode.FRIEND })).rejects.toMatchObject({ constructor: errorType, message });
  });

  it('rejects a duplicate contact', async () => {
    await service.create(owner.id, { playerId: target.id, mode: ContactMode.NEUTRAL });
    await expect(service.create(owner.id, { playerId: target.id, mode: ContactMode.FRIEND })).rejects.toThrow('Dieser Spieler befindet sich bereits auf Deiner Kontaktliste');
  });

  it('changes mode, edits comments, and validates both', async () => {
    const created = await service.create(owner.id, { playerId: target.id, mode: ContactMode.NEUTRAL });
    await service.updateMode(owner.id, created.id, ContactMode.ENEMY);
    expect(messaging.sendSystem).toHaveBeenLastCalledWith(target.id, 'Kontaktstatus geändert', 'Der Siedler betrachtet Dich von nun an als Feind');
    expect((await service.updateComment(owner.id, created.id, ' smuggler ')).comment).toBe('smuggler');
    await expect(service.updateComment(owner.id, created.id, 'x'.repeat(256))).rejects.toThrow('Der Kommentar darf höchstens 255 Zeichen lang sein');
    await expect(service.updateMode(owner.id, created.id, 'ALLY' as ContactMode)).rejects.toThrow('Ungültiger Kontaktmodus');
  });

  it('lists who marked the player and removes selected or all owned contacts', async () => {
    const received = repository.create({ userId: target.id, user: target, contactUserId: owner.id, contactUser: owner, mode: ContactMode.FRIEND });
    contacts.set(received.id, received);
    expect(await service.listReceived(owner.id)).toEqual([expect.objectContaining({ ownerId: target.id, ownerUsername: 'Han', mode: ContactMode.FRIEND })]);

    const owned = await service.create(owner.id, { playerId: target.id, mode: ContactMode.NEUTRAL });
    await service.removeSelected(owner.id, [owned.id, received.id]);
    expect(contacts.has(owned.id)).toBe(false);
    expect(contacts.has(received.id)).toBe(true);
    await service.create(owner.id, { playerId: target.id, mode: ContactMode.NEUTRAL });
    await service.removeAll(owner.id);
    expect([...contacts.values()].every((contact) => contact.userId !== owner.id)).toBe(true);
  });
});
