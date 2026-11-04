import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameDataModule } from '../game-data/game-data.module';
import { ResearchModule } from '../research/research.module';
import { ColonyTimingService } from '../colony/colony-timing.service';
import { ShipbuildingCoreService } from '../spacecraft/shipbuilding-core.service';
import { SpacecraftStatsService } from '../spacecraft/spacecraft-stats.service';

@Module({
  imports: [ConfigModule, GameDataModule, ResearchModule],
  providers: [
    ShipbuildingCoreService,
    SpacecraftStatsService,
    ColonyTimingService,
  ],
  exports: [ShipbuildingCoreService],
})
export class ShipbuildingModule {}
