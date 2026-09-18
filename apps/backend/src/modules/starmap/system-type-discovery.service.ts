import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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

    return this.dataSource.transaction(async (manager) => {
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
        .execute();
      if (!result.identifiers.length) {
        return { discovered: false, prestigeAwarded: 0, name: definition.name };
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
  }

  async getDiscoveries(userId: number): Promise<SystemTypeDiscovery[]> {
    return this.discoveryRepo.find({ where: { userId } });
  }
}
