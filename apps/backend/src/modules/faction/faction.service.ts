import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import { FactionEntity } from './entities/faction.entity';
import { FactionModifier } from './entities/faction-modifier.entity';

const DEFAULT_FACTIONS: Array<{
  key: Faction;
  name: string;
  colorPrimary: string;
  colorSecondary: string;
  homeZone: string;
  starterShipClassId: number;
  starterProfileKey: string;
  modifiers: Pick<
    FactionModifier,
    | 'hullMultiplier'
    | 'shieldMultiplier'
    | 'cargoMultiplier'
    | 'researchMultiplier'
    | 'colonyGrowthMultiplier'
    | 'tradeModifier'
  >;
}> = [
  {
    key: Faction.REBEL_ALLIANCE,
    name: 'Rebellenallianz',
    colorPrimary: '#2563eb',
    colorSecondary: '#bfdbfe',
    homeZone: 'REBEL',
    starterShipClassId: 1001,
    starterProfileKey: 'rebel-starter',
    modifiers: {
      hullMultiplier: 1,
      shieldMultiplier: 1.05,
      cargoMultiplier: 1,
      researchMultiplier: 1.05,
      colonyGrowthMultiplier: 1,
      tradeModifier: 1,
    },
  },
  {
    key: Faction.GALACTIC_EMPIRE,
    name: 'Galaktisches Imperium',
    colorPrimary: '#dc2626',
    colorSecondary: '#fecaca',
    homeZone: 'EMPIRE',
    starterShipClassId: 2001,
    starterProfileKey: 'empire-starter',
    modifiers: {
      hullMultiplier: 1.05,
      shieldMultiplier: 1,
      cargoMultiplier: 1,
      researchMultiplier: 1,
      colonyGrowthMultiplier: 1,
      tradeModifier: 1,
    },
  },
];

@Injectable()
export class FactionService {
  constructor(
    @InjectRepository(FactionEntity)
    private readonly factionRepo: Repository<FactionEntity>,
    @InjectRepository(FactionModifier)
    private readonly factionModifierRepo: Repository<FactionModifier>,
  ) {}

  async seedDefaults(): Promise<void> {
    const count = await this.factionRepo.count();
    if (count > 0) {
      return;
    }

    for (const definition of DEFAULT_FACTIONS) {
      const faction = await this.factionRepo.save(
        this.factionRepo.create({
          key: definition.key,
          name: definition.name,
          colorPrimary: definition.colorPrimary,
          colorSecondary: definition.colorSecondary,
          homeZone: definition.homeZone,
          starterShipClassId: definition.starterShipClassId,
          starterProfileKey: definition.starterProfileKey,
        }),
      );

      await this.factionModifierRepo.save(
        this.factionModifierRepo.create({
          factionId: faction.id,
          ...definition.modifiers,
        }),
      );
    }
  }

  async syncStarterShipClassIds(): Promise<void> {
    // ponytail: legacy stub, remove when starterShipClassId column dropped
  }

  findAll(): Promise<FactionEntity[]> {
    return this.factionRepo.find({ relations: { modifiers: true } });
  }

  findByKey(key: Faction | string): Promise<FactionEntity | null> {
    return this.factionRepo.findOne({
      where: { key },
      relations: { modifiers: true },
    });
  }
}
