import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingSelection } from './entities/onboarding-selection.entity';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { User } from '../auth/user.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { FactionModule } from '../faction/faction.module';
import { ColonyModule } from '../colony/colony.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OnboardingSelection,
      User,
      Layer,
      StarSystem,
      CelestialObject,
      GalaxyField,
    ]),
    FactionModule,
    ColonyModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
