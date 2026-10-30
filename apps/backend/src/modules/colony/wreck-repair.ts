import {
  isWreckField,
  wreckDamageForField,
  wreckRepairPlan,
  type WreckRepairPlan,
} from '@swuniverse/shared';
import { GameDataService } from '../game-data/game-data.service';
import { COLONY_FUNCTION_IDS } from './colony.constants';
import type { ColonyField } from './entities/colony-field.entity';
import type { Colony } from './entities/colony.entity';

export function isWreckColonyField(
  gameData: GameDataService,
  field: Pick<ColonyField, 'terrainTileId'>,
): boolean {
  return (
    field.terrainTileId != null &&
    isWreckField(gameData.getCategoriesForTerrainTile(field.terrainTileId))
  );
}

/** Reparaturplan fuer ein Wrack-Feld; Reparaturstation halbiert Kosten und Zeit. */
export function colonyWreckRepairPlan(
  gameData: GameDataService,
  colony: Colony,
  field: Pick<ColonyField, 'fieldIndex'>,
): WreckRepairPlan {
  const hasRepairStationBonus = (colony.fields ?? []).some(
    (candidate) =>
      candidate.buildingId != null &&
      !candidate.isBuilding &&
      candidate.isActive &&
      gameData
        .getBuildingFunctions(candidate.buildingId)
        .includes(COLONY_FUNCTION_IDS.REPAIR_STATION),
  );
  return wreckRepairPlan(
    wreckDamageForField(colony.id, field.fieldIndex),
    hasRepairStationBonus,
  );
}
