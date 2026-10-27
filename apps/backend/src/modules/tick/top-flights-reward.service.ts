import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PrestigeService } from '../prestige/prestige.service';
import { STU_PRESTIGE } from '../prestige/prestige.constants';
import type { MaintenanceHandler } from './maintenance.service';

const PRESTIGE_REWARDS = [
  STU_PRESTIGE.TOP_TEN_MAX,
  15,
  10,
  7,
  6,
  5,
  4,
  3,
  2,
  STU_PRESTIGE.TOP_TEN_MIN,
] as const;

@Injectable()
export class TopFlightsRewardService implements MaintenanceHandler {
  readonly name = 'top-flights-reward';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly prestigeService: PrestigeService,
  ) {}

  async run(now: Date): Promise<string> {
    const ranking = await this.databaseService.getFlightRankingForRewards(now);
    for (const [index, entry] of ranking.entries()) {
      const amount = PRESTIGE_REWARDS[index];
      if (amount === undefined) break;
      const place = index + 1;
      await this.prestigeService.change(
        entry.userId,
        amount,
        `${amount} Prestige erhalten für Platz ${place} unter den Vielfliegern`,
      );
    }
    return `${Math.min(ranking.length, PRESTIGE_REWARDS.length)} Vielflieger belohnt`;
  }
}
