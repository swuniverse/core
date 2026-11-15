import { Inject, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { isNpcUser } from '../auth/non-npc-users';
import {
  DATABASE_DISCOVERY,
  type DatabaseDiscoveryPort,
} from '../database/database-discovery.port';
import { STU_PRESTIGE } from '../prestige/prestige.constants';
import { SYSTEM_TYPE_BY_ID } from './starmap-system-types';
import { SystemTypeDiscovery } from './entities/system-type-discovery.entity';
import { PrestigeService } from '../prestige/prestige.service';

@Injectable()
export class SystemTypeDiscoveryService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SystemTypeDiscovery)
    private readonly discoveryRepo: Repository<SystemTypeDiscovery>,
    private readonly prestigeService: PrestigeService,
    @Optional()
    @Inject(DATABASE_DISCOVERY)
    private readonly databaseDiscovery?: DatabaseDiscoveryPort,
  ) {}

  async discover(input: {
    userId: number;
    systemTypeId: number;
    source: 'SECTOR_SCAN' | 'SYSTEM_ENTRY';
    spacecraftId?: number | null;
    layerId?: number | null;
    x?: number | null;
    y?: number | null;
  }): Promise<{ discovered: boolean; prestigeAwarded: number; name: string }> {
    const definition = SYSTEM_TYPE_BY_ID[input.systemTypeId];
    if (!definition) throw new Error('Ungültiger Sternensystemtyp');

    const outcome = await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(SystemTypeDiscovery)
        .values({
          ...input,
          spacecraftId: input.spacecraftId ?? null,
          layerId: input.layerId ?? null,
          x: input.x ?? null,
          y: input.y ?? null,
        })
        .orIgnore()
        .returning('id')
        .execute();
      if (!result.raw.length) {
        return { discovered: false, prestigeAwarded: 0, name: definition.name };
      }
      if (await isNpcUser(manager, input.userId)) {
        return { discovered: true, prestigeAwarded: 0, name: definition.name };
      }
      await this.prestigeService.change(
        input.userId,
        STU_PRESTIGE.DISCOVER_SYSTEM_TYPE,
        `${STU_PRESTIGE.DISCOVER_SYSTEM_TYPE} Prestige erhalten für die Entdeckung des Sternensystemtyps „${definition.name}“`,
        manager,
      );
      return {
        discovered: true,
        prestigeAwarded: STU_PRESTIGE.DISCOVER_SYSTEM_TYPE,
        name: definition.name,
      };
    });
    // First discovery by a player: notice and database award check (tmw-D5b).
    if (outcome.discovered && outcome.prestigeAwarded > 0) {
      await this.databaseDiscovery?.notify?.({
        userId: input.userId,
        category: 'SYSTEM_TYPES',
        name: outcome.name,
        prestige: outcome.prestigeAwarded,
      });
    }
    return outcome;
  }

  async getDiscoveries(userId: number): Promise<SystemTypeDiscovery[]> {
    return this.discoveryRepo.find({ where: { userId } });
  }
}
