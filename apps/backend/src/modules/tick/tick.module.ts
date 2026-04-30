import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TickService } from './tick.service';
import { ColonyModule } from '../colony/colony.module';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyField } from '../colony/entities/colony-field.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Colony, ColonyField]),
    ColonyModule,
  ],
  providers: [TickService],
})
export class TickModule {}
