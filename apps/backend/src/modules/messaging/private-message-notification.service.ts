import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { MailService } from '../mail/mail.service';
import { UserSettingsReader } from '../settings/user-settings-reader';

@Injectable()
export class PrivateMessageNotificationService {
  private readonly logger = new Logger(PrivateMessageNotificationService.name);
  constructor(
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly settings: UserSettingsReader,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /** Called after delivery; owns all failures so mail never blocks the PM. */
  async notify(senderId: number, recipientId: number): Promise<void> {
    try {
      if (
        this.config.get<string>('PLAYER_MAIL_NOTIFICATIONS_ENABLED') !==
          'true' ||
        !this.mail.isEnabled()
      )
        return;
      if (!(await this.settings.getBoolean(recipientId, 'email_notification')))
        return;
      const [sender, recipient] = await Promise.all([
        this.users.findOneBy({ id: senderId }),
        this.users.findOneBy({ id: recipientId }),
      ]);
      if (!sender || sender.isNpc || !recipient || recipient.isNpc) return;
      await this.mail.sendPrivateMessageNotification(
        recipient.email,
        sender.displayName || sender.username,
      );
    } catch (error) {
      this.logger.error(
        'PM mail notification failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
