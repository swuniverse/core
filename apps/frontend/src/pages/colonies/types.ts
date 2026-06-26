export interface ColonyField {
  id: number;
  fieldIndex: number;
  fieldType: number;
  terrainTileId: number | null;
  buildingId: number | null;
  isBuilding: boolean;
  isActive: boolean;
  integrity?: number;
  maxIntegrity?: number;
  buildProgress: number;
  buildFinishesAt: string | null;
  terraformingId?: number | null;
  terraformingFinishesAt?: string | null;
}

export interface ColonyStorageItem {
  id: number;
  commodityId: number;
  amount: number;
}

export type ShipyardQueueMode = 'BUILD' | 'REPAIR' | 'RETROFIT';

export type ShipyardQueueEntry = {
  id: number;
  shipClassId: number;
  spacecraftId?: number | null;
  mode?: ShipyardQueueMode;
  name: string;
  buildPlanName: string | null;
  buildPlanId?: number | null;
  buildPlanSignature?: string | null;
  moduleTypes: string[];
  moduleCommodityIds?: number[];
  moduleNames?: string[];
  crewAssigned?: number;
  crewIds?: number[];
  repairSnapshot?: {
    hullBefore: number;
    hullAfter: number;
    moduleIntegrityBefore: Array<{ moduleId: number; integrity: number }>;
    costs: Array<{ commodityId: number; amount: number }>;
  } | null;
  retrofitSnapshot?: {
    oldModuleCommodityIds: number[];
    newModuleCommodityIds: number[];
    newModuleTypes: string[];
    returnedModuleCommodityIds: number[];
    consumedModuleCommodityIds: number[];
  } | null;
  finishesAt: string;
  status: string;
};

export interface ColonyEventDto {
  id: number;
  colonyId?: number;
  userId?: number;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  tickId?: number | null;
  readAt?: string | null;
  createdAt: string;
}

export interface TorpedoTypeDto {
  id: number;
  commodityId: number;
  name: string;
  level: number;
  baseDamage: number;
  criticalChance: number;
  hitFactor: number;
  hullDamageFactor: number;
  shieldDamageFactor: number;
  variance: number;
  energyCost: number;
  productionAmount: number;
  researchId: number | null;
  amount?: number;
}

export enum BuildingMassActionMode {
  EPS_CONSUMERS = 1,
  SELECTION = 2,
  EPS_PRODUCERS = 3,
  INDUSTRY = 4,
  RESIDENTIALS = 5,
  COMMODITY_CONSUMERS = 6,
  COMMODITY_PRODUCERS = 7,
}

export interface BuildingRepairPlan {
  fieldIndex: number;
  buildingId: number | null;
  buildingName: string;
  integrity: number;
  maxIntegrity: number;
  damageRatio: number;
  energyCost: number;
  costs: Array<{ commodityId: number; amount: number }>;
  repairable: boolean;
  reason?: string;
}

export interface BuildingRepairPreview {
  fields: BuildingRepairPlan[];
  totalEnergyCost: number;
  totalCosts: Array<{ commodityId: number; amount: number }>;
}

export interface BuildingRepairResult {
  action: 'REPAIR';
  repaired: Array<{
    fieldIndex: number;
    buildingId: number;
    buildingName: string;
  }>;
  skipped: Array<{
    fieldIndex: number;
    buildingId: number | null;
    reason: string;
  }>;
  totalEnergyCost: number;
  totalCosts: Array<{ commodityId: number; amount: number }>;
  previewAfter: BuildingRepairPreview;
}

export interface BuildingMassActionResult {
  mode: BuildingMassActionMode;
  action: 'ACTIVATE' | 'DEACTIVATE' | 'REPAIR';
  changed: Array<{
    fieldIndex: number;
    buildingId: number;
    buildingName: string;
  }>;
  skipped: Array<{
    fieldIndex: number;
    buildingId: number | null;
    reason: string;
    reasonCode?: string;
  }>;
  summaryAfter: {
    energyDelta: number;
    workersUsed: number;
    freeWorkers: number;
    maxStorage: number;
    maxHousing: number;
    storageFree?: number;
    energyCurrent?: number;
    energyMax?: number;
    activeFunctionIds?: number[];
  };
}

export interface ColonyEffectiveFunction {
  id: number;
  key: string;
  name: string;
  buildingIds: number[];
}

export interface ColonyFeatureTabAccess {
  visible: boolean;
  reason?: string;
  requiredFunctionIds?: number[];
  presentFunctionIds?: number[];
  activeFunctionIds?: number[];
}

export interface ColonyFeatureAccess {
  tabs: Record<DetailTab | string, ColonyFeatureTabAccess>;
  functions: {
    present: ColonyEffectiveFunction[];
    active: ColonyEffectiveFunction[];
    groups: Record<
      string,
      { presentFunctionIds: number[]; activeFunctionIds: number[] }
    >;
  };
}

export interface ColonyEffectiveState {
  orbitalMaintenance: {
    production: number;
    consumption: number;
    balance: number;
  };
  population: {
    current: number;
    workers: number;
    available: number;
    maxHousing: number;
    freeHousing: number;
    housingBonus: number;
  };
  energy: {
    current: number;
    max: number;
    delta: number;
    production: number;
    consumption: number;
  };
  storage: {
    current: number;
    max: number;
    free: number;
    delta: number;
    bonus: number;
  };
  functions: {
    active: ColonyEffectiveFunction[];
    activeIds: number[];
  };
  production: {
    storage: Array<{ commodityId: number; amount: number }>;
    effects: Array<{ commodityId: number; amount: number }>;
    deposits: Array<{ commodityId: number; amount: number }>;
  };
  shortages: Array<{
    code: string;
    label: string;
    commodityId?: number;
    amount?: number;
  }>;
}

export interface ColonyDetailV2 {
  featureAccess?: ColonyFeatureAccess;
  eventSummary?: { unreadCount: number; latest: ColonyEventDto[] };
  activeFunctions?: ColonyEffectiveFunction[];
  effectiveState?: ColonyEffectiveState;
  buildingManagement?: {
    counts: {
      active: number;
      inactive: number;
      damaged: number;
      building: number;
    };
    fields: Array<{
      fieldIndex: number;
      buildingId: number | null;
      buildingName: string;
      isActive: boolean;
      isBuilding: boolean;
      integrity: number;
      maxIntegrity: number;
      epsProc: number;
      bevUse: number;
      bevPro: number;
      production: Array<{ commodityId: number; amount: number }>;
      functions?: ColonyEffectiveFunction[];
      skipReason?: { code: string; label: string } | null;
    }>;
    usableCommodities: Array<{ id: number; name: string }>;
  };
  energy: { current: number; max: number; delta: number };
  storage: { current: number; max: number; delta: number };
  population: {
    current: number;
    max: number;
    growth: number;
    workers: number;
    available: number;
    housing: number;
    housingFree?: number;
    housingMax?: number;
    housingBonus?: number;
  };
  inventory: Array<{
    id: number;
    commodityId: number;
    name: string;
    nameShort: string;
    amount: number;
    delta: number;
  }>;
  productionDeltas: Array<{
    commodityId: number;
    name: string;
    nameShort: string;
    amount: number;
  }>;
  deposits?: Array<{
    commodityId: number;
    name: string;
    nameShort: string;
    amountLeft: number;
    delta: number;
    depleted: boolean;
  }>;
  activeBuildJobs: Array<{
    fieldIndex: number;
    buildingId: number;
    buildingName: string;
    finishesAt: string | null;
    progress: number;
  }>;
  effects: Array<{ label: string; value: number; source: string }>;
  orbitShips: Array<{
    id: number;
    name: string;
    shipClassId: number;
    status: string;
    hull: number;
    hullMax: number;
    shields: number;
    shieldsMax: number;
    energy: number;
    energyMax: number;
    crew: number;
    crewRequired: number;
    crewMax: number;
    hasEnoughCrew: boolean;
    canLand?: boolean;
    canDisassemble?: boolean;
    canRepair?: boolean;
    canRetrofit?: boolean;
    damageSummary?: { hullDamage: number; damagedModules: number };
    modules?: Array<{
      id: number;
      moduleType: string;
      category: string;
      level: number;
      integrity: number;
      isActive: boolean;
      commodityId: number | null;
    }>;
    cargoUsed?: number;
    cargoMax?: number;
  }>;
  research: { pointsPerTick: number };
  planetaryDefense?: Array<{
    fieldIndex: number;
    buildingId: number;
    buildingName: string;
    functionId: number;
    functionName: string;
  }>;
  shipBuildQueue?: ShipyardQueueEntry[];
  shipyardQueue?: ShipyardQueueEntry[];
  availableShipModules?: Array<{
    commodityId: number;
    commodityName: string;
    amount: number;
    moduleType: string;
    moduleCategory: string;
    moduleLevel: number;
    displayName: string;
  }>;
  buildplans?: Array<{
    id: number;
    shipClassId: number;
    name: string;
    signature: string;
    moduleCommodityIds: number[];
    moduleTypes: string[];
  }>;
  fabricationQueue?: Array<{
    id: number;
    queueType: 'MODULE' | 'TORPEDO';
    itemKey: string;
    displayName: string;
    amount: number;
    outputCommodityId: number | null;
    outputAmount: number;
    buildingFunctionId: number;
    functionName: string;
    finishesAt: string;
    status: string;
  }>;
  fabricationCatalog?: Array<{
    itemKey: string;
    queueType: 'MODULE' | 'TORPEDO';
    displayName: string;
    outputCommodityId: number;
    outputAmount: number;
    buildingFunctionIds: number[];
    durationSeconds: number;
    costs: Array<{ commodityId: number; amount: number }>;
    available: boolean;
  }>;
  activeFabricationFunctionIds?: number[];
  defense?: {
    shields: { current: number; max: number; frequency: number | null };
    activeFunctionIds: number[];
    energyPhalanx: boolean;
    particlePhalanx: boolean;
    antiParticle: boolean;
    torpedoTypeId: number | null;
    selectedTorpedoType?: TorpedoTypeDto | null;
    availableTorpedoTypes?: TorpedoTypeDto[];
  };
  hangar?: {
    hasAirfield: boolean;
    inventory: Array<{
      shipClassKey: string;
      hangarCommodityId: number;
      displayName: string;
      amount: number;
    }>;
    buildable: Array<{
      shipClassId: number;
      shipClassKey: string;
      shipClassName: string;
      hangarCommodityId: number;
      displayName: string;
      buildEnergyCost: number;
      startEnergyCost: number;
      buildCosts: Array<{ commodityId: number; amount: number }>;
      crewRequired: number;
    }>;
    startable: Array<{
      shipClassId: number;
      shipClassKey: string;
      shipClassName: string;
      hangarCommodityId: number;
      displayName: string;
      amount: number;
      startEnergyCost: number;
      crewRequired: number;
    }>;
    landableOrbitShips: Array<{
      id: number;
      name: string;
      shipClassId: number;
    }>;
  };
  social?: {
    local: {
      primaryEffect: { commodityId: number; name: string; value: number };
      secondaryEffect: { commodityId: number; name: string; value: number };
      negativeEffect: number;
      lifeStandard: {
        commodityId: number;
        name: string;
        value: number;
        absolute: number;
        percent: number;
      };
      generatedCrew: number;
      workers: number;
      population: number;
    };
    global: {
      globalCrewLimit: number;
      crewOnShips: number;
      availableCrewOnColony: number;
      inTraining: number;
      trainableRemaining: number;
    };
    calculatorDefaults: {
      primaryEffect: number;
      secondaryEffect: number;
      negativeEffect: number;
      workers: number;
      lifeStandardAbsolute: number;
      population: number;
      generatedCrew: number;
    };
  };
  crew?: {
    available: number;
    assignedToColony: number;
    inTraining: number;
    localLimit: number;
    globalLimit: number;
    remainingGlobal: number;
    trainableNow: number;
    trainingFacility?: {
      present: boolean;
      active: boolean;
      mode: 'ACADEMY' | 'CENTRAL' | null;
      maxConcurrent: number | null;
      presentFunctionIds: number[];
      activeFunctionIds: number[];
    };
    trainingQueue: Array<{
      id: number;
      amount: number;
      finishesAt: string;
      status: string;
    }>;
  };
  shipyard: {
    unlocked: boolean;
    completed: boolean;
    inProgress: boolean;
    buildingId: number;
    buildingName: string;
    hasAirfield?: boolean;
    airfieldPresentFunctionIds?: number[];
    airfieldActiveFunctionIds?: number[];
    airfield?: {
      present: boolean;
      active: boolean;
      buildableCount: number;
      startableCount: number;
      landableCount: number;
    };
    orbitalMaintenance?: {
      production: number;
      consumption: number;
      balance: number;
    };
    presentFunctionIds?: number[];
    activeFunctionIds?: number[];
    repairPresentFunctionIds?: number[];
    repairActiveFunctionIds?: number[];
    slotRules?: Array<{
      category: string;
      allowedBuildingFunctionIds: number[];
      moduleSlots: Record<string, number>;
    }>;
  };
}

export interface Colony {
  id: number;
  name: string;
  energy: number;
  energyMax: number;
  population: number;
  populationMax: number;
  storageUsed: number;
  storageMax: number;
  locationLabel?: string;
  fieldCount?: number;
  storageItemCount?: number;
  posX?: number;
  posY?: number;
  starSystem?: { name: string; cx?: number; cy?: number; layerId?: number };
  celestialObject?: { name: string | null; classId: number | null };
  fields?: ColonyField[];
  storage?: ColonyStorageItem[];
  detailV2?: ColonyDetailV2;
}

export interface BuildingDef {
  id: number;
  name: string;
  rawName?: string;
  nameShort?: string;
  description: string;
  category: string;
  costs: Record<string, number>;
  resourceCosts?: Array<{ commodityId: number; amount: number }>;
  allowedFieldTypes: number[];
  isUnique: boolean;
  visible?: boolean;
  researchId?: number | null;
  production: Array<{ commodityId: number; amount: number }>;
  bonuses: { energy: number; population: number; storage: number };
  researchPoints?: number;
  researchRequired?: string;
  bmCol?: number;
  epsCost?: number;
  epsProc?: number;
  bevUse?: number;
  bevPro?: number;
  integrity?: number;
  functions?: number[];
}

export interface CommodityDef {
  id: number;
  name: string;
  nameShort: string;
}

export interface TerraformingDef {
  id: number;
  description: string;
  fromFieldType: number;
  toFieldType: number;
  energyCost: number;
  duration: number;
  researchId: number | null;
  costs: Array<{ commodityId: number; amount: number }>;
}

export interface ShipClassDef {
  id: number;
  key: string;
  name: string;
  category: string;
  role: string;
  hullBase: number;
  shieldBase: number;
  cargoCapacity: number;
  crewMin: number;
  crewMax: number;
  warpBase: number;
  starterAllowed: boolean;
  unlockTechId?: number | null;
  unlocked?: boolean;
  requirementLabel?: string | null;
  buildCosts?: Record<string, number>;
}

export type DetailTab =
  | 'info'
  | 'build'
  | 'buildingManagement'
  | 'shipyard'
  | 'fabrication'
  | 'defense'
  | 'events'
  | 'social'
  | 'crew'
  | 'hangar';
