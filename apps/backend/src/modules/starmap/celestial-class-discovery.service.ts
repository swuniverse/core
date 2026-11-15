import { Inject, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { isNpcUser } from '../auth/non-npc-users';
import {
  DATABASE_DISCOVERY,
  type DatabaseDiscoveryPort,
} from '../database/database-discovery.port';
import { STU_PRESTIGE } from '../prestige/prestige.constants';
import { PrestigeService } from '../prestige/prestige.service';
import {
  resolveSwuPlanetType,
  type SwuTypeSource,
} from './generator/swu-planet-type';
import { CelestialClassDiscovery } from './entities/celestial-class-discovery.entity';

@Injectable()
export class CelestialClassDiscoveryService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CelestialClassDiscovery)
    private readonly discoveryRepo: Repository<CelestialClassDiscovery>,
    private readonly prestigeService: PrestigeService,
    @Optional()
    @Inject(DATABASE_DISCOVERY)
    private readonly databaseDiscovery?: DatabaseDiscoveryPort,
  ) {}

  async discover(input: {
    userId: number;
    object: SwuTypeSource & { id: number };
    spacecraftId: number;
  }): Promise<{ discovered: boolean; prestigeAwarded: number; name: string } | null> {
    const definition = resolveSwuPlanetType(input.object);
    if (!definition) return null;

    const outcome = await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(CelestialClassDiscovery)
        .values({
          userId: input.userId,
          spacecraftId: input.spacecraftId,
          celestialObjectId: input.object.id,
          classId: definition.classId,
          swuTypeKey: definition.key,
          source: 'SECTOR_SCAN',
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
        STU_PRESTIGE.DISCOVER_PLANET_CLASS,
        `${STU_PRESTIGE.DISCOVER_PLANET_CLASS} Prestige erhalten für die Entdeckung des Planetentyps „${definition.name}“`,
        manager,
      );
      return {
        discovered: true,
        prestigeAwarded: STU_PRESTIGE.DISCOVER_PLANET_CLASS,
        name: definition.name,
      };
    });
    // First discovery by a player: notice and database award check (tmw-D5b).
    if (outcome.discovered && outcome.prestigeAwarded > 0) {
      await this.databaseDiscovery?.notify?.({
        userId: input.userId,
        category: 'PLANET_TYPES',
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
