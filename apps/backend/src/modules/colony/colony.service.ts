import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { In, Repository } from 'typeorm';
import { Research, ResearchStatus } from '../research/entities/research.entity';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { ColonyDepositMining } from './entities/colony-deposit-mining.entity';
import { ColonyStats } from './entities/colony-stats.entity';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
} from './entities/colony-ship-build-queue.entity';
import { ColonyShipBuildplan } from './entities/colony-ship-buildplan.entity';
import {
  ColonyFabricationQueue,
  ColonyFabricationQueueStatus,
  ColonyFabricationQueueType,
} from './entities/colony-fabrication-queue.entity';
import {
  ColonyCrewTrainingQueue,
  ColonyCrewTrainingQueueStatus,
} from './entities/colony-crew-training-queue.entity';
import {
  AlertState,
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { SpacecraftStatsService } from '../spacecraft/spacecraft-stats.service';
import {
  GameDataService,
  BuildingDef,
  HangarShipDef,
} from '../game-data/game-data.service';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import {
  ColonyInternalSummary,
  ColonyStatsService,
} from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import { BuildingLifecycleService } from './building-lifecycle.service';
import { ColonyCrewService } from './colony-crew.service';

export interface ColonyTickEvent {
  type:
    | 'BUILDING_DEACTIVATED'
    | 'STORAGE_FULL'
    | 'BUILDING_FINISHED'
    | 'TERRAFORMING_FINISHED'
    | 'CREW_LIMIT_EXCEEDED';
  fieldIndex?: number;
  buildingId?: number | null;
  commodityId?: number;
  reason?: string;
  amount?: number;
}

export interface ColonyTickResult {
  researchPoints: number;
  productionDelta: Map<number, number>;
  events: ColonyTickEvent[];
}

@Injectable()
export class ColonyService {
  private readonly legacyShipyardBuildingIds = new Set([
    11, 85010100, 85010300,
  ]);
  private readonly shipyardFunctionIds = new Set([5, 6, 7, 8, 21, 22]);
  private readonly airfieldFunctionId = 4;
  private readonly repairShipyardFunctionId = 22;
  private readonly repairSparePartCommodityId = 10001;
  private readonly repairSystemComponentCommodityId = 10002;
  private readonly headquartersBuildingIds = new Set([1, 82010100, 82010300]);

  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    @InjectRepository(ColonyStorage)
    readonly storageRepo: Repository<ColonyStorage>,
    @InjectRepository(ColonyDepositMining)
    private readonly depositMiningRepo: Repository<ColonyDepositMining>,
    @InjectRepository(ColonyStats)
    private readonly statsRepo: Repository<ColonyStats>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(CargoItem)
    private readonly cargoRepo: Repository<CargoItem>,
    @InjectRepository(Research)
    private readonly researchRepo: Repository<Research>,
    @InjectRepository(ColonyShipBuildQueue)
    private readonly shipBuildQueueRepo: Repository<ColonyShipBuildQueue>,
    @InjectRepository(ColonyShipBuildplan)
    private readonly shipBuildplanRepo: Repository<ColonyShipBuildplan>,
    @InjectRepository(SpacecraftModule)
    private readonly spacecraftModuleRepo: Repository<SpacecraftModule>,
    @InjectRepository(ColonyFabricationQueue)
    private readonly fabricationQueueRepo: Repository<ColonyFabricationQueue>,
    @InjectRepository(ColonyCrewTrainingQueue)
    private readonly crewTrainingQueueRepo: Repository<ColonyCrewTrainingQueue>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    private readonly gameData: GameDataService,
    private readonly unlockResolver: UnlockResolverService,
    private readonly colonyStatsService: ColonyStatsService,
    private readonly colonyStorageService: ColonyStorageService,
    private readonly buildingLifecycleService: BuildingLifecycleService,
    private readonly spacecraftStatsService: SpacecraftStatsService,
    private readonly colonyCrewService: ColonyCrewService,
  ) {}

  async getAvailableBuildings(userId: number, fieldType?: number) {
    const buildings = fieldType
      ? this.gameData.getBuildingsForFieldType(fieldType)
      : this.gameData
          .getAllBuildings()
          .filter(
            (building) =>
              building.visible !== false &&
              building.allowedFieldTypes.length > 0,
          );
    const result = [];
    for (const building of buildings) {
      if (await this.unlockResolver.isBuildingUnlocked(userId, building.id)) {
        result.push(building);
      }
    }
    return result;
  }

  async findAllByUser(userId: number): Promise<Colony[]> {
    const colonies = await this.colonyRepo.find({
      where: { userId },
      relations: ['starSystem', 'celestialObject'],
      order: { id: 'ASC' },
    });
    return colonies.map((colony) => this.toColonySummary(colony));
  }

  async findOne(colonyId: number, userId: number): Promise<Colony> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId, userId },
      relations: [
        'fields',
        'storage',
        'stats',
        'starSystem',
        'celestialObject',
      ],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    return this.toColonyDetail(colony, userId);
  }

  async getCurrentObjective(userId: number) {
    const colonies = await this.colonyRepo.find({
      where: { userId },
      relations: ['fields'],
      order: { id: 'ASC' },
    });
    if (colonies.length === 0) {
      return {
        key: 'CLAIM_HOMEWORLD',
        label: 'Heimatwelt waehlen',
        description: 'Waehle deinen ersten Planeten und gruende deine Kolonie.',
        href: '/claim-colony',
        completed: false,
      };
    }

    const completedResearch = await this.researchRepo.find({
      where: { userId, status: ResearchStatus.COMPLETED },
    });
    const completedTechIds = new Set(completedResearch.map((r) => r.techId));
    const activeResearch = await this.researchRepo.findOne({
      where: { userId, status: ResearchStatus.IN_PROGRESS },
    });
    const primaryColony = colonies[0];
    const hasCompletedShipyard = colonies.some((colony) =>
      colony.fields?.some((field) => this.isShipyardField(field, false)),
    );
    const hasShipyardInProgress = colonies.some((colony) =>
      colony.fields?.some((field) => this.isShipyardField(field, true)),
    );
    const shipCount = await this.shipRepo.count({ where: { userId } });

    const isKlingon = completedTechIds.has(1003);
    const foodTechId = isKlingon ? 220103 : 220101;
    const waterPowerTechId = isKlingon ? 230103 : 230101;
    const chemistryTechId = isKlingon ? 254003 : 254001;

    if (!completedTechIds.has(foodTechId)) {
      const tech = this.gameData.getTech(foodTechId);
      return {
        key: 'RESEARCH_FOOD',
        label: `${tech?.name ?? 'Nahrungsforschung'} erforschen`,
        description:
          activeResearch?.techId === foodTechId
            ? 'Forschung laeuft. Fehlt Baumaterial, pausiert der Fortschritt automatisch.'
            : 'Erweitere deine Nahrungsproduktion auf Wasserfelder. Kostet Baumaterial pro Tick.',
        href: `/research?focus=${foodTechId}`,
        completed: false,
        colonyId: primaryColony.id,
      };
    }

    if (!completedTechIds.has(waterPowerTechId)) {
      const tech = this.gameData.getTech(waterPowerTechId);
      return {
        key: 'RESEARCH_WATER_POWER',
        label: `${tech?.name ?? 'Wasserenergieanlage'} erforschen`,
        description:
          activeResearch?.techId === waterPowerTechId
            ? 'Forschung laeuft. Fehlt Baumaterial, pausiert der Fortschritt automatisch.'
            : 'Schalte eine fruehe Energieoption fuer Wasserfelder frei.',
        href: `/research?focus=${waterPowerTechId}`,
        completed: false,
        colonyId: primaryColony.id,
      };
    }

    if (!completedTechIds.has(chemistryTechId)) {
      const tech = this.gameData.getTech(chemistryTechId);
      return {
        key: 'RESEARCH_BASIC_CHEMISTRY',
        label: `${tech?.name ?? 'Grundstoffchemie'} erforschen`,
        description:
          activeResearch?.techId === chemistryTechId
            ? 'Forschung laeuft. Fehlt Baumaterial, pausiert der Fortschritt automatisch.'
            : 'Schalte chemische Komponenten als naechsten Industriezweig frei.',
        href: `/research?focus=${chemistryTechId}`,
        completed: false,
        colonyId: primaryColony.id,
      };
    }

    const shipyardUnlocked = await this.unlockResolver.isBuildingUnlocked(
      userId,
      11,
    );
    if (!shipyardUnlocked) {
      const nextResearch = this.getNextAvailableResearch(completedTechIds);
      if (nextResearch) {
        return {
          key: `RESEARCH_${nextResearch.id}`,
          label: `${nextResearch.name} erforschen`,
          description: nextResearch.mappedCommodityId
            ? `Kostet ${this.gameData.getCommodity(nextResearch.mappedCommodityId)?.name ?? 'Ressourcen'} pro Tick.`
            : 'Schaltet den naechsten Entwicklungsschritt frei.',
          href: `/research?focus=${nextResearch.id}`,
          completed: false,
          colonyId: primaryColony.id,
        };
      }
    }

    if (shipyardUnlocked && !hasCompletedShipyard) {
      return {
        key: hasShipyardInProgress ? 'SHIPYARD_BUILDING' : 'BUILD_SHIPYARD_HUB',
        label: hasShipyardInProgress
          ? 'Werfthub fertigstellen'
          : 'Werfthub bauen',
        description: hasShipyardInProgress
          ? 'Der Werfthub ist im Bau. Nach Fertigstellung beginnt der Schiffbaupfad.'
          : 'Baue einen Werfthub auf einem passenden Koloniefeld.',
        href: `/colonies?selected=${primaryColony.id}`,
        completed: false,
        colonyId: primaryColony.id,
      };
    }

    if (shipCount === 0) {
      return {
        key: 'BUILD_FIRST_SHIP',
        label: 'Erstes Schiff bauen',
        description:
          'Deine Werft ist bereit. Plane jetzt dein erstes Schiff mit Kosten und Bauzeit.',
        href: `/colonies?selected=${primaryColony.id}`,
        completed: false,
        colonyId: primaryColony.id,
      };
    }

    return {
      key: 'OPEN_SPACECRAFT',
      label: 'Erstes Schiff einsetzen',
      description:
        'Dein erstes Schiff ist bereit. Jetzt werden Bewegung, Erkundung und Transfer relevant.',
      href: '/spacecraft',
      completed: true,
      colonyId: primaryColony.id,
    };
  }

  private getNextAvailableResearch(completedTechIds: Set<number>) {
    return this.gameData
      .getTechTree()
      .filter((tech) => !tech.hidden && !tech.excludeFromNormalProgression)
      .filter((tech) => {
        if (tech.id === 1001 || tech.id === 1003) return false;
        return true;
      })
      .filter((tech) => !completedTechIds.has(tech.id))
      .filter((tech) =>
        tech.dependencies.every((dependency) => {
          if (dependency.type === 'EXCLUDE') {
            return !dependency.techIds.some((id) => completedTechIds.has(id));
          }
          if (dependency.type === 'REQUIRE_SOME') {
            return dependency.techIds.some((id) => completedTechIds.has(id));
          }
          return dependency.techIds.every((id) => completedTechIds.has(id));
        }),
      )
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id)[0];
  }

  async rename(
    colonyId: number,
    userId: number,
    name: string,
  ): Promise<Colony> {
    const colony = await this.findOne(colonyId, userId);
    colony.name = name;
    return this.colonyRepo.save(colony);
  }

  async build(
    colonyId: number,
    userId: number,
    fieldIndex: number,
    buildingId: number,
  ): Promise<ColonyField> {
    const colony = await this.findOne(colonyId, userId);
    const field = colony.fields.find((f) => f.fieldIndex === fieldIndex);
    if (!field) throw new NotFoundException('Field not found');
    if (field.buildingId && !field.isBuilding) {
      throw new BadRequestException('Field already has a building');
    }

    const buildingDef = this.gameData.getBuilding(buildingId);
    if (!buildingDef) {
      throw new BadRequestException('Unknown building type');
    }

    if (!buildingDef.allowedFieldTypes.includes(field.fieldType)) {
      throw new BadRequestException(
        'Building cannot be placed on this terrain',
      );
    }
    this.assertOrbitAllowed(colony, field, 'build in orbit');

    if (buildingDef.researchId != null) {
      const unlocked = await this.unlockResolver.isBuildingUnlocked(
        userId,
        buildingId,
      );
      if (!unlocked) {
        throw new BadRequestException(
          `Research required: ${buildingDef.researchRequired || buildingDef.researchId}`,
        );
      }
    }

    const fieldBuildRule = this.gameData.getFieldBuildRule(
      buildingId,
      field.fieldType,
    );
    if (fieldBuildRule?.researchId != null) {
      const hasFieldResearch = await this.unlockResolver.hasTech(
        userId,
        fieldBuildRule.researchId,
      );
      if (!hasFieldResearch) {
        throw new BadRequestException(
          `Research required for this terrain: ${fieldBuildRule.researchId}`,
        );
      }
    }

    await this.checkBuildingLimits(colony, userId, buildingDef);

    const actualBuildingId = this.resolveFieldAlternative(
      buildingDef,
      field.fieldType,
    );
    const actualDef =
      actualBuildingId !== buildingId
        ? (this.gameData.getBuilding(actualBuildingId) ?? buildingDef)
        : buildingDef;

    this.checkDepositAvailability(colony, actualDef);

    this.deductBuildEnergy(colony, buildingDef);
    await this.deductBuildCosts(colony, buildingDef.resourceCosts ?? []);
    await this.colonyRepo.save(colony);

    this.buildingLifecycleService.prepareBuildJob(
      field,
      actualBuildingId,
      buildingDef.costs.buildTime,
    );

    return this.fieldRepo.save(field);
  }

  private async checkBuildingLimits(
    colony: Colony,
    userId: number,
    buildingDef: BuildingDef,
  ): Promise<void> {
    const colonyLimit = buildingDef.colonyLimit ?? buildingDef.bclimit ?? 0;
    const globalLimit = buildingDef.globalLimit ?? buildingDef.blimit ?? 0;

    if (colonyLimit > 0) {
      const colonyCount = (colony.fields ?? []).filter(
        (field) => field.buildingId === buildingDef.id,
      ).length;
      if (colonyCount >= colonyLimit) {
        throw new BadRequestException(
          `This building is limited to ${colonyLimit} per colony`,
        );
      }
    }

    if (globalLimit > 0) {
      const userColonies = await this.colonyRepo.find({
        where: { userId },
        relations: ['fields'],
      });
      const userCount = userColonies.reduce(
        (count, userColony) =>
          count +
          (userColony.fields ?? []).filter(
            (field) => field.buildingId === buildingDef.id,
          ).length,
        0,
      );
      if (userCount >= globalLimit) {
        throw new BadRequestException(
          `This building is limited to ${globalLimit} per user`,
        );
      }
    }
  }

  private deductBuildEnergy(colony: Colony, buildingDef: BuildingDef): void {
    const epsCost = buildingDef.epsCost || 0;
    if (epsCost <= 0) return;
    if (colony.energy < epsCost) {
      throw new BadRequestException(
        `Not enough energy: need ${epsCost}, have ${colony.energy}`,
      );
    }
    colony.energy -= epsCost;
  }

  private async deductBuildCosts(
    colony: Colony,
    resourceCosts: Array<{ commodityId: number; amount: number }>,
  ): Promise<void> {
    const costMap: [number, number][] = resourceCosts.map((cost) => [
      cost.commodityId,
      cost.amount,
    ]);

    for (const [commodityId, required] of costMap) {
      if (required <= 0) continue;
      const storage = await this.storageRepo.findOne({
        where: { colonyId: colony.id, commodityId },
      });
      const available = storage?.amount || 0;
      if (available < required) {
        const commodity = this.gameData.getCommodity(commodityId);
        throw new BadRequestException(
          `Not enough ${commodity?.name || `resource #${commodityId}`}: need ${required}, have ${available}`,
        );
      }
    }

    for (const [commodityId, required] of costMap) {
      if (required <= 0) continue;
      await this.colonyStorageService.lowerStorage(
        colony,
        commodityId,
        required,
      );
    }
  }

  private resolveFieldAlternative(
    buildingDef: BuildingDef,
    fieldType: number,
  ): number {
    if (!buildingDef.fieldAlternatives?.length) return buildingDef.id;
    const alt = buildingDef.fieldAlternatives.find(
      (a) => a.fieldtype === fieldType,
    );
    if (!alt) return buildingDef.id;
    return alt.alternateBuildingId;
  }

  private checkDepositAvailability(
    colony: Colony,
    buildingDef: BuildingDef,
  ): void {
    const deposits = (buildingDef.production || []).filter(
      (p) => p.amount < 0 && p.commodityId >= 1500 && p.commodityId < 2000,
    );
    if (deposits.length === 0) return;

    const colonyClass = this.gameData.getColonyClass(colony.colonyClassId);
    const activeFields = (colony.fields ?? []).filter(
      (f) => f.buildingId && !f.isBuilding && f.isActive,
    );

    for (const deposit of deposits) {
      let available =
        colonyClass?.baseProduction.find(
          (bp) => bp.commodityId === deposit.commodityId,
        )?.amount ?? 0;

      for (const field of activeFields) {
        const def = this.gameData.getBuilding(field.buildingId!);
        if (!def) continue;
        for (const p of def.production) {
          if (p.commodityId === deposit.commodityId) {
            available += p.amount;
          }
        }
      }

      if (available + deposit.amount < 0) {
        const commodity = this.gameData.getCommodity(deposit.commodityId);
        throw new BadRequestException(
          `Nicht genug ${commodity?.name || 'Vorkommen'} verfügbar (${available} vorhanden)`,
        );
      }
    }
  }

  async demolish(
    colonyId: number,
    userId: number,
    fieldIndex: number,
  ): Promise<ColonyField> {
    const colony = await this.findOne(colonyId, userId);
    const field = colony.fields.find((f) => f.fieldIndex === fieldIndex);
    if (!field) throw new NotFoundException('Field not found');
    if (!field.buildingId) {
      throw new BadRequestException('No building on this field');
    }
    if (this.isHeadquartersField(field)) {
      throw new BadRequestException('Cannot demolish headquarters');
    }
    if (field.isBuilding) {
      throw new BadRequestException(
        'Cannot demolish a building under construction',
      );
    }

    const definition = this.gameData.getBuilding(field.buildingId);
    if (!definition) {
      throw new BadRequestException('Unknown building');
    }

    if (field.isActive) {
      await this.buildingLifecycleService.deactivateBuilding(
        colony,
        field,
        definition,
      );
    }

    this.buildingLifecycleService.clearBuilding(field);
    return this.fieldRepo.save(field);
  }

  async repairBuilding(
    colonyId: number,
    userId: number,
    fieldIndex: number,
  ): Promise<ColonyField> {
    const colony = await this.findOne(colonyId, userId);
    const field = colony.fields.find((f) => f.fieldIndex === fieldIndex);
    if (!field) throw new NotFoundException('Field not found');
    if (!field.buildingId || field.isBuilding) {
      throw new BadRequestException('No completed building on this field');
    }
    if (field.maxIntegrity <= 0 || field.integrity >= field.maxIntegrity) {
      throw new BadRequestException('Building is not damaged');
    }
    this.assertOrbitAllowed(colony, field, 'repair orbital buildings');

    const definition = this.gameData.getBuilding(field.buildingId);
    if (!definition) {
      throw new BadRequestException('Unknown building');
    }

    const damageRatio =
      (field.maxIntegrity - field.integrity) / field.maxIntegrity;
    const epsCost = Math.ceil((definition.epsCost || 0) * damageRatio);
    if (epsCost > colony.energy) {
      throw new BadRequestException(
        `Not enough energy: need ${epsCost}, have ${colony.energy}`,
      );
    }

    const repairCosts = (definition.resourceCosts ?? [])
      .map((cost) => ({
        commodityId: cost.commodityId,
        amount: Math.ceil(cost.amount * damageRatio),
      }))
      .filter((cost) => cost.amount > 0);
    await this.deductBuildCosts(colony, repairCosts);

    colony.energy -= epsCost;
    await this.colonyRepo.save(colony);

    this.buildingLifecycleService.repairBuilding(field);
    return this.fieldRepo.save(field);
  }

  async terraformField(
    colonyId: number,
    userId: number,
    fieldIndex: number,
    terraformingId: number,
  ): Promise<ColonyField> {
    const colony = await this.findOne(colonyId, userId);
    const field = colony.fields.find((f) => f.fieldIndex === fieldIndex);
    if (!field) throw new NotFoundException('Field not found');
    if (field.buildingId || field.isBuilding) {
      throw new BadRequestException('Cannot terraform a field with a building');
    }
    if (field.terraformingId) {
      throw new BadRequestException('Field is already being terraformed');
    }

    const terraforming = this.gameData.getTerraforming(terraformingId);
    if (!terraforming || terraforming.fromFieldType !== field.fieldType) {
      throw new BadRequestException('Invalid terraforming option');
    }
    if (terraforming.researchId != null) {
      const hasResearch = await this.unlockResolver.hasTech(
        userId,
        terraforming.researchId,
      );
      if (!hasResearch) {
        throw new BadRequestException(
          `Research required: ${terraforming.researchId}`,
        );
      }
    }
    if (terraforming.energyCost > colony.energy) {
      throw new BadRequestException(
        `Not enough energy: need ${terraforming.energyCost}, have ${colony.energy}`,
      );
    }

    await this.deductBuildCosts(colony, terraforming.costs);
    colony.energy -= terraforming.energyCost;
    field.terraformingId = terraforming.id;
    field.terraformingFinishesAt = new Date(
      Date.now() + terraforming.duration * 1000,
    );
    await this.colonyRepo.save(colony);
    return this.fieldRepo.save(field);
  }

  async upgradeBuilding(
    colonyId: number,
    userId: number,
    fieldIndex: number,
    upgradeId: number,
  ): Promise<ColonyField> {
    const colony = await this.findOne(colonyId, userId);
    const field = colony.fields.find((f) => f.fieldIndex === fieldIndex);
    if (!field) throw new NotFoundException('Field not found');
    if (!field.buildingId || field.isBuilding) {
      throw new BadRequestException('No completed building on this field');
    }

    this.assertOrbitAllowed(colony, field, 'upgrade orbital buildings');

    const upgrade = this.gameData.getBuildingUpgrade(upgradeId);
    if (!upgrade || upgrade.fromBuildingId !== field.buildingId) {
      throw new BadRequestException('Invalid building upgrade');
    }
    if (upgrade.researchId != null && upgrade.researchId > 0) {
      const hasResearch = await this.unlockResolver.hasTech(
        userId,
        upgrade.researchId,
      );
      if (!hasResearch) {
        throw new BadRequestException(
          `Research required: ${upgrade.researchId}`,
        );
      }
    }

    const currentDefinition = this.gameData.getBuilding(field.buildingId);
    const targetDefinition = this.gameData.getBuilding(upgrade.toBuildingId);
    if (!currentDefinition || !targetDefinition) {
      throw new BadRequestException('Unknown building upgrade target');
    }
    if (upgrade.energyCost > colony.energy) {
      throw new BadRequestException(
        `Not enough energy: need ${upgrade.energyCost}, have ${colony.energy}`,
      );
    }

    await this.deductBuildCosts(colony, upgrade.costs);
    colony.energy -= upgrade.energyCost;

    const wasActive = field.isActive;
    if (wasActive) {
      await this.buildingLifecycleService.deactivateBuilding(
        colony,
        field,
        currentDefinition,
      );
    }

    field.activateAfterBuild = wasActive;
    field.reactivateAfterUpgrade = wasActive ? field.id : null;
    this.buildingLifecycleService.prepareBuildJob(
      field,
      upgrade.toBuildingId,
      targetDefinition.costs.buildTime,
    );
    field.activateAfterBuild = wasActive;
    await this.colonyRepo.save(colony);
    return this.fieldRepo.save(field);
  }

  async toggleBuilding(
    colonyId: number,
    userId: number,
    fieldIndex: number,
  ): Promise<ColonyField> {
    const colony = await this.findOne(colonyId, userId);
    const field = colony.fields.find((f) => f.fieldIndex === fieldIndex);
    if (!field) throw new NotFoundException('Field not found');
    if (!field.buildingId || field.isBuilding) {
      throw new BadRequestException('No completed building on this field');
    }
    if (this.isHeadquartersField(field)) {
      throw new BadRequestException('Cannot deactivate headquarters');
    }

    const definition = this.gameData.getBuilding(field.buildingId);
    if (!definition) {
      throw new BadRequestException('Unknown building');
    }

    if (field.isActive) {
      return this.buildingLifecycleService.deactivateBuilding(
        colony,
        field,
        definition,
      );
    } else {
      const summaryWithoutField = this.colonyStatsService.calculateSummary(
        colony,
        new Set([field.id]),
      );
      const availableWorkers =
        colony.stats?.workless ??
        colony.population - summaryWithoutField.workersUsed;
      if ((definition.bevUse || 0) > availableWorkers) {
        throw new BadRequestException('Nicht genug freie Arbeiter');
      }

      const energyAfter =
        summaryWithoutField.energyDelta + (definition.epsProc || 0);
      if (energyAfter < 0 && colony.energy + energyAfter < 0) {
        throw new BadRequestException('Nicht genug Energie');
      }

      return this.buildingLifecycleService.activateBuilding(
        colony,
        field,
        definition,
      );
    }
  }

  async setShieldFrequency(
    colonyId: number,
    userId: number,
    frequency: number,
  ): Promise<Colony> {
    const colony = await this.findOne(colonyId, userId);
    if (!colony.stats) throw new BadRequestException('Colony stats missing');
    if (!this.hasActiveBuildingFunction(colony, 24)) {
      throw new BadRequestException('Active shield generator required');
    }
    colony.stats.shieldFrequency = frequency;
    await this.statsRepo.save(colony.stats);
    return colony;
  }

  async loadShields(
    colonyId: number,
    userId: number,
    amount: number,
  ): Promise<Colony> {
    const colony = await this.findOne(colonyId, userId);
    if (!colony.stats) throw new BadRequestException('Colony stats missing');
    if (!this.hasActiveBuildingFunction(colony, 25)) {
      throw new BadRequestException('Active shield battery required');
    }
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const maxShields = Math.max(0, colony.stats.maxShields || 100);
    const current = colony.stats.shields ?? 0;
    const loadAmount = Math.min(amount, maxShields - current, colony.energy);
    if (loadAmount <= 0)
      throw new BadRequestException('No shield capacity or energy available');
    colony.energy -= loadAmount;
    colony.stats.maxShields = maxShields;
    colony.stats.shields = current + loadAmount;
    await this.statsRepo.save(colony.stats);
    await this.colonyRepo.save(colony);
    return colony;
  }

  private hasActiveBuildingFunction(
    colony: Colony,
    functionId: number,
  ): boolean {
    return (colony.fields ?? []).some((field) => {
      if (!field.buildingId || field.isBuilding || !field.isActive)
        return false;
      return this.gameData.buildingHasFunction(field.buildingId, functionId);
    });
  }

  private hasActiveAirfield(colony: Colony): boolean {
    return this.hasActiveBuildingFunction(colony, this.airfieldFunctionId);
  }

  private getHangarDefForShipClass(
    shipClass: ShipClassDef,
  ): HangarShipDef | undefined {
    return this.gameData.getHangarShipDef(shipClass.key);
  }

  private async getHangarInventory(colony: Colony): Promise<
    Array<{
      shipClassKey: string;
      hangarCommodityId: number;
      displayName: string;
      amount: number;
    }>
  > {
    const inventory = [];
    for (const def of this.gameData.getAllHangarShipDefs()) {
      const storage = await this.storageRepo.findOne({
        where: { colonyId: colony.id, commodityId: def.hangarCommodityId },
      });
      inventory.push({
        shipClassKey: def.shipClassKey,
        hangarCommodityId: def.hangarCommodityId,
        displayName: def.displayName,
        amount: storage?.amount ?? 0,
      });
    }
    return inventory;
  }

  private async getStartableHangarShips(
    userId: number,
    colony: Colony,
  ): Promise<
    Array<{
      shipClass: ShipClassDef;
      hangarDef: HangarShipDef;
      amount: number;
    }>
  > {
    const result = [];
    for (const def of this.gameData.getAllHangarShipDefs()) {
      const shipClass = await this.shipClassRepo.findOne({
        where: { key: def.shipClassKey },
      });
      if (!shipClass || shipClass.isNpc) continue;
      const unlocked = await this.unlockResolver.isShipClassUnlocked(
        userId,
        shipClass.id,
      );
      if (!unlocked) continue;
      const storage = await this.storageRepo.findOne({
        where: { colonyId: colony.id, commodityId: def.hangarCommodityId },
      });
      result.push({ shipClass, hangarDef: def, amount: storage?.amount ?? 0 });
    }
    return result;
  }

  async queueCrewTraining(
    colonyId: number,
    userId: number,
    amount: number,
  ): Promise<ColonyCrewTrainingQueue> {
    const colony = await this.findOne(colonyId, userId);
    const hasAcademy = colony.fields.some((field) => {
      if (!field.buildingId || field.isBuilding || !field.isActive)
        return false;
      return this.gameData.buildingHasFunction(field.buildingId, 20);
    });
    if (!hasAcademy) {
      throw new BadRequestException('Academy required for crew training');
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    if (!colony.stats) {
      throw new BadRequestException('Colony stats missing');
    }

    const [remainingGlobal, trainableGlobal, inTraining, freeLocal] =
      await Promise.all([
        this.colonyCrewService.getRemainingCount(userId),
        this.colonyCrewService.getTrainableCount(userId),
        this.colonyCrewService.getInTrainingCount(userId),
        this.colonyCrewService.getFreeAssignmentCount(colony),
      ]);
    const trainableNow = Math.max(0, trainableGlobal - inTraining);
    const finalAmount = Math.min(
      amount,
      remainingGlobal,
      trainableNow,
      freeLocal,
      colony.stats.workless,
    );
    if (finalAmount <= 0) {
      throw new BadRequestException('No crew can currently be trained');
    }

    colony.stats.workless -= finalAmount;
    await this.statsRepo.save(colony.stats);

    const queue = this.crewTrainingQueueRepo.create({
      colonyId: colony.id,
      userId,
      amount: finalAmount,
      finishesAt: new Date(Date.now() + Math.max(1, finalAmount) * 60_000),
      status: ColonyCrewTrainingQueueStatus.QUEUED,
    });
    return this.crewTrainingQueueRepo.save(queue);
  }

  async queueFabrication(
    colonyId: number,
    userId: number,
    queueType: ColonyFabricationQueueType,
    itemKey: string,
    amount: number,
    buildingFunctionId: number,
  ): Promise<ColonyFabricationQueue> {
    const normalizedItemKey = itemKey?.trim();
    const item = this.gameData.getFabricationItem(normalizedItemKey);
    if (!item) {
      throw new BadRequestException('Unknown fabrication item');
    }
    if (item.queueType !== queueType) {
      throw new BadRequestException('Fabrication item queue type mismatch');
    }
    if (!item.buildingFunctionIds.includes(buildingFunctionId)) {
      throw new BadRequestException(
        'Fabrication item cannot be produced by this building function',
      );
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const colony = await this.findOne(colonyId, userId);
    if (!this.hasActiveBuildingFunction(colony, buildingFunctionId)) {
      throw new BadRequestException(
        'Required fabrication building is not active',
      );
    }

    const activeForFunction = await this.fabricationQueueRepo.find({
      where: {
        colonyId: colony.id,
        buildingFunctionId,
        status: ColonyFabricationQueueStatus.QUEUED,
      },
    });
    if (activeForFunction.length > 0) {
      throw new BadRequestException(
        'A fabrication queue is already active for this building function',
      );
    }

    for (const cost of item.costs) {
      await this.colonyStorageService.lowerStorage(
        colony,
        cost.commodityId,
        cost.amount * amount,
      );
    }

    const queue = this.fabricationQueueRepo.create({
      colonyId: colony.id,
      userId,
      queueType,
      itemKey: normalizedItemKey,
      amount,
      buildingFunctionId,
      finishesAt: new Date(Date.now() + item.durationSeconds * amount * 1000),
      status: ColonyFabricationQueueStatus.QUEUED,
    });
    return this.fabricationQueueRepo.save(queue);
  }

  async cancelFabricationQueue(
    colonyId: number,
    userId: number,
    queueId: number,
  ): Promise<ColonyFabricationQueue> {
    const colony = await this.findOne(colonyId, userId);
    const queue = await this.fabricationQueueRepo.findOne({
      where: {
        id: queueId,
        colonyId: colony.id,
        userId,
      },
    });
    if (!queue) {
      throw new NotFoundException('Fabrication queue not found');
    }
    if (queue.status !== ColonyFabricationQueueStatus.QUEUED) {
      throw new BadRequestException(
        'Only queued fabrication jobs can be cancelled',
      );
    }

    const item = this.gameData.getFabricationItem(queue.itemKey);
    if (item) {
      const maxStorage =
        this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
      for (const cost of item.costs) {
        const refund = Math.floor((cost.amount * queue.amount) / 2);
        await this.colonyStorageService.upperStorage(
          colony,
          cost.commodityId,
          refund,
          maxStorage,
        );
      }
    }

    queue.status = ColonyFabricationQueueStatus.CANCELLED;
    return this.fabricationQueueRepo.save(queue);
  }

  async landShip(
    colonyId: number,
    userId: number,
    shipId: number,
  ): Promise<Colony> {
    const colony = await this.findOne(colonyId, userId);
    if (!this.hasActiveAirfield(colony)) {
      throw new BadRequestException('Active airfield required');
    }
    const ship = await this.shipRepo.findOne({ where: { id: shipId, userId } });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (!this.canManageOrbitShip(colony, ship)) {
      throw new BadRequestException('Ship is not in colony orbit');
    }
    const shipClass = await this.shipClassRepo.findOneBy({
      id: ship.shipClassId,
    });
    if (!shipClass) throw new BadRequestException('Unknown ship class');
    const hangarDef = this.getHangarDefForShipClass(shipClass);
    if (!hangarDef) throw new BadRequestException('Ship cannot land in hangar');

    const freeAssignmentCount =
      await this.colonyCrewService.getFreeAssignmentCount(colony);
    if (ship.crew > freeAssignmentCount) {
      throw new BadRequestException('Not enough colony crew capacity');
    }
    const maxStorage =
      this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
    const cargo = await this.cargoRepo.find({
      where: { spacecraftId: ship.id },
    });
    const cargoAmount = cargo.reduce((sum, item) => sum + item.amount, 0);
    const freeStorage = await this.colonyStorageService.getFreeStorage(
      colony,
      maxStorage,
    );
    if (freeStorage < cargoAmount + 1) {
      throw new BadRequestException('Not enough colony storage capacity');
    }

    for (const item of cargo) {
      await this.colonyStorageService.upperStorage(
        colony,
        item.commodityId,
        item.amount,
        maxStorage,
      );
      item.amount = 0;
      await this.cargoRepo.save(item);
    }
    await this.colonyStorageService.upperStorage(
      colony,
      hangarDef.hangarCommodityId,
      1,
      maxStorage,
    );
    await this.colonyCrewService.transferCrewFromShipToColony(
      colony,
      ship,
      ship.crew,
    );
    await this.shipRepo.remove(ship);
    return this.findOne(colonyId, userId);
  }

  async buildAirfieldRump(
    colonyId: number,
    userId: number,
    shipClassId: number,
    amount = 1,
  ): Promise<Colony> {
    const colony = await this.findOne(colonyId, userId);
    if (!this.hasActiveAirfield(colony)) {
      throw new BadRequestException('Active airfield required');
    }
    if (!Number.isInteger(amount) || amount <= 0 || amount > 50) {
      throw new BadRequestException('Amount must be between 1 and 50');
    }
    const shipClass = await this.shipClassRepo.findOneBy({ id: shipClassId });
    if (!shipClass || shipClass.isNpc) {
      throw new BadRequestException('Unknown ship class');
    }
    const hangarDef = this.getHangarDefForShipClass(shipClass);
    if (!hangarDef)
      throw new BadRequestException('Ship class is not hangar-buildable');
    const unlocked = await this.unlockResolver.isShipClassUnlocked(
      userId,
      shipClass.id,
    );
    if (!unlocked) throw new BadRequestException('Ship class is not unlocked');

    const totalEnergy = hangarDef.buildEnergyCost * amount;
    if (colony.energy < totalEnergy) {
      throw new BadRequestException(
        `Not enough energy: need ${totalEnergy}, have ${colony.energy}`,
      );
    }
    const totalCosts = hangarDef.buildCosts.map((cost) => ({
      commodityId: cost.commodityId,
      amount: cost.amount * amount,
    }));
    await this.deductBuildCosts(colony, totalCosts);
    colony.energy -= totalEnergy;
    await this.colonyRepo.save(colony);

    const maxStorage =
      this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
    const stored = await this.colonyStorageService.upperStorage(
      colony,
      hangarDef.hangarCommodityId,
      amount,
      maxStorage,
    );
    if (stored < amount) {
      throw new BadRequestException('Not enough colony storage capacity');
    }
    return this.findOne(colonyId, userId);
  }

  async startHangarShip(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name?: string,
  ): Promise<Colony> {
    const colony = await this.findOne(colonyId, userId);
    if (!this.hasActiveAirfield(colony)) {
      throw new BadRequestException('Active airfield required');
    }
    const shipClass = await this.shipClassRepo.findOneBy({ id: shipClassId });
    if (!shipClass || shipClass.isNpc) {
      throw new BadRequestException('Unknown ship class');
    }
    const hangarDef = this.getHangarDefForShipClass(shipClass);
    if (!hangarDef)
      throw new BadRequestException('Ship class is not startable from hangar');
    if (colony.energy < hangarDef.startEnergyCost) {
      throw new BadRequestException(
        `Not enough energy: need ${hangarDef.startEnergyCost}, have ${colony.energy}`,
      );
    }
    const availableCrew = await this.colonyCrewService.getAvailableColonyCrew(
      colony.id,
    );
    const crewRequired = Math.max(0, shipClass.crewMin || 0);
    if (availableCrew.length < crewRequired) {
      throw new BadRequestException(
        `Not enough trained crew: need ${crewRequired}, have ${availableCrew.length}`,
      );
    }

    await this.colonyStorageService.lowerStorage(
      colony,
      hangarDef.hangarCommodityId,
      1,
    );
    colony.energy -= hangarDef.startEnergyCost;
    await this.colonyRepo.save(colony);
    const crewIds = await this.colonyCrewService.reserveCrewForShipBuild(
      colony,
      crewRequired,
    );
    if (crewIds.length < crewRequired) {
      throw new BadRequestException('Unable to reserve trained crew');
    }

    const ship = this.createShipFromClass(
      colony,
      userId,
      shipClass,
      name?.trim() || shipClass.name,
    );
    ship.crew = crewRequired;
    const savedShip = await this.shipRepo.save(ship);
    const modules = await this.createDefaultModulesForHangarShip(
      savedShip.id,
      hangarDef,
    );
    if (crewRequired > 0) {
      await this.colonyCrewService.assignCrewToShip(
        userId,
        savedShip.id,
        crewIds,
      );
    }
    this.spacecraftStatsService.applyStats(savedShip, shipClass, modules);
    await this.shipRepo.save(savedShip);
    return this.findOne(colonyId, userId);
  }

  private async createDefaultModulesForHangarShip(
    spacecraftId: number,
    hangarDef: HangarShipDef,
  ): Promise<SpacecraftModule[]> {
    const modules: SpacecraftModule[] = [];
    for (const commodityId of hangarDef.defaultModuleCommodityIds ?? []) {
      const item =
        this.gameData.getFabricationItemByOutputCommodity(commodityId);
      if (!item?.moduleType) continue;
      modules.push(
        await this.spacecraftModuleRepo.save(
          this.spacecraftModuleRepo.create({
            spacecraftId,
            moduleType: item.moduleType,
            category: item.moduleCategory ?? 'UNKNOWN',
            level: item.moduleLevel ?? 1,
            integrity: 100,
            cooldown: 0,
            isActive: true,
          }),
        ),
      );
    }
    return modules;
  }

  async disassembleShip(
    colonyId: number,
    userId: number,
    shipId: number,
  ): Promise<Colony> {
    const colony = await this.findOne(colonyId, userId);
    const ship = await this.shipRepo.findOne({ where: { id: shipId, userId } });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (!this.canManageOrbitShip(colony, ship)) {
      throw new BadRequestException('Ship is not in colony orbit');
    }
    if (colony.energy < 20) {
      throw new BadRequestException('20 energy required to disassemble ship');
    }
    const freeAssignmentCount =
      await this.colonyCrewService.getFreeAssignmentCount(colony);
    if (ship.crew > freeAssignmentCount) {
      throw new BadRequestException('Not enough colony crew capacity');
    }

    await this.transferShipCargoToColony(colony, ship);
    await this.colonyCrewService.transferCrewFromShipToColony(
      colony,
      ship,
      ship.crew,
    );

    const shipClass = await this.shipClassRepo.findOneBy({
      id: ship.shipClassId,
    });
    if (shipClass) {
      const maxStorage =
        this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
      for (const cost of this.calculateShipBuildCosts(shipClass)) {
        const refund = Math.floor(cost.amount / 2);
        if (refund > 0) {
          await this.colonyStorageService.upperStorage(
            colony,
            cost.commodityId,
            refund,
            maxStorage,
          );
        }
      }
    }

    colony.energy -= 20;
    await this.colonyRepo.save(colony);
    await this.shipRepo.remove(ship);
    return this.findOne(colonyId, userId);
  }

  async assignCrewToShip(
    colonyId: number,
    userId: number,
    shipId: number,
    amount: number,
  ): Promise<Colony> {
    const colony = await this.findOne(colonyId, userId);
    const ship = await this.shipRepo.findOne({ where: { id: shipId, userId } });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    await this.colonyCrewService.transferCrewFromColonyToShip(
      colony,
      ship,
      amount,
    );
    return this.findOne(colonyId, userId);
  }

  async unassignCrewFromShip(
    colonyId: number,
    userId: number,
    shipId: number,
    amount: number,
  ): Promise<Colony> {
    const colony = await this.findOne(colonyId, userId);
    const ship = await this.shipRepo.findOne({ where: { id: shipId, userId } });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    await this.colonyCrewService.transferCrewFromShipToColony(
      colony,
      ship,
      amount,
    );
    return this.findOne(colonyId, userId);
  }

  private async transferShipCargoToColony(
    colony: Colony,
    ship: Spacecraft,
  ): Promise<void> {
    const maxStorage =
      this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
    const cargo = await this.cargoRepo.find({
      where: { spacecraftId: ship.id },
    });
    for (const item of cargo) {
      const stored = await this.colonyStorageService.upperStorage(
        colony,
        item.commodityId,
        item.amount,
        maxStorage,
      );
      item.amount = Math.max(0, item.amount - stored);
      await this.cargoRepo.save(item);
    }
    ship.cargoUsed = await this.getShipCargoUsed(ship.id);
    await this.shipRepo.save(ship);
  }

  private async getShipCargoUsed(shipId: number): Promise<number> {
    const result = await this.cargoRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where('c.spacecraftId = :shipId', { shipId })
      .getRawOne();
    return parseInt(result?.total || '0', 10);
  }

  private canManageOrbitShip(colony: Colony, ship: Spacecraft): boolean {
    return (
      ship.userId === colony.userId &&
      ship.starSystemId === colony.starSystemId &&
      (colony.celestialObjectId == null ||
        ship.celestialObjectId === colony.celestialObjectId)
    );
  }

  private isShipRepairNeeded(
    ship: Spacecraft,
    modules: SpacecraftModule[] = [],
  ): boolean {
    return (
      ship.hull < ship.hullMax ||
      modules.some((module) => module.integrity < 100)
    );
  }

  private calculateShipRepairPlan(
    colony: Colony,
    ship: Spacecraft,
    modules: SpacecraftModule[] = [],
  ): {
    costs: Array<{ commodityId: number; amount: number }>;
    durationMinutes: number;
    hasRepairShipyardBonus: boolean;
  } {
    const hasRepairShipyardBonus = this.hasActiveBuildingFunction(
      colony,
      this.repairShipyardFunctionId,
    );
    const hullDamage = Math.max(0, ship.hullMax - ship.hull);
    const hullChunks = Math.ceil(hullDamage / 100);
    const damagedModules = modules.filter((module) => module.integrity < 100);
    const systemComponentChunks = damagedModules.reduce(
      (sum, module) => sum + Math.ceil((100 - module.integrity) / 100),
      0,
    );
    const applyBonus = (amount: number) =>
      hasRepairShipyardBonus ? Math.ceil(amount / 2) : amount;
    const costs = [
      {
        commodityId: this.repairSparePartCommodityId,
        amount: applyBonus(hullChunks),
      },
      {
        commodityId: this.repairSystemComponentCommodityId,
        amount: applyBonus(systemComponentChunks),
      },
    ].filter((cost) => cost.amount > 0);
    const durationUnits = hullChunks + damagedModules.length;
    const durationMinutes = Math.max(1, applyBonus(Math.max(1, durationUnits)));

    return { costs, durationMinutes, hasRepairShipyardBonus };
  }

  private async hasActiveShipyardQueueForShip(
    colonyId: number,
    userId: number,
    spacecraftId: number,
  ): Promise<boolean> {
    const queue = await this.shipBuildQueueRepo.findOne({
      where: {
        colonyId,
        userId,
        spacecraftId,
        status: ColonyShipBuildQueueStatus.QUEUED,
      },
    });
    return !!queue;
  }

  async queueShipRepair(
    colonyId: number,
    userId: number,
    shipId: number,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    if (
      !this.hasActiveBuildingFunction(colony, this.repairShipyardFunctionId)
    ) {
      throw new BadRequestException('Active repair shipyard required');
    }

    const ship = await this.shipRepo.findOne({ where: { id: shipId, userId } });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (!this.canManageOrbitShip(colony, ship)) {
      throw new BadRequestException('Ship is not in colony orbit');
    }
    if (await this.hasActiveShipyardQueueForShip(colony.id, userId, ship.id)) {
      throw new BadRequestException('Ship already has an active shipyard job');
    }

    const modules = await this.spacecraftModuleRepo.find({
      where: { spacecraftId: ship.id },
    });
    if (!this.isShipRepairNeeded(ship, modules)) {
      throw new BadRequestException('Ship is not damaged');
    }

    const repairPlan = this.calculateShipRepairPlan(colony, ship, modules);
    await this.deductBuildCosts(colony, repairPlan.costs);

    const queue = this.shipBuildQueueRepo.create({
      colonyId: colony.id,
      userId,
      shipClassId: ship.shipClassId,
      mode: ColonyShipBuildQueueMode.REPAIR,
      spacecraftId: ship.id,
      name: `Reparatur: ${ship.name}`,
      buildPlanName: null,
      buildPlanId: null,
      buildPlanSignature: null,
      moduleTypes: [],
      moduleCommodityIds: [],
      crewAssigned: 0,
      crewIds: [],
      repairSnapshot: {
        hullBefore: ship.hull,
        hullAfter: ship.hullMax,
        moduleIntegrityBefore: modules
          .filter((module) => module.integrity < 100)
          .map((module) => ({
            moduleId: module.id,
            integrity: module.integrity,
          })),
        costs: repairPlan.costs,
      },
      retrofitSnapshot: null,
      finishesAt: new Date(Date.now() + repairPlan.durationMinutes * 60_000),
      status: ColonyShipBuildQueueStatus.QUEUED,
    });

    return this.shipBuildQueueRepo.save(queue);
  }

  async queueShipRetrofit(
    colonyId: number,
    userId: number,
    shipId: number,
    moduleCommodityIds: number[] = [],
    buildPlanName?: string,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    const ship = await this.shipRepo.findOne({ where: { id: shipId, userId } });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (!this.canManageOrbitShip(colony, ship)) {
      throw new BadRequestException('Ship is not in colony orbit');
    }
    if (await this.hasActiveShipyardQueueForShip(colony.id, userId, ship.id)) {
      throw new BadRequestException('Ship already has an active shipyard job');
    }

    const shipClass = await this.shipClassRepo.findOneBy({
      id: ship.shipClassId,
    });
    if (!shipClass || shipClass.isNpc) {
      throw new BadRequestException('Unknown ship class');
    }
    const activeShipyardFunctionIds = this.getActiveShipyardFunctionIds(colony);
    this.assertShipyardCompatibility(shipClass, activeShipyardFunctionIds);

    const selectedModuleCommodityIds =
      this.validateShipBuildModuleCommodities(moduleCommodityIds);
    this.assertModuleSlotCompatibility(shipClass, selectedModuleCommodityIds);
    const selectedModuleTypes = selectedModuleCommodityIds.map(
      (commodityId) =>
        this.gameData.getFabricationItemByOutputCommodity(commodityId)!
          .moduleType!,
    );

    const installedModules = await this.spacecraftModuleRepo.find({
      where: { spacecraftId: ship.id },
    });
    const oldModuleCommodityIds =
      this.resolveModuleCommodityIds(installedModules);
    if (
      this.createBuildplanSignature(ship.shipClassId, oldModuleCommodityIds) ===
      this.createBuildplanSignature(
        ship.shipClassId,
        selectedModuleCommodityIds,
      )
    ) {
      throw new BadRequestException('No retrofit changes selected');
    }

    const consumedModuleCommodityIds = this.diffCommodityIds(
      selectedModuleCommodityIds,
      oldModuleCommodityIds,
    );
    await this.assertModuleCommoditiesAvailable(
      colony,
      consumedModuleCommodityIds,
    );

    const buildPlanSignature = this.createBuildplanSignature(
      ship.shipClassId,
      selectedModuleCommodityIds,
    );
    const buildPlan = await this.getOrCreateBuildplan(
      userId,
      ship.shipClassId,
      buildPlanName?.trim() || `${shipClass.name} Retrofit`,
      buildPlanSignature,
      selectedModuleCommodityIds,
      selectedModuleTypes,
    );

    for (const commodityId of consumedModuleCommodityIds) {
      await this.colonyStorageService.lowerStorage(colony, commodityId, 1);
    }

    const buildMinutes = Math.max(1, shipClass.buildTimeTicks || 1);
    const queue = this.shipBuildQueueRepo.create({
      colonyId: colony.id,
      userId,
      shipClassId: ship.shipClassId,
      mode: ColonyShipBuildQueueMode.RETROFIT,
      spacecraftId: ship.id,
      name: `Umrüstung: ${ship.name}`,
      buildPlanName: buildPlan.name,
      buildPlanId: buildPlan.id,
      buildPlanSignature,
      moduleTypes: selectedModuleTypes,
      moduleCommodityIds: selectedModuleCommodityIds,
      crewAssigned: 0,
      crewIds: [],
      repairSnapshot: null,
      retrofitSnapshot: {
        oldModuleCommodityIds,
        newModuleCommodityIds: selectedModuleCommodityIds,
        newModuleTypes: selectedModuleTypes,
        returnedModuleCommodityIds: [],
        consumedModuleCommodityIds,
      },
      finishesAt: new Date(Date.now() + buildMinutes * 60_000),
      status: ColonyShipBuildQueueStatus.QUEUED,
    });

    return this.shipBuildQueueRepo.save(queue);
  }

  private resolveModuleCommodityIds(modules: SpacecraftModule[]): number[] {
    return modules
      .map((module) => this.resolveModuleCommodityId(module))
      .filter((commodityId): commodityId is number => commodityId != null);
  }

  private resolveModuleCommodityId(module: SpacecraftModule): number | null {
    const item = this.gameData
      .getAllFabricationItems()
      .find(
        (candidate) =>
          candidate.queueType === ColonyFabricationQueueType.MODULE &&
          candidate.moduleType === module.moduleType &&
          (candidate.moduleCategory ?? module.category) === module.category &&
          (candidate.moduleLevel ?? module.level) === module.level,
      );
    return item?.outputCommodityId ?? null;
  }

  private diffCommodityIds(desired: number[], existing: number[]): number[] {
    const remainingExisting = [...existing];
    const diff: number[] = [];
    for (const commodityId of desired) {
      const existingIndex = remainingExisting.indexOf(commodityId);
      if (existingIndex >= 0) {
        remainingExisting.splice(existingIndex, 1);
      } else {
        diff.push(commodityId);
      }
    }
    return diff;
  }

  async cancelShipBuildQueue(
    colonyId: number,
    userId: number,
    queueId: number,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    const queue = await this.shipBuildQueueRepo.findOne({
      where: { id: queueId, colonyId: colony.id, userId },
    });
    if (!queue) {
      throw new NotFoundException('Ship build queue not found');
    }
    if (queue.status !== ColonyShipBuildQueueStatus.QUEUED) {
      throw new BadRequestException(
        'Only queued shipyard jobs can be cancelled',
      );
    }

    if (!queue.mode || queue.mode === ColonyShipBuildQueueMode.BUILD) {
      await this.colonyCrewService.returnCrewToColony(
        colony,
        queue.crewIds ?? [],
      );
    }

    if (queue.mode === ColonyShipBuildQueueMode.RETROFIT) {
      const maxStorage =
        this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
      for (const commodityId of queue.retrofitSnapshot
        ?.consumedModuleCommodityIds ?? []) {
        await this.colonyStorageService.upperStorage(
          colony,
          commodityId,
          1,
          maxStorage,
        );
      }
    }

    queue.status = ColonyShipBuildQueueStatus.CANCELLED;
    return this.shipBuildQueueRepo.save(queue);
  }

  async cancelShipyardQueue(
    colonyId: number,
    userId: number,
    queueId: number,
  ): Promise<ColonyShipBuildQueue> {
    return this.cancelShipBuildQueue(colonyId, userId, queueId);
  }

  private createBuildplanSignature(
    shipClassId: number,
    moduleCommodityIds: number[],
  ): string {
    const canonical = JSON.stringify({
      shipClassId,
      moduleCommodityIds: [...moduleCommodityIds].sort((a, b) => a - b),
    });
    return createHash('sha256').update(canonical).digest('hex');
  }

  async buildShip(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name: string,
    moduleTypes: string[] = [],
    buildPlanName?: string,
    moduleCommodityIds: number[] = [],
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);

    const activeShipyardFunctionIds = this.getActiveShipyardFunctionIds(colony);
    if (activeShipyardFunctionIds.length === 0) {
      throw new BadRequestException('Colony needs a completed Shipyard');
    }

    const hasShipyardOperations = await this.unlockResolver.hasTechByName(
      userId,
      'Werftbetrieb',
    );
    if (!hasShipyardOperations) {
      throw new BadRequestException('Research required: Werftbetrieb');
    }

    const shipClass = await this.shipClassRepo.findOneBy({ id: shipClassId });
    if (!shipClass || shipClass.isNpc) {
      throw new BadRequestException('Unknown ship class');
    }

    const unlocked = await this.unlockResolver.isShipClassUnlocked(
      userId,
      shipClassId,
    );
    if (!unlocked) {
      throw new BadRequestException('Ship class is not unlocked');
    }
    this.assertShipyardCompatibility(shipClass, activeShipyardFunctionIds);

    const selectedModuleCommodityIds =
      this.validateShipBuildModuleCommodities(moduleCommodityIds);
    const selectedModuleTypes =
      selectedModuleCommodityIds.length > 0
        ? selectedModuleCommodityIds.map(
            (commodityId) =>
              this.gameData.getFabricationItemByOutputCommodity(commodityId)!
                .moduleType!,
          )
        : this.validateShipBuildModules(moduleTypes);
    this.assertModuleSlotCompatibility(shipClass, selectedModuleCommodityIds);

    const crewRequired = Math.max(0, shipClass.crewMin || 0);
    const availableCrew = await this.colonyCrewService.getAvailableColonyCrew(
      colony.id,
    );
    if (availableCrew.length < crewRequired) {
      throw new BadRequestException(
        `Not enough trained crew: need ${crewRequired}, have ${availableCrew.length}`,
      );
    }

    await this.assertModuleCommoditiesAvailable(
      colony,
      selectedModuleCommodityIds,
    );

    const buildPlanSignature = this.createBuildplanSignature(
      shipClassId,
      selectedModuleCommodityIds,
    );
    const buildPlan = await this.getOrCreateBuildplan(
      userId,
      shipClassId,
      buildPlanName?.trim() || `${shipClass.name} Buildplan`,
      buildPlanSignature,
      selectedModuleCommodityIds,
      selectedModuleTypes,
    );

    const costs = this.calculateShipBuildCosts(shipClass);
    await this.deductBuildCosts(colony, costs);
    for (const commodityId of selectedModuleCommodityIds) {
      await this.colonyStorageService.lowerStorage(colony, commodityId, 1);
    }
    const crewIds = await this.colonyCrewService.reserveCrewForShipBuild(
      colony,
      crewRequired,
    );
    if (crewIds.length < crewRequired) {
      throw new BadRequestException('Unable to reserve trained crew');
    }

    const buildMinutes = Math.max(1, shipClass.buildTimeTicks || 1);
    const queue = this.shipBuildQueueRepo.create({
      colonyId: colony.id,
      userId,
      shipClassId,
      name: name?.trim() || shipClass.name,
      buildPlanName: buildPlan.name,
      buildPlanId: buildPlan.id,
      buildPlanSignature,
      moduleTypes: selectedModuleTypes,
      moduleCommodityIds: selectedModuleCommodityIds,
      crewAssigned: crewRequired,
      crewIds,
      finishesAt: new Date(Date.now() + buildMinutes * 60_000),
      mode: ColonyShipBuildQueueMode.BUILD,
      spacecraftId: null,
      repairSnapshot: null,
      retrofitSnapshot: null,
      status: ColonyShipBuildQueueStatus.QUEUED,
    });

    return this.shipBuildQueueRepo.save(queue);
  }

  private getActiveShipyardFunctionIds(colony: Colony): number[] {
    return [
      ...new Set(
        (colony.fields ?? [])
          .filter((field) => this.isShipyardField(field, false))
          .flatMap((field) =>
            this.gameData.getBuildingFunctions(field.buildingId!),
          )
          .filter((functionId) => this.shipyardFunctionIds.has(functionId)),
      ),
    ];
  }

  private assertShipyardCompatibility(
    shipClass: ShipClassDef,
    activeShipyardFunctionIds: number[],
  ): void {
    const rule = this.gameData.getShipClassSlotRule(shipClass.category);
    if (!rule) return;
    const hasCompatibleShipyard = rule.allowedBuildingFunctionIds.some(
      (functionId) => activeShipyardFunctionIds.includes(functionId),
    );
    if (!hasCompatibleShipyard) {
      throw new BadRequestException(
        `${shipClass.category} cannot be built by the active shipyard`,
      );
    }
  }

  private assertModuleSlotCompatibility(
    shipClass: ShipClassDef,
    moduleCommodityIds: number[],
  ): void {
    if (moduleCommodityIds.length === 0) return;
    const rule = this.gameData.getShipClassSlotRule(shipClass.category);
    if (!rule) return;

    const counts = new Map<string, number>();
    for (const commodityId of moduleCommodityIds) {
      const item =
        this.gameData.getFabricationItemByOutputCommodity(commodityId);
      const category = item?.moduleCategory;
      if (!category || rule.moduleSlots[category] == null) {
        throw new BadRequestException(
          `${item?.displayName ?? `Module #${commodityId}`} is not allowed on ${shipClass.category}`,
        );
      }
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }

    for (const [category, count] of counts) {
      const max = rule.moduleSlots[category] ?? 0;
      if (count > max) {
        throw new BadRequestException(
          `Too many ${category} modules for ${shipClass.category}: ${count}/${max}`,
        );
      }
    }
  }

  private async getOrCreateBuildplan(
    userId: number,
    shipClassId: number,
    name: string,
    signature: string,
    moduleCommodityIds: number[],
    moduleTypes: string[],
  ): Promise<ColonyShipBuildplan> {
    const existing = await this.shipBuildplanRepo.findOne({
      where: { userId, signature },
    });
    if (existing) return existing;

    const buildplan = this.shipBuildplanRepo.create({
      userId,
      shipClassId,
      name,
      signature,
      moduleCommodityIds,
      moduleTypes,
    });
    return this.shipBuildplanRepo.save(buildplan);
  }

  private async assertModuleCommoditiesAvailable(
    colony: Colony,
    moduleCommodityIds: number[],
  ): Promise<void> {
    const required = new Map<number, number>();
    for (const commodityId of moduleCommodityIds) {
      required.set(commodityId, (required.get(commodityId) ?? 0) + 1);
    }
    for (const [commodityId, amount] of required) {
      const storage = await this.storageRepo.findOne({
        where: { colonyId: colony.id, commodityId },
      });
      if ((storage?.amount ?? 0) < amount) {
        const commodity = this.gameData.getCommodity(commodityId);
        throw new BadRequestException(
          `Not enough ${commodity?.name ?? `module #${commodityId}`} in colony storage`,
        );
      }
    }
  }

  private validateShipBuildModuleCommodities(
    moduleCommodityIds: number[],
  ): number[] {
    if (!Array.isArray(moduleCommodityIds) || moduleCommodityIds.length === 0)
      return [];

    const allModules = this.gameData.getAllModules();
    const validModuleNames = new Set(allModules.map((module) => module.name));
    const selected = moduleCommodityIds.map(Number);
    if (selected.some((commodityId) => !Number.isInteger(commodityId))) {
      throw new BadRequestException('Invalid module commodity id');
    }

    for (const commodityId of selected) {
      const item =
        this.gameData.getFabricationItemByOutputCommodity(commodityId);
      if (!item || item.queueType !== ColonyFabricationQueueType.MODULE) {
        throw new BadRequestException(
          `Commodity #${commodityId} is not a ship module`,
        );
      }
      if (!item.moduleType || !validModuleNames.has(item.moduleType)) {
        throw new BadRequestException(
          `Module commodity #${commodityId} has no valid module type`,
        );
      }
    }
    return selected;
  }

  private validateShipBuildModules(moduleTypes: string[]): string[] {
    if (!Array.isArray(moduleTypes) || moduleTypes.length === 0) return [];
    const allModules = this.gameData.getAllModules();
    const validNames = new Set(allModules.map((module) => module.name));
    const selected = [
      ...new Set(moduleTypes.map((module) => module.trim())),
    ].filter(Boolean);
    const unknown = selected.find((module) => !validNames.has(module));
    if (unknown) {
      throw new BadRequestException(`Unknown module type: ${unknown}`);
    }
    return selected;
  }

  private async processCrewTrainingQueue(colony: Colony): Promise<void> {
    const finishedJobs = await this.crewTrainingQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: ColonyCrewTrainingQueueStatus.QUEUED,
      },
    });
    const now = new Date();
    for (const job of finishedJobs.filter(
      (candidate) => candidate.finishesAt <= now,
    )) {
      await this.colonyCrewService.createCrewOnColony(colony, job.amount);
      job.status = ColonyCrewTrainingQueueStatus.COMPLETED;
      await this.crewTrainingQueueRepo.save(job);
    }
  }

  private async enforceLocalCrewLimit(
    colony: Colony,
    events: ColonyTickEvent[] = [],
  ): Promise<void> {
    const removed = await this.colonyCrewService.removeExcessColonyCrew(colony);
    if (removed > 0) {
      events.push({
        type: 'CREW_LIMIT_EXCEEDED',
        amount: removed,
        reason: 'LOCAL_CREW_LIMIT',
      });
    }
  }

  private async processFabricationQueue(colony: Colony): Promise<void> {
    const finishedJobs = await this.fabricationQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: ColonyFabricationQueueStatus.QUEUED,
      },
    });
    const now = new Date();
    for (const job of finishedJobs.filter(
      (candidate) => candidate.finishesAt <= now,
    )) {
      const item = this.gameData.getFabricationItem(job.itemKey);
      if (!item) continue;
      const maxStorage =
        this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
      await this.colonyStorageService.upperStorage(
        colony,
        item.outputCommodityId,
        item.outputAmount * job.amount,
        maxStorage,
      );
      job.status = ColonyFabricationQueueStatus.COMPLETED;
      await this.fabricationQueueRepo.save(job);
    }
  }

  private async processShipBuildQueue(colony: Colony): Promise<void> {
    const finishedJobs = await this.shipBuildQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: ColonyShipBuildQueueStatus.QUEUED,
      },
      relations: ['shipClass'],
    });
    const now = new Date();
    for (const job of finishedJobs.filter(
      (candidate) => candidate.finishesAt <= now,
    )) {
      if (job.mode === ColonyShipBuildQueueMode.REPAIR) {
        await this.finishShipRepairQueue(job);
        continue;
      }
      if (job.mode === ColonyShipBuildQueueMode.RETROFIT) {
        await this.finishShipRetrofitQueue(colony, job);
        continue;
      }
      await this.finishShipBuildQueue(colony, job);
    }
  }

  private async finishShipBuildQueue(
    colony: Colony,
    job: ColonyShipBuildQueue,
  ): Promise<void> {
    const shipClass =
      job.shipClass ??
      (await this.shipClassRepo.findOneBy({ id: job.shipClassId }));
    if (!shipClass) return;
    const ship = this.createShipFromClass(
      colony,
      job.userId,
      shipClass,
      job.name,
    );
    const savedShip = await this.shipRepo.save(ship);
    const modules = await this.createModulesForBuiltShip(savedShip.id, job);
    if ((job.crewAssigned ?? 0) > 0) {
      savedShip.crew = job.crewAssigned;
      await this.colonyCrewService.assignCrewToShip(
        job.userId,
        savedShip.id,
        job.crewIds ?? [],
      );
    }
    this.spacecraftStatsService.applyStats(savedShip, shipClass, modules);
    await this.shipRepo.save(savedShip);
    job.status = ColonyShipBuildQueueStatus.COMPLETED;
    await this.shipBuildQueueRepo.save(job);
  }

  private async finishShipRepairQueue(
    job: ColonyShipBuildQueue,
  ): Promise<void> {
    if (!job.spacecraftId) {
      job.status = ColonyShipBuildQueueStatus.CANCELLED;
      await this.shipBuildQueueRepo.save(job);
      return;
    }
    const ship = await this.shipRepo.findOne({
      where: { id: job.spacecraftId, userId: job.userId },
    });
    if (!ship) {
      job.status = ColonyShipBuildQueueStatus.CANCELLED;
      await this.shipBuildQueueRepo.save(job);
      return;
    }
    const [shipClass, modules] = await Promise.all([
      this.shipClassRepo.findOneBy({ id: ship.shipClassId }),
      this.spacecraftModuleRepo.find({ where: { spacecraftId: ship.id } }),
    ]);
    if (!shipClass) return;

    ship.hull = ship.hullMax;
    for (const module of modules) {
      if (module.integrity < 100 || !module.isActive || module.cooldown !== 0) {
        module.integrity = 100;
        module.isActive = true;
        module.cooldown = 0;
      }
    }
    await this.spacecraftModuleRepo.save(modules);
    this.spacecraftStatsService.applyStats(ship, shipClass, modules);
    ship.hull = ship.hullMax;
    ship.shields = Math.min(ship.shieldsMax, Math.max(ship.shields, 0));
    ship.energy = Math.min(ship.energyMax, Math.max(ship.energy, 0));
    await this.shipRepo.save(ship);
    job.status = ColonyShipBuildQueueStatus.COMPLETED;
    await this.shipBuildQueueRepo.save(job);
  }

  private async finishShipRetrofitQueue(
    colony: Colony,
    job: ColonyShipBuildQueue,
  ): Promise<void> {
    if (!job.spacecraftId) {
      job.status = ColonyShipBuildQueueStatus.CANCELLED;
      await this.shipBuildQueueRepo.save(job);
      return;
    }
    const ship = await this.shipRepo.findOne({
      where: { id: job.spacecraftId, userId: job.userId },
    });
    if (!ship) {
      job.status = ColonyShipBuildQueueStatus.CANCELLED;
      await this.shipBuildQueueRepo.save(job);
      return;
    }

    const [shipClass, installedModules] = await Promise.all([
      this.shipClassRepo.findOneBy({ id: ship.shipClassId }),
      this.spacecraftModuleRepo.find({ where: { spacecraftId: ship.id } }),
    ]);
    if (!shipClass) return;

    const desiredCommodityIds =
      job.retrofitSnapshot?.newModuleCommodityIds ??
      job.moduleCommodityIds ??
      [];
    const desiredRemaining = [...desiredCommodityIds];
    const modulesToKeep: SpacecraftModule[] = [];
    const modulesToRemove: Array<{
      module: SpacecraftModule;
      commodityId: number | null;
    }> = [];

    for (const module of installedModules) {
      const commodityId = this.resolveModuleCommodityId(module);
      const desiredIndex =
        commodityId == null ? -1 : desiredRemaining.indexOf(commodityId);
      if (desiredIndex >= 0) {
        desiredRemaining.splice(desiredIndex, 1);
        modulesToKeep.push(module);
      } else {
        modulesToRemove.push({ module, commodityId });
      }
    }

    const returnedModuleCommodityIds: number[] = [];
    const maxStorage =
      this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
    for (const { module, commodityId } of modulesToRemove) {
      if (
        commodityId != null &&
        module.category !== 'HULL' &&
        module.integrity >= 100
      ) {
        const stored = await this.colonyStorageService.upperStorage(
          colony,
          commodityId,
          1,
          maxStorage,
        );
        if (stored > 0) returnedModuleCommodityIds.push(commodityId);
      }
    }
    if (modulesToRemove.length > 0) {
      await this.spacecraftModuleRepo.remove(
        modulesToRemove.map(({ module }) => module),
      );
    }

    const createdModules: SpacecraftModule[] = [];
    for (const commodityId of desiredRemaining) {
      const item =
        this.gameData.getFabricationItemByOutputCommodity(commodityId);
      if (!item?.moduleType) continue;
      const savedModule = await this.spacecraftModuleRepo.save(
        this.spacecraftModuleRepo.create({
          spacecraftId: ship.id,
          moduleType: item.moduleType,
          category: item.moduleCategory ?? 'UNKNOWN',
          level: item.moduleLevel ?? 1,
          integrity: 100,
          cooldown: 0,
          isActive: true,
        }),
      );
      createdModules.push(savedModule);
    }

    const finalModules = [...modulesToKeep, ...createdModules];
    this.spacecraftStatsService.applyStats(ship, shipClass, finalModules);
    await this.shipRepo.save(ship);
    job.retrofitSnapshot = {
      oldModuleCommodityIds: job.retrofitSnapshot?.oldModuleCommodityIds ?? [],
      newModuleCommodityIds: desiredCommodityIds,
      newModuleTypes:
        job.retrofitSnapshot?.newModuleTypes ?? job.moduleTypes ?? [],
      returnedModuleCommodityIds,
      consumedModuleCommodityIds:
        job.retrofitSnapshot?.consumedModuleCommodityIds ?? [],
    };
    job.status = ColonyShipBuildQueueStatus.COMPLETED;
    await this.shipBuildQueueRepo.save(job);
  }

  private async createModulesForBuiltShip(
    spacecraftId: number,
    job: ColonyShipBuildQueue,
  ): Promise<SpacecraftModule[]> {
    const createdModules: SpacecraftModule[] = [];
    if (job.moduleCommodityIds?.length) {
      for (const commodityId of job.moduleCommodityIds) {
        const item =
          this.gameData.getFabricationItemByOutputCommodity(commodityId);
        if (!item?.moduleType) continue;
        const savedModule = await this.spacecraftModuleRepo.save(
          this.spacecraftModuleRepo.create({
            spacecraftId,
            moduleType: item.moduleType,
            category: item.moduleCategory ?? 'UNKNOWN',
            level: item.moduleLevel ?? 1,
            integrity: 100,
            cooldown: 0,
            isActive: true,
          }),
        );
        createdModules.push(savedModule);
      }
      return createdModules;
    }

    for (const moduleType of job.moduleTypes ?? []) {
      const moduleDef = this.gameData
        .getAllModules()
        .find((candidate) => candidate.name === moduleType);
      if (!moduleDef) continue;
      const savedModule = await this.spacecraftModuleRepo.save(
        this.spacecraftModuleRepo.create({
          spacecraftId,
          moduleType,
          category: moduleDef.category,
          level: 1,
          integrity: 100,
          cooldown: 0,
          isActive: true,
        }),
      );
      createdModules.push(savedModule);
    }
    return createdModules;
  }

  private createShipFromClass(
    colony: Colony,
    userId: number,
    shipClass: ShipClassDef,
    name: string,
  ): Spacecraft {
    return this.shipRepo.create({
      name: name?.trim() || shipClass.name,
      shipClassId: shipClass.id,
      userId,
      starSystemId: colony.starSystemId,
      currentLayerId: colony.starSystem?.layerId ?? null,
      celestialObjectId: colony.celestialObjectId,
      inSystem: true,
      currentSystemFieldX: colony.posX,
      currentSystemFieldY: colony.posY,
      posX: colony.posX,
      posY: colony.posY,
      status: SpacecraftStatus.DOCKED,
      alertState: AlertState.GREEN,
      hull: shipClass.hullBase,
      hullMax: shipClass.hullBase,
      shields: shipClass.shieldBase,
      shieldsMax: shipClass.shieldBase,
      energy: shipClass.epsBase,
      energyMax: shipClass.epsBase,
      warpSpeed: shipClass.warpBase,
      crew: shipClass.crewMin,
      crewMax: shipClass.crewMax,
      cargoUsed: 0,
      cargoMax: shipClass.cargoCapacity,
      battery: shipClass.batteryBase,
      batteryMax: shipClass.batteryBase,
    });
  }

  private calculateShipBuildCosts(
    shipClass: ShipClassDef,
  ): Array<{ commodityId: number; amount: number }> {
    return [
      {
        commodityId: 1,
        amount: Math.max(100, Math.round(shipClass.hullBase * 4)),
      },
      {
        commodityId: 2,
        amount: Math.max(50, Math.round(shipClass.hullBase * 1.5)),
      },
      {
        commodityId: 3,
        amount: Math.max(20, Math.round(shipClass.shieldBase * 0.5)),
      },
      {
        commodityId: 4,
        amount: Math.max(0, Math.round(shipClass.epsBase * 0.1)),
      },
      {
        commodityId: 6,
        amount: Math.max(20, Math.round(shipClass.cargoCapacity * 0.25)),
      },
      {
        commodityId: 7,
        amount: Math.max(20, Math.round(shipClass.epsBase * 0.4)),
      },
    ].filter((c) => c.amount > 0);
  }

  private toColonySummary(colony: Colony): Colony {
    return Object.assign(colony, {
      locationLabel:
        colony.celestialObject?.name || colony.starSystem?.name || 'Unknown',
    });
  }

  private async toColonyDetail(
    colony: Colony,
    userId: number,
  ): Promise<Colony> {
    const fields = colony.fields ?? [];
    const storage = colony.storage ?? [];
    const summary = this.colonyStatsService.calculateSummary(colony);
    const productionDelta = new Map([
      ...summary.productionDelta,
      ...summary.depositDelta,
    ]);

    const orbitShips = colony.starSystemId
      ? await this.shipRepo.find({
          where: {
            userId,
            starSystemId: colony.starSystemId,
            ...(colony.celestialObjectId
              ? { celestialObjectId: colony.celestialObjectId }
              : {}),
          },
          order: { id: 'ASC' },
        })
      : [];
    const orbitShipModules = orbitShips.length
      ? await this.spacecraftModuleRepo.find({
          where: { spacecraftId: In(orbitShips.map((ship) => ship.id)) },
          order: { id: 'ASC' },
        })
      : [];
    const modulesByShipId = new Map<number, SpacecraftModule[]>();
    for (const module of orbitShipModules) {
      const modules = modulesByShipId.get(module.spacecraftId) ?? [];
      modules.push(module);
      modulesByShipId.set(module.spacecraftId, modules);
    }
    const orbitShipClassIds = [
      ...new Set(orbitShips.map((ship) => ship.shipClassId)),
    ];
    const orbitShipClasses = orbitShipClassIds.length
      ? await this.shipClassRepo.findBy({ id: In(orbitShipClassIds) })
      : [];
    const orbitShipClassMap = new Map(
      orbitShipClasses.map((shipClass) => [shipClass.id, shipClass]),
    );
    const shipyardBuilding = this.getPrimaryShipyardBuilding();
    const shipyardUnlocked = shipyardBuilding
      ? await this.unlockResolver.isBuildingUnlocked(
          userId,
          shipyardBuilding.id,
        )
      : false;
    const depositMining = await this.depositMiningRepo.find({
      where: { colonyId: colony.id, userId },
      order: { commodityId: 'ASC' },
    });
    const shipBuildQueue = await this.shipBuildQueueRepo.find({
      where: { colonyId: colony.id, status: ColonyShipBuildQueueStatus.QUEUED },
      order: { finishesAt: 'ASC' },
    });
    const buildplans = await this.shipBuildplanRepo.find({
      where: { userId },
      order: { id: 'ASC' },
    });
    const fabricationQueue = await this.fabricationQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: ColonyFabricationQueueStatus.QUEUED,
      },
      order: { finishesAt: 'ASC' },
    });
    const crewTrainingQueue = await this.crewTrainingQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: ColonyCrewTrainingQueueStatus.QUEUED,
      },
      order: { finishesAt: 'ASC' },
    });
    const [
      assignedToColony,
      localCrewLimit,
      globalCrewLimit,
      remainingGlobal,
      trainableGlobal,
      inTraining,
    ] = await Promise.all([
      this.colonyCrewService.getAssignedToColonyCount(colony.id),
      Promise.resolve(this.colonyCrewService.getLocalCrewLimit(colony)),
      this.colonyCrewService.getGlobalCrewLimit(userId),
      this.colonyCrewService.getRemainingCount(userId),
      this.colonyCrewService.getTrainableCount(userId),
      this.colonyCrewService.getInTrainingCount(userId),
    ]);
    const activeFabricationFunctionIds = [
      ...new Set(
        fields
          .filter(
            (field) => field.buildingId && !field.isBuilding && field.isActive,
          )
          .flatMap((field) =>
            this.gameData.getBuildingFunctions(field.buildingId!),
          )
          .filter(
            (functionId) =>
              functionId === 9 || (functionId >= 10 && functionId <= 18),
          ),
      ),
    ].sort((a, b) => a - b);
    const activeFabricationFunctionIdSet = new Set(
      activeFabricationFunctionIds,
    );
    const hangarInventory = await this.getHangarInventory(colony);
    const startableHangarShips = await this.getStartableHangarShips(
      userId,
      colony,
    );
    const hasAirfield = this.hasActiveAirfield(colony);

    const planetaryDefense = fields
      .filter(
        (field) => field.buildingId && !field.isBuilding && field.isActive,
      )
      .flatMap((field) => {
        const functions = this.gameData
          .getBuildingFunctions(field.buildingId!)
          .filter((functionId) => [26, 27, 28].includes(functionId));
        const building = this.gameData.getBuilding(field.buildingId!);
        return functions.map((functionId) => ({
          fieldIndex: field.fieldIndex,
          buildingId: field.buildingId,
          buildingName: building?.name ?? `Gebäude #${field.buildingId}`,
          functionId,
          functionName:
            this.gameData.getBuildingFunction(functionId)?.name ??
            String(functionId),
        }));
      });

    const availableShipModules = storage
      .map((storageItem) => {
        const item = this.gameData.getFabricationItemByOutputCommodity(
          storageItem.commodityId,
        );
        if (!item?.moduleType) return null;
        const commodity = this.gameData.getCommodity(storageItem.commodityId);
        return {
          commodityId: storageItem.commodityId,
          commodityName: commodity?.name ?? `Ware #${storageItem.commodityId}`,
          amount: storageItem.amount,
          moduleType: item.moduleType,
          moduleCategory: item.moduleCategory ?? 'UNKNOWN',
          moduleLevel: item.moduleLevel ?? 1,
          displayName: item.displayName,
        };
      })
      .filter(Boolean);

    const hasCompletedShipyard = fields.some((field) =>
      this.isShipyardField(field, false),
    );
    const hasShipyardInProgress = fields.some((field) =>
      this.isShipyardField(field, true),
    );

    return Object.assign(this.toColonySummary(colony), {
      fieldCount: fields.length,
      storageItemCount: storage.length,
      detailV2: {
        energy: {
          current: colony.energy,
          max: colony.stats?.maxEnergy ?? colony.energyMax,
          delta: summary.energyDelta,
        },
        storage: {
          current: colony.storageUsed,
          max: summary.effectiveStorageMax,
          delta: Array.from(productionDelta.values()).reduce(
            (sum, value) => sum + value,
            0,
          ),
        },
        population: {
          current: colony.population,
          max: summary.effectivePopulationMax,
          growth: this.calculatePopulationGrowth(colony, summary),
          workers: colony.stats?.workers ?? summary.workersUsed,
          available:
            colony.stats?.workless ?? colony.population - summary.workersUsed,
          housing: summary.freeHousing,
          housingFree: summary.freeHousing,
          housingMax: summary.maxHousing,
          housingBonus: summary.housingBonus,
        },
        inventory: storage.map((item) => {
          const commodity = this.gameData.getCommodity(item.commodityId);
          return {
            id: item.id,
            commodityId: item.commodityId,
            name: commodity?.name ?? `Ware #${item.commodityId}`,
            nameShort: commodity?.nameShort ?? String(item.commodityId),
            amount: item.amount,
            delta: productionDelta.get(item.commodityId) ?? 0,
          };
        }),
        deposits: depositMining.map((deposit) => {
          const commodity = this.gameData.getCommodity(deposit.commodityId);
          const delta = summary.depositDelta.get(deposit.commodityId) ?? 0;
          return {
            commodityId: deposit.commodityId,
            name: commodity?.name ?? `Ware #${deposit.commodityId}`,
            nameShort: commodity?.nameShort ?? String(deposit.commodityId),
            amountLeft: deposit.amountLeft,
            delta,
            depleted: deposit.amountLeft <= 0,
          };
        }),
        productionDeltas: Array.from(productionDelta.entries()).map(
          ([commodityId, amount]) => {
            const commodity = this.gameData.getCommodity(commodityId);
            return {
              commodityId,
              name: commodity?.name ?? `Ware #${commodityId}`,
              nameShort: commodity?.nameShort ?? String(commodityId),
              amount,
            };
          },
        ),
        activeBuildJobs: fields
          .filter((field) => field.isBuilding && field.buildingId)
          .map((field) => {
            const building = this.gameData.getBuilding(field.buildingId!);
            return {
              fieldIndex: field.fieldIndex,
              buildingId: field.buildingId,
              buildingName: building?.name ?? `Gebaeude #${field.buildingId}`,
              finishesAt: field.buildFinishesAt,
              progress: field.buildProgress,
            };
          }),
        effects: this.buildEffectSummary(summary),
        orbitShips: orbitShips.map((ship) => {
          const shipClass = orbitShipClassMap.get(ship.shipClassId);
          const crewRequired = shipClass?.crewMin ?? 0;
          const canManage = this.canManageOrbitShip(colony, ship);
          const modules = modulesByShipId.get(ship.id) ?? [];
          const damagedModules = modules.filter(
            (module) => module.integrity < 100,
          );
          const canRepair =
            canManage &&
            this.hasActiveBuildingFunction(
              colony,
              this.repairShipyardFunctionId,
            ) &&
            this.isShipRepairNeeded(ship, modules);
          const canRetrofit =
            canManage &&
            !!shipClass &&
            (() => {
              try {
                this.assertShipyardCompatibility(
                  shipClass,
                  this.getActiveShipyardFunctionIds(colony),
                );
                return true;
              } catch {
                return false;
              }
            })();
          return {
            id: ship.id,
            name: ship.name,
            shipClassId: ship.shipClassId,
            hull: ship.hull,
            hullMax: ship.hullMax,
            shields: ship.shields,
            shieldsMax: ship.shieldsMax,
            energy: ship.energy,
            energyMax: ship.energyMax,
            crew: ship.crew,
            crewRequired,
            crewMax: ship.crewMax,
            hasEnoughCrew: crewRequired <= 0 || ship.crew >= crewRequired,
            canLand:
              canManage &&
              hasAirfield &&
              !!shipClass &&
              !!this.getHangarDefForShipClass(shipClass),
            canDisassemble: canManage && colony.energy >= 20,
            canRepair,
            canRetrofit,
            damageSummary: {
              hullDamage: Math.max(0, ship.hullMax - ship.hull),
              damagedModules: damagedModules.length,
            },
            modules: modules.map((module) => ({
              id: module.id,
              moduleType: module.moduleType,
              category: module.category,
              level: module.level,
              integrity: module.integrity,
              isActive: module.isActive,
              commodityId: this.resolveModuleCommodityId(module),
            })),
            cargoUsed: ship.cargoUsed,
            cargoMax: ship.cargoMax,
            status: ship.status,
          };
        }),
        research: {
          pointsPerTick: summary.researchPoints,
        },
        planetaryDefense,
        shields: colony.stats
          ? {
              current: colony.stats.shields ?? 0,
              max: colony.stats.maxShields,
              frequency: colony.stats.shieldFrequency,
            }
          : null,
        shipBuildQueue: shipBuildQueue.map((job) => ({
          id: job.id,
          shipClassId: job.shipClassId,
          spacecraftId: job.spacecraftId,
          mode: job.mode ?? ColonyShipBuildQueueMode.BUILD,
          name: job.name,
          buildPlanName: job.buildPlanName,
          buildPlanId: job.buildPlanId,
          buildPlanSignature: job.buildPlanSignature,
          moduleTypes: job.moduleTypes,
          moduleCommodityIds: job.moduleCommodityIds,
          crewAssigned: job.crewAssigned,
          crewIds: job.crewIds,
          repairSnapshot: job.repairSnapshot,
          retrofitSnapshot: job.retrofitSnapshot,
          moduleNames: (job.moduleCommodityIds ?? []).map((commodityId) => {
            const item =
              this.gameData.getFabricationItemByOutputCommodity(commodityId);
            return item?.displayName ?? `Modul #${commodityId}`;
          }),
          finishesAt: job.finishesAt,
          status: job.status,
        })),
        shipyardQueue: shipBuildQueue.map((job) => ({
          id: job.id,
          shipClassId: job.shipClassId,
          spacecraftId: job.spacecraftId,
          mode: job.mode ?? ColonyShipBuildQueueMode.BUILD,
          name: job.name,
          buildPlanName: job.buildPlanName,
          moduleCommodityIds: job.moduleCommodityIds,
          moduleTypes: job.moduleTypes,
          repairSnapshot: job.repairSnapshot,
          retrofitSnapshot: job.retrofitSnapshot,
          finishesAt: job.finishesAt,
          status: job.status,
        })),
        availableShipModules,
        buildplans: buildplans.map((buildplan) => ({
          id: buildplan.id,
          shipClassId: buildplan.shipClassId,
          name: buildplan.name,
          signature: buildplan.signature,
          moduleCommodityIds: buildplan.moduleCommodityIds,
          moduleTypes: buildplan.moduleTypes,
        })),
        fabricationQueue: fabricationQueue.map((job) => {
          const item = this.gameData.getFabricationItem(job.itemKey);
          return {
            id: job.id,
            queueType: job.queueType,
            itemKey: job.itemKey,
            displayName: item?.displayName ?? job.itemKey,
            amount: job.amount,
            outputCommodityId: item?.outputCommodityId ?? null,
            outputAmount: item ? item.outputAmount * job.amount : 0,
            buildingFunctionId: job.buildingFunctionId,
            functionName:
              this.gameData.getBuildingFunction(job.buildingFunctionId)?.name ??
              String(job.buildingFunctionId),
            finishesAt: job.finishesAt,
            status: job.status,
          };
        }),
        fabricationCatalog: this.gameData
          .getAllFabricationItems()
          .map((item) => ({
            ...item,
            available: item.buildingFunctionIds.some((functionId) =>
              activeFabricationFunctionIdSet.has(functionId),
            ),
          })),
        activeFabricationFunctionIds,
        crew: {
          available: assignedToColony,
          assignedToColony,
          inTraining,
          localLimit: localCrewLimit,
          globalLimit: globalCrewLimit,
          remainingGlobal,
          trainableNow: Math.max(0, trainableGlobal - inTraining),
          trainingQueue: crewTrainingQueue.map((job) => ({
            id: job.id,
            amount: job.amount,
            finishesAt: job.finishesAt,
            status: job.status,
          })),
        },
        hangar: {
          hasAirfield,
          inventory: hangarInventory,
          buildable: startableHangarShips.map(({ shipClass, hangarDef }) => ({
            shipClassId: shipClass.id,
            shipClassKey: shipClass.key,
            shipClassName: shipClass.name,
            hangarCommodityId: hangarDef.hangarCommodityId,
            displayName: hangarDef.displayName,
            buildEnergyCost: hangarDef.buildEnergyCost,
            startEnergyCost: hangarDef.startEnergyCost,
            buildCosts: hangarDef.buildCosts,
            crewRequired: shipClass.crewMin,
          })),
          startable: startableHangarShips.map(
            ({ shipClass, hangarDef, amount }) => ({
              shipClassId: shipClass.id,
              shipClassKey: shipClass.key,
              shipClassName: shipClass.name,
              hangarCommodityId: hangarDef.hangarCommodityId,
              displayName: hangarDef.displayName,
              amount,
              startEnergyCost: hangarDef.startEnergyCost,
              crewRequired: shipClass.crewMin,
            }),
          ),
          landableOrbitShips: orbitShips
            .filter((ship) => {
              const shipClass = orbitShipClassMap.get(ship.shipClassId);
              return (
                this.canManageOrbitShip(colony, ship) &&
                hasAirfield &&
                !!shipClass &&
                !!this.getHangarDefForShipClass(shipClass)
              );
            })
            .map((ship) => ({
              id: ship.id,
              name: ship.name,
              shipClassId: ship.shipClassId,
            })),
        },
        shipyard: {
          unlocked: shipyardUnlocked,
          completed: hasCompletedShipyard,
          inProgress: hasShipyardInProgress,
          buildingId: shipyardBuilding?.id ?? 85010100,
          buildingName: shipyardBuilding?.name ?? 'Werfthub',
          slotRules: this.gameData.getAllShipClassSlotRules(),
        },
      },
    });
  }

  private calculatePopulationGrowth(
    colony: Colony,
    summary: ColonyInternalSummary,
  ): number {
    if (colony.stats?.immigrationEnabled === false) {
      return 0;
    }

    const freeHousing = summary.maxHousing - colony.population;
    if (freeHousing <= 0) {
      return 0;
    }

    const lifeStandardProduction = summary.productionDelta.get(1300) ?? 0;
    if (lifeStandardProduction === 0) {
      return 0;
    }

    const lifeStandardPercentage =
      lifeStandardProduction > colony.population || colony.population <= 0
        ? 100
        : Math.floor((lifeStandardProduction * 100) / colony.population);
    const bevGrowthRate =
      this.gameData.getColonyClass(colony.colonyClassId)?.bevGrowthRate ?? 100;

    let immigration = Math.ceil(
      (freeHousing / 3 / 100) * bevGrowthRate * (lifeStandardPercentage / 50),
    );

    if (colony.population + immigration > summary.maxHousing) {
      immigration = summary.maxHousing - colony.population;
    }

    const populationLimit = colony.stats?.populationLimit ?? 0;
    if (
      populationLimit > 0 &&
      colony.population + immigration > populationLimit
    ) {
      immigration = populationLimit - colony.population;
    }

    return Math.max(0, immigration);
  }

  private buildEffectSummary(summary: ColonyInternalSummary) {
    const effects: Array<{ label: string; value: number; source: string }> = [];
    for (const field of summary.activeFields) {
      const definition = this.gameData.getBuilding(field.buildingId!);
      if (!definition) continue;
      if (definition.epsProc) {
        effects.push({
          label: 'Energie',
          value: definition.epsProc,
          source: definition.name,
        });
      }
      if (definition.bonuses.population !== 0) {
        effects.push({
          label: 'Bevoelkerung',
          value: definition.bonuses.population,
          source: definition.name,
        });
      }
      for (const output of definition.production) {
        const commodity = this.gameData.getCommodity(output.commodityId);
        if (commodity?.isTradeOnly) {
          effects.push({
            label: commodity.name,
            value: output.amount,
            source: definition.name,
          });
        }
      }
      if (definition.researchPoints) {
        effects.push({
          label: 'Forschungspunkte',
          value: definition.researchPoints,
          source: definition.name,
        });
      }
    }
    effects.unshift({
      label: 'Basis-Forschung',
      value: summary.researchPoints > 0 ? 1 : 0,
      source: 'Kolonie',
    });
    return effects;
  }

  async processTick(colony: Colony): Promise<ColonyTickResult> {
    const events: ColonyTickEvent[] = [];
    await this.checkBuildingCompletions(colony, events);
    await this.balanceAndProduce(colony, events);
    await this.growPopulation(colony);
    await this.processFabricationQueue(colony);
    await this.processCrewTrainingQueue(colony);
    await this.enforceLocalCrewLimit(colony, events);
    await this.processShipBuildQueue(colony);
    const summary = this.colonyStatsService.calculateSummary(colony);
    return {
      researchPoints: summary.researchPoints,
      productionDelta: summary.productionDelta,
      events,
    };
  }

  async checkBuildingCompletions(
    colony: Colony,
    events: ColonyTickEvent[] = [],
  ): Promise<void> {
    const now = new Date();
    for (const field of colony.fields) {
      if (
        field.terraformingId &&
        field.terraformingFinishesAt &&
        field.terraformingFinishesAt <= now
      ) {
        const terraforming = this.gameData.getTerraforming(
          field.terraformingId,
        );
        if (terraforming) {
          field.fieldType = terraforming.toFieldType;
          field.terrainTileId = terraforming.toFieldType;
        }
        field.terraformingId = null;
        field.terraformingFinishesAt = null;
        await this.fieldRepo.save(field);
        events.push({
          type: 'TERRAFORMING_FINISHED',
          fieldIndex: field.fieldIndex,
        });
      }

      if (
        field.isBuilding &&
        field.buildFinishesAt &&
        field.buildFinishesAt <= now
      ) {
        const definition = this.gameData.getBuilding(field.buildingId!);
        if (!definition) continue;
        await this.buildingLifecycleService.finishBuilding(
          colony,
          field,
          definition,
          field.activateAfterBuild,
        );
        events.push({
          type: 'BUILDING_FINISHED',
          fieldIndex: field.fieldIndex,
          buildingId: field.buildingId,
        });
      }
    }
  }

  private async balanceAndProduce(
    colony: Colony,
    events: ColonyTickEvent[] = [],
  ): Promise<void> {
    const deactivatedFieldIds = new Set<number>();

    for (let round = 0; round < 100; round++) {
      const summary = this.colonyStatsService.calculateSummary(
        colony,
        deactivatedFieldIds,
      );
      const activeFields = summary.activeFields;
      let rewind = false;

      if (summary.energyDelta < 0 && colony.energy + summary.energyDelta < 0) {
        const victim = activeFields.find((field) => {
          if (this.isHeadquartersField(field)) return false;
          const definition = this.gameData.getBuilding(field.buildingId!);
          return definition && (definition.epsProc || 0) < 0;
        });
        if (victim) {
          victim.isActive = false;
          deactivatedFieldIds.add(victim.id);
          await this.fieldRepo.save(victim);
          events.push({
            type: 'BUILDING_DEACTIVATED',
            fieldIndex: victim.fieldIndex,
            buildingId: victim.buildingId,
            reason: 'ENERGY',
          });
          rewind = true;
        }
      }

      if (summary.workersUsed > colony.population) {
        const victim = activeFields.find((field) => {
          if (this.isHeadquartersField(field)) return false;
          const definition = this.gameData.getBuilding(field.buildingId!);
          return definition && (definition.bevUse || 0) > 0;
        });
        if (victim) {
          victim.isActive = false;
          deactivatedFieldIds.add(victim.id);
          await this.fieldRepo.save(victim);
          events.push({
            type: 'BUILDING_DEACTIVATED',
            fieldIndex: victim.fieldIndex,
            buildingId: victim.buildingId,
            reason: 'WORKERS',
          });
          rewind = true;
        }
      }

      for (const [commodityId, needed] of summary.depositConsumption) {
        const mining = await this.depositMiningRepo.findOne({
          where: { colonyId: colony.id, userId: colony.userId, commodityId },
        });
        if (!mining || mining.amountLeft < needed) {
          const victim = activeFields.find((field) => {
            if (this.isHeadquartersField(field)) return false;
            const definition = this.gameData.getBuilding(field.buildingId!);
            if (!definition) return false;
            return definition.production.some(
              (p) => p.commodityId === commodityId && p.amount < 0,
            );
          });
          if (victim) {
            victim.isActive = false;
            deactivatedFieldIds.add(victim.id);
            await this.fieldRepo.save(victim);
            events.push({
              type: 'BUILDING_DEACTIVATED',
              fieldIndex: victim.fieldIndex,
              buildingId: victim.buildingId,
              commodityId,
              reason: 'DEPOSIT',
            });
            rewind = true;
          }
        }
      }

      for (const [commodityId, amount] of summary.productionDelta) {
        if (amount >= 0) continue;
        const commodity = this.gameData.getCommodity(commodityId);
        if (commodity?.isTradeOnly && !commodity.isEffect) continue;
        const storage = await this.storageRepo.findOne({
          where: { colonyId: colony.id, commodityId },
        });
        const available = storage?.amount || 0;
        if (available + amount < 0) {
          const victim = activeFields.find((field) => {
            if (this.isHeadquartersField(field)) return false;
            const definition = this.gameData.getBuilding(field.buildingId!);
            if (!definition) return false;
            return definition.production.some(
              (p) => p.commodityId === commodityId && p.amount < 0,
            );
          });
          if (victim) {
            victim.isActive = false;
            deactivatedFieldIds.add(victim.id);
            await this.fieldRepo.save(victim);
            events.push({
              type: 'BUILDING_DEACTIVATED',
              fieldIndex: victim.fieldIndex,
              buildingId: victim.buildingId,
              commodityId,
              reason: 'RESOURCE',
            });
            rewind = true;
          }
        }
      }

      if (!rewind) break;
    }

    const summary = this.colonyStatsService.calculateSummary(
      colony,
      deactivatedFieldIds,
    );
    const finalProduction = summary.productionDelta;
    await this.applyDepositConsumption(colony, summary.depositConsumption);

    if (summary.energyDelta !== 0) {
      colony.energy = Math.max(
        0,
        Math.min(
          colony.energy + summary.energyDelta,
          colony.stats?.maxEnergy ?? colony.energyMax,
        ),
      );
    }

    if (finalProduction.size > 0) {
      let currentStored = await this.colonyStorageService.getStorageUsed(
        colony.id,
      );

      for (const [commodityId, amount] of finalProduction) {
        if (amount >= 0) continue;
        const commodity = this.gameData.getCommodity(commodityId);
        if (!commodity?.isSaveable) continue;
        try {
          await this.colonyStorageService.lowerStorage(
            colony,
            commodityId,
            Math.abs(amount),
          );
          currentStored += amount;
        } catch {
          continue;
        }
      }

      for (const [commodityId, amount] of finalProduction) {
        if (amount <= 0) continue;
        const commodity = this.gameData.getCommodity(commodityId);
        if (!commodity?.isSaveable) continue;
        const freeStorage = summary.effectiveStorageMax - currentStored;
        if (freeStorage <= 0) {
          events.push({ type: 'STORAGE_FULL', commodityId });
          break;
        }
        const storedAmount = this.colonyStorageService.capToMax(
          amount,
          freeStorage,
        );
        if (storedAmount < amount) {
          events.push({ type: 'STORAGE_FULL', commodityId });
        }
        let storage = await this.storageRepo.findOne({
          where: { colonyId: colony.id, commodityId },
        });
        if (storage) {
          storage.amount += storedAmount;
        } else {
          storage = this.storageRepo.create({
            colonyId: colony.id,
            commodityId,
            amount: storedAmount,
          });
        }
        currentStored += storedAmount;
        await this.storageRepo.save(storage);
      }

      colony.storageUsed = currentStored;
    }

    if (
      summary.energyDelta !== 0 ||
      finalProduction.size > 0 ||
      deactivatedFieldIds.size > 0
    ) {
      await this.colonyRepo.save(colony);
    }
  }

  private async applyDepositConsumption(
    colony: Colony,
    depositConsumption: Map<number, number>,
  ): Promise<void> {
    for (const [commodityId, amount] of depositConsumption) {
      const mining = await this.depositMiningRepo.findOne({
        where: { colonyId: colony.id, userId: colony.userId, commodityId },
      });
      if (!mining) continue;
      mining.amountLeft = Math.max(0, mining.amountLeft - amount);
      await this.depositMiningRepo.save(mining);
    }
  }

  private assertOrbitAllowed(
    colony: Colony,
    field: ColonyField,
    action: string,
  ): void {
    if (this.isOrbitField(field) && colony.stats?.isBlockaded) {
      throw new BadRequestException(
        `Cannot ${action} while colony is blockaded`,
      );
    }
  }

  private isOrbitField(field: ColonyField): boolean {
    return field.fieldType >= 900 && field.fieldType < 1000;
  }

  private getPrimaryShipyardBuilding() {
    return (
      this.gameData.getBuilding(85010100) ??
      this.gameData.getBuilding(85010300) ??
      this.gameData.getBuilding(11) ??
      null
    );
  }

  private isShipyardField(field: ColonyField, inProgress?: boolean): boolean {
    if (!field.buildingId) return false;
    const hasShipyardFunction = this.gameData
      .getBuildingFunctions(field.buildingId)
      .some((functionId) => this.shipyardFunctionIds.has(functionId));
    if (
      !hasShipyardFunction &&
      !this.legacyShipyardBuildingIds.has(field.buildingId)
    ) {
      return false;
    }
    return inProgress == null ? true : field.isBuilding === inProgress;
  }

  private isHeadquartersField(field: ColonyField): boolean {
    return (
      !!field.buildingId && this.headquartersBuildingIds.has(field.buildingId)
    );
  }

  private async growPopulation(colony: Colony): Promise<void> {
    const summary = this.colonyStatsService.calculateSummary(colony);
    const growth = this.calculatePopulationGrowth(colony, summary);
    if (growth <= 0) {
      return;
    }

    const previousPopulation = colony.population;
    colony.population = Math.min(
      colony.population + growth,
      summary.effectivePopulationMax,
    );
    const actualGrowth = colony.population - previousPopulation;

    if (actualGrowth > 0 && colony.stats) {
      colony.stats.workless += actualGrowth;
      await this.statsRepo.save(colony.stats);
    }
    await this.colonyRepo.save(colony);
  }
}
