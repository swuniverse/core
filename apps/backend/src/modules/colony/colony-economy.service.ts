import { Injectable } from '@nestjs/common';
import {
  BuildingFunctionDef,
  GameDataService,
} from '../game-data/game-data.service';
import { Colony } from './entities/colony.entity';
import { ColonyStatsService } from './colony-stats.service';
import { ColonyFunctionManagerService } from './colony-function-manager.service';

export interface ColonyFeatureTabAccess {
  visible: boolean;
  reason?: string;
  requiredFunctionIds?: number[];
  presentFunctionIds?: number[];
  activeFunctionIds?: number[];
}

export interface ColonyFeatureAccess {
  tabs: Record<string, ColonyFeatureTabAccess>;
  functions: {
    present: BuildingFunctionDef[];
    active: BuildingFunctionDef[];
    groups: Record<
      string,
      { presentFunctionIds: number[]; activeFunctionIds: number[] }
    >;
  };
}

@Injectable()
export class ColonyEconomyService {
  private readonly airfieldFunctionIds = [4];
  private readonly fighterShipyardFunctionIds = [5];
  private readonly shipyardFunctionIds = [6, 7, 8, 21];
  private readonly repairStationFunctionId = 22;
  private readonly fabricationFunctionIds = [
    9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
  ];
  private readonly fabricationSupportFunctionIds = [29, 30];
  private readonly defenseFunctionIds = [24, 25, 26, 27, 28];
  private readonly academyFunctionIds = [20];
  private readonly centralCrewTrainingFunctionIds = [1, 2];

  constructor(
    private readonly statsService: ColonyStatsService,
    private readonly gameData: GameDataService,
    private readonly functionManager?: ColonyFunctionManagerService,
  ) {}

  calculateSummary(colony: Colony, excludedFieldIds: Set<number> = new Set()) {
    return this.statsService.calculateSummary(colony, excludedFieldIds);
  }

  buildEffectiveState(
    colony: Colony,
    excludedFieldIds: Set<number> = new Set(),
  ) {
    return this.calculateSummary(colony, excludedFieldIds).effectiveState;
  }

  getActiveFunctions(
    colony: Colony,
    excludedFieldIds: Set<number> = new Set(),
  ): BuildingFunctionDef[] {
    return this.toFunctionDefs(
      this.getActiveFunctionIds(colony, excludedFieldIds),
    );
  }

  getPresentFunctions(
    colony: Colony,
    excludedFieldIds: Set<number> = new Set(),
  ): BuildingFunctionDef[] {
    return this.toFunctionDefs(
      this.getPresentFunctionIds(colony, excludedFieldIds),
    );
  }

  getActiveFunctionIds(
    colony: Colony,
    excludedFieldIds: Set<number> = new Set(),
  ): number[] {
    return (
      this.functionManager?.getActiveFunctionIds(colony, excludedFieldIds) ??
      this.collectFunctionIds(colony, excludedFieldIds, true)
    );
  }

  getPresentFunctionIds(
    colony: Colony,
    _excludedFieldIds: Set<number> = new Set(),
  ): number[] {
    return (
      this.functionManager?.getPresentFunctionIds(colony) ??
      this.collectFunctionIds(colony, new Set(), false)
    );
  }

  hasActiveFunction(
    colony: Colony,
    functionId: number,
    excludedFieldIds: Set<number> = new Set(),
  ): boolean {
    return (
      this.functionManager?.hasActiveFunction(
        colony,
        functionId,
        excludedFieldIds,
      ) ??
      this.collectFunctionIds(colony, excludedFieldIds, true).includes(
        functionId,
      )
    );
  }

  buildFeatureAccess(colony: Colony): ColonyFeatureAccess {
    const presentIds = this.getPresentFunctionIds(colony);
    const activeIds = this.getActiveFunctionIds(colony);
    const hasPresent = (ids: number[]) =>
      ids.some((id) => presentIds.includes(id));
    const group = (ids: number[]) => {
      const presentFunctionIds = ids.filter((id) => presentIds.includes(id));
      const activeFunctionIds = ids.filter((id) => activeIds.includes(id));
      return { presentFunctionIds, activeFunctionIds };
    };
    const shipyardIds = [
      ...this.fighterShipyardFunctionIds,
      ...this.shipyardFunctionIds,
    ];
    const fabricationIds = [
      ...this.fabricationFunctionIds,
      ...this.fabricationSupportFunctionIds,
    ];
    const coreVisible = { visible: true };
    const shipyardGroup = group(shipyardIds);
    const fabricationGroup = group(fabricationIds);
    const defenseGroup = group(this.defenseFunctionIds);
    const airfieldGroup = group(this.airfieldFunctionIds);

    return {
      tabs: {
        info: coreVisible,
        build: coreVisible,
        events: coreVisible,
        buildingManagement: coreVisible,
        settings: coreVisible,
        crew: coreVisible,
        shipyard: {
          visible: hasPresent(shipyardIds),
          reason: 'Benötigt eine gebaute Werft',
          requiredFunctionIds: shipyardIds,
          presentFunctionIds: shipyardGroup.presentFunctionIds,
          activeFunctionIds: shipyardGroup.activeFunctionIds,
        },
        fabrication: {
          visible: hasPresent(fabricationIds),
          reason:
            'Benötigt eine gebaute Torpedo-, Modul- oder Fabrikationsunterstützung',
          requiredFunctionIds: fabricationIds,
          presentFunctionIds: fabricationGroup.presentFunctionIds,
          activeFunctionIds: fabricationGroup.activeFunctionIds,
        },
        defense: {
          visible: hasPresent(this.defenseFunctionIds),
          reason: 'Benötigt ein gebautes Schild- oder Verteidigungsgebäude',
          requiredFunctionIds: this.defenseFunctionIds,
          presentFunctionIds: defenseGroup.presentFunctionIds,
          activeFunctionIds: defenseGroup.activeFunctionIds,
        },
        hangar: {
          visible: hasPresent(this.airfieldFunctionIds),
          reason: 'Benötigt einen gebauten Raumhafen',
          requiredFunctionIds: this.airfieldFunctionIds,
          presentFunctionIds: airfieldGroup.presentFunctionIds,
          activeFunctionIds: airfieldGroup.activeFunctionIds,
        },
      },
      functions: {
        present: this.toFunctionDefs(presentIds),
        active: this.toFunctionDefs(activeIds),
        groups: {
          fighterShipyards: group(this.fighterShipyardFunctionIds),
          shipyards: group(this.shipyardFunctionIds),
          repairShipyards: group([this.repairStationFunctionId]),
          fabrication: group(this.fabricationFunctionIds),
          fabricationSupport: group(this.fabricationSupportFunctionIds),
          defense: group(this.defenseFunctionIds),
          airfield: group(this.airfieldFunctionIds),
          academy: group(this.academyFunctionIds),
          centralCrewTraining: group(this.centralCrewTrainingFunctionIds),
        },
      },
    };
  }

  getCrewTrainingFacility(colony: Colony): {
    present: boolean;
    active: boolean;
    mode: 'ACADEMY' | 'CENTRAL' | null;
    maxConcurrent: number;
    presentFunctionIds: number[];
    activeFunctionIds: number[];
  } {
    const academyPresent = this.getPresentFunctionIds(colony).filter((id) =>
      this.academyFunctionIds.includes(id),
    );
    const academyActive = this.getActiveFunctionIds(colony).filter((id) =>
      this.academyFunctionIds.includes(id),
    );
    const centralPresent = this.getPresentFunctionIds(colony).filter((id) =>
      this.centralCrewTrainingFunctionIds.includes(id),
    );
    const centralActive = this.getActiveFunctionIds(colony).filter((id) =>
      this.centralCrewTrainingFunctionIds.includes(id),
    );

    if (academyActive.length > 0) {
      return {
        present: true,
        active: true,
        mode: 'ACADEMY',
        maxConcurrent: Number.POSITIVE_INFINITY,
        presentFunctionIds: academyPresent,
        activeFunctionIds: academyActive,
      };
    }

    if (centralPresent.length > 0) {
      return {
        present: true,
        active: centralActive.length > 0,
        mode: 'CENTRAL',
        maxConcurrent: 2,
        presentFunctionIds: [...academyPresent, ...centralPresent],
        activeFunctionIds: centralActive,
      };
    }

    return {
      present: academyPresent.length > 0,
      active: false,
      mode: academyPresent.length > 0 ? 'ACADEMY' : null,
      maxConcurrent: Number.POSITIVE_INFINITY,
      presentFunctionIds: academyPresent,
      activeFunctionIds: [],
    };
  }

  buildingHasFunction(buildingId: number, functionId: number): boolean {
    return this.gameData.buildingHasFunction(buildingId, functionId);
  }

  private collectFunctionIds(
    colony: Colony,
    excludedFieldIds: Set<number>,
    activeOnly: boolean,
  ): number[] {
    const ids = new Set<number>();
    for (const field of colony.fields ?? []) {
      if (
        !field.buildingId ||
        field.isBuilding ||
        excludedFieldIds.has(field.id)
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

  private toFunctionDefs(functionIds: number[]): BuildingFunctionDef[] {
    return functionIds.map((id) => {
      const definition = this.gameData.getBuildingFunction(id);
      return {
        id,
        key: definition?.key ?? String(id),
        name: definition?.name ?? `Function ${id}`,
      };
    });
  }
}
