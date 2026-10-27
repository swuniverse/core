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
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { User } from '../auth/user.entity';
import { TradeController } from './trade.controller';
import { TradeQueryService } from './trade-query.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      TradePost,
      GalaxyField,
      SpaceLocation,
      Spacecraft,
      User,
      TradeAccountStorage,
      TradeOffer,
      TradeTransfer,
      TradeTransaction,
    ]),
  ],
  controllers: [TradeController],
  providers: [TradeStorageService, TradePostSeedService, TradeQueryService],
  exports: [TradeStorageService, TradeQueryService, TypeOrmModule],
})
export class TradeModule {}
