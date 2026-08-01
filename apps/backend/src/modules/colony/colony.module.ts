import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ColonyController } from './colony.controller';
import { ColonyService } from './colony.service';
import { ColonySeedService } from './colony-seed.service';
import { ColonyStatsService } from './colony-stats.service';
import { ColonyEconomyService } from './colony-economy.service';
import { ColonyFunctionManagerService } from './colony-function-manager.service';
import { ColonyBuildingEffectsService } from './colony-building-effects.service';
import { ColonyStorageService } from './colony-storage.service';
import { BuildingLifecycleService } from './building-lifecycle.service';
import { ColonyCrewService } from './colony-crew.service';
import { ColonyDefenseService } from './colony-defense.service';
import { ColonyDamageService } from './colony-damage.service';
import { ColonyBuildingManagementService } from './colony-building-management.service';
import { ColonyEventService } from './colony-event.service';
import { ColonySocialService } from './colony-social.service';
import { ColonyOwnershipService } from './colony-ownership.service';
import { ColonyAbandonmentService } from './colony-abandonment.service';
import { ColonySettingsService } from './colony-settings.service';
import { ColonyTimingService } from './colony-timing.service';
import { ColonyFabricationService } from './colony-fabrication.service';
import { ColonyOrbitService } from './colony-orbit.service';
import { ColonyProjectionService } from './colony-projection.service';
import { ColonyShipyardService } from './colony-shipyard.service';
import { ColonyConstructionService } from './colony-construction.service';
import { ColonyTickProcessorService } from './colony-tick-processor.service';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { ColonyStats } from './entities/colony-stats.entity';
import { ColonyChangeable } from './entities/colony-changeable.entity';
import { ColonyDepositMining } from './entities/colony-deposit-mining.entity';
import { ColonyShipBuildQueue } from './entities/colony-ship-build-queue.entity';
import { ColonyShipBuildplan } from './entities/colony-ship-buildplan.entity';
import { ColonyFabricationQueue } from './entities/colony-fabrication-queue.entity';
import { ColonyCrewTrainingQueue } from './entities/colony-crew-training-queue.entity';
import { ColonyEvent } from './entities/colony-event.entity';
import { ColonyOrbitAssignment } from './entities/colony-orbit-assignment.entity';
import { Crew } from './entities/crew.entity';
import { CrewAssignment } from './entities/crew-assignment.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { PlanetField } from '../starmap/entities/planet-field.entity';
import { StarmapModule } from '../starmap/starmap.module';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import { SpacecraftTorpedoStorage } from '../spacecraft/entities/spacecraft-torpedo-storage.entity';
import { SpacecraftTorpedoService } from '../spacecraft/spacecraft-torpedo.service';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { SpacecraftStatsService } from '../spacecraft/spacecraft-stats.service';
import { ResearchModule } from '../research/research.module';
import { Research } from '../research/entities/research.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { User } from '../auth/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Colony,
      ColonyField,
      ColonyStorage,
      ColonyStats,
      ColonyChangeable,
      ColonyDepositMining,
      ColonyShipBuildQueue,
      ColonyShipBuildplan,
      ColonyFabricationQueue,
      ColonyCrewTrainingQueue,
      ColonyEvent,
      ColonyOrbitAssignment,
      Crew,
      CrewAssignment,
      CelestialObject,
      PlanetField,
      Spacecraft,
      SpacecraftModule,
      SpacecraftTorpedoStorage,
      CargoItem,
      Research,
      ShipClassDef,
      User,
    ]),
    ResearchModule,
    StarmapModule,
  ],
  controllers: [ColonyController],
  providers: [
    ColonyService,
    ColonySeedService,
    ColonyStatsService,
    ColonyEconomyService,
    ColonyFunctionManagerService,
    ColonyBuildingEffectsService,
    ColonyStorageService,
    BuildingLifecycleService,
    ColonyBuildingManagementService,
    ColonyCrewService,
    ColonyDefenseService,
    ColonyDamageService,
    ColonyEventService,
    ColonySocialService,
    ColonyOwnershipService,
    ColonyAbandonmentService,
    ColonySettingsService,
    ColonyTimingService,
    ColonyFabricationService,
    ColonyOrbitService,
    ColonyProjectionService,
    ColonyShipyardService,
    ColonyConstructionService,
    ColonyTickProcessorService,
    SpacecraftStatsService,
    SpacecraftTorpedoService,
  ],
  exports: [
    ColonyService,
    ColonySeedService,
    ColonyStatsService,
    ColonyEconomyService,
    ColonyFunctionManagerService,
    ColonyBuildingEffectsService,
    ColonyStorageService,
    BuildingLifecycleService,
    ColonyBuildingManagementService,
    ColonyCrewService,
    ColonyDefenseService,
    ColonyDamageService,
    ColonyEventService,
    ColonySocialService,
    ColonyOwnershipService,
    ColonyAbandonmentService,
    ColonySettingsService,
    ColonyTimingService,
    ColonyFabricationService,
    ColonyOrbitService,
    ColonyProjectionService,
    ColonyShipyardService,
    ColonyConstructionService,
    ColonyTickProcessorService,
    SpacecraftStatsService,
    SpacecraftTorpedoService,
  ],
})
export class ColonyModule {}
