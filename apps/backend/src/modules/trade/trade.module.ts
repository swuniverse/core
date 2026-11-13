import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeLicenseCondition } from './entities/trade-license-condition.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradeOffer } from './entities/trade-offer.entity';
import { TradePost } from './entities/trade-post.entity';
import { TradeTransaction } from './entities/trade-transaction.entity';
import { TradeTransfer } from './entities/trade-transfer.entity';
import { AuthModule } from '../auth/auth.module';
import { AllianceModule } from '../alliance/alliance.module';
import { AccountDeletionModule } from '../account-deletion/account-deletion.module';
import { TradeDeletionHandler } from './trade-deletion.handler';
import { TradeNetworkTransferService } from './trade-network-transfer.service';
import { TradeShoutboxService } from './trade-shoutbox.service';
import { TradeShoutboxEntry } from './entities/trade-shoutbox-entry.entity';
import { PrestigeModule } from '../prestige/prestige.module';
import { TradeDeal } from './entities/trade-deal.entity';
import { TradeAuctionBid } from './entities/trade-auction-bid.entity';
import { TradeDealService } from './trade-deal.service';
import { TradeDealAdminService } from './trade-deal-admin.service';
import { TradeDealNotificationService } from './trade-deal-notification.service';
import { AdminTradeDealController, AdminTradeLotteryController, TradeDealController, TradeLotteryController } from './trade-deal.controller';
import { TradeLotteryService } from './trade-lottery.service';
import { LotteryAwardListener } from './lottery-award.listener';
import { TradeAuctionService } from './trade-auction.service';
import { PlayerTradePostService } from './player-trade-post.service';
import { TradePostManagementService } from './trade-post-management.service';
import { AwardsModule } from '../awards/awards.module';
import { LotteryTicket } from './entities/lottery-ticket.entity';
import { LotteryWinnerBuildplan } from './entities/lottery-winner-buildplan.entity';
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
import { TradeAgreementPolicy } from './trade-agreement.policy';
import { TradeQueryService } from './trade-query.service';

@Module({
  imports: [
    // Auth reaches trade again through colony and spacecraft.
    forwardRef(() => AuthModule),
    AllianceModule,
    AccountDeletionModule,
    PrestigeModule,
    AwardsModule,
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
      TradeDeal,
      TradeAuctionBid,
      TradeShoutboxEntry,
      LotteryTicket,
      LotteryWinnerBuildplan,
    ]),
  ],
  controllers: [
    TradeController,
    TradeShipController,
    TradeDealController,
    AdminTradeDealController,
    TradeLotteryController,
    AdminTradeLotteryController,
  ],
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
    TradeAgreementPolicy,
    TradeDeletionHandler,
    TradeDealService,
    TradeDealAdminService,
    TradeDealNotificationService,
    TradeNetworkTransferService,
    TradeShoutboxService,
    TradeLotteryService,
    LotteryAwardListener,
    TradeAuctionService,
    PlayerTradePostService,
    TradePostManagementService,
  ],
  exports: [
    PlayerTradePostService,
    TradeLotteryService,
    TradeDealService,
    TradeDealNotificationService,
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
