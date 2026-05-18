import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';

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

  async getSent(userId: number, page = 1, limit = 20) {
    const [data, total] = await this.messageRepo.findAndCount({
      where: { senderId: userId, deletedBySender: false },
      relations: ['recipient'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
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
    });
    return this.messageRepo.save(message);
  }

  async sendSystem(recipientId: number, subject: string, body: string): Promise<Message> {
    const message = this.messageRepo.create({
      senderId: recipientId,
      recipientId,
      subject,
      body,
      isSystem: true,
    });
    return this.messageRepo.save(message);
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
