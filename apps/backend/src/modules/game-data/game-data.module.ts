import { Global, Module } from '@nestjs/common';
import { GameDataService } from './game-data.service';

@Global()
@Module({
  providers: [GameDataService],
  exports: [GameDataService],
})
export class GameDataModule {}
