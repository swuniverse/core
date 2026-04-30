import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';
import { Research } from './entities/research.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Research])],
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule {}
