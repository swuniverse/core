import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import {
  IncomingMessageFolder,
  MessageFolder,
  MESSAGE_FOLDERS,
} from './message-folder';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async getInbox(userId: number, page = 1, limit = 20) {
    const [data, total] = await this.messageRepo.findAndCount({
      where: { recipientId: userId, deletedByRecipient: false },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getFolder(
    userId: number,
    folder: MessageFolder,
    page = 1,
    limit = 20,
  ) {
    const normalizedPage = Math.max(1, page);
    if (folder === MessageFolder.OUTBOX) {
      return this.getSent(userId, normalizedPage, limit);
    }

    const [data, total] = await this.messageRepo.findAndCount({
      where: {
        recipientId: userId,
        folder: folder as IncomingMessageFolder,
        deletedByRecipient: false,
      },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: (normalizedPage - 1) * limit,
      take: limit,
    });

    return { data, total, page: normalizedPage, limit };
  }

  async getFolderSummary(userId: number) {
    const received = await this.messageRepo
      .createQueryBuilder('message')
      .select('message.folder', 'folder')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        'COUNT(*) FILTER (WHERE message."isRead" = false)',
        'unread',
      )
      .where('message."recipientId" = :userId', { userId })
      .andWhere('message."deletedByRecipient" = false')
      .groupBy('message.folder')
      .getRawMany<{ folder: MessageFolder; total: string; unread: string }>();
    const sent = await this.messageRepo
      .createQueryBuilder('message')
      .select('COUNT(*)', 'total')
      .where('message."senderId" = :userId', { userId })
      .andWhere('message."deletedBySender" = false')
      .getRawOne<{ total: string }>();
    const counts = new Map(
      received.map((row) => [
        row.folder,
        { total: Number(row.total), unread: Number(row.unread) },
      ]),
    );
    counts.set(MessageFolder.OUTBOX, {
      total: Number(sent?.total ?? 0),
      unread: 0,
    });

    return MESSAGE_FOLDERS.map((folder) => ({
      folder,
      ...(counts.get(folder) ?? { unread: 0, total: 0 }),
    }));
  }

  async getSent(userId: number, page = 1, limit = 20) {
    const normalizedPage = Math.max(1, page);
    const [data, total] = await this.messageRepo.findAndCount({
      where: { senderId: userId, deletedBySender: false },
      relations: ['recipient'],
      order: { createdAt: 'DESC' },
      skip: (normalizedPage - 1) * limit,
      take: limit,
    });

    return { data, total, page: normalizedPage, limit };
  }

  async getOne(messageId: number, userId: number): Promise<Message> {
    const message = await this.messageRepo.findOne({
      where: [
        { id: messageId, recipientId: userId, deletedByRecipient: false },
        { id: messageId, senderId: userId, deletedBySender: false },
      ],
      relations: ['sender', 'recipient'],
    });
    if (!message) throw new NotFoundException('Message not found');

    if (message.recipientId === userId && !message.isRead) {
      message.isRead = true;
      await this.messageRepo.save(message);
    }

    return message;
  }

  async send(senderId: number, recipientId: number, subject: string, body: string): Promise<Message> {
    const message = this.messageRepo.create({
      senderId,
      recipientId,
      subject,
      body,
      folder: MessageFolder.PERSONAL,
    });
    return this.messageRepo.save(message);
  }

  async sendSystem(
    recipientId: number,
    subject: string,
    body: string,
    deliveryKey?: string,
  ): Promise<Message> {
    if (!deliveryKey) {
      const message = this.messageRepo.create({
        senderId: recipientId,
        recipientId,
        subject,
        body,
        isSystem: true,
        folder: MessageFolder.SYSTEM,
      });
      return this.messageRepo.save(message);
    }

    const inserted = await this.messageRepo
      .createQueryBuilder()
      .insert()
      .into(Message)
      .values({
        senderId: recipientId,
        recipientId,
        subject,
        body,
        isSystem: true,
        folder: MessageFolder.SYSTEM,
        deliveryKey,
      })
      .orIgnore()
      .returning('*')
      .execute();
    const insertedId = inserted.identifiers[0]?.id as number | undefined;
    if (insertedId !== undefined) {
      const message = await this.messageRepo.findOneBy({ id: insertedId });
      if (message) return message;
    }
    const existing = await this.messageRepo.findOneBy({ deliveryKey });
    if (!existing) throw new Error('System message delivery key was not persisted');
    return existing;
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.messageRepo.count({
      where: { recipientId: userId, isRead: false, deletedByRecipient: false },
    });
  }

  async delete(messageId: number, userId: number): Promise<void> {
    const message = await this.messageRepo.findOne({
      where: [
        { id: messageId, recipientId: userId },
        { id: messageId, senderId: userId },
      ],
    });
    if (!message) throw new NotFoundException('Message not found');

    if (message.recipientId === userId) {
      message.deletedByRecipient = true;
    }
    if (message.senderId === userId) {
      message.deletedBySender = true;
    }

    await this.messageRepo.save(message);
  }
}
