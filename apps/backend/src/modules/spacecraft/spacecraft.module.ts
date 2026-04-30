import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpacecraftController } from './spacecraft.controller';
import { SpacecraftService } from './spacecraft.service';
import { Spacecraft } from './entities/spacecraft.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Spacecraft])],
  controllers: [SpacecraftController],
  providers: [SpacecraftService],
  exports: [SpacecraftService],
})
export class SpacecraftModule {}
