import { Inject, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { isNpcUser } from '../auth/non-npc-users';
import {
  DATABASE_DISCOVERY,
  type DatabaseDiscoveryPort,
} from '../database/database-discovery.port';
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
    @Optional()
    @Inject(DATABASE_DISCOVERY)
    private readonly databaseDiscovery?: DatabaseDiscoveryPort,
  ) {}

  async discover(input: {
    userId: number;
    shipClassId: number;
    sourceSpacecraftId: number | null;
    targetSpacecraftId: number | null;
    source?: 'TARGET_SCAN' | 'RESEARCH' | 'AIRFIELD_START';
  }) {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const shipClass = await manager.findOneByOrFail(ShipClassDef, {
        id: input.shipClassId,
      });
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(ShipClassDiscovery)
        .values({ ...input, source: input.source ?? 'TARGET_SCAN' })
        .orIgnore()
        .returning('id')
        .execute();
      if (!result.raw.length) {
        return { discovered: false, prestigeAwarded: 0, name: shipClass.name };
      }
      if (await isNpcUser(manager, input.userId)) {
        return { discovered: true, prestigeAwarded: 0, name: shipClass.name };
      }
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
    // First discovery by a player: notice and database award check (tmw-D5b).
    if (outcome.discovered && outcome.prestigeAwarded > 0) {
      await this.databaseDiscovery?.notify?.({
        userId: input.userId,
        category: 'SHIP_HULLS',
        name: outcome.name,
        prestige: outcome.prestigeAwarded,
      });
    }
    return outcome;
  }

  getDiscoveries(userId: number) {
    return this.discoveryRepo.find({ where: { userId } });
  }
}
