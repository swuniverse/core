import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';
import { UnlockResolverService } from './unlock-resolver.service';
import { Research } from './entities/research.entity';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyField } from '../colony/entities/colony-field.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Research, Colony, ColonyField, ShipClassDef]),
  ],
  controllers: [ResearchController],
  providers: [ResearchService, UnlockResolverService],
  exports: [ResearchService, UnlockResolverService],
})
export class ResearchModule {}
