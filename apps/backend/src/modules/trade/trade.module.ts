import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeOffer } from './entities/trade-offer.entity';
import { TradePost } from './entities/trade-post.entity';
import { TradeTransaction } from './entities/trade-transaction.entity';
import { TradeTransfer } from './entities/trade-transfer.entity';
import { TradeStorageService } from './trade-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TradePost,
      TradeAccountStorage,
      TradeOffer,
      TradeTransfer,
      TradeTransaction,
    ]),
  ],
  providers: [TradeStorageService],
  exports: [TradeStorageService, TypeOrmModule],
})
export class TradeModule {}
