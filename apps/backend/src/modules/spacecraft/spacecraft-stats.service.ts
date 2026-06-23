import { Injectable } from '@nestjs/common';
import { GameDataService, ModuleDef } from '../game-data/game-data.service';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';

export interface CalculatedSpacecraftStats {
  hullMax: number;
  shieldsMax: number;
  energyMax: number;
  warpSpeed: number;
  crewMax: number;
  cargoMax: number;
  batteryMax: number;
}

@Injectable()
export class SpacecraftStatsService {
  constructor(private readonly gameData: GameDataService) {}

  calculateStats(
    shipClass: ShipClassDef,
    modules: SpacecraftModule[] = [],
  ): CalculatedSpacecraftStats {
    const stats: CalculatedSpacecraftStats = {
      hullMax: shipClass.hullBase,
      shieldsMax: shipClass.shieldBase,
      energyMax: shipClass.epsBase,
      warpSpeed: shipClass.warpBase,
      crewMax: shipClass.crewMax,
      cargoMax: shipClass.cargoCapacity,
      batteryMax: shipClass.batteryBase,
    };

    for (const module of modules) {
      if (!module.isActive || module.integrity <= 0) continue;
      const definition = this.findModuleDefinition(module.moduleType);
      if (!definition) continue;
      this.applyModule(stats, definition, module.level);
    }

    return stats;
  }

  applyStats(
    ship: Spacecraft,
    shipClass: ShipClassDef,
    modules: SpacecraftModule[] = [],
  ): Spacecraft {
    const stats = this.calculateStats(shipClass, modules);
    ship.hullMax = stats.hullMax;
    ship.shieldsMax = stats.shieldsMax;
    ship.energyMax = stats.energyMax;
    ship.warpSpeed = stats.warpSpeed;
    ship.crewMax = stats.crewMax;
    ship.cargoMax = stats.cargoMax;
    ship.batteryMax = stats.batteryMax;

    ship.hull = Math.min(ship.hull, ship.hullMax);
    ship.shields = Math.min(ship.shields, ship.shieldsMax);
    ship.energy = Math.min(ship.energy, ship.energyMax);
    ship.crew = Math.min(ship.crew, ship.crewMax);
    ship.cargoUsed = Math.min(ship.cargoUsed, ship.cargoMax);
    ship.battery = Math.min(ship.battery, ship.batteryMax);
    return ship;
  }

  private findModuleDefinition(moduleType: string): ModuleDef | undefined {
    return this.gameData
      .getAllModules()
      .find((definition) => definition.name === moduleType);
  }

  private applyModule(
    stats: CalculatedSpacecraftStats,
    definition: ModuleDef,
    level: number,
  ): void {
    const publicStats = definition.public as Record<string, unknown>;
    const secretStats = definition.secret as Record<string, unknown>;
    const levelScale = 1 + (Math.max(1, level) - 1) * 0.2;
    const scaled = (value: unknown) =>
      typeof value === 'number' ? Math.round(value * levelScale) : 0;

    switch (definition.category) {
      case 'HULL':
        stats.hullMax += scaled(publicStats.baseHullPoints);
        break;
      case 'SHIELDS':
        stats.shieldsMax +=
          scaled(publicStats.baseShieldPoints) ||
          scaled(secretStats.baseShieldStrength);
        break;
      case 'SPECIAL':
        stats.energyMax += scaled(publicStats.baseEnergyOutput);
        break;
      case 'SUBLIGHT_ENGINE':
        stats.warpSpeed += scaled(publicStats.baseSpeed);
        break;
      case 'HYPERDRIVE': {
        const rating = publicStats.hyperdriveRating;
        if (typeof rating === 'number') {
          stats.warpSpeed += Math.max(0, Math.round((4 - rating) * levelScale));
        }
        break;
      }
      case 'CARGO':
        stats.cargoMax += scaled(publicStats.baseCargoCapacity);
        break;
      default:
        break;
    }

    stats.crewMax += scaled(publicStats.baseCrewCapacity);
  }
}
