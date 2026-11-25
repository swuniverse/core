import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderBroadcastModule } from '../order-broadcast/order-broadcast.module';
import { ShipGift } from './entities/ship-gift.entity';
import { ShipGiftService } from './ship-gift.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShipGift]), OrderBroadcastModule],
  providers: [ShipGiftService],
  exports: [ShipGiftService],
})
export class ShipGiftModule {}
