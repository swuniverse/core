import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ColonizationController } from './colonization.controller';
import { ColonizationService } from './colonization.service';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyEvent } from '../colony/entities/colony-event.entity';
import { ColonyModule } from '../colony/colony.module';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { ResearchModule } from '../research/research.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Colony,
      ColonyEvent,
      CelestialObject,
      Spacecraft,
      ShipClassDef,
    ]),
    ResearchModule,
    forwardRef(() => ColonyModule),
  ],
  controllers: [ColonizationController],
  providers: [ColonizationService],
  exports: [ColonizationService],
})
export class ColonizationModule {}
