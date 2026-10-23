import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeOffer } from './entities/trade-offer.entity';
import { TradePost } from './entities/trade-post.entity';
import { TradeTransaction } from './entities/trade-transaction.entity';
import { TradeTransfer } from './entities/trade-transfer.entity';
import { AuthModule } from '../auth/auth.module';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { TradeStorageService } from './trade-storage.service';
import { TradePostSeedService } from './trade-post-seed.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      TradePost,
      GalaxyField,
      SpaceLocation,
      TradeAccountStorage,
      TradeOffer,
      TradeTransfer,
      TradeTransaction,
    ]),
  ],
  providers: [TradeStorageService, TradePostSeedService],
  exports: [TradeStorageService, TypeOrmModule],
})
export class TradeModule {}
