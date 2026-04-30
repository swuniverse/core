import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HolonetController } from './holonet.controller';
import { HolonetService } from './holonet.service';
import { HolonetPost } from './entities/holonet-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HolonetPost])],
  controllers: [HolonetController],
  providers: [HolonetService],
  exports: [HolonetService],
})
export class HolonetModule {}
