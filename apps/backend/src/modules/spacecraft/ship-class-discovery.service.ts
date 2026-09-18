import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { STU_PRESTIGE } from '../prestige/prestige.constants';
import { ShipClassDiscovery } from './entities/ship-class-discovery.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { PrestigeService } from '../prestige/prestige.service';

@Injectable()
export class ShipClassDiscoveryService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ShipClassDiscovery)
    private readonly discoveryRepo: Repository<ShipClassDiscovery>,
    private readonly prestigeService: PrestigeService,
  ) {}

  async discover(input: {
    userId: number;
    shipClassId: number;
    sourceSpacecraftId: number;
    targetSpacecraftId: number;
  }) {
    return this.dataSource.transaction(async (manager) => {
      const shipClass = await manager.findOneByOrFail(ShipClassDef, {
        id: input.shipClassId,
      });
      const existing = await manager.exists(ShipClassDiscovery, {
        where: { userId: input.userId, shipClassId: input.shipClassId },
      });
      if (existing) {
        return { discovered: false, prestigeAwarded: 0, name: shipClass.name };
      }
      await manager
        .createQueryBuilder()
        .insert()
        .into(ShipClassDiscovery)
        .values({ ...input, source: 'TARGET_SCAN' })
        .orIgnore()
        .execute();
      await this.prestigeService.change(
        input.userId,
        STU_PRESTIGE.SCAN_SHIP_HULL,
        `${STU_PRESTIGE.SCAN_SHIP_HULL} Prestige erhalten für die Entdeckung des Schiffsrumpfs „${shipClass.name}“`,
        manager,
      );
      return {
        discovered: true,
        prestigeAwarded: STU_PRESTIGE.SCAN_SHIP_HULL,
        name: shipClass.name,
      };
    });
  }

  getDiscoveries(userId: number) {
    return this.discoveryRepo.find({ where: { userId } });
  }
}
