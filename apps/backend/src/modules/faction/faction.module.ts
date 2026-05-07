import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FactionEntity } from './entities/faction.entity';
import { FactionModifier } from './entities/faction-modifier.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { FactionService } from './faction.service';
import { FactionController } from './faction.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FactionEntity, FactionModifier, ShipClassDef]),
  ],
  controllers: [FactionController],
  providers: [FactionService],
  exports: [FactionService],
})
export class FactionModule implements OnModuleInit {
  constructor(private readonly factionService: FactionService) {}

  async onModuleInit() {
    await this.factionService.seedDefaults();
    await this.factionService.syncStarterShipClassIds();
  }
}
