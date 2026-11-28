import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrderBroadcast } from './entities/order-broadcast.entity';
import { OrderBroadcastAck } from './entities/order-broadcast-ack.entity';
import { OrderBroadcastController } from './order-broadcast.controller';
import { OrderBroadcastService } from './order-broadcast.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderBroadcast, OrderBroadcastAck, User]),
    WebsocketModule,
  ],
  controllers: [OrderBroadcastController],
  providers: [OrderBroadcastService],
  exports: [OrderBroadcastService],
})
export class OrderBroadcastModule {}
