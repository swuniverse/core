import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WsEventType } from '@swuniverse/shared';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { PRIVATE_MESSAGES_EVENT } from '../statistics/statistic-events';
import { StatisticsService } from '../statistics/statistics.service';
import { GameGateway } from '../websocket/game.gateway';
import { UserSettingsReader } from '../settings/user-settings-reader';
import { Message } from './entities/message.entity';
import {
  IncomingMessageFolder,
  MessageFolder,
  MESSAGE_FOLDERS,
} from './message-folder';

@Injectable()
export class MessagingService {
  private ignoreCheck: (recipientId: number, senderId: number) => Promise<boolean> =
    async () => false;

  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly statisticsService: StatisticsService,
    private readonly gateway: GameGateway,
    private readonly settingsReader: UserSettingsReader,
  ) {}

  setIgnoreCheck(
    ignoreCheck: (recipientId: number, senderId: number) => Promise<boolean>,
  ): void {
    this.ignoreCheck = ignoreCheck;
  }

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

    const receiptSettings = await this.settingsReader.getManyBoolean(
      [userId, ...data.map((message) => message.recipientId)],
      'show_pm_read_receipt',
    );
    const senderEnabled = receiptSettings.get(userId) ?? true;
    const receipts = data.map(({ isRead, ...message }) => ({
      ...message,
      readReceipt:
        isRead &&
        senderEnabled &&
        (receiptSettings.get(message.recipientId) ?? true),
    }));

    return { data: receipts, total, page: normalizedPage, limit };
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

  async getCorrespondence(userId: number, partnerId: number, limit = 10) {
    return this.messageRepo.find({
      where: [
        {
          senderId: partnerId,
          recipientId: userId,
          folder: MessageFolder.PERSONAL,
          isSystem: false,
          deletedByRecipient: false,
        },
        {
          senderId: userId,
          recipientId: partnerId,
          folder: MessageFolder.PERSONAL,
          isSystem: false,
          deletedBySender: false,
        },
      ],
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(1, limit), 10),
    });
  }

  async send(senderId: number, recipientId: number, subject: string, body: string): Promise<Message> {
    if (senderId === recipientId) {
      throw new BadRequestException('Du kannst Dir keine Nachricht schicken');
    }
    const recipient = await this.userRepo.findOneBy({ id: recipientId });
    if (!recipient) {
      throw new NotFoundException('Dieser Siedler existiert nicht');
    }
    if (await this.ignoreCheck(recipientId, senderId)) {
      throw new BadRequestException('Der Siedler ignoriert Dich');
    }

    const message = this.messageRepo.create({
      senderId,
      recipientId,
      subject: subject.trim(),
      body: body.trim(),
      folder: MessageFolder.PERSONAL,
    });
    const saved = await this.messageRepo.save(message);
    this.notifyRecipient(recipientId, MessageFolder.PERSONAL);
    await this.statisticsService.countEvent(PRIVATE_MESSAGES_EVENT);
    return saved;
  }

  async sendNpcTrade(
    senderId: number,
    recipientId: number,
    subject: string,
    body: string,
  ): Promise<Message> {
    const [sender, recipient] = await Promise.all([
      this.userRepo.findOneBy({ id: senderId }),
      this.userRepo.findOneBy({ id: recipientId }),
    ]);
    if (!sender?.isNpc) throw new BadRequestException('Invalid NPC sender');
    if (!recipient) throw new NotFoundException('Dieser Siedler existiert nicht');
    return this.messageRepo.save(
      this.messageRepo.create({
        senderId,
        recipientId,
        subject: subject.trim(),
        body: body.trim(),
        folder: MessageFolder.TRADE,
      }),
    );
  }

  async sendSystem(
    recipientId: number,
    subject: string,
    body: string,
    deliveryKey?: string,
    folder: MessageFolder = MessageFolder.SYSTEM,
  ): Promise<Message> {
    if (!deliveryKey) {
      const message = this.messageRepo.create({
        senderId: recipientId,
        recipientId,
        subject,
        body,
        isSystem: true,
        folder,
      });
      const saved = await this.messageRepo.save(message);
      this.notifyRecipient(recipientId, folder);
      return saved;
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
        folder,
        deliveryKey,
      })
      .orIgnore()
      .returning('*')
      .execute();
    const insertedId = inserted.identifiers[0]?.id as number | undefined;
    if (insertedId !== undefined) {
      const message = await this.messageRepo.findOneBy({ id: insertedId });
      if (message) {
        this.notifyRecipient(recipientId, folder);
        return message;
      }
    }
    const existing = await this.messageRepo.findOneBy({ deliveryKey });
    if (!existing) throw new Error('System message delivery key was not persisted');
    return existing;
  }

  private notifyRecipient(recipientId: number, folder: MessageFolder): void {
    this.gateway.emitToUser(recipientId, WsEventType.MESSAGE_RECEIVED, { folder });
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.messageRepo.count({
      where: { recipientId: userId, isRead: false, deletedByRecipient: false },
    });
  }

  async bulkDelete(userId: number, ids: number[]) {
    const messageIds = [...new Set(ids)];
    const result = await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ deletedByRecipient: true })
      .where('id IN (:...messageIds)', { messageIds })
      .andWhere('"recipientId" = :userId', { userId })
      .andWhere('"deletedByRecipient" = false')
      .execute();

    return { affected: result.affected ?? 0 };
  }

  async markFolderRead(userId: number, folder: IncomingMessageFolder) {
    const result = await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('"recipientId" = :userId', { userId })
      .andWhere('folder = :folder', { folder })
      .andWhere('"deletedByRecipient" = false')
      .andWhere('"isRead" = false')
      .execute();

    return { affected: result.affected ?? 0 };
  }

  async emptyFolder(userId: number, folder: IncomingMessageFolder) {
    const result = await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ deletedByRecipient: true })
      .where('"recipientId" = :userId', { userId })
      .andWhere('folder = :folder', { folder })
      .andWhere('"deletedByRecipient" = false')
      .execute();

    return { affected: result.affected ?? 0 };
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
