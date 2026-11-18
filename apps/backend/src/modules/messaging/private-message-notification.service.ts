import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { MailService } from '../mail/mail.service';
import { UserSettingsReader } from '../settings/user-settings-reader';
import { mailPlainText } from '../mail/mail-plain-text';

@Injectable()
export class PrivateMessageNotificationService {
  private readonly logger = new Logger(PrivateMessageNotificationService.name);
  constructor(
    private readonly mail: MailService,
    private readonly settings: UserSettingsReader,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /** Called after delivery; owns all failures so mail never blocks the PM. */
  async notify(senderId: number, recipientId: number, body: string): Promise<void> {
    try {
      if (!(await this.settings.getBoolean(recipientId, 'email_notification')))
        return;
      const [sender, recipient] = await Promise.all([
        this.users.findOneBy({ id: senderId }),
        this.users.findOneBy({ id: recipientId }),
      ]);
      if (!sender || sender.isNpc || !recipient || recipient.isNpc) return;
      await this.mail.sendPrivateMessageNotification(
        recipient.email,
        mailPlainText(sender.displayName || sender.username).replace(/\s+/g, ' ').trim(),
        mailPlainText(body),
      );
    } catch (error) {
      this.logger.error(
        'PM mail notification failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
