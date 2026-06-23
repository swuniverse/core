import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ColonyController } from './colony.controller';
import { ColonyService } from './colony.service';
import { ColonySeedService } from './colony-seed.service';
import { ColonyStatsService } from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import { BuildingLifecycleService } from './building-lifecycle.service';
import { ColonyCrewService } from './colony-crew.service';
import { ColonyDefenseService } from './colony-defense.service';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { ColonyStats } from './entities/colony-stats.entity';
import { ColonyDepositMining } from './entities/colony-deposit-mining.entity';
import { ColonyShipBuildQueue } from './entities/colony-ship-build-queue.entity';
import { ColonyShipBuildplan } from './entities/colony-ship-buildplan.entity';
import { ColonyFabricationQueue } from './entities/colony-fabrication-queue.entity';
import { ColonyCrewTrainingQueue } from './entities/colony-crew-training-queue.entity';
import { Crew } from './entities/crew.entity';
import { CrewAssignment } from './entities/crew-assignment.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { PlanetField } from '../starmap/entities/planet-field.entity';
import { StarmapModule } from '../starmap/starmap.module';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { SpacecraftStatsService } from '../spacecraft/spacecraft-stats.service';
import { ResearchModule } from '../research/research.module';
import { Research } from '../research/entities/research.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Colony,
      ColonyField,
      ColonyStorage,
      ColonyStats,
      ColonyDepositMining,
      ColonyShipBuildQueue,
      ColonyShipBuildplan,
      ColonyFabricationQueue,
      ColonyCrewTrainingQueue,
      Crew,
      CrewAssignment,
      CelestialObject,
      PlanetField,
      Spacecraft,
      SpacecraftModule,
      CargoItem,
      Research,
      ShipClassDef,
    ]),
    ResearchModule,
    StarmapModule,
  ],
  controllers: [ColonyController],
  providers: [
    ColonyService,
    ColonySeedService,
    ColonyStatsService,
    ColonyStorageService,
    BuildingLifecycleService,
    ColonyCrewService,
    ColonyDefenseService,
    SpacecraftStatsService,
  ],
  exports: [
    ColonyService,
    ColonySeedService,
    ColonyStatsService,
    ColonyStorageService,
    BuildingLifecycleService,
    ColonyCrewService,
    ColonyDefenseService,
    SpacecraftStatsService,
  ],
})
export class ColonyModule {}
