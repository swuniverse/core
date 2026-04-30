import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { User } from './modules/auth/user.entity';
import { Colony } from './modules/colony/entities/colony.entity';
import { ColonyField } from './modules/colony/entities/colony-field.entity';
import { ColonyStorage } from './modules/colony/entities/colony-storage.entity';
import { Layer } from './modules/starmap/entities/layer.entity';
import { StarSystem } from './modules/starmap/entities/star-system.entity';
import { CelestialObject } from './modules/starmap/entities/celestial-object.entity';
import { Spacecraft } from './modules/spacecraft/entities/spacecraft.entity';
import { Research } from './modules/research/entities/research.entity';
import { Message } from './modules/messaging/entities/message.entity';
import { HolonetPost } from './modules/holonet/entities/holonet-post.entity';

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
          Spacecraft,
          Research,
          Message,
          HolonetPost,
        ],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') !== 'production',
      }),
    }),
    AuthModule,
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
