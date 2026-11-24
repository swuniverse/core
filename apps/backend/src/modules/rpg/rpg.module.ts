import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { MessagingModule } from '../messaging/messaging.module';
import { RpgPlotController } from './rpg-plot.controller';
import { RpgPlotMember } from './rpg-plot-member.entity';
import { RpgPlot } from './rpg-plot.entity';
import { RpgPlotService } from './rpg-plot.service';
import { EmptyPlotMaintenanceService } from './empty-plot-maintenance.service';
import { RpgController } from './rpg.controller';
import { RpgService } from './rpg.service';
import { UserCharacter } from './user-character.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserCharacter, RpgPlot, RpgPlotMember, User]),
    MessagingModule,
  ],
  controllers: [RpgController, RpgPlotController],
  providers: [RpgService, RpgPlotService, EmptyPlotMaintenanceService],
  exports: [RpgPlotService, EmptyPlotMaintenanceService],
})
export class RpgModule {}
