import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

export interface Commodity {
  id: number;
  name: string;
  nameShort: string;
  description: string;
  density: number;
  isTradeOnly: boolean;
}

export interface BuildingCosts {
  credits: number;
  durastahl: number;
  tibannaGas: number;
  kyberKristalle: number;
  beskar: number;
  kristallinesSilizium: number;
  energiemodule: number;
  buildTime: number;
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

export interface BuildingDef {
  id: number;
  name: string;
  nameShort: string;
  description: string;
  category: string;
  allowedFieldTypes: number[];
  isUnique: boolean;
  costs: BuildingCosts;
  resourceCosts?: Array<{ commodityId: number; amount: number }>;
  production: BuildingProduction[];
  bonuses: BuildingBonuses;
  researchPoints?: number;
  researchRequired?: string;
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
  costs: BuildingCosts;
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
  category: string;
  tier?: number;
  sort?: number;
  duration?: number;
  effort?: number;
  commodityId?: number;
  mappedCommodityId?: number | null;
  hidden?: boolean;
  adminOnly?: boolean;
  excludeFromNormalProgression?: boolean;
  dependencies: TechDependency[];
  unlocks?: ResearchUnlocks;
}

@Injectable()
export class GameDataService implements OnModuleInit {
  private readonly logger = new Logger(GameDataService.name);
  private dataPath: string;

  private commodities: Map<number, Commodity> = new Map();
  private buildings: Map<number, BuildingDef> = new Map();
  private combatFormulas: CombatFormulas;
  private modules: Map<string, ModuleDef[]> = new Map();
  private techTree: TechDef[] = [];

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
    this.loadCombatFormulas();
    this.loadModules();
    this.loadTechTree();
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
    const stuData = this.loadYaml<{
      commodities: Array<{
        id: number;
        name: string;
        rawName?: string;
        visible?: boolean;
        type?: number;
      }>;
    }>('commodities/stu-commodity-map.yaml');
    if (stuData?.commodities?.length) {
      for (const c of stuData.commodities) {
        this.commodities.set(c.id, {
          id: c.id,
          name: c.name,
          nameShort: c.name.slice(0, 3).toUpperCase(),
          description: c.rawName ? `Aus STU importiert: ${c.rawName}` : c.name,
          density: 1,
          isTradeOnly: c.type !== 1 || c.visible === false,
        });
      }
      this.logger.log(`Loaded ${this.commodities.size} STU commodities`);
      return;
    }

    const data = this.loadYaml<{ commodities: Commodity[] }>(
      'commodities.yaml',
    );
    if (data?.commodities) {
      for (const c of data.commodities) {
        this.commodities.set(c.id, c);
      }
      this.logger.log(`Loaded ${this.commodities.size} commodities`);
    }
  }

  private loadBuildings() {
    const data = this.loadYaml<{ buildings: BuildingDef[] }>(
      'buildings/buildings.yaml',
    );
    if (data?.buildings) {
      for (const b of data.buildings) {
        this.buildings.set(b.id, b);
      }
      this.logger.log(`Loaded ${this.buildings.size} buildings`);
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

  private loadTechTree() {
    const stuData = this.loadYaml<{ technologies: TechDef[] }>(
      'research/stu-research-tree.yaml',
    );
    if (stuData?.technologies?.length) {
      this.techTree = stuData.technologies;
      this.logger.log(`Loaded ${this.techTree.length} STU technologies`);
      return;
    }

    const data = this.loadYaml<{ technologies: TechDef[] }>(
      'research/tech-tree.yaml',
    );
    if (data?.technologies) {
      this.techTree = data.technologies;
      this.logger.log(`Loaded ${this.techTree.length} technologies`);
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

  getBuildingsForFieldType(fieldType: number): BuildingDef[] {
    return Array.from(this.buildings.values()).filter((b) =>
      b.allowedFieldTypes.includes(fieldType),
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

  getTechTree(): TechDef[] {
    return this.techTree;
  }

  getTech(id: number): TechDef | undefined {
    return this.techTree.find((t) => t.id === id);
  }
}
