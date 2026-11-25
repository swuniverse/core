import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';
import { UnlockResolverService } from './unlock-resolver.service';
import { Research } from './entities/research.entity';
import { ResearchRewardGrant } from './entities/research-reward-grant.entity';
import { ResearchRewardGrantService } from './research-reward-grant.service';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { WebsocketModule } from '../websocket/websocket.module';
import { FactionModule } from '../faction/faction.module';
import { AwardsModule } from '../awards/awards.module';
import { ShipGiftModule } from '../ship-gift/ship-gift.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Research,
      ResearchRewardGrant,
      Colony,
      ColonyStorage,
      ShipClassDef,
    ]),
    WebsocketModule,
    FactionModule,
    AwardsModule,
    ShipGiftModule,
  ],
  controllers: [ResearchController],
  providers: [
    ResearchService,
    UnlockResolverService,
    ResearchRewardGrantService,
  ],
  exports: [ResearchService, UnlockResolverService, ResearchRewardGrantService],
})
export class ResearchModule {}
