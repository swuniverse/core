import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StarmapController } from './starmap.controller';
import { StarmapService } from './starmap.service';
import { StarmapAdminService } from './starmap-admin.service';
import { StarmapQueryService } from './starmap-query.service';
import { ExplorationService } from './exploration.service';
import { Layer } from './entities/layer.entity';
import { StarSystem } from './entities/star-system.entity';
import { CelestialObject } from './entities/celestial-object.entity';
import { GalaxyFieldType } from './entities/galaxy-field-type.entity';
import { GalaxyField } from './entities/galaxy-field.entity';
import { SystemField } from './entities/system-field.entity';
import { MapRegion } from './entities/map-region.entity';
import { BorderType } from './entities/border-type.entity';
import { ExplorationState } from './entities/exploration-state.entity';
import { SystemExploration } from './entities/system-exploration.entity';
import { PlanetField } from './entities/planet-field.entity';
import { InfluenceArea } from './entities/influence-area.entity';
import { Wormhole } from './entities/wormhole.entity';
import { HyperspaceRoute } from './entities/hyperspace-route.entity';
import { HyperspaceRouteSegment } from './entities/hyperspace-route-segment.entity';
import { AuthModule } from '../auth/auth.module';
import { StarmapSystemGeneratorService } from './generator/starmap-system-generator.service';
import { PlanetGeneratorService } from './generator/planet-generator.service';
import { InfluenceService } from './influence.service';
import { WormholeService } from './wormhole.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Layer,
      StarSystem,
      CelestialObject,
      GalaxyFieldType,
      GalaxyField,
      SystemField,
      MapRegion,
      BorderType,
      ExplorationState,
      SystemExploration,
      PlanetField,
      InfluenceArea,
      Wormhole,
      HyperspaceRoute,
      HyperspaceRouteSegment,
    ]),
    AuthModule,
  ],
  controllers: [StarmapController],
  providers: [
    StarmapService,
    StarmapAdminService,
    StarmapQueryService,
    ExplorationService,
    StarmapSystemGeneratorService,
    PlanetGeneratorService,
    InfluenceService,
    WormholeService,
  ],
  exports: [
    StarmapService,
    StarmapAdminService,
    StarmapQueryService,
    ExplorationService,
    StarmapSystemGeneratorService,
    PlanetGeneratorService,
    InfluenceService,
    WormholeService,
  ],
})
export class StarmapModule {}
