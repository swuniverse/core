import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StarmapController } from './starmap.controller';
import { PlanetSurfacesController } from './planet-surfaces.controller';
import { StarmapService } from './starmap.service';
import { StarmapAdminService } from './starmap-admin.service';
import { StarmapQueryService } from './starmap-query.service';
import { ExplorationService } from './exploration.service';
import { SystemTypeDiscoveryService } from './system-type-discovery.service';
import { CelestialClassDiscoveryService } from './celestial-class-discovery.service';
import { Layer } from './entities/layer.entity';
import { StarSystem } from './entities/star-system.entity';
import { CelestialObject } from './entities/celestial-object.entity';
import { GalaxyFieldType } from './entities/galaxy-field-type.entity';
import { GalaxyField } from './entities/galaxy-field.entity';
import { SystemField } from './entities/system-field.entity';
import { SpaceLocation } from './entities/space-location.entity';
import { MapRegion } from './entities/map-region.entity';
import { BorderType } from './entities/border-type.entity';
import { ExplorationState } from './entities/exploration-state.entity';
import { SystemExploration } from './entities/system-exploration.entity';
import { RegionDiscovery } from './entities/region-discovery.entity';
import { RegionDiscoveryService } from './region-discovery.service';
import { SystemTypeDiscovery } from './entities/system-type-discovery.entity';
import { CelestialClassDiscovery } from './entities/celestial-class-discovery.entity';
import { PlanetField } from './entities/planet-field.entity';
import { InfluenceArea } from './entities/influence-area.entity';
import { Wormhole } from './entities/wormhole.entity';
import { HyperspaceRoute } from './entities/hyperspace-route.entity';
import { HyperspaceRouteSegment } from './entities/hyperspace-route-segment.entity';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyChangeable } from '../colony/entities/colony-changeable.entity';
import { StarmapSystemGeneratorService } from './generator/starmap-system-generator.service';
import { PlanetGeneratorService } from './generator/planet-generator.service';
import { InfluenceService } from './influence.service';
import { WormholeService } from './wormhole.service';
import { PrestigeModule } from '../prestige/prestige.module';
import { Alliance } from '../alliance/entities/alliance.entity';
import { AllianceMembership } from '../alliance/entities/alliance-membership.entity';
import { UserSetting } from '../settings/entities/user-setting.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { FieldEffectQuery } from './field-effect-query';
import { LayerKnowledge } from './entities/layer-knowledge.entity';
import { LayerKnowledgeService } from './layer-knowledge.service';
import { LayerExploredEvent } from './entities/layer-explored-event.entity';
import { LayerMapCycleService } from './layer-map-cycle.service';
import { AwardsModule } from '../awards/awards.module';
import { LayerAccessService } from './layer-access.service';
import { LayerAccessGuard } from './layer-access.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Layer,
      LayerKnowledge,
      LayerExploredEvent,
      StarSystem,
      CelestialObject,
      GalaxyFieldType,
      GalaxyField,
      SystemField,
      SpaceLocation,
      MapRegion,
      BorderType,
      ExplorationState,
      SystemExploration,
      RegionDiscovery,
      SystemTypeDiscovery,
      CelestialClassDiscovery,
      PlanetField,
      InfluenceArea,
      Wormhole,
      HyperspaceRoute,
      HyperspaceRouteSegment,
      Colony,
      ColonyChangeable,
      Alliance,
      AllianceMembership,
      UserSetting,
      FactionEntity,
    ]),
    PrestigeModule,
    AwardsModule,
  ],
  controllers: [StarmapController, PlanetSurfacesController],
  providers: [
    StarmapService,
    RegionDiscoveryService,
    StarmapAdminService,
    StarmapQueryService,
    ExplorationService,
    SystemTypeDiscoveryService,
    CelestialClassDiscoveryService,
    StarmapSystemGeneratorService,
    PlanetGeneratorService,
    InfluenceService,
    WormholeService,
    FieldEffectQuery,
    LayerKnowledgeService,
    LayerAccessService,
    LayerAccessGuard,
    LayerMapCycleService,
  ],
  exports: [
    StarmapService,
    RegionDiscoveryService,
    StarmapAdminService,
    StarmapQueryService,
    ExplorationService,
    SystemTypeDiscoveryService,
    CelestialClassDiscoveryService,
    StarmapSystemGeneratorService,
    PlanetGeneratorService,
    InfluenceService,
    WormholeService,
    FieldEffectQuery,
    LayerKnowledgeService,
    LayerAccessService,
    LayerMapCycleService,
  ],
})
export class StarmapModule {}
