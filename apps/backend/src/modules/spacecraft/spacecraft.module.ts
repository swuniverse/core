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
import { StarSystem } from '../starmap/entities/star-system.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { ShipClassService } from './ship-class.service';
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
      StarSystem,
      Layer,
      CelestialObject,
      GalaxyField,
      SystemField,
      FactionEntity,
      User,
      Colony,
      ColonyStorage,
    ]),
    forwardRef(() => StarmapModule),
    ResearchModule,
  ],
  controllers: [SpacecraftController],
  providers: [SpacecraftService, ShipClassService, TransferService],
  exports: [SpacecraftService, ShipClassService, TransferService],
})
export class SpacecraftModule implements OnModuleInit {
  constructor(private readonly shipClassService: ShipClassService) {}

  async onModuleInit() {
    await this.shipClassService.seedDefaults();
  }
}
