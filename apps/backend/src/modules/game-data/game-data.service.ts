import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Faction } from '@swuniverse/shared';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

export interface Commodity {
  id: number;
  name: string;
  nameShort: string;
  description: string;
  density: number;
  type: number;
  isTradeOnly: boolean;
  isSaveable: boolean;
  isEffect: boolean;
  isDeposit: boolean;
  isShuttle?: boolean;
  isWorkbee?: boolean;
}

export interface BuildingCosts {
  buildTime: number;
}

export interface ModuleCosts {
  credits: number;
  durastahl: number;
  tibannaGas: number;
  kyberKristalle: number;
  beskar: number;
  kristallinesSilizium: number;
}

export interface BuildingProduction {
  commodityId: number;
  amount: number;
}

export interface BuildingBonuses {
  energy: number;
  population: number;
  storage: number;
}

export interface BuildingFieldAlternative {
  fieldtype: number;
  alternateBuildingId: number;
  researchId: number | null;
}

export interface BuildingFunctionDef {
  id: number;
  key: string;
  name: string;
}

export interface BuildingDef {
  id: number;
  name: string;
  rawName?: string;
  source?: 'stu' | 'swu';
  sourceId?: number;
  category: string;
  allowedFieldTypes: number[];
  isUnique: boolean;
  visible?: boolean;
  researchId?: number | null;
  researchRequired?: string | null;
  researchPoints?: number;
  costs: BuildingCosts;
  resourceCosts?: Array<{ commodityId: number; amount: number }>;
  production: BuildingProduction[];
  bonuses: BuildingBonuses;
  fieldAlternatives?: BuildingFieldAlternative[];
  lager?: number;
  epsCost?: number;
  eps?: number;
  epsProc?: number;
  bevPro?: number;
  bevUse?: number;
  integrity?: number;
  /** STU global/user-wide building limit (raw blimit). */
  blimit?: number;
  /** STU per-colony building limit (raw bclimit). */
  bclimit?: number;
  globalLimit?: number;
  colonyLimit?: number;
  isActivateable?: boolean;
  bmCol?: number;
  functions?: number[];
}

export interface CombatFormulas {
  damage: {
    base_multiplier: number;
    level_scaling: number;
    variance_min: number;
    variance_max: number;
    crit_chance: number;
    crit_multiplier: number;
  };
  shields: {
    efficiency: number;
    recharge_rate: number;
    bleedthrough: number;
  };
  hit_chance: {
    base: number;
    speed_modifier: number;
    min: number;
    max: number;
  };
  ship_class_modifiers: Record<
    string,
    { damage: number; speed: number; hull: number; evasion: number }
  >;
  combat_flow: {
    max_rounds: number;
    initiative: { speed_weight: number; sensor_weight: number };
    escape: {
      base_chance: number;
      speed_bonus: number;
      damage_penalty: number;
    };
  };
  ion_effects: {
    disable_chance: number;
    disable_duration: number;
    systems_priority: string[];
  };
}

export interface ModuleDef {
  name: string;
  description: string;
  category: string;
  maxLevel: number;
  public: Record<string, unknown>;
  secret: Record<string, unknown>;
  costs: ModuleCosts;
  research: { name: string; level: number } | null;
}

export interface TechDependency {
  type: 'REQUIRE' | 'REQUIRE_SOME' | 'EXCLUDE';
  techIds: number[];
}

export interface ResearchUnlocks {
  buildings?: Array<
    number | { id: number; name?: string; rawName?: string; visible?: boolean }
  >;
  shipClasses?: number[];
  modules?: string[];
  colonyTypes?: number[];
}

export interface TechDef {
  id: number;
  key?: string;
  source?: 'stu' | 'swu';
  sourceId?: number;
  rawName?: string;
  name: string;
  description?: string;
  category?: string;
  tier?: number;
  sort?: number;
  duration?: number;
  effort?: number;
  commodityId?: number;
  mappedCommodityId?: number | null;
  researchMode?: 'commodity' | 'points';
  faction?: Faction;
  hidden?: boolean;
  adminOnly?: boolean;
  excludeFromNormalProgression?: boolean;
  dependencies: TechDependency[];
  unlocks?: ResearchUnlocks;
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

export interface BuildingUpgradeDef {
  id: number;
  fromBuildingId: number;
  toBuildingId: number;
  researchId: number | null;
  description: string;
  energyCost: number;
  costs: Array<{ commodityId: number; amount: number }>;
}

export interface FieldBuildRuleDef {
  id: number;
  type: number;
  buildingsId: number;
  researchId: number | null;
  visible?: boolean;
}

export interface ColonyClassDepositDef {
  commodityId: number;
  minAmount: number;
  maxAmount: number;
}

export interface ColonyClassDef {
  classId: number;
  name: string;
  type: number;
  baseProduction: Array<{ commodityId: number; amount: number }>;
  deposits?: ColonyClassDepositDef[];
  bevGrowthRate: number;
}

export interface FabricationCostDef {
  commodityId: number;
  amount: number;
}

export type ShipyardGroup =
  | 'CORE_SYSTEMS'
  | 'OFFENSE_SYSTEMS'
  | 'DEFENSE_SYSTEMS';

export type ShipyardType =
  | 'HULL'
  | 'SHIELDS'
  | 'COMPUTER'
  | 'SUBLIGHT_DRIVE'
  | 'SENSORS'
  | 'HYPERDRIVE'
  | 'REACTOR'
  | 'EPS'
  | 'ENERGY_WEAPON'
  | 'TORPEDO_BANK'
  | 'SPECIAL';

const SHIPYARD_TYPE_TO_GROUP: Record<ShipyardType, ShipyardGroup> = {
  HULL: 'DEFENSE_SYSTEMS',
  COMPUTER: 'CORE_SYSTEMS',
  SUBLIGHT_DRIVE: 'CORE_SYSTEMS',
  SENSORS: 'CORE_SYSTEMS',
  HYPERDRIVE: 'CORE_SYSTEMS',
  REACTOR: 'CORE_SYSTEMS',
  EPS: 'CORE_SYSTEMS',
  SPECIAL: 'CORE_SYSTEMS',
  SHIELDS: 'DEFENSE_SYSTEMS',
  ENERGY_WEAPON: 'OFFENSE_SYSTEMS',
  TORPEDO_BANK: 'OFFENSE_SYSTEMS',
};

export interface ShipyardModuleStatsDef {
  outputCommodityId: number;
  stuModuleId: number;
  stuName: string;
  level: number;
  upgradeFactor: number;
  downgradeFactor: number;
  crew: number;
  type: number;
  energyCost: number;
  defaultFactor: number;
  factionId: number | null;
  systemType: number | null;
}

export interface ShipyardRumpStatsDef {
  stuRumpId: number;
  stuName: string;
  moduleLevel: number;
  baseCrew: number;
  baseEps: number;
  baseReactor: number;
  baseHull: number;
  baseShield: number;
  baseDamage: number;
  baseSensorRange: number;
  baseEvadeChance: number;
  baseHitChance: number;
  baseWarpdrive: number;
  specialSlots: number;
}

export interface ShipyardRumpModuleRuleDef {
  level: number;
  mandatory: number;
  min: number;
  max: number;
}

export interface ShipyardRumpModuleRulesDef {
  stuRumpId: number;
  moduleRules: Partial<Record<ShipyardType, ShipyardRumpModuleRuleDef>>;
}

export interface FabricationItemDef {
  itemKey: string;
  queueType: 'MODULE' | 'TORPEDO';
  displayName: string;
  outputCommodityId: number;
  outputAmount: number;
  moduleType?: string;
  moduleCategory?: string;
  fabricationCategory?: string;
  shipyardGroup?: ShipyardGroup;
  shipyardType?: ShipyardType;
  shipyardModuleStats?: ShipyardModuleStatsDef;
  moduleLevel?: number;
  moduleClass?: number;
  moduleTier?: number;
  researchId?: number | null;
  researchRequired?: string | null;
  faction?: Faction;
  buildingFunctionIds: number[];
  durationSeconds: number;
  source?: string;
  costSource?: string;
  durationSource?: string;
  stuModuleId?: number;
  stuSourceCommodityId?: number;
  stuSourceTechId?: number | null;
  stuRawName?: string;
  costs: FabricationCostDef[];
}

export interface ShipClassLayoutSlotDef {
  slotId: string;
  moduleCategory: ShipyardType;
  label: string;
  anchorX: number;
  anchorY: number;
  calloutSide: 'left' | 'right' | 'top' | 'bottom';
  order: number;
  required?: boolean;
}

export interface ShipClassSlotRuleDef {
  category: string;
  allowedBuildingFunctionIds: number[];
  moduleSlots: Record<ShipyardType, number>;
  layoutKey: string;
  imageKey: string;
  slots: ShipClassLayoutSlotDef[];
}

export interface HangarShipDef {
  shipClassKey: string;
  hangarCommodityId: number;
  displayName: string;
  airfieldFunctionId: number;
  startEnergyCost: number;
  buildEnergyCost: number;
  buildCosts: Array<{ commodityId: number; amount: number }>;
  defaultModuleCommodityIds: number[];
  defaultTorpedoCommodityId: number | null;
  defaultTorpedoAmount: number;
}

export interface ShipClassYamlDef {
  key: string;
  name: string;
  category: string;
  role: string;
  factionKey?: string | null;
  allowedBuildingFunctionIds?: number[];
  unlockTechId: number | null;
  buildTimeTicks: number;
  cargoCapacity: number;
  crewMin: number;
  crewMax: number;
  hullBase: number;
  shieldBase: number;
  epsBase: number;
  batteryBase: number;
  reactorBase: number;
  warpdriveBase: number;
  evadeBase: number;
  hitChanceBase: number;
  sensorRangeBase: number;
  torpedoStorageBase: number;
  flightEnergyCost: number;
  shuttleSlots?: number;
  starterAllowed: boolean;
  isNpc: boolean;
  isColonizer?: boolean;
  colonizerTier?: number | null;
  colonizationBuildingId?: number | null;
  stuRumpId?: number;
  buildCosts?: FabricationCostDef[];
}

export interface SocialEffectsDef {
  lifeStandardCommodityId: number;
  fallback: {
    primaryEffectCommodityId: number;
    secondaryEffectCommodityId: number;
  };
  factions: Record<
    string,
    { primaryEffectCommodityId: number; secondaryEffectCommodityId: number }
  >;
}

export type TorpedoDamageType =
  | 'PROTON'
  | 'QUANTUM'
  | 'HEAVY_QUANTUM'
  | 'PLASMA'
  | 'HEAVY_PLASMA';

export interface WeaponShieldModifierDef {
  weaponFamily: string;
  shieldFamily: string;
  modifier: number; // percent, 100 = neutral
}

export interface TorpedoTypeDef {
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
  damageType?: TorpedoDamageType;
  energyCost: number;
  productionAmount: number;
  researchId: number | null;
  compatibleShipCategories?: string[];
}

@Injectable()
export class GameDataService implements OnModuleInit {
  private readonly logger = new Logger(GameDataService.name);
  private dataPath: string;

  private commodities: Map<number, Commodity> = new Map();
  private buildings: Map<number, BuildingDef> = new Map();
  private buildingFunctions: Map<number, BuildingFunctionDef> = new Map();
  private buildingFunctionMap: Map<number, number[]> = new Map();
  private combatFormulas: CombatFormulas;
  private modules: Map<string, ModuleDef[]> = new Map();
  private techTree: TechDef[] = [];
  private colonyClasses: Map<number, ColonyClassDef> = new Map();
  private fieldBuildRules: FieldBuildRuleDef[] = [];
  private buildingUpgrades: Map<number, BuildingUpgradeDef> = new Map();
  private buildingUpgradesBySource: Map<number, BuildingUpgradeDef[]> =
    new Map();
  private terraforming: Map<number, TerraformingDef> = new Map();
  private terraformingBySourceField: Map<number, TerraformingDef[]> = new Map();
  private fabricationItems: Map<string, FabricationItemDef> = new Map();
  private shipClassSlotRules: Map<string, ShipClassSlotRuleDef> = new Map();
  private socialEffects: SocialEffectsDef | null = null;
  private torpedoTypes: Map<number, TorpedoTypeDef> = new Map();
  private torpedoTypesByCommodity: Map<number, TorpedoTypeDef> = new Map();
  private hangarShipDefsByClassKey: Map<string, HangarShipDef> = new Map();
  private hangarShipDefsByCommodity: Map<number, HangarShipDef> = new Map();
  private shipClassDefs: ShipClassYamlDef[] = [];
  private moduleStatsByOutputCommodity: Map<number, ShipyardModuleStatsDef> =
    new Map();
  private rumpStatsByStuRumpId: Map<number, ShipyardRumpStatsDef> = new Map();
  private rumpModuleRulesByStuRumpId: Map<number, ShipyardRumpModuleRulesDef> =
    new Map();
  private weaponShieldModifiers: WeaponShieldModifierDef[] = [];

  onModuleInit() {
    this.dataPath =
      process.env.GAME_DATA_PATH ||
      path.resolve(process.cwd(), '../../game-data/data');
    if (!fs.existsSync(this.dataPath)) {
      this.dataPath = path.resolve(process.cwd(), '../game-data/data');
    }
    if (!fs.existsSync(this.dataPath)) {
      this.dataPath = path.resolve(process.cwd(), 'game-data/data');
    }
    this.logger.log(`Loading game data from: ${this.dataPath}`);
    this.loadCommodities();
    this.loadBuildings();
    this.loadFieldBuildRules();
    this.loadBuildingFunctions();
    this.loadBuildingUpgrades();
    this.loadTerraforming();
    this.loadCombatFormulas();
    this.loadModules();
    this.loadShipyardModuleStats();
    this.loadShipyardRumpStats();
    this.loadShipyardRumpModuleRules();
    this.loadFabricationItems();

    this.loadShipClassSlotRules();
    this.loadSocialEffects();
    this.loadTorpedoTypes();
    this.loadShipClasses();
    this.loadHangarShipDefs();
    this.loadTechTree();
    this.loadColonyClasses();
    this.loadWeaponShieldModifiers();
  }

  private loadYaml<T>(relativePath: string): T | null {
    const fullPath = path.join(this.dataPath, relativePath);
    if (!fs.existsSync(fullPath)) {
      this.logger.warn(`Game data file not found: ${fullPath}`);
      return null;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    return yaml.load(content) as T;
  }

  private loadCommodities() {
    const data = this.loadYaml<{
      commodities: Array<{
        id: number;
        name: string;
        rawName?: string;
        visible?: boolean;
        type?: number;
        bound?: boolean;
        npcCommodity?: boolean;
      }>;
    }>('commodities/stu-commodity-map.yaml');
    if (data?.commodities?.length) {
      for (const c of data.commodities) {
        const type = c.type ?? 1;
        this.commodities.set(c.id, {
          id: c.id,
          name: c.name,
          nameShort: c.name.slice(0, 3).toUpperCase(),
          description: c.name,
          density: 1,
          type,
          isTradeOnly: type !== 1 || c.visible === false,
          isSaveable: type === 1 && c.visible !== false,
          isEffect: type !== 1,
          isDeposit: c.id >= 1500 && c.id < 1700,
          isShuttle: c.id >= 21600 && c.id < 21700,
          isWorkbee: c.id >= 21650 && c.id < 21660,
        });
      }
      this.logger.log(`Loaded ${this.commodities.size} commodities`);
    }
  }

  private loadBuildings() {
    const data = this.loadYaml<{ buildings: BuildingDef[] }>(
      'buildings/stu-buildings.yaml',
    );
    if (data?.buildings?.length) {
      for (const b of data.buildings) {
        b.globalLimit = b.blimit ?? 0;
        b.colonyLimit = b.bclimit ?? (b.isUnique ? 1 : 0);
        b.production = this.normalizeBuildingProduction(b);
        this.buildings.set(b.id, b);
      }
      this.logger.log(`Loaded ${this.buildings.size} buildings`);
    }
  }

  private normalizeBuildingProduction(building: BuildingDef) {
    const production = building.production ?? [];
    const producesResearchPoints = production.some(
      (entry) => entry.commodityId >= 1701 && entry.commodityId <= 1722,
    );
    if (!producesResearchPoints) return production;

    return production.filter(
      (entry) => !(entry.commodityId === 1700 && entry.amount < 0),
    );
  }

  private loadFieldBuildRules() {
    const data = this.loadYaml<{ fieldBuildRules: FieldBuildRuleDef[] }>(
      'buildings/stu-field-build.yaml',
    );
    this.fieldBuildRules = data?.fieldBuildRules ?? [];
    if (this.fieldBuildRules.length > 0) {
      this.logger.log(
        `Loaded ${this.fieldBuildRules.length} field build rules`,
      );
    }
  }

  private loadBuildingFunctions() {
    const data = this.loadYaml<{
      functionDefs: BuildingFunctionDef[];
      buildingFunctions: Array<{ buildingId: number; functions: number[] }>;
    }>('buildings/stu-building-functions.yaml');
    if (!data) return;

    for (const def of data.functionDefs ?? []) {
      this.buildingFunctions.set(def.id, def);
    }
    for (const mapping of data.buildingFunctions ?? []) {
      const functions = [...new Set(mapping.functions)].sort((a, b) => a - b);
      this.buildingFunctionMap.set(mapping.buildingId, functions);
      const building = this.buildings.get(mapping.buildingId);
      if (building) {
        building.functions = functions;
      }
    }
    this.logger.log(
      `Loaded ${this.buildingFunctions.size} building functions for ${this.buildingFunctionMap.size} buildings`,
    );
  }

  private loadBuildingUpgrades() {
    const data = this.loadYaml<{ upgrades: BuildingUpgradeDef[] }>(
      'buildings/stu-building-upgrades.yaml',
    );
    for (const upgrade of data?.upgrades ?? []) {
      this.buildingUpgrades.set(upgrade.id, upgrade);
      const list =
        this.buildingUpgradesBySource.get(upgrade.fromBuildingId) ?? [];
      list.push(upgrade);
      this.buildingUpgradesBySource.set(upgrade.fromBuildingId, list);
    }
    if (this.buildingUpgrades.size > 0) {
      this.logger.log(`Loaded ${this.buildingUpgrades.size} building upgrades`);
    }
  }

  private loadTerraforming() {
    const data = this.loadYaml<{ terraforming: TerraformingDef[] }>(
      'terraforming/stu-terraforming.yaml',
    );
    for (const option of data?.terraforming ?? []) {
      this.terraforming.set(option.id, option);
      const list =
        this.terraformingBySourceField.get(option.fromFieldType) ?? [];
      list.push(option);
      this.terraformingBySourceField.set(option.fromFieldType, list);
    }
    if (this.terraforming.size > 0) {
      this.logger.log(`Loaded ${this.terraforming.size} terraforming options`);
    }
  }

  private loadCombatFormulas() {
    const data = this.loadYaml<{ combat: CombatFormulas }>(
      'combat/formulas.yaml',
    );
    if (data?.combat) {
      this.combatFormulas = data.combat;
      this.logger.log('Loaded combat formulas');
    }
  }

  private loadModules() {
    const moduleFiles = [
      'weapons',
      'shields',
      'engines',
      'hull',
      'sensors',
      'computer',
      'cargo',
      'life-support',
      'tractor-beam',
      'hyperdrive',
      'special',
    ];
    for (const file of moduleFiles) {
      const data = this.loadYaml<{ modules: ModuleDef[] }>(
        `modules/${file}.yaml`,
      );
      if (data?.modules) {
        this.modules.set(file, data.modules);
      }
    }
    const total = Array.from(this.modules.values()).reduce(
      (sum, m) => sum + m.length,
      0,
    );
    this.logger.log(
      `Loaded ${total} ship modules across ${this.modules.size} categories`,
    );
  }

  private loadShipyardModuleStats() {
    const data = this.loadYaml<{ moduleStats: ShipyardModuleStatsDef[] }>(
      'fabrication/stu-module-stats.yaml',
    );
    for (const stats of data?.moduleStats ?? []) {
      this.moduleStatsByOutputCommodity.set(stats.outputCommodityId, stats);
    }
    if (this.moduleStatsByOutputCommodity.size > 0) {
      this.logger.log(
        `Loaded ${this.moduleStatsByOutputCommodity.size} shipyard module stat rows`,
      );
    }
  }

  private loadShipyardRumpStats() {
    const data = this.loadYaml<{ rumpStats: ShipyardRumpStatsDef[] }>(
      'ship-building/stu-rump-stats.yaml',
    );
    for (const stats of data?.rumpStats ?? []) {
      this.rumpStatsByStuRumpId.set(stats.stuRumpId, stats);
    }
    if (this.rumpStatsByStuRumpId.size > 0) {
      this.logger.log(
        `Loaded ${this.rumpStatsByStuRumpId.size} shipyard rump stat rows`,
      );
    }
  }

  private loadShipyardRumpModuleRules() {
    const data = this.loadYaml<{
      rumpModuleRules: ShipyardRumpModuleRulesDef[];
    }>('ship-building/stu-rump-module-rules.yaml');
    for (const rules of data?.rumpModuleRules ?? []) {
      this.rumpModuleRulesByStuRumpId.set(rules.stuRumpId, rules);
    }
    if (this.rumpModuleRulesByStuRumpId.size > 0) {
      this.logger.log(
        `Loaded ${this.rumpModuleRulesByStuRumpId.size} shipyard rump module rule rows`,
      );
    }
  }

  private loadFabricationItems() {
    const data = this.loadYaml<{ fabricationItems: FabricationItemDef[] }>(
      'fabrication/stu-fabrication.yaml',
    );
    for (const rawItem of data?.fabricationItems ?? []) {
      const item = this.applyShipyardClassification(rawItem);
      this.fabricationItems.set(item.itemKey, item);
    }
    if (this.fabricationItems.size > 0) {
      this.logger.log(`Loaded ${this.fabricationItems.size} fabrication items`);
    }
  }

  private classifyShipyardType(
    item: Pick<
      FabricationItemDef,
      'displayName' | 'moduleType' | 'moduleCategory' | 'fabricationCategory'
    >,
  ): ShipyardType | null {
    const displayName = item.displayName ?? '';
    const moduleType = item.moduleType ?? '';
    const moduleCategory = item.moduleCategory ?? '';
    const fabricationCategory = item.fabricationCategory ?? moduleCategory;
    const haystack = `${displayName} ${moduleType}`;

    if (fabricationCategory === 'WEAPONS') {
      if (
        haystack.includes('Torpedorampe') ||
        haystack.includes('Torpedo-Werfer') ||
        haystack.includes('Protonenraketen-System')
      ) {
        return 'TORPEDO_BANK';
      }
      return 'ENERGY_WEAPON';
    }

    if (fabricationCategory === 'SHIELDS') return 'SHIELDS';

    if (fabricationCategory === 'DRIVE') {
      if (moduleCategory === 'HYPERDRIVE') return 'HYPERDRIVE';
      if (moduleCategory === 'SUBLIGHT_ENGINE') return 'SUBLIGHT_DRIVE';
      if (haystack.includes('Hypermaterie-Reaktor')) return 'REACTOR';
      if (haystack.includes('Hyperantrieb')) return 'HYPERDRIVE';
      if (haystack.includes('Sublight-Antrieb')) return 'SUBLIGHT_DRIVE';
      return null;
    }

    if (moduleCategory === 'HULL' || haystack.includes('Panzerung')) {
      return 'HULL';
    }
    if (moduleCategory === 'SENSORS' || haystack.includes('Sensor')) {
      return 'SENSORS';
    }
    if (moduleCategory === 'COMPUTER' || haystack.includes('Zielcomputer')) {
      return 'COMPUTER';
    }
    if (haystack.includes('Energieverteiler')) return 'EPS';
    if (moduleCategory === 'SPECIAL') return 'SPECIAL';

    return null;
  }

  private applyShipyardClassification(item: FabricationItemDef): FabricationItemDef {
    const shipyardType = item.shipyardType ?? this.classifyShipyardType(item);
    const shipyardModuleStats = this.moduleStatsByOutputCommodity.get(
      item.outputCommodityId,
    );
    return {
      ...item,
      shipyardType: shipyardType ?? undefined,
      shipyardGroup:
        item.shipyardGroup ??
        (shipyardType ? SHIPYARD_TYPE_TO_GROUP[shipyardType] : undefined),
      shipyardModuleStats,
    };

  }


  private loadShipClassSlotRules() {
    const data = this.loadYaml<{
      shipClassSlotRules: ShipClassSlotRuleDef[];
    }>('ship-building/ship-class-slots.yaml');
    for (const rule of data?.shipClassSlotRules ?? []) {
      rule.moduleSlots ??= this.buildModuleSlotCounts(rule.slots ?? []);
      rule.slots = (rule.slots ?? []).map((slot, index) => ({
        ...slot,
        order: slot.order ?? index,
      }));
      rule.layoutKey ??= `${rule.category.toLowerCase()}-layout`;
      rule.imageKey ??= rule.layoutKey;
      this.shipClassSlotRules.set(rule.category, rule);
    }
    if (this.shipClassSlotRules.size > 0) {
      this.logger.log(
        `Loaded ${this.shipClassSlotRules.size} ship class slot rules`,
      );
    }
  }

  private buildModuleSlotCounts(
    slots: ShipClassLayoutSlotDef[],
  ): Record<ShipyardType, number> {
    return slots.reduce<Record<ShipyardType, number>>((counts, slot) => {
      counts[slot.moduleCategory] = (counts[slot.moduleCategory] ?? 0) + 1;
      return counts;
    }, {} as Record<ShipyardType, number>);
  }

  private loadSocialEffects() {
    this.socialEffects = this.loadYaml<SocialEffectsDef>(
      'colony-social/stu-social-effects.yaml',
    );
    if (this.socialEffects) {
      this.logger.log('Loaded colony social effects');
    }
  }

  private loadTorpedoTypes() {
    const data = this.loadYaml<{ torpedoTypes: TorpedoTypeDef[] }>(
      'torpedoes/stu-torpedoes.yaml',
    );
    for (const torpedo of data?.torpedoTypes ?? []) {
      this.torpedoTypes.set(torpedo.id, torpedo);
      this.torpedoTypesByCommodity.set(torpedo.commodityId, torpedo);
    }
    if (this.torpedoTypes.size > 0) {
      this.logger.log(`Loaded ${this.torpedoTypes.size} torpedo types`);
    }
  }

  private loadHangarShipDefs() {
    const data = this.loadYaml<{ hangarShips: HangarShipDef[] }>(
      'ship-building/ship-class-hangar.yaml',
    );
    for (const def of data?.hangarShips ?? []) {
      const shipClass = this.getShipClassDefByKey(def.shipClassKey);
      const sourceCosts = shipClass?.buildCosts ?? [];
      def.buildCosts = sourceCosts.filter((cost) => cost.commodityId < 10_000);
      def.defaultModuleCommodityIds = sourceCosts
        .filter((cost) => cost.commodityId >= 10_000)
        .flatMap((cost) => Array.from({ length: cost.amount }, () => cost.commodityId));
      def.defaultTorpedoCommodityId ??= null;
      def.defaultTorpedoAmount ??= 0;
      this.hangarShipDefsByClassKey.set(def.shipClassKey, def);
      this.hangarShipDefsByCommodity.set(def.hangarCommodityId, def);
    }
    if (this.hangarShipDefsByClassKey.size > 0) {
      this.logger.log(
        `Loaded ${this.hangarShipDefsByClassKey.size} hangar ship definitions`,
      );
    }
  }

  private loadShipClasses() {
    const data = this.loadYaml<{ shipClasses: ShipClassYamlDef[] }>(
      'ship-building/ship-classes.yaml',
    );
    this.shipClassDefs = data?.shipClasses ?? [];
    if (this.shipClassDefs.length > 0) {
      this.logger.log(
        `Loaded ${this.shipClassDefs.length} ship class definitions`,
      );
    }
  }

  private loadTechTree() {
    this.techTree = [];
    const files: Array<{ file: string; faction: Faction }> = [
      { file: 'research/rebels.yaml', faction: Faction.REBEL_ALLIANCE },
      { file: 'research/imperials.yaml', faction: Faction.GALACTIC_EMPIRE },
    ];
    for (const { file, faction } of files) {
      const data = this.loadYaml<{ technologies: TechDef[] }>(file);
      if (data?.technologies?.length) {
        this.techTree.push(
          ...data.technologies.map((tech) => ({ ...tech, faction })),
        );
      }
    }
    this.logger.log(`Loaded ${this.techTree.length} technologies`);
  }

  private loadColonyClasses() {
    const data = this.loadYaml<{ colonyClasses: ColonyClassDef[] }>(
      'colony-classes/stu-colony-classes.yaml',
    );
    if (data?.colonyClasses?.length) {
      for (const cc of data.colonyClasses) {
        cc.bevGrowthRate ??= 100;
        cc.deposits ??= cc.baseProduction.map((production) => ({
          commodityId: production.commodityId,
          minAmount: production.amount,
          maxAmount: production.amount,
        }));
        this.colonyClasses.set(cc.classId, cc);
      }
      this.logger.log(`Loaded ${this.colonyClasses.size} colony classes`);
    }
  }

  private loadWeaponShieldModifiers() {
    const data = this.loadYaml<{ modifiers: WeaponShieldModifierDef[] }>(
      'combat/weapon-shield-modifiers.yaml',
    );
    this.weaponShieldModifiers = data?.modifiers ?? [];
    if (this.weaponShieldModifiers.length > 0) {
      this.logger.log(
        `Loaded ${this.weaponShieldModifiers.length} weapon-shield modifiers`,
      );
    }
  }

  getCommodity(id: number): Commodity | undefined {
    return this.commodities.get(id);
  }

  getAllCommodities(): Commodity[] {
    return Array.from(this.commodities.values());
  }

  getBuilding(id: number): BuildingDef | undefined {
    return this.buildings.get(id);
  }

  getAllBuildings(): BuildingDef[] {
    return Array.from(this.buildings.values());
  }

  getBuildingsForFieldTypes(fieldTypes: number[]): BuildingDef[] {
    const candidates = fieldTypes.filter((fieldType, index) => {
      return fieldType != null && fieldTypes.indexOf(fieldType) === index;
    });
    return Array.from(this.buildings.values()).filter(
      (b) =>
        b.visible !== false &&
        candidates.some((fieldType) => b.allowedFieldTypes.includes(fieldType)),
    );
  }

  getBuildingsForFieldType(fieldType: number): BuildingDef[] {
    return this.getBuildingsForFieldTypes([fieldType]);
  }

  getBuildingsByName(name: string): BuildingDef[] {
    return Array.from(this.buildings.values()).filter((b) => b.name === name);
  }

  getBuildingFunction(id: number): BuildingFunctionDef | undefined {
    return this.buildingFunctions.get(id);
  }

  getAllBuildingFunctions(): BuildingFunctionDef[] {
    return Array.from(this.buildingFunctions.values());
  }

  getTerraforming(id: number): TerraformingDef | undefined {
    return this.terraforming.get(id);
  }

  getAllTerraforming(): TerraformingDef[] {
    return Array.from(this.terraforming.values());
  }

  getTerraformingForFieldType(fieldType: number): TerraformingDef[] {
    return this.terraformingBySourceField.get(fieldType) ?? [];
  }

  getBuildingUpgrade(id: number): BuildingUpgradeDef | undefined {
    return this.buildingUpgrades.get(id);
  }

  getBuildingUpgradesForBuilding(buildingId: number): BuildingUpgradeDef[] {
    return this.buildingUpgradesBySource.get(buildingId) ?? [];
  }

  getFieldBuildRule(
    buildingId: number,
    fieldType: number,
  ): FieldBuildRuleDef | undefined {
    return this.fieldBuildRules.find(
      (rule) => rule.buildingsId === buildingId && rule.type === fieldType,
    );
  }

  getFieldBuildRuleForFieldTypes(
    buildingId: number,
    fieldTypes: number[],
  ): FieldBuildRuleDef | undefined {
    for (const fieldType of fieldTypes) {
      const rule = this.getFieldBuildRule(buildingId, fieldType);
      if (rule) return rule;
    }
    return undefined;
  }

  getBuildingFunctions(buildingId: number): number[] {
    return this.buildingFunctionMap.get(buildingId) ?? [];
  }

  buildingHasFunction(buildingId: number, functionId: number): boolean {
    return this.getBuildingFunctions(buildingId).includes(functionId);
  }

  getBuildingsByFunction(functionId: number): BuildingDef[] {
    return Array.from(this.buildings.values()).filter((building) =>
      this.buildingHasFunction(building.id, functionId),
    );
  }

  getCombatFormulas(): CombatFormulas {
    return this.combatFormulas;
  }

  getModulesByCategory(category: string): ModuleDef[] {
    return this.modules.get(category) || [];
  }

  getAllModules(): ModuleDef[] {
    return Array.from(this.modules.values()).flat();
  }

  getFabricationItem(itemKey: string): FabricationItemDef | undefined {
    return this.fabricationItems.get(itemKey);
  }

  getFabricationItemByOutputCommodity(
    commodityId: number,
  ): FabricationItemDef | undefined {
    return Array.from(this.fabricationItems.values()).find(
      (item) => item.outputCommodityId === commodityId,
    );
  }

  getAllFabricationItems(): FabricationItemDef[] {
    return Array.from(this.fabricationItems.values());
  }

  getShipClassSlotRule(category: string): ShipClassSlotRuleDef | undefined {
    return this.shipClassSlotRules.get(category);
  }

  getShipClassSlotRuleForShipClass(shipClass: {
    category: string;
    key?: string;
  }): ShipClassSlotRuleDef | undefined {
    const rule = this.getShipClassSlotRule(shipClass.category);
    if (!rule) return undefined;
    const definition = shipClass.key
      ? this.getShipClassDefByKey(shipClass.key)
      : undefined;
    const specialSlots = this.getShipyardRumpStats(
      definition?.stuRumpId,
    )?.specialSlots;
    if (specialSlots == null) return rule;

    const slots = [
      ...rule.slots.filter((slot) => slot.moduleCategory !== 'SPECIAL'),
      ...rule.slots
        .filter((slot) => slot.moduleCategory === 'SPECIAL')
        .slice(0, specialSlots),
    ].map((slot, index) => ({ ...slot, order: index }));

    return {
      ...rule,
      moduleSlots: {
        ...rule.moduleSlots,
        SPECIAL: specialSlots,
      },
      slots,
    };
  }

  getShipyardRumpModuleRules(
    stuRumpId?: number | null,
  ): ShipyardRumpModuleRulesDef | undefined {
    return stuRumpId == null
      ? undefined
      : this.rumpModuleRulesByStuRumpId.get(stuRumpId);
  }

  isShipyardModuleAllowedForShipClass(
    item: FabricationItemDef,
    shipClass: { key?: string; category: string },
  ): boolean {
    if (!item.shipyardType) return false;
    const definition = shipClass.key
      ? this.getShipClassDefByKey(shipClass.key)
      : undefined;
    const stuRumpId = definition?.stuRumpId;
    const moduleRules = this.getShipyardRumpModuleRules(stuRumpId)?.moduleRules;
    const rule = moduleRules?.[item.shipyardType];
    if (item.shipyardType === 'SPECIAL') {
      const specialSlots = this.getShipyardRumpStats(stuRumpId)?.specialSlots ?? 0;
      return specialSlots > 0;
    }
    if (!rule || rule.level <= 0) return false;
    const level = item.shipyardModuleStats?.level ?? item.moduleLevel ?? 0;
    return level >= rule.min && level <= rule.max;
  }

  getAllShipClassSlotRules(): ShipClassSlotRuleDef[] {
    return Array.from(this.shipClassSlotRules.values());
  }

  getSocialEffects(): SocialEffectsDef | null {
    return this.socialEffects;
  }

  getTorpedoType(id: number): TorpedoTypeDef | undefined {
    return this.torpedoTypes.get(id);
  }

  getTorpedoTypeByCommodity(commodityId: number): TorpedoTypeDef | undefined {
    return this.torpedoTypesByCommodity.get(commodityId);
  }

  getAllTorpedoTypes(): TorpedoTypeDef[] {
    return Array.from(this.torpedoTypes.values());
  }

  getHangarShipDef(shipClassKey: string): HangarShipDef | undefined {
    return this.hangarShipDefsByClassKey.get(shipClassKey);
  }

  getHangarShipDefByCommodity(commodityId: number): HangarShipDef | undefined {
    return this.hangarShipDefsByCommodity.get(commodityId);
  }

  getAllHangarShipDefs(): HangarShipDef[] {
    return Array.from(this.hangarShipDefsByClassKey.values());
  }

  getShipClassDefs(): ShipClassYamlDef[] {
    return this.shipClassDefs;
  }

  getShipClassDefByKey(key: string): ShipClassYamlDef | undefined {
    return this.shipClassDefs.find((definition) => definition.key === key);
  }

  getShipyardRumpStats(stuRumpId?: number | null): ShipyardRumpStatsDef | undefined {
    return stuRumpId == null ? undefined : this.rumpStatsByStuRumpId.get(stuRumpId);
  }

  getShipyardModuleStats(
    outputCommodityId: number,
  ): ShipyardModuleStatsDef | undefined {
    return this.moduleStatsByOutputCommodity.get(outputCommodityId);
  }

  getTechTree(): TechDef[] {
    return this.techTree;
  }

  getTech(id: number): TechDef | undefined {
    return this.techTree.find((t) => t.id === id);
  }

  getTechForFaction(id: number, faction?: Faction | null): TechDef | undefined {
    if (!faction) return this.getTech(id);
    return (
      this.techTree.find((t) => t.id === id && t.faction === faction) ??
      this.getTech(id)
    );
  }

  getColonyClass(classId: number): ColonyClassDef | undefined {
    return this.colonyClasses.get(classId);
  }

  getColonyClassDeposits(classId: number): ColonyClassDepositDef[] {
    return this.getColonyClass(classId)?.deposits ?? [];
  }

  getColonyClassCount(): number {
    return this.colonyClasses.size;
  }

  getWeaponShieldModifier(weaponFamily: string, shieldFamily: string): number {
    const entry = this.weaponShieldModifiers.find(
      (m) => m.weaponFamily === weaponFamily && m.shieldFamily === shieldFamily,
    );
    return entry?.modifier ?? 100;
  }
}
