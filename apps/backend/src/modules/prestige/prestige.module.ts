import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrestigeHistoryEntry } from './entities/prestige-history-entry.entity';
import { PrestigeService } from './prestige.service';

@Module({
  imports: [TypeOrmModule.forFeature([PrestigeHistoryEntry])],
  providers: [PrestigeService],
  exports: [PrestigeService],
})
export class PrestigeModule {}
