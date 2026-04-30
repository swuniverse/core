import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { ColonyModule } from './modules/colony/colony.module';
import { StarmapModule } from './modules/starmap/starmap.module';
import { TickModule } from './modules/tick/tick.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { User } from './modules/auth/user.entity';
import { Colony } from './modules/colony/entities/colony.entity';
import { ColonyField } from './modules/colony/entities/colony-field.entity';
import { ColonyStorage } from './modules/colony/entities/colony-storage.entity';
import { Layer } from './modules/starmap/entities/layer.entity';
import { StarSystem } from './modules/starmap/entities/star-system.entity';
import { CelestialObject } from './modules/starmap/entities/celestial-object.entity';

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
        ],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') !== 'production',
      }),
    }),
    AuthModule,
    ColonyModule,
    StarmapModule,
    TickModule,
    WebsocketModule,
  ],
})
export class AppModule {}
