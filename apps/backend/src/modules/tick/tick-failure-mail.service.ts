import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { GameTickState, GameTickStatus } from './entities/game-tick-state.entity';

@Injectable()
export class TickFailureMailService {
  private readonly logger = new Logger(TickFailureMailService.name);
  constructor(private readonly config: ConfigService, private readonly mail: MailService) {}

  /** Called by the actual tick runner for scheduled and manual executions. */
  async notify(run: Pick<GameTickState, 'tickType' | 'tickNumber' | 'status' | 'completedAt' | 'error'>): Promise<void> {
    const to = this.config.get<string>('ADMIN_EMAIL')?.trim();
    if (run.status !== GameTickStatus.FAILED || !to) return;
    try {
      const sent = await this.mail.sendMail({
        to, subject: `Star Wars Universe – ${run.tickType}-Tick fehlgeschlagen`,
        text: `Typ: ${run.tickType}\nTick: ${run.tickNumber}\nZeit: ${(run.completedAt ?? new Date()).toISOString()}\nFehler:\n${run.error ?? 'Unbekannter Fehler'}`,
      });
      if (!sent) this.logger.error(`Failed to deliver ${run.tickType} tick error mail`);
    } catch (error) {
      this.logger.error('Tick error mail failed', error instanceof Error ? error.stack : String(error));
    }
  }
}
