import { User } from '../auth/user.entity';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { UserMessageFoldersService } from './user-message-folders.service';
import { Message } from './entities/message.entity';
import { MessageFolder } from './message-folder';
import { MessagingService } from './messaging.service';

describe('Custom message folders (PostgreSQL)', () => {
  let db: DataSource,
    service: UserMessageFoldersService,
    owner: number,
    other: number,
    message: Message;
  beforeAll(async () => {
    db = await connectIntegrationDatabase();
    service = new UserMessageFoldersService(db);
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => {
    await resetDatabase(db);
    owner = (await createUser(db)).id;
    other = (await createUser(db)).id;
    message = await db
      .getRepository(Message)
      .save({
        senderId: other,
        recipientId: owner,
        body: 'Test',
        folder: MessageFolder.PERSONAL,
      });
  });
  it('creates, renames, persists order, deletes and returns messages to PERSONAL', async () => {
    const a = await service.create(owner, ' A '),
      b = await service.create(owner, 'B');
    expect(a.name).toBe('A');
    await service.rename(owner, a.id, 'Archiv');
    await service.sort(owner, b.id, 'up');
    expect((await service.list(owner)).map((f) => f.name)).toEqual([
      'B',
      'Archiv',
    ]);
    await service.move(owner, [message.id], a.id);
    expect((await service.messages(owner, a.id)).total).toBe(1);
    await service.remove(owner, a.id);
    expect(
      (await db.getRepository(Message).findOneByOrFail({ id: message.id }))
        .userFolderId,
    ).toBeNull();
    expect(await service.list(owner)).toHaveLength(1);
  });
  it('moves a single message into a folder where it is shown in full and marked read', async () => {
    const folder = await service.create(owner, 'Archiv');
    await service.move(owner, [message.id], folder.id);
    const page = await service.messages(owner, folder.id);
    expect(page).toMatchObject({ total: 1, limit: 6 });
    expect(page.data[0]).toMatchObject({
      id: message.id,
      isRead: false,
      sender: { id: other },
      senderContact: null,
    });
    expect(page.data[0].sender).not.toHaveProperty('email');
    expect(
      (await db.getRepository(Message).findOneByOrFail({ id: message.id })).isRead,
    ).toBe(true);
  });
  it('moves a bulk selection and back, without changing fixed counters', async () => {
    const second = await db
      .getRepository(Message)
      .save({
        senderId: other,
        recipientId: owner,
        body: 'Two',
      });
    const folder = await service.create(owner, 'Archiv');
    await service.move(owner, [message.id, second.id], folder.id);
    const messaging = new MessagingService(
      db.getRepository(Message),
      db.getRepository(User),
      {} as never,
      {} as never,
      {} as never,
    );
    expect(
      (await messaging.getFolder(owner, MessageFolder.PERSONAL)).total,
    ).toBe(0);
    expect(
      (await messaging.getFolderSummary(owner)).find(
        (f) => f.folder === MessageFolder.PERSONAL,
      ),
    ).toMatchObject({ total: 2, unread: 2 });
    await service.move(owner, [message.id, second.id], null);
    expect(
      (await messaging.getFolder(owner, MessageFolder.PERSONAL)).total,
    ).toBe(2);
  });
  it('hides and protects foreign folders in every operation', async () => {
    const folder = await service.create(other, 'Secret');
    expect(await service.list(owner)).toEqual([]);
    for (const action of [
      () => service.rename(owner, folder.id, 'X'),
      () => service.remove(owner, folder.id),
      () => service.sort(owner, folder.id, 'up'),
      () => service.messages(owner, folder.id),
      () => service.move(owner, [message.id], folder.id),
      () => service.action(owner, folder.id, true),
    ]) {
      await expect(action()).rejects.toThrow('Ordner nicht gefunden');
    }
  });
  it('rejects foreign/system messages atomically and invalid names', async () => {
    const folder = await service.create(owner, 'A');
    const system = await db
      .getRepository(Message)
      .save({
        senderId: owner,
        recipientId: owner,
        body: 'System',
        folder: MessageFolder.SYSTEM,
        isSystem: true,
      });
    const foreign = await db
      .getRepository(Message)
      .save({
        senderId: owner,
        recipientId: other,
        body: 'Foreign',
      });
    for (const bad of [system.id, foreign.id])
      await expect(
        service.move(owner, [message.id, bad], folder.id),
      ).rejects.toThrow('Nur eigene');
    expect(
      (await db.getRepository(Message).findOneByOrFail({ id: message.id }))
        .userFolderId,
    ).toBeNull();
    for (const name of ['', ' '.repeat(3), 'x'.repeat(41)])
      expect(() => service.create(owner, name)).toThrow();
  });
  it('serializes concurrent moves and deletion without losing a message', async () => {
    const folder = await service.create(owner, 'A');
    await Promise.allSettled([
      service.move(owner, [message.id], folder.id),
      service.remove(owner, folder.id),
    ]);
    expect(
      (await db.getRepository(Message).findOneByOrFail({ id: message.id }))
        .userFolderId,
    ).toBeNull();
  });
});
