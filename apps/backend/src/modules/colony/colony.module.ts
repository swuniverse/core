import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ColonyController } from './colony.controller';
import { ColonyService } from './colony.service';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Colony, ColonyField, ColonyStorage])],
  controllers: [ColonyController],
  providers: [ColonyService],
  exports: [ColonyService],
})
export class ColonyModule {}
