import { Module } from '@nestjs/common';
import { AccountDataDeletionHandler } from './account-data-deletion.handler';
import { PlayerDeletionService } from './player-deletion.service';

@Module({
  providers: [PlayerDeletionService, AccountDataDeletionHandler],
  exports: [PlayerDeletionService],
})
export class AccountDeletionModule {}
