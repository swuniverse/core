import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeLicenseCondition } from './entities/trade-license-condition.entity';
import { TradeLicense } from './entities/trade-license.entity';
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
import { TradeLicenseService } from './trade-license.service';
import { TradeLicensePurchaseService } from './trade-license-purchase.service';
import { TradeLicenseMaintenanceService } from './trade-license-maintenance.service';
import { TradeLicenseMenuService } from './trade-license-menu.service';
import { TradeAccountTransferService } from './trade-account-transfer.service';
import { TradeShipController } from './trade-ship.controller';
import { TradeOfferService } from './trade-offer.service';
import { BasicTradeService } from './basic-trade.service';
import { BasicTradeRate } from './entities/basic-trade-rate.entity';
import { TradeOfferMarketService } from './trade-offer-market.service';
import { TradeOfferMaintenanceService } from './trade-offer-maintenance.service';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { TradePostPresencePolicy } from './trade-post-presence.policy';
import { TradeQueryService } from './trade-query.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      TradePost,
      TradeLicenseCondition,
      TradeLicense,
      GalaxyField,
      SpaceLocation,
      Spacecraft,
      User,
      TradeAccountStorage,
      TradeOffer,
      TradeTransfer,
      TradeTransaction,
      CargoItem,
      BasicTradeRate,
    ]),
  ],
  controllers: [TradeController, TradeShipController],
  providers: [
    TradeStorageService,
    TradePostSeedService,
    TradeQueryService,
    TradeLicenseService,
    TradeLicensePurchaseService,
    TradeLicenseMaintenanceService,
    TradeLicenseMenuService,
    TradeAccountTransferService,
    TradeOfferService,
    TradeOfferMarketService,
    TradeOfferMaintenanceService,
    BasicTradeService,
    TradePostPresencePolicy,
  ],
  exports: [
    TradeLicenseMaintenanceService,
    TradeOfferMaintenanceService,
    TradeStorageService,
    TradeQueryService,
    TradeLicenseService,
    TradePostPresencePolicy,
    TypeOrmModule,
  ],
})
export class TradeModule {}
