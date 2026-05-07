import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StarmapController } from './starmap.controller';
import { StarmapService } from './starmap.service';
import { StarmapAdminService } from './starmap-admin.service';
import { StarmapQueryService } from './starmap-query.service';
import { Layer } from './entities/layer.entity';
import { StarSystem } from './entities/star-system.entity';
import { CelestialObject } from './entities/celestial-object.entity';
import { GalaxyFieldType } from './entities/galaxy-field-type.entity';
import { GalaxyField } from './entities/galaxy-field.entity';
import { SystemField } from './entities/system-field.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Layer,
      StarSystem,
      CelestialObject,
      GalaxyFieldType,
      GalaxyField,
      SystemField,
    ]),
    AuthModule,
  ],
  controllers: [StarmapController],
  providers: [StarmapService, StarmapAdminService, StarmapQueryService],
  exports: [StarmapService, StarmapAdminService, StarmapQueryService],
})
export class StarmapModule {}
