import { Injectable, type OnModuleInit } from '@nestjs/common';
import { AwardService } from '../awards/award.service';
import { TradeLotteryService, type LotteryDrawnEvent } from './trade-lottery.service';

/**
 * STU `EndLotteryPeriod#createAwardAndPrestige` (soc-G2c): the winner gets
 * `LOTTERY_WINNER`, repeated wins count up. A period is drawn only once, so
 * the award is granted at most once per period.
 */
@Injectable()
export class LotteryAwardListener implements OnModuleInit {
  constructor(
    private readonly lottery: TradeLotteryService,
    private readonly awards: AwardService,
  ) {}

  onModuleInit(): void {
    this.lottery.onDrawn((event) => this.grant(event));
  }

  private async grant(event: LotteryDrawnEvent): Promise<void> {
    await this.awards.grant(event.winnerUserId, 'LOTTERY_WINNER', { incrementExisting: true });
  }
}
