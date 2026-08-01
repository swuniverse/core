import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { GameDataService } from '../game-data/game-data.service';

@Injectable()
export class ShipClassService {
  constructor(
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    @InjectRepository(FactionEntity)
    private readonly factionRepo: Repository<FactionEntity>,
    private readonly gameData: GameDataService,
  ) {}

  async seedDefaults(): Promise<void> {
    const factions = await this.factionRepo.find();
    const factionMap = new Map(factions.map((f) => [f.key, f.id]));

    const yamlDefs = this.gameData.getShipClassDefs();
    const activeKeys = yamlDefs.map((def) => def.key);
    if (activeKeys.length > 0) {
      await this.shipClassRepo.update(
        { key: Not(In(activeKeys)) },
        { isNpc: true, starterAllowed: false },
      );
    }
    for (const def of yamlDefs) {
      const definition = {
        key: def.key,
        name: def.name,
        category: def.category,
        role: def.role,
        factionId: def.factionKey ? (factionMap.get(def.factionKey) ?? null) : null,
        unlockTechId: def.unlockTechId,
        buildTimeTicks: def.buildTimeTicks,
        cargoCapacity: def.cargoCapacity,
        crewMin: def.crewMin,
        crewMax: def.crewMax,
        hullBase: def.hullBase,
        shieldBase: def.shieldBase,
        epsBase: def.epsBase,
        warpBase: def.warpBase,
        batteryBase: def.batteryBase,
        shuttleSlots: def.shuttleSlots ?? 0,
        starterAllowed: def.starterAllowed,
        isNpc: def.isNpc,
        isColonizer: def.isColonizer ?? false,
        colonizerTier: def.colonizerTier ?? null,
        colonizationBuildingId: def.colonizationBuildingId ?? null,
      };

      const existing = await this.shipClassRepo.findOne({
        where: { key: definition.key },
      });

      if (existing) {
        Object.assign(existing, definition);
        await this.shipClassRepo.save(existing);
      } else {
        await this.shipClassRepo.save(this.shipClassRepo.create(definition));
      }
    }
  }


  findAll(): Promise<ShipClassDef[]> {
    return this.shipClassRepo.find({
      where: { isNpc: false },
      order: { id: 'ASC' },
    });
  }

  findById(id: number): Promise<ShipClassDef | null> {
    return this.shipClassRepo.findOneBy({ id });
  }
}
