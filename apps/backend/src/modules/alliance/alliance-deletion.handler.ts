import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { PlayerDeletionHandler } from '../account-deletion/player-deletion-handler';
import { PlayerDeletionService } from '../account-deletion/player-deletion.service';
import { AllianceService } from './alliance.service';

/**
 * STU `AllianceDeletionHandler` (sh-AP-05b): the deleted player leaves the
 * alliance with the regular succession or dissolution. That transition runs
 * its own transactions and writes chronicle entries naming the player, so it
 * happens before the deletion transaction locks the user row.
 */
@Injectable()
export class AllianceDeletionHandler implements PlayerDeletionHandler, OnModuleInit {
  readonly order = 10;

  constructor(
    private readonly deletions: PlayerDeletionService,
    private readonly alliances: AllianceService,
  ) {}

  onModuleInit(): void {
    this.deletions.register(this);
  }

  prepare(userId: number): Promise<void> {
    return this.alliances.removeAccount(userId);
  }

  /** Memberships and applications are gone after `prepare`. */
  async delete(): Promise<void> {
    return undefined;
  }
}
