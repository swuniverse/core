import { Module } from '@nestjs/common';
import { PlayerDeletionService } from './player-deletion.service';

@Module({
  providers: [PlayerDeletionService],
  exports: [PlayerDeletionService],
})
export class AccountDeletionModule {}
