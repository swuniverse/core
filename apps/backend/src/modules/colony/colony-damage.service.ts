import { Injectable } from '@nestjs/common';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { GameDataService } from '../game-data/game-data.service';
import {
  COLONY_BUILDING_ID_SETS,
  COLONY_FUNCTION_ID_SETS,
} from './colony.constants';

export type ColonyDamageStatus = 'DAMAGED' | 'DISABLED_BY_DAMAGE' | 'DESTROYED';

export interface DamagedColonyFieldResult {
  fieldIndex: number;
  buildingId: number;
  integrityBefore: number;
  integrityAfter: number;
  damage: number;
  status: ColonyDamageStatus;
}

@Injectable()
export class ColonyDamageService {
  private readonly defenseFunctionIds = COLONY_FUNCTION_ID_SETS.DEFENSE;
  private readonly headquartersBuildingIds = COLONY_BUILDING_ID_SETS.HEADQUARTERS;

  constructor(private readonly gameData: GameDataService) {}

  applyIncomingDamage(
    colony: Colony,
    remainingDamage: number,
  ): DamagedColonyFieldResult[] {
    if (remainingDamage <= 0) return [];
    const target = this.selectDamageTargets(colony)[0];
    if (!target?.buildingId) return [];
    const integrityLoss = Math.max(1, Math.ceil(remainingDamage / 10));
    return [this.damageField(target, integrityLoss)];
  }

  selectDamageTargets(colony: Colony): ColonyField[] {
    const fields = (colony.fields ?? [])
      .filter((field) => field.buildingId && !field.isBuilding)
      .sort((a, b) => a.fieldIndex - b.fieldIndex);

    const defense = fields.filter(
      (field) => field.isActive && this.hasDefenseFunction(field),
    );
    if (defense.length > 0) return defense;

    const activeNonHq = fields.filter(
      (field) => field.isActive && !this.isHeadquartersField(field),
    );
    if (activeNonHq.length > 0) return activeNonHq;

    const inactiveNonHq = fields.filter(
      (field) => !this.isHeadquartersField(field),
    );
    if (inactiveNonHq.length > 0) return inactiveNonHq;

    return fields.filter((field) => !this.isHeadquartersField(field));
  }

  damageField(
    field: ColonyField,
    integrityLoss: number,
  ): DamagedColonyFieldResult {
    const integrityBefore = Math.max(0, field.integrity ?? 0);
    const maxIntegrity = Math.max(field.maxIntegrity ?? 0, integrityBefore, 1);
    const integrityAfter = Math.max(0, integrityBefore - integrityLoss);
    field.integrity = integrityAfter;

    let status: ColonyDamageStatus = 'DAMAGED';
    if (integrityAfter <= 0) {
      field.isActive = false;
      status = 'DESTROYED';
    } else if (integrityAfter / maxIntegrity < 0.5 && field.isActive) {
      field.isActive = false;
      status = 'DISABLED_BY_DAMAGE';
    }

    return {
      fieldIndex: field.fieldIndex,
      buildingId: field.buildingId!,
      integrityBefore,
      integrityAfter,
      damage: integrityBefore - integrityAfter,
      status,
    };
  }

  private hasDefenseFunction(field: ColonyField): boolean {
    if (!field.buildingId) return false;
    return this.gameData
      .getBuildingFunctions(field.buildingId)
      .some((functionId) => this.defenseFunctionIds.has(functionId));
  }

  private isHeadquartersField(field: ColonyField): boolean {
    return (
      !!field.buildingId && this.headquartersBuildingIds.has(field.buildingId)
    );
  }
}
