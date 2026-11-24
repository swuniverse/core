import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { DATABASE_AWARD_CATEGORIES } from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { DatabaseCompletionService } from '../database/database-completion.service';
import type { MaintenanceHandler } from './maintenance.service';

const BATCH_SIZE = 200;

/**
 * STU `CreateMissingUserAwards`: re-checks every database category (star
 * systems per layer) for each player; `checkCompletion` grants only missing awards.
 */
@Injectable()
export class MissingAwardsMaintenanceService implements MaintenanceHandler {
  readonly name = 'missing-awards';
  private readonly logger = new Logger(MissingAwardsMaintenanceService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly completion: DatabaseCompletionService,
  ) {}

  async run(): Promise<string> {
    let lastId = 0;
    let granted = 0;
    let failed = 0;
    for (;;) {
      const batch = await this.users.find({
        select: { id: true },
        where: { isNpc: false, id: MoreThan(lastId) },
        order: { id: 'ASC' },
        take: BATCH_SIZE,
      });
      if (batch.length === 0) break;
      lastId = batch[batch.length - 1].id;
      for (const { id } of batch) {
        try {
          for (const category of DATABASE_AWARD_CATEGORIES) {
            granted += (await this.completion.checkCompletion(id, category)).length;
          }
        } catch (error) {
          failed += 1;
          this.logger.error(`Award-Prüfung für Spieler ${id} fehlgeschlagen: ${String(error)}`);
        }
      }
    }
    return `${granted} fehlende Awards vergeben${failed ? `, ${failed} Spieler fehlgeschlagen` : ''}`;
  }
}
