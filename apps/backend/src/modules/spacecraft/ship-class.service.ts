import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { FactionEntity } from '../faction/entities/faction.entity';

@Injectable()
export class ShipClassService {
  constructor(
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    @InjectRepository(FactionEntity)
    private readonly factionRepo: Repository<FactionEntity>,
  ) {}

  async seedDefaults(): Promise<void> {
    const factions = await this.factionRepo.find();
    const rebelFaction =
      factions.find((faction) => faction.key === 'REBEL_ALLIANCE') ?? null;
    const empireFaction =
      factions.find((faction) => faction.key === 'GALACTIC_EMPIRE') ?? null;

    const definitions = [
      {
        key: 'REBEL_STARTER_CORVETTE',
        name: 'Rebel Starter Corvette',
        category: 'CORVETTE',
        role: 'STARTER',
        factionId: rebelFaction?.id ?? null,
        unlockTechId: 4,
        buildTimeTicks: 0,
        cargoCapacity: 150,
        crewMin: 8,
        crewMax: 18,
        hullBase: 120,
        shieldBase: 70,
        epsBase: 110,
        warpBase: 3,
        batteryBase: 40,
        starterAllowed: true,
        isNpc: false,
      },
      {
        key: 'EMPIRE_STARTER_FRIGATE',
        name: 'Empire Starter Frigate',
        category: 'FRIGATE',
        role: 'STARTER',
        factionId: empireFaction?.id ?? null,
        unlockTechId: 4,
        buildTimeTicks: 0,
        cargoCapacity: 130,
        crewMin: 10,
        crewMax: 20,
        hullBase: 135,
        shieldBase: 60,
        epsBase: 105,
        warpBase: 3,
        batteryBase: 35,
        starterAllowed: true,
        isNpc: false,
      },
    ];

    for (const definition of definitions) {
      const existing = await this.shipClassRepo.findOne({
        where: { key: definition.key },
      });

      if (existing) {
        Object.assign(existing, definition);
        await this.shipClassRepo.save(existing);
        continue;
      }

      await this.shipClassRepo.save(this.shipClassRepo.create(definition));
    }
  }

  findAll(): Promise<ShipClassDef[]> {
    return this.shipClassRepo.find({ order: { id: 'ASC' } });
  }

  findById(id: number): Promise<ShipClassDef | null> {
    return this.shipClassRepo.findOneBy({ id });
  }

  async findStarterByFactionId(
    factionId: number,
  ): Promise<ShipClassDef | null> {
    const directMatch = await this.shipClassRepo.findOne({
      where: { factionId, starterAllowed: true },
      order: { id: 'ASC' },
    });
    if (directMatch) {
      return directMatch;
    }

    const faction = await this.factionRepo.findOne({
      where: { id: factionId },
    });
    if (!faction) {
      return null;
    }

    if (faction.starterShipClassId) {
      const byStoredId = await this.shipClassRepo.findOne({
        where: { id: faction.starterShipClassId },
      });
      if (byStoredId) {
        return byStoredId;
      }
    }

    const keyPrefix = faction.key === 'REBEL_ALLIANCE' ? 'REBEL_' : 'EMPIRE_';
    return this.shipClassRepo
      .findOne({
        where: { starterAllowed: true },
        order: { id: 'ASC' },
      })
      .then(async (fallback) => {
        const keyed = await this.shipClassRepo.findOne({
          where: {
            key:
              keyPrefix === 'REBEL_'
                ? 'REBEL_STARTER_CORVETTE'
                : 'EMPIRE_STARTER_FRIGATE',
          },
        });
        return keyed ?? fallback;
      });
  }
}
