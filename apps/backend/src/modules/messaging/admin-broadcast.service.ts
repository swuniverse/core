import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AdminBroadcastAudienceDto,
  AdminBroadcastDto,
  AdminBroadcastResultDto,
  AdminBroadcastTarget,
} from '@swuniverse/shared';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { NON_NPC_USER_WHERE } from '../auth/non-npc-users';
import { MailService } from '../mail/mail.service';
import { UserSettingsReader } from '../settings/user-settings-reader';
import { MessagingService } from './messaging.service';

/** Admin mass message (STU `SendMassMail`) as system message, optionally mailed. */
@Injectable()
export class AdminBroadcastService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly messagingService: MessagingService,
    private readonly settingsReader: UserSettingsReader,
    private readonly mailService: MailService,
  ) {}

  async audience(target: AdminBroadcastTarget): Promise<AdminBroadcastAudienceDto> {
    const recipients = await this.recipients(target);
    return {
      recipients: recipients.length,
      emailRecipients: (await this.emailRecipients(recipients)).length,
      emailEnabled: true,
    };
  }

  async broadcast(dto: AdminBroadcastDto): Promise<AdminBroadcastResultDto> {
    const recipients = await this.recipients(dto.target);
    const delivered = new Set(
      await this.messagingService.sendSystemToMany(
        recipients.map((user) => user.id),
        dto.subject,
        dto.body,
        (userId) => `broadcast:${dto.broadcastId}:${userId}`,
      ),
    );

    let emailsSent = 0;
    if (dto.alsoEmail) {
      const newRecipients = recipients.filter((user) => delivered.has(user.id));
      for (const user of await this.emailRecipients(newRecipients)) {
        if (await this.mailService.sendMail({ to: user.email, subject: dto.subject, text: dto.body })) {
          emailsSent += 1;
        }
      }
    }
    return { recipients: recipients.length, emailsSent };
  }

  private recipients(target: AdminBroadcastTarget): Promise<Pick<User, 'id' | 'email'>[]> {
    return this.userRepo.find({
      select: { id: true, email: true },
      where: { ...NON_NPC_USER_WHERE, ...(target === 'ALL' ? {} : { faction: target }) },
      order: { id: 'ASC' },
    });
  }

  private async emailRecipients<T extends { id: number }>(users: T[]): Promise<T[]> {
    const wanted = await this.settingsReader.getManyBoolean(
      users.map((user) => user.id),
      'email_notification',
    );
    return users.filter((user) => wanted.get(user.id));
  }
}
