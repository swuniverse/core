import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameDataModule } from './modules/game-data/game-data.module';
import { AuthModule } from './modules/auth/auth.module';
import { ColonyModule } from './modules/colony/colony.module';
import { StarmapModule } from './modules/starmap/starmap.module';
import { SpacecraftModule } from './modules/spacecraft/spacecraft.module';
import { CombatModule } from './modules/combat/combat.module';
import { ResearchModule } from './modules/research/research.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { HolonetModule } from './modules/holonet/holonet.module';
import { TickModule } from './modules/tick/tick.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { FactionModule } from './modules/faction/faction.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { User } from './modules/auth/user.entity';
import { Colony } from './modules/colony/entities/colony.entity';
import { ColonyField } from './modules/colony/entities/colony-field.entity';
import { ColonyStorage } from './modules/colony/entities/colony-storage.entity';
import { Layer } from './modules/starmap/entities/layer.entity';
import { StarSystem } from './modules/starmap/entities/star-system.entity';
import { CelestialObject } from './modules/starmap/entities/celestial-object.entity';
import { GalaxyFieldType } from './modules/starmap/entities/galaxy-field-type.entity';
import { GalaxyField } from './modules/starmap/entities/galaxy-field.entity';
import { SystemField } from './modules/starmap/entities/system-field.entity';
import { FactionEntity } from './modules/faction/entities/faction.entity';
import { FactionModifier } from './modules/faction/entities/faction-modifier.entity';
import { OnboardingSelection } from './modules/onboarding/entities/onboarding-selection.entity';
import { Spacecraft } from './modules/spacecraft/entities/spacecraft.entity';
import { SpacecraftModule as SpacecraftModuleEntity } from './modules/spacecraft/entities/spacecraft-module.entity';
import { Fleet } from './modules/spacecraft/entities/fleet.entity';
import { ShipClassDef } from './modules/spacecraft/entities/ship-class-def.entity';
import { Research } from './modules/research/entities/research.entity';
import { Message } from './modules/messaging/entities/message.entity';
import { HolonetPost } from './modules/holonet/entities/holonet-post.entity';
import { GameTickState } from './modules/tick/entities/game-tick-state.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [
          User,
          Colony,
          ColonyField,
          ColonyStorage,
          Layer,
          StarSystem,
          CelestialObject,
          GalaxyFieldType,
          GalaxyField,
          SystemField,
          FactionEntity,
          FactionModifier,
          OnboardingSelection,
          Spacecraft,
          SpacecraftModuleEntity,
          Fleet,
          ShipClassDef,
          Research,
          Message,
          HolonetPost,
          GameTickState,
        ],
        synchronize: config.get('TYPEORM_SYNCHRONIZE') === 'true',
        logging: config.get('NODE_ENV') !== 'production',
      }),
    }),
    GameDataModule,
    FactionModule,
    AuthModule,
    OnboardingModule,
    ColonyModule,
    StarmapModule,
    SpacecraftModule,
    CombatModule,
    ResearchModule,
    MessagingModule,
    HolonetModule,
    TickModule,
    WebsocketModule,
  ],
})
export class AppModule {}
