import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { GameDataService } from '../game-data/game-data.service';
import {
  COLONIZATION_BUILDING_IDS,
  COLONIZATION_TECH_IDS,
  COLONIZER_SHIP_CLASS_KEYS,
} from '@swuniverse/shared';

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

    const yamlDefs = [
      ...this.gameData.getShipClassDefs(),
      ...this.getColonizerShipClassDefs(),
    ];
    for (const def of yamlDefs) {
      const definition = {
        key: def.key,
        name: def.name,
        category: def.category,
        role: def.role,
        factionId: factionMap.get(def.factionKey) ?? null,
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

  private getColonizerShipClassDefs() {
    return [
      {
        key: COLONIZER_SHIP_CLASS_KEYS.REBEL_TIER_2,
        name: 'CR90 Kolonieschiff',
        category: 'CORVETTE',
        role: 'COLONIZER',
        factionKey: 'REBEL_ALLIANCE',
        unlockTechId: COLONIZATION_TECH_IDS.REBEL_TIER_2_COLONIZER,
        buildTimeTicks: 0,
        cargoCapacity: 220,
        crewMin: 0,
        crewMax: 24,
        hullBase: 180,
        shieldBase: 100,
        epsBase: 140,
        warpBase: 4,
        batteryBase: 60,
        starterAllowed: false,
        isNpc: false,
        isColonizer: true,
        colonizerTier: 2,
        colonizationBuildingId: COLONIZATION_BUILDING_IDS.REBEL_COLONY_CENTRAL,
      },
      {
        key: COLONIZER_SHIP_CLASS_KEYS.EMPIRE_TIER_2,
        name: 'Lambda-Klasse Siedlungsschiff',
        category: 'ESCORT',
        role: 'COLONIZER',
        factionKey: 'GALACTIC_EMPIRE',
        unlockTechId: COLONIZATION_TECH_IDS.EMPIRE_TIER_2_COLONIZER,
        buildTimeTicks: 0,
        cargoCapacity: 180,
        crewMin: 0,
        crewMax: 18,
        hullBase: 155,
        shieldBase: 90,
        epsBase: 130,
        warpBase: 4,
        batteryBase: 55,
        starterAllowed: false,
        isNpc: false,
        isColonizer: true,
        colonizerTier: 2,
        colonizationBuildingId: COLONIZATION_BUILDING_IDS.EMPIRE_COLONY_CENTRAL,
      },
    ];
  }

  findAll(): Promise<ShipClassDef[]> {
    return this.shipClassRepo.find({ order: { id: 'ASC' } });
  }

  findById(id: number): Promise<ShipClassDef | null> {
    return this.shipClassRepo.findOneBy({ id });
  }
}
