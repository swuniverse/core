import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StarmapController } from './starmap.controller';
import { StarmapService } from './starmap.service';
import { Layer } from './entities/layer.entity';
import { StarSystem } from './entities/star-system.entity';
import { CelestialObject } from './entities/celestial-object.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Layer, StarSystem, CelestialObject])],
  controllers: [StarmapController],
  providers: [StarmapService],
  exports: [StarmapService],
})
export class StarmapModule {}
