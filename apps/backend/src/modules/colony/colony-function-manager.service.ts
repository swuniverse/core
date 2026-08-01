import { Injectable } from '@nestjs/common';
import { GameDataService } from '../game-data/game-data.service';
import { Colony } from './entities/colony.entity';

@Injectable()
export class ColonyFunctionManagerService {
  constructor(private readonly gameData: GameDataService) {}

  getPresentFunctionIds(colony: Colony): number[] {
    return this.collectFunctionIds(colony, new Set(), false);
  }

  getActiveFunctionIds(
    colony: Colony,
    ignoredFieldIds: Set<number> = new Set(),
  ): number[] {
    return this.collectFunctionIds(colony, ignoredFieldIds, true);
  }

  hasActiveFunction(
    colony: Colony,
    functionId: number,
    ignoredFieldIds: Set<number> = new Set(),
  ): boolean {
    return this.getActiveFunctionIds(colony, ignoredFieldIds).includes(
      functionId,
    );
  }

  countActiveFunctions(
    colony: Colony,
    functionIds: number[],
    ignoredFieldIds: Set<number> = new Set(),
  ): number {
    const targets = new Set(functionIds);
    return this.getActiveFunctionIds(colony, ignoredFieldIds).filter((id) =>
      targets.has(id),
    ).length;
  }

  private collectFunctionIds(
    colony: Colony,
    ignoredFieldIds: Set<number>,
    activeOnly: boolean,
  ): number[] {
    const ids = new Set<number>();
    for (const field of colony.fields ?? []) {
      if (
        !field.buildingId ||
        field.isBuilding ||
        ignoredFieldIds.has(field.id)
      ) {
        continue;
      }
      if (activeOnly && !field.isActive) continue;
      for (const functionId of this.gameData.getBuildingFunctions(
        field.buildingId,
      )) {
        ids.add(functionId);
      }
    }
    return Array.from(ids).sort((a, b) => a - b);
  }
}
