import { BadRequestException, Injectable } from '@nestjs/common';
import { Colony } from './entities/colony.entity';
import { ColonyStorageService } from './colony-storage.service';
import {
  deductColonyEnergy,
  getColonyChangeable,
  syncLegacyColonySnapshot,
} from './colony-stats.service';
import { GameDataService } from '../game-data/game-data.service';
export interface ColonyDefenseConstants {
  shield: {
    generatorCapacity: number;
    batteryCapacity: number;
    loadPerEnergy: number;
  };
  phalanx: {
    energy: { damage: number; energyCost: number; hitChance: number };
    particle: {
      damage: number;
      energyCost: number;
      torpedoAmount: number;
      hitChance: number;
    };
    antiParticle: { incomingProjectileReductionPercent: number };
  };
}

export const DEFAULT_COLONY_DEFENSE: ColonyDefenseConstants = {
  shield: {
    generatorCapacity: 4000,
    batteryCapacity: 10000,
    loadPerEnergy: 10,
  },
  phalanx: {
    energy: { damage: 250, energyCost: 25, hitChance: 86 },
    particle: { damage: 180, energyCost: 15, torpedoAmount: 1, hitChance: 75 },
    antiParticle: { incomingProjectileReductionPercent: 50 },
  },
};

@Injectable()
export class ColonyDefenseService {
  readonly constants = DEFAULT_COLONY_DEFENSE;

  constructor(
    private readonly storageService: ColonyStorageService,
    private readonly gameData: GameDataService,
  ) {}

  calculateMaxShields(colony: Colony): number {
    let max = 0;
    for (const field of colony.fields ?? []) {
      if (!field.buildingId || field.isBuilding || !field.isActive) continue;
      const functions = (field as any).functions as number[] | undefined;
      // Prefer explicit test helpers when present, otherwise use building ids via callers.
      if (functions?.includes(24))
        max += this.constants.shield.generatorCapacity;
      if (functions?.includes(25)) max += this.constants.shield.batteryCapacity;
    }
    return max;
  }

  calculateMaxShieldsByFunctions(functionIds: number[]): number {
    let max = 0;
    if (functionIds.includes(24))
      max += this.constants.shield.generatorCapacity;
    max +=
      functionIds.filter((id) => id === 25).length *
      this.constants.shield.batteryCapacity;
    return max;
  }

  syncShieldCapacity(colony: Colony, maxShields: number): void {
    const changeable = getColonyChangeable(colony);
    changeable.maxShields = Math.max(0, maxShields);
    changeable.shields = Math.min(changeable.shields ?? 0, changeable.maxShields);
    if (changeable.maxShields <= 0) {
      changeable.shields = 0;
      changeable.shieldFrequency = null;
    }
    syncLegacyColonySnapshot(colony);
  }

  loadShields(colony: Colony, amount: number, maxShields: number): number {
    const changeable = getColonyChangeable(colony);
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    if (maxShields <= 0)
      throw new BadRequestException('Active shield generator required');
    const current = changeable.shields ?? 0;
    const capacity = Math.max(0, maxShields - current);
    const loadAmount = Math.min(
      amount,
      capacity,
      changeable.energy * this.constants.shield.loadPerEnergy,
    );
    if (loadAmount <= 0) {
      throw new BadRequestException('No shield capacity or energy available');
    }
    const energyCost = Math.ceil(
      loadAmount / this.constants.shield.loadPerEnergy,
    );
    deductColonyEnergy(colony, energyCost);
    changeable.maxShields = maxShields;
    changeable.shields = current + loadAmount;
    syncLegacyColonySnapshot(colony);
    return loadAmount;
  }

  hasEnergyPhalanx(functionIds: number[]): boolean {
    return functionIds.includes(26);
  }

  hasParticlePhalanx(functionIds: number[]): boolean {
    return functionIds.includes(27);
  }

  hasAntiParticle(functionIds: number[]): boolean {
    return functionIds.includes(28);
  }

  setTorpedoType(colony: Colony, commodityId: number | null): void {
    getColonyChangeable(colony).torpedoTypeId = commodityId;
  }

  async consumeParticlePhalanxTorpedo(colony: Colony): Promise<boolean> {
    const torpedoTypeId = getColonyChangeable(colony).torpedoTypeId;
    if (!torpedoTypeId) return false;
    const torpedoType = this.gameData.getTorpedoType(torpedoTypeId);
    if (!torpedoType) return false;
    try {
      await this.storageService.lowerStorage(
        colony,
        torpedoType.commodityId,
        this.constants.phalanx.particle.torpedoAmount,
      );
      return true;
    } catch {
      return false;
    }
  }
}
