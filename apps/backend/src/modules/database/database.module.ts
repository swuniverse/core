import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseController } from './database.controller';
import { DatabaseService } from './database.service';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { Research } from '../research/entities/research.entity';
import { FactionModule } from '../faction/faction.module';
import { GameDataModule } from '../game-data/game-data.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Colony, Spacecraft, Research]),
    FactionModule,
    GameDataModule,
  ],
  controllers: [DatabaseController],
  providers: [DatabaseService],
})
export class DatabaseModule {}
