import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpacecraftController } from './spacecraft.controller';
import { SpacecraftService } from './spacecraft.service';
import { TransferService } from './transfer.service';
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftModule as SpacecraftModuleEntity } from './entities/spacecraft-module.entity';
import { Fleet } from './entities/fleet.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { SpacecraftTorpedoStorage } from './entities/spacecraft-torpedo-storage.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { ShipClassService } from './ship-class.service';
import { SpacecraftScanService } from './spacecraft-scan.service';
import { SpacecraftStatsService } from './spacecraft-stats.service';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import { SpacecraftTorpedoService } from './spacecraft-torpedo.service';
import { ColonyStorageService } from '../colony/colony-storage.service';
import { StarmapModule } from '../starmap/starmap.module';
import { ResearchModule } from '../research/research.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Spacecraft,
      SpacecraftModuleEntity,
      Fleet,
      ShipClassDef,
      CargoItem,
      SpacecraftTorpedoStorage,
      StarSystem,
      Layer,
      CelestialObject,
      GalaxyField,
      SystemField,
      FactionEntity,
      User,
      Colony,
      ColonyStorage,
      CrewAssignment,
    ]),
    forwardRef(() => StarmapModule),
    ResearchModule,
  ],
  controllers: [SpacecraftController],
  providers: [
    SpacecraftService,
    ShipClassService,
    TransferService,
    SpacecraftScanService,
    SpacecraftStatsService,
    SpacecraftCrewService,
    SpacecraftTorpedoService,
    ColonyStorageService,
  ],
  exports: [
    SpacecraftService,
    ShipClassService,
    TransferService,
    SpacecraftScanService,
    SpacecraftStatsService,
    SpacecraftCrewService,
    SpacecraftTorpedoService,
  ],
})
export class SpacecraftModule implements OnModuleInit {
  constructor(private readonly shipClassService: ShipClassService) {}

  async onModuleInit() {
    await this.shipClassService.seedDefaults();
  }
}
