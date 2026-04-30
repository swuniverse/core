import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ColonyController } from './colony.controller';
import { ColonyService } from './colony.service';
import { ColonySeedService } from './colony-seed.service';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Colony, ColonyField, ColonyStorage, CelestialObject]),
  ],
  controllers: [ColonyController],
  providers: [ColonyService, ColonySeedService],
  exports: [ColonyService, ColonySeedService],
})
export class ColonyModule {}
