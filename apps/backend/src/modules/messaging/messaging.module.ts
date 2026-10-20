import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { Message } from './entities/message.entity';
import { StatisticsModule } from '../statistics/statistics.module';
import { ColonyEventService } from './colony-event.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Message]), StatisticsModule],
  controllers: [MessagingController],
  providers: [MessagingService, ColonyEventService],
  exports: [MessagingService, ColonyEventService],
})
export class MessagingModule {}
