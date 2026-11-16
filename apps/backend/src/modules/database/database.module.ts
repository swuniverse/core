import { ColonyStatsService } from '../colony/colony-stats.service';
import { ColonySocialService } from '../colony/colony-social.service';
import { MapRegion } from '../starmap/entities/map-region.entity';
import { RegionDiscovery } from '../starmap/entities/region-discovery.entity';
import { DatabaseRegionCatalogService } from './database-region-catalog.service';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseController } from './database.controller';
import { DatabaseService } from './database.service';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { Research } from '../research/entities/research.entity';
import { SystemTypeDiscovery } from '../starmap/entities/system-type-discovery.entity';
import { ShipClassDiscovery } from '../spacecraft/entities/ship-class-discovery.entity';
import { StationClassDiscovery } from '../spacecraft/entities/station-class-discovery.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { FactionModule } from '../faction/faction.module';
import { GameDataModule } from '../game-data/game-data.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { AwardsModule } from '../awards/awards.module';
import { DatabaseCategoryAward } from '../awards/entities/database-category-award.entity';
import { DatabaseCompletionService } from './database-completion.service';
import { DatabaseDiscoveryListener } from './database-discovery.listener';
import { DatabaseProgressController } from './database-progress.controller';
import { PrestigeHistoryEntry } from '../prestige/entities/prestige-history-entry.entity';
import { CelestialClassDiscovery } from '../starmap/entities/celestial-class-discovery.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { AllianceModule } from '../alliance/alliance.module';
import { ContactModule } from '../contacts/contact.module';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemExploration } from '../starmap/entities/system-exploration.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { ColonyScan } from '../spacecraft/entities/colony-scan.entity';
import { ColonyScanProjectionService } from '../spacecraft/colony-scan-projection.service';
import { CartographyPlan } from '../spacecraft/entities/cartography-plan.entity';
import { StatisticsModule } from '../statistics/statistics.module';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { SpacecraftTorpedoStorage } from '../spacecraft/entities/spacecraft-torpedo-storage.entity';
import { CommodityOverviewService } from './commodity-overview.service';
import { OwnedStorageCommodityLocationSource } from './owned-storage-commodity-location.source';
import { TradeAccountStorage } from '../trade/entities/trade-account-storage.entity';
import { TradeAccountCommodityLocationSource } from './trade-account-commodity-location.source';
import { TradeOfferCommodityLocationSource } from './trade-offer-commodity-location.source';
import { TradeOffer } from '../trade/entities/trade-offer.entity';
import { COMMODITY_LOCATION_SOURCES } from './commodity-location-source';
import { UserAward } from '../awards/entities/user-award.entity';
import { FlightSignature } from '../spacecraft/entities/flight-signature.entity';
import { TradePost } from '../trade/entities/trade-post.entity';
import { ExplorationState } from '../starmap/entities/exploration-state.entity';
import { ProfileVisitorModule } from '../profile-visitor/profile-visitor.module';
import { HolonetRating } from '../holonet/entities/holonet-rating.entity';
import { ColonyAurodiumRankingSource } from './colony-aurodium-ranking.source';
import { SpacecraftAurodiumRankingSource } from './spacecraft-aurodium-ranking.source';
import { AURODIUM_RANKING_SOURCES } from './aurodium-ranking-source';
import { TradeAccountAurodiumRankingSource } from './trade-account-aurodium-ranking.source';
import { TradeOfferAurodiumRankingSource } from './trade-offer-aurodium-ranking.source';
import { TradePostActivityRanking } from './trade-post-activity.ranking';
import { TradeTransaction } from '../trade/entities/trade-transaction.entity';
import { SettingsModule } from '../settings/settings.module';
import { RpgModule } from '../rpg/rpg.module';
import { StarmapModule } from '../starmap/starmap.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Colony,
      Spacecraft,
      Research,
      SystemTypeDiscovery,
      ShipClassDiscovery,
      StationClassDiscovery,
      ShipClassDef,
      PrestigeHistoryEntry,
      CelestialClassDiscovery,
      CrewAssignment,
      CelestialObject,
      Layer,
      StarSystem,
      SystemExploration,
      SystemField,
      CartographyPlan,
      ColonyScan,
      ColonyStorage,
      CargoItem,
      SpacecraftTorpedoStorage,
      UserAward,
      FlightSignature,
      TradePost,
      TradeAccountStorage,
      TradeOffer,
      TradeTransaction,
      ExplorationState,
      HolonetRating,
      DatabaseCategoryAward,
      MapRegion,
      RegionDiscovery,
    ]),
    FactionModule,
    GameDataModule,
    WebsocketModule,
    AllianceModule,
    ContactModule,
    StatisticsModule,
    ProfileVisitorModule,
    SettingsModule,
    RpgModule,
    StarmapModule,
    AwardsModule,
  ],
  controllers: [DatabaseController, DatabaseProgressController],
  providers: [
    DatabaseService,
    ColonyStatsService,
    ColonySocialService,
    DatabaseRegionCatalogService,
    DatabaseCompletionService,
    DatabaseDiscoveryListener,
    ColonyScanProjectionService,
    CommodityOverviewService,
    OwnedStorageCommodityLocationSource,
    TradeAccountCommodityLocationSource,
    TradeOfferCommodityLocationSource,
    ColonyAurodiumRankingSource,
    SpacecraftAurodiumRankingSource,
    TradeAccountAurodiumRankingSource,
    TradeOfferAurodiumRankingSource,
    TradePostActivityRanking,
    {
      provide: AURODIUM_RANKING_SOURCES,
      useFactory: (
        colonies: ColonyAurodiumRankingSource,
        spacecraft: SpacecraftAurodiumRankingSource,
        tradeAccounts: TradeAccountAurodiumRankingSource,
        tradeOffers: TradeOfferAurodiumRankingSource,
      ) => [colonies, spacecraft, tradeAccounts, tradeOffers],
      inject: [
        ColonyAurodiumRankingSource,
        SpacecraftAurodiumRankingSource,
        TradeAccountAurodiumRankingSource,
        TradeOfferAurodiumRankingSource,
      ],
    },
    {
      provide: COMMODITY_LOCATION_SOURCES,
      useFactory: (
        ownedStorage: OwnedStorageCommodityLocationSource,
        tradeAccounts: TradeAccountCommodityLocationSource,
        tradeOffers: TradeOfferCommodityLocationSource,
      ) => [ownedStorage, tradeAccounts, tradeOffers],
      inject: [
        OwnedStorageCommodityLocationSource,
        TradeAccountCommodityLocationSource,
        TradeOfferCommodityLocationSource,
      ],
    },
  ],
  exports: [DatabaseService, ColonyScanProjectionService, DatabaseCompletionService],
})
export class DatabaseModule {}
