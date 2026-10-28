import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { STU_PRESTIGE } from '../prestige/prestige.constants';
import { PrestigeService } from '../prestige/prestige.service';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { StationClassDiscovery } from './entities/station-class-discovery.entity';

@Injectable()
export class StationClassDiscoveryService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(StationClassDiscovery)
    private readonly discoveryRepo: Repository<StationClassDiscovery>,
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
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(StationClassDiscovery)
        .values({ ...input, source: 'TARGET_SCAN' })
        .orIgnore()
        .returning('id')
        .execute();
      if (!result.raw.length) {
        return { discovered: false, prestigeAwarded: 0, name: shipClass.name };
      }
      await this.prestigeService.change(
        input.userId,
        STU_PRESTIGE.SCAN_STATION_HULL,
        `${STU_PRESTIGE.SCAN_STATION_HULL} Prestige erhalten für die Entdeckung des Stationsrumpfs „${shipClass.name}“`,
        manager,
      );
      return {
        discovered: true,
        prestigeAwarded: STU_PRESTIGE.SCAN_STATION_HULL,
        name: shipClass.name,
      };
    });
  }

  getDiscoveries(userId: number) {
    return this.discoveryRepo.find({ where: { userId } });
  }
}
