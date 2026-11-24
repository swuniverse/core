import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { User } from '../auth/user.entity';
import { Message } from './entities/message.entity';
import { UserMessageFolder } from './entities/user-message-folder.entity';
import { MessageFolder } from './message-folder';
import { FOLDER_PAGE_SIZE, presentReceivedPage } from './folder-page';

@Injectable()
export class UserMessageFoldersService {
  constructor(private readonly db: DataSource) {}

  list(userId: number) {
    return this.db
      .getRepository(UserMessageFolder)
      .find({ where: { userId }, order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  private async owned(tx: EntityManager, userId: number, id: number) {
    const folder = await tx.findOneBy(UserMessageFolder, { id, userId });
    if (!folder) throw new NotFoundException('Ordner nicht gefunden');
    return folder;
  }

  private mutate<T>(userId: number, action: (tx: EntityManager) => Promise<T>) {
    return this.db.transaction(async (tx) => {
      // Serialize moves/deletes/reorders for this owner, including empty folders.
      const user = await tx.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Spieler nicht gefunden');
      return action(tx);
    });
  }

  private name(value: unknown): string {
    if (
      typeof value !== 'string' ||
      value.trim().length < 1 ||
      value.trim().length > 40
    )
      throw new BadRequestException('Ordnername muss 1–40 Zeichen enthalten');
    return value.trim();
  }

  create(userId: number, name: string) {
    const validName = this.name(name);
    return this.mutate(userId, async (tx) => {
      const folders = await tx.find(UserMessageFolder, { where: { userId } });
      return tx.save(UserMessageFolder, {
        userId,
        name: validName,
        sortOrder: Math.max(-1, ...folders.map((f) => f.sortOrder)) + 1,
      });
    });
  }

  rename(userId: number, id: number, name: string) {
    const validName = this.name(name);
    return this.mutate(userId, async (tx) => {
      const folder = await this.owned(tx, userId, id);
      folder.name = validName;
      return tx.save(folder);
    });
  }

  remove(userId: number, id: number) {
    return this.mutate(userId, async (tx) => {
      await this.owned(tx, userId, id);
      await tx.update(Message, { userFolderId: id }, { userFolderId: null });
      await tx.delete(UserMessageFolder, { id, userId });
      return { deleted: true };
    });
  }

  sort(userId: number, id: number, direction: unknown) {
    if (direction !== 'up' && direction !== 'down')
      throw new BadRequestException('Ungültige Sortierrichtung');
    return this.mutate(userId, async (tx) => {
      await this.owned(tx, userId, id);
      const folders = await tx.find(UserMessageFolder, {
        where: { userId },
        order: { sortOrder: 'ASC', id: 'ASC' },
      });
      const index = folders.findIndex((f) => f.id === id);
      const target = index + (direction === 'up' ? -1 : 1);
      if (target >= 0 && target < folders.length)
        [folders[index], folders[target]] = [folders[target], folders[index]];
      for (let i = 0; i < folders.length; i++) folders[i].sortOrder = i;
      return tx.save(folders);
    });
  }

  move(userId: number, ids: number[], folderId: number | null) {
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.length > 100 ||
      ids.some((id) => !Number.isInteger(id) || id < 1) ||
      (folderId !== null && (!Number.isInteger(folderId) || folderId < 1))
    )
      throw new BadRequestException('Ungültige Nachrichtenauswahl');
    const unique = [...new Set(ids)];
    return this.mutate(userId, async (tx) => {
      if (folderId !== null) await this.owned(tx, userId, folderId);
      const messages = await tx.find(Message, {
        where: {
          id: In(unique),
          recipientId: userId,
          deletedByRecipient: false,
          folder: MessageFolder.PERSONAL,
          isSystem: false,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (messages.length !== unique.length)
        throw new BadRequestException(
          'Nur eigene persönliche Nachrichten sind verschiebbar',
        );
      await tx.update(
        Message,
        { id: In(unique), recipientId: userId },
        { userFolderId: folderId },
      );
      return { affected: unique.length };
    });
  }

  async messages(userId: number, id: number, page = 1) {
    await this.owned(this.db.manager, userId, id);
    const p = Math.max(1, Math.trunc(page));
    const [data, total] = await this.db
      .getRepository(Message)
      .findAndCount({
        where: {
          recipientId: userId,
          userFolderId: id,
          folder: MessageFolder.PERSONAL,
          deletedByRecipient: false,
        },
        relations: ['sender'],
        order: { createdAt: 'DESC' },
        skip: (p - 1) * FOLDER_PAGE_SIZE,
        take: FOLDER_PAGE_SIZE,
      });
    return {
      data: await presentReceivedPage(this.db.manager, userId, data),
      total,
      page: p,
      limit: FOLDER_PAGE_SIZE,
    };
  }

  action(userId: number, id: number, empty: boolean) {
    return this.mutate(userId, async (tx) => {
      await this.owned(tx, userId, id);
      const result = await tx.update(
        Message,
        { recipientId: userId, userFolderId: id, deletedByRecipient: false },
        empty ? { deletedByRecipient: true } : { isRead: true },
      );
      return { affected: result.affected ?? 0 };
    });
  }
}
