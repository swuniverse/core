import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { getStuCelestialClass } from '@swuniverse/shared';
import { STU_PRESTIGE } from '../prestige/prestige.constants';
import { PrestigeService } from '../prestige/prestige.service';
import { CelestialClassDiscovery } from './entities/celestial-class-discovery.entity';

@Injectable()
export class CelestialClassDiscoveryService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CelestialClassDiscovery)
    private readonly discoveryRepo: Repository<CelestialClassDiscovery>,
    private readonly prestigeService: PrestigeService,
  ) {}

  async discover(input: {
    userId: number;
    classId: number | null;
    celestialObjectId: number;
    spacecraftId: number;
  }): Promise<{ discovered: boolean; prestigeAwarded: number; name: string } | null> {
    const definition = getStuCelestialClass(input.classId);
    if (!definition || definition.colonization === 'UNUSED') return null;

    return this.dataSource.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(CelestialClassDiscovery)
        .values({ ...input, classId: definition.id, source: 'SECTOR_SCAN' })
        .orIgnore()
        .returning('id')
        .execute();
      if (!result.raw.length) {
        return { discovered: false, prestigeAwarded: 0, name: definition.name };
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
  }

  getDiscoveries(userId: number) {
    return this.discoveryRepo.find({ where: { userId } });
  }
}
