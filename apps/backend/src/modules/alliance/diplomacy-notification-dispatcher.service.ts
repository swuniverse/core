import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

export const DIPLOMACY_NOTIFICATION_RETRY = Symbol(
  'DIPLOMACY_NOTIFICATION_RETRY',
);

export interface DiplomacyNotificationRetry {
  retryDiplomacyNotifications(): Promise<void>;
}

/**
 * Retries durable diplomacy notification intents after the transition has
 * committed. Message delivery keys make retried physical deliveries idempotent.
 */
@Injectable()
export class DiplomacyNotificationDispatcherService {
  private readonly logger = new Logger(
    DiplomacyNotificationDispatcherService.name,
  );
  private dispatching = false;

  constructor(
    @Inject(DIPLOMACY_NOTIFICATION_RETRY)
    private readonly retry: DiplomacyNotificationRetry,
  ) {}

  @Interval(10_000)
  async dispatch(): Promise<void> {
    if (this.dispatching) return;

    this.dispatching = true;
    try {
      await this.retry.retryDiplomacyNotifications();
    } catch (error) {
      this.logger.error(
        'Failed to retry pending alliance diplomacy notifications',
        error instanceof Error ? error.stack : error,
      );
    } finally {
      this.dispatching = false;
    }
  }
}
