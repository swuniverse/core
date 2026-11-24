import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { AdminBroadcastAudienceDto, AdminBroadcastDto, AdminBroadcastResultDto, AdminBroadcastTarget } from '@swuniverse/shared';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { NON_NPC_USER_WHERE } from '../auth/non-npc-users';
import { MailService } from '../mail/mail.service';
import { mailPlainText } from '../mail/mail-plain-text';
import { MessagingService } from './messaging.service';
import { AdminBroadcastDelivery } from './entities/admin-broadcast-delivery.entity';

/** Admin mass message delivered through exactly one selected medium. */
@Injectable()
export class AdminBroadcastService {
  private readonly logger = new Logger(AdminBroadcastService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly messagingService: MessagingService,
    private readonly mailService: MailService,
    @InjectRepository(AdminBroadcastDelivery) private readonly deliveries: Repository<AdminBroadcastDelivery>,
  ) {}

  async audience(target: AdminBroadcastTarget): Promise<AdminBroadcastAudienceDto> {
    const recipients = await this.recipients(target);
    return { recipients: recipients.length, emailRecipients: recipients.filter(user => user.email.trim()).length };
  }

  async broadcast(dto: AdminBroadcastDto): Promise<AdminBroadcastResultDto> {
    const recipients = await this.recipients(dto.target);
    if (dto.medium === 'PM') {
      await this.messagingService.sendSystemToMany(
        recipients.map(user => user.id), `[b]Betreff: ${dto.subject}[/b]\n\n${dto.body}`,
        userId => `broadcast:${dto.broadcastId}:${userId}`,
      );
      return { recipients: recipients.length, emailsSent: 0 };
    }

    const emailRecipients = recipients.filter(user => user.email.trim());
    for (const user of emailRecipients) {
      // Commit the claim before touching SMTP. A crash or failure may lose this
      // attempt, but a concurrent/retried HTTP request cannot send it twice.
      const claimed = await this.deliveries.createQueryBuilder().insert()
        .values({ broadcastId: dto.broadcastId, userId: user.id })
        .orIgnore().returning(['userId']).execute();
      if (!claimed.raw.length) continue;
      try {
        const sent = await this.mailService.sendMail({ to: user.email, subject: mailPlainText(dto.subject), text: mailPlainText(dto.body) });
        await this.deliveries.update({ broadcastId: dto.broadcastId, userId: user.id }, { sent });
      } catch (error) {
        this.logger.error(`Broadcast mail failed for player ${user.id}`, error instanceof Error ? error.stack : String(error));
      }
    }
    return { recipients: emailRecipients.length, emailsSent: await this.deliveries.countBy({ broadcastId: dto.broadcastId, sent: true }) };
  }

  private recipients(target: AdminBroadcastTarget): Promise<Pick<User, 'id' | 'email'>[]> {
    return this.userRepo.find({
      select: { id: true, email: true },
      where: { ...NON_NPC_USER_WHERE, ...(target === 'ALL' ? {} : { faction: target }) },
      order: { id: 'ASC' },
    });
  }
}
