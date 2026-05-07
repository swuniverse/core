import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpacecraftController } from './spacecraft.controller';
import { SpacecraftService } from './spacecraft.service';
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftModule as SpacecraftModuleEntity } from './entities/spacecraft-module.entity';
import { Fleet } from './entities/fleet.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { ShipClassService } from './ship-class.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Spacecraft,
      SpacecraftModuleEntity,
      Fleet,
      ShipClassDef,
      StarSystem,
      Layer,
      CelestialObject,
      FactionEntity,
    ]),
  ],
  controllers: [SpacecraftController],
  providers: [SpacecraftService, ShipClassService],
  exports: [SpacecraftService, ShipClassService],
})
export class SpacecraftModule implements OnModuleInit {
  constructor(private readonly shipClassService: ShipClassService) {}

  async onModuleInit() {
    await this.shipClassService.seedDefaults();
  }
}
