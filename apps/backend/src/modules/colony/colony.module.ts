import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ColonyController } from './colony.controller';
import { ColonyService } from './colony.service';
import { ColonySeedService } from './colony-seed.service';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { PlanetField } from '../starmap/entities/planet-field.entity';
import { StarmapModule } from '../starmap/starmap.module';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { ResearchModule } from '../research/research.module';
import { Research } from '../research/entities/research.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Colony,
      ColonyField,
      ColonyStorage,
      CelestialObject,
      PlanetField,
      Spacecraft,
      Research,
      ShipClassDef,
    ]),
    ResearchModule,
    StarmapModule,
  ],
  controllers: [ColonyController],
  providers: [ColonyService, ColonySeedService],
  exports: [ColonyService, ColonySeedService],
})
export class ColonyModule {}
