import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  getEffectiveCurrentPopulation,
} from './colony-stats.service';
import { ColonyEconomyService } from './colony-economy.service';
import { ColonyStorageService } from './colony-storage.service';
import { BuildingLifecycleService } from './building-lifecycle.service';
import { ColonyCrewService } from './colony-crew.service';
import { ColonyDefenseService } from './colony-defense.service';
import { ColonyEventService } from './colony-event.service';
import { SpacecraftTorpedoService } from '../spacecraft/spacecraft-torpedo.service';
import { ColonyBuildingManagementService } from './colony-building-management.service';
import { ColonySocialService } from './colony-social.service';
import { BuildingMassActionMode } from './colony-building-management.types';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from './entities/colony-event.entity';
import {
  ColonyOrbitAssignment,
  ColonyOrbitAssignmentMode,
} from './entities/colony-orbit-assignment.entity';

export interface ColonyTickEvent {
  type:
    | 'BUILDING_DEACTIVATED'
    | 'STORAGE_FULL'
    | 'BUILDING_FINISHED'
    | 'TERRAFORMING_FINISHED'
    | 'CREW_LIMIT_EXCEEDED';
  fieldIndex?: number;
  buildingId?: number | null;
  buildingName?: string;
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
  private readonly warehouseFunctionId = 23;
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
    @InjectRepository(ColonyOrbitAssignment)
    private readonly orbitAssignmentRepo: Repository<ColonyOrbitAssignment>,
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
    private readonly colonyEconomyService: ColonyEconomyService,
    private readonly colonyStorageService: ColonyStorageService,
    private readonly buildingLifecycleService: BuildingLifecycleService,
    private readonly spacecraftStatsService: SpacecraftStatsService,
    private readonly colonyCrewService: ColonyCrewService,
    private readonly colonyDefenseService: ColonyDefenseService,
    private readonly colonyEventService: ColonyEventService,
    private readonly spacecraftTorpedoService: SpacecraftTorpedoService,
    private readonly buildingManagementService: ColonyBuildingManagementService,
    private readonly colonySocialService: ColonySocialService,
    private readonly config: ConfigService,
  ) {}

  async getEvents(
    colonyId: number,
    userId: number,
    limit = 50,
    unreadOnly = false,
  ) {
    await this.findOne(colonyId, userId);
    return this.colonyEventService.listForColony(colonyId, userId, {
      limit,
      unreadOnly,
    });
  }

  async markEventRead(colonyId: number, userId: number, eventId: number) {
    await this.findOne(colonyId, userId);
    return this.colonyEventService.markRead(colonyId, userId, eventId);
  }

  async markAllEventsRead(colonyId: number, userId: number) {
    await this.findOne(colonyId, userId);
    return this.colonyEventService.markAllRead(colonyId, userId);
  }

  async activateBuildings(
    colonyId: number,
    userId: number,
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number } = {},
  ) {
    const colony = await this.findOne(colonyId, userId);
    return this.buildingManagementService.activateBuildings(
      colony,
      mode,
      options,
    );
  }

  async deactivateBuildings(
    colonyId: number,
    userId: number,
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number } = {},
  ) {
    const colony = await this.findOne(colonyId, userId);
    return this.buildingManagementService.deactivateBuildings(
      colony,
      mode,
      options,
    );
  }

  async getAvailableBuildings(userId: number, fieldType?: number) {
    const buildings = fieldType
      ? this.gameData.getBuildingsForFieldTypes(
          this.getFieldTypeCandidatesFromType(fieldType),
        )
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

  async findAllByUser(userId: number) {
    const colonies = await this.colonyRepo.find({
      where: { userId },
      relations: ['starSystem', 'celestialObject', 'fields'],
      order: { id: 'ASC' },
    });
    const colonyIds = colonies.map((c) => c.id);
    const [crewCounts, trainingQueues] = await Promise.all([
      this.colonyCrewService.getCrewCountsByColonyIds(colonyIds),
      this.crewTrainingQueueRepo.find({
        where: {
          userId,
          status: ColonyCrewTrainingQueueStatus.QUEUED,
        },
      }),
    ]);
    const trainingByColony = new Map<number, number>();
    for (const q of trainingQueues) {
      trainingByColony.set(
        q.colonyId,
        (trainingByColony.get(q.colonyId) || 0) + q.amount,
      );
    }

    return colonies.map((colony) => {
      const summary = this.colonyStatsService.calculateSummary(colony);
      const crewLimit = this.colonyCrewService.getLocalCrewLimit(colony);
      const crewAssigned = crewCounts.get(colony.id) || 0;
      const crewInTraining = trainingByColony.get(colony.id) || 0;
      const productionDeltas: Array<{ commodityId: number; amount: number }> =
        [];
      for (const [commodityId, amount] of summary.productionDelta) {
        if (amount === 0) continue;
        const commodity = this.gameData.getCommodity(commodityId);
        if (commodity?.isEffect || commodity?.isDeposit) continue;
        productionDeltas.push({ commodityId, amount });
      }
      const activeBuildJobs = (colony.fields ?? [])
        .filter((f) => f.isBuilding && f.buildingId)
        .map((f) => ({
          fieldIndex: f.fieldIndex,
          buildingId: f.buildingId!,
          buildingName:
            this.gameData.getBuilding(f.buildingId!)?.name ||
            `#${f.buildingId}`,
          finishesAt: f.buildFinishesAt?.toISOString() || null,
        }));

      const base = this.toColonySummary(colony);
      delete (base as any).fields;
      (base as any).energyMax = summary.effectiveState.energy.max;
      return Object.assign(base, {
        crewSummary: {
          assigned: crewAssigned,
          limit: crewLimit,
          inTraining: crewInTraining,
        },
        productionDeltas,
        activeBuildJobs,
      });
    });
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
    const normalizedName = this.normalizeColonyName(name);
    const colony = await this.findOne(colonyId, userId);
    colony.name = normalizedName;
    return this.colonyRepo.save(colony);
  }

  async setPopulationLimit(
    colonyId: number,
    userId: number,
    limit: number,
  ): Promise<{ populationLimit: number }> {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new BadRequestException('Population limit must be zero or higher');
    }
    const colony = await this.findOwnedColonyWithStats(colonyId, userId);
    colony.stats.populationLimit = limit;
    await this.statsRepo.save(colony.stats);
    return { populationLimit: colony.stats.populationLimit };
  }

  async setImmigration(
    colonyId: number,
    userId: number,
    enabled: boolean,
  ): Promise<{ immigrationEnabled: boolean }> {
    if (typeof enabled !== 'boolean') {
      throw new BadRequestException('Immigration flag must be boolean');
    }
    const colony = await this.findOwnedColonyWithStats(colonyId, userId);
    colony.stats.immigrationEnabled = enabled;
    await this.statsRepo.save(colony.stats);
    return { immigrationEnabled: colony.stats.immigrationEnabled };
  }

  async setColonyMessage(
    colonyId: number,
    userId: number,
    message: string | null,
  ): Promise<{ colonyMessage: string | null }> {
    if (message != null && typeof message !== 'string') {
      throw new BadRequestException('Colony message must be text');
    }
    const normalizedMessage = message?.trim() ? message.trim() : null;
    if (normalizedMessage && normalizedMessage.length > 2000) {
      throw new BadRequestException('Colony message is too long');
    }
    const colony = await this.findOwnedColonyWithStats(colonyId, userId);
    colony.stats.colonyMessage = normalizedMessage;
    await this.statsRepo.save(colony.stats);
    return { colonyMessage: colony.stats.colonyMessage };
  }

  async discardStorage(
    colonyId: number,
    userId: number,
    items: Array<{ commodityId: number; amount: number }>,
  ): Promise<{
    discarded: Array<{ commodityId: number; amount: number; name: string }>;
  }> {
    const colony = await this.findOne(colonyId, userId);
    if (!this.hasCompletedBuildingFunction(colony, this.warehouseFunctionId)) {
      throw new BadRequestException('Warehouse required');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('No commodities selected');
    }

    const requested = new Map<number, number>();
    for (const item of items) {
      const commodityId = Number(item?.commodityId);
      const amount = Math.floor(Number(item?.amount));
      if (!Number.isInteger(commodityId) || commodityId <= 0) continue;
      if (!Number.isFinite(amount) || amount < 1) continue;
      requested.set(commodityId, (requested.get(commodityId) ?? 0) + amount);
    }
    if (requested.size === 0) {
      throw new BadRequestException('No valid commodity amounts selected');
    }

    const discarded: Array<{
      commodityId: number;
      amount: number;
      name: string;
    }> = [];
    for (const [commodityId, requestedAmount] of requested.entries()) {
      const storage = await this.storageRepo.findOne({
        where: { colonyId: colony.id, commodityId },
      });
      if (!storage || storage.amount <= 0) continue;
      const amount = Math.min(requestedAmount, storage.amount);
      if (amount <= 0) continue;
      storage.amount -= amount;
      await this.storageRepo.save(storage);
      const commodity = this.gameData.getCommodity(commodityId);
      discarded.push({
        commodityId,
        amount,
        name: commodity?.name ?? `Ware #${commodityId}`,
      });
    }

    if (discarded.length === 0) {
      throw new BadRequestException('No matching storage available');
    }

    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.WASTE_DISCARDED,
      severity: ColonyEventSeverity.INFO,
      title: 'Waren entsorgt',
      message: `Es wurden ${discarded
        .map((item) => `${item.amount} ${item.name}`)
        .join(', ')} entsorgt.`,
      payload: { discarded },
    });

    return { discarded };
  }

  private normalizeColonyName(name: string): string {
    if (typeof name !== 'string') {
      throw new BadRequestException('Colony name must be text');
    }
    const normalizedName = name.trim();
    if (normalizedName.length < 3) {
      throw new BadRequestException('Colony name is too short');
    }
    if (normalizedName.length > 255) {
      throw new BadRequestException('Colony name is too long');
    }
    return normalizedName;
  }

  private async findOwnedColonyWithStats(
    colonyId: number,
    userId: number,
  ): Promise<Colony> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId, userId },
      relations: ['stats'],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    if (!colony.stats) throw new BadRequestException('Colony stats missing');
    return colony;
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

    if (!this.isBuildingAllowedOnField(buildingDef, field)) {
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

    const fieldBuildRule = this.gameData.getFieldBuildRuleForFieldTypes(
      buildingId,
      this.getFieldTypeCandidates(field),
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

    const actualBuildingId = this.resolveFieldAlternative(buildingDef, field);
    const actualDef =
      actualBuildingId !== buildingId
        ? (this.gameData.getBuilding(actualBuildingId) ?? buildingDef)
        : buildingDef;

    await this.checkBuildingLimits(colony, userId, actualDef);

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

  private getFieldTypeCandidates(field: ColonyField): number[] {
    return this.getFieldTypeCandidatesFromType(
      field.fieldType,
      field.terrainTileId ?? undefined,
    );
  }

  private getFieldTypeCandidatesFromType(
    fieldType: number,
    terrainTileId?: number,
  ): number[] {
    const normalizedFieldType = this.normalizeFieldTypeCandidate(fieldType);
    return [terrainTileId, fieldType, normalizedFieldType].filter(
      (candidate, index, values): candidate is number =>
        candidate != null && values.indexOf(candidate) === index,
    );
  }

  private normalizeFieldTypeCandidate(fieldType: number): number {
    return fieldType >= 10000 ? Math.floor(fieldType / 100) : fieldType;
  }

  private isBuildingAllowedOnField(
    buildingDef: BuildingDef,
    field: ColonyField,
  ): boolean {
    return this.getFieldTypeCandidates(field).some((fieldType) =>
      buildingDef.allowedFieldTypes.includes(fieldType),
    );
  }

  private resolveFieldAlternative(
    buildingDef: BuildingDef,
    field: ColonyField,
  ): number {
    if (!buildingDef.fieldAlternatives?.length) return buildingDef.id;
    for (const fieldType of this.getFieldTypeCandidates(field)) {
      const alt = buildingDef.fieldAlternatives.find(
        (alternative) => alternative.fieldtype === fieldType,
      );
      if (alt) return alt.alternateBuildingId;
    }
    return buildingDef.id;
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

  private getDemolitionRefunds(
    definition: BuildingDef,
  ): Array<{ commodityId: number; amount: number }> {
    return (definition.resourceCosts ?? [])
      .map((cost) => ({
        commodityId: cost.commodityId,
        amount: Math.floor(cost.amount / 2),
      }))
      .filter((cost) => cost.amount > 0);
  }

  private getUnavailableEffectCommodity(
    summary: ColonyInternalSummary,
    definition: BuildingDef,
  ): { commodityId: number; available: number } | null {
    for (const production of definition.production ?? []) {
      if (production.amount >= 0) continue;
      const commodity = this.gameData.getCommodity(production.commodityId);
      if (!commodity || commodity.isSaveable || commodity.isDeposit) continue;

      const available =
        summary.productionDelta.get(production.commodityId) ?? 0;
      if (available + production.amount < 0) {
        return { commodityId: production.commodityId, available };
      }
    }

    return null;
  }

  private assertCanActivateBuilding(
    colony: Colony,
    field: ColonyField,
    definition: BuildingDef,
  ): void {
    const summaryWithoutField = this.colonyStatsService.calculateSummary(
      colony,
      new Set([field.id]),
    );
    const availableWorkers =
      summaryWithoutField.effectiveState.population.available;
    if ((definition.bevUse || 0) > availableWorkers) {
      throw new BadRequestException('Nicht genug freie Arbeiter');
    }

    const energyAfter =
      summaryWithoutField.energyDelta + (definition.epsProc || 0);
    if (energyAfter < 0 && colony.energy + energyAfter < 0) {
      throw new BadRequestException('Nicht genug Energie');
    }

    const missingEffectCommodity = this.getUnavailableEffectCommodity(
      summaryWithoutField,
      definition,
    );
    if (missingEffectCommodity) {
      const commodity = this.gameData.getCommodity(
        missingEffectCommodity.commodityId,
      );
      throw new BadRequestException(
        `Nicht genug ${commodity?.name ?? 'Effekt-Ressource'} verfügbar (${missingEffectCommodity.available} vorhanden)`,
      );
    }
  }

  private async deactivateDependentBuildings(
    colony: Colony,
    fieldToRemove: ColonyField,
  ): Promise<ColonyField[]> {
    const deactivated: ColonyField[] = [];

    for (let round = 0; round < 100; round++) {
      const summary = this.colonyStatsService.calculateSummary(
        colony,
        new Set([fieldToRemove.id, ...deactivated.map((field) => field.id)]),
      );
      let victim: ColonyField | null = null;

      for (const field of summary.activeFields) {
        if (field.id === fieldToRemove.id || this.isHeadquartersField(field)) {
          continue;
        }
        const definition = this.gameData.getBuilding(field.buildingId!);
        if (!definition) continue;
        const missingEffectCommodity = this.getUnavailableEffectCommodity(
          summary,
          definition,
        );
        if (missingEffectCommodity) {
          victim = field;
          break;
        }
      }

      if (!victim) break;
      const victimDefinition = this.gameData.getBuilding(victim.buildingId!);
      if (!victimDefinition) break;
      await this.buildingLifecycleService.deactivateBuilding(
        colony,
        victim,
        victimDefinition,
      );
      deactivated.push(victim);
    }

    return deactivated;
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

    const deactivatedFields: ColonyField[] = [];
    if (field.isActive) {
      await this.buildingLifecycleService.deactivateBuilding(
        colony,
        field,
        definition,
      );
      deactivatedFields.push(field);
    }
    deactivatedFields.push(
      ...(await this.deactivateDependentBuildings(colony, field)),
    );

    this.buildingLifecycleService.clearBuilding(field);
    const saved = await this.fieldRepo.save(field);

    const storageMax =
      this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
    const recycled: Array<{ commodityId: number; amount: number }> = [];
    let currentStored = await this.colonyStorageService.getStorageUsed(
      colony.id,
    );
    for (const refund of this.getDemolitionRefunds(definition)) {
      const stored = await this.colonyStorageService.upperStorage(
        colony,
        refund.commodityId,
        refund.amount,
        storageMax,
      );
      if (stored > 0) {
        recycled.push({ commodityId: refund.commodityId, amount: stored });
        currentStored += stored;
      }
    }
    colony.storageUsed = currentStored;
    await this.colonyRepo.save(colony);
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.BUILDING_DESTROYED,
      severity: ColonyEventSeverity.INFO,
      title: 'Gebäude abgerissen',
      message: `${definition.name} auf Feld ${field.fieldIndex} wurde abgerissen.`,
      payload: {
        fieldIndex: field.fieldIndex,
        buildingId: definition.id,
        recycled,
        deactivatedFieldIndexes: deactivatedFields
          .filter((entry) => entry.id !== field.id)
          .map((entry) => entry.fieldIndex),
      },
    });

    return saved;
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

    const repairPlan = this.buildingManagementService.calculateRepairPlan(
      colony,
      field,
      { checkStorageAvailability: false },
    );
    if (!repairPlan.repairable) {
      throw new BadRequestException(
        repairPlan.reason ?? 'Building is not repairable',
      );
    }
    await this.deductBuildCosts(colony, repairPlan.costs);

    colony.energy -= repairPlan.energyCost;
    await this.colonyRepo.save(colony);

    this.buildingLifecycleService.repairBuilding(field);
    const saved = await this.fieldRepo.save(field);
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.BUILDING_REPAIRED,
      severity: ColonyEventSeverity.INFO,
      title: 'Gebäude repariert',
      message: `${repairPlan.buildingName} auf Feld ${field.fieldIndex} wurde repariert.`,
      payload: { fieldIndex: field.fieldIndex, buildingId: field.buildingId },
    });
    return saved;
  }

  async getBuildingRepairPreview(
    colonyId: number,
    userId: number,
    fieldIndexes?: number[],
  ) {
    const colony = await this.findOne(colonyId, userId);
    return this.buildingManagementService.getRepairPreview(
      colony,
      fieldIndexes,
    );
  }

  async repairDamagedBuildings(
    colonyId: number,
    userId: number,
    fieldIndexes?: number[],
  ) {
    const colony = await this.findOne(colonyId, userId);
    const result = await this.buildingManagementService.repairDamagedBuildings(
      colony,
      fieldIndexes,
    );
    await this.colonyRepo.save(colony);
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.BUILDINGS_REPAIRED,
      severity:
        result.skipped.length > 0
          ? ColonyEventSeverity.WARNING
          : ColonyEventSeverity.INFO,
      title: 'Gebäudereparatur abgeschlossen',
      message: `${result.repaired.length} Gebäude repariert, ${result.skipped.length} übersprungen.`,
      payload: result as unknown as Record<string, unknown>,
    });
    return result;
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
    field.terraformingFinishesAt = this.dateAfterScaledSeconds(
      terraforming.duration,
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
      await this.buildingLifecycleService.deactivateBuilding(
        colony,
        field,
        definition,
      );
      await this.deactivateDependentBuildings(colony, field);
      return field;
    } else {
      this.assertCanActivateBuilding(colony, field, definition);

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
    const maxShields = this.getMaxShields(colony);
    if (maxShields <= 0 || !this.hasActiveBuildingFunction(colony, 24)) {
      throw new BadRequestException('Active shield generator required');
    }
    this.colonyDefenseService.syncShieldCapacity(colony, maxShields);
    colony.stats.shieldFrequency = frequency;
    await this.statsRepo.save(colony.stats);
    return colony;
  }

  async setDefenseTorpedoType(
    colonyId: number,
    userId: number,
    torpedoTypeId: number | null,
  ): Promise<Colony> {
    const colony = await this.findOne(colonyId, userId);
    if (!this.hasActiveBuildingFunction(colony, 27)) {
      throw new BadRequestException('Active particle phalanx required');
    }
    if (torpedoTypeId != null && !this.gameData.getTorpedoType(torpedoTypeId)) {
      throw new BadRequestException('Unknown torpedo type');
    }
    this.colonyDefenseService.setTorpedoType(colony, torpedoTypeId);
    if (colony.stats) await this.statsRepo.save(colony.stats);
    return colony;
  }

  async loadShields(
    colonyId: number,
    userId: number,
    amount: number,
  ): Promise<Colony> {
    const colony = await this.findOne(colonyId, userId);
    if (!colony.stats) throw new BadRequestException('Colony stats missing');
    const maxShields = this.getMaxShields(colony);
    if (maxShields <= 0 || !this.hasActiveBuildingFunction(colony, 24)) {
      throw new BadRequestException('Active shield generator required');
    }
    const loaded = this.colonyDefenseService.loadShields(
      colony,
      amount,
      maxShields,
    );
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.SHIELDS_LOADED,
      severity: ColonyEventSeverity.INFO,
      title: 'Schilde geladen',
      message: `Kolonieschilde wurden um ${loaded} Punkte geladen.`,
      payload: {
        amount: loaded,
        current: colony.stats.shields,
        max: maxShields,
      },
    });
    await this.statsRepo.save(colony.stats);
    await this.colonyRepo.save(colony);
    return colony;
  }

  private getActiveBuildingFunctionIds(colony: Colony): number[] {
    return this.colonyEconomyService.getActiveFunctionIds(colony);
  }

  private getMaxShields(colony: Colony): number {
    return this.colonyDefenseService.calculateMaxShieldsByFunctions(
      this.getActiveBuildingFunctionIds(colony),
    );
  }

  private hasActiveBuildingFunction(
    colony: Colony,
    functionId: number,
  ): boolean {
    return this.colonyEconomyService.hasActiveFunction(colony, functionId);
  }

  private hasCompletedBuildingFunction(
    colony: Colony,
    functionId: number,
  ): boolean {
    return (colony.fields ?? []).some(
      (field) =>
        field.buildingId &&
        !field.isBuilding &&
        this.gameData
          .getBuildingFunctions(field.buildingId)
          .includes(functionId),
    );
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
    const trainingFacility =
      this.colonyEconomyService.getCrewTrainingFacility(colony);
    if (!trainingFacility.present) {
      throw new BadRequestException('Crew training facility required');
    }
    if (!trainingFacility.active) {
      throw new BadRequestException('Crew training facility must be active');
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
    const trainableNow = this.getColonyTrainableCrewNow(
      colony,
      trainableGlobal,
      inTraining,
    );
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
      finishesAt: this.dateAfterScaledSeconds(item.durationSeconds * amount),
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
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.SHIP_LANDED,
      severity: ColonyEventSeverity.INFO,
      title: 'Schiff gelandet',
      message: `${ship.name} ist auf der Kolonie gelandet.`,
      payload: {
        shipId: ship.id,
        shipClassId: ship.shipClassId,
        hangarCommodityId: hangarDef.hangarCommodityId,
      },
    });
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
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.HANGAR_SHIP_STARTED,
      severity: ColonyEventSeverity.INFO,
      title: 'Hangarschiff gestartet',
      message: `${savedShip.name} wurde aus dem Hangar gestartet.`,
      payload: {
        shipId: savedShip.id,
        shipClassId: shipClass.id,
        hangarCommodityId: hangarDef.hangarCommodityId,
      },
    });
    if (
      hangarDef.defaultTorpedoCommodityId &&
      hangarDef.defaultTorpedoAmount > 0
    ) {
      const torpedoType = this.gameData.getTorpedoTypeByCommodity(
        hangarDef.defaultTorpedoCommodityId,
      );
      if (torpedoType) {
        try {
          await this.spacecraftTorpedoService.loadFromColony(
            colony,
            savedShip,
            torpedoType.id,
            hangarDef.defaultTorpedoAmount,
          );
        } catch {
          // STU starts even if default torpedo loading cannot be fully satisfied.
        }
      }
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

  private async getShipCargoItem(
    spacecraftId: number,
    commodityId: number,
  ): Promise<CargoItem | null> {
    return this.cargoRepo.findOne({
      where: { spacecraftId, commodityId },
    });
  }

  private async getShuttleCargoUsed(shipId: number): Promise<number> {
    const cargo = await this.cargoRepo.find({
      where: { spacecraftId: shipId },
    });
    return cargo
      .filter((item) => this.gameData.getCommodity(item.commodityId)?.isShuttle)
      .reduce((sum, item) => sum + item.amount, 0);
  }

  private async getColonyStorageItem(
    colonyId: number,
    commodityId: number,
  ): Promise<ColonyStorage | null> {
    return this.storageRepo.findOne({
      where: { colonyId, commodityId },
    });
  }

  private canManageOrbitShip(colony: Colony, ship: Spacecraft): boolean {
    return (
      ship.userId === colony.userId && this.isShipInColonyOrbit(colony, ship)
    );
  }

  private isShipInColonyOrbit(colony: Colony, ship: Spacecraft): boolean {
    return (
      ship.starSystemId === colony.starSystemId &&
      (colony.celestialObjectId == null ||
        ship.celestialObjectId === colony.celestialObjectId)
    );
  }

  private async syncColonyBlockadeState(colonyId: number): Promise<void> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId },
      relations: ['stats'],
    });
    if (!colony?.stats) return;
    const blockadeCount = await this.orbitAssignmentRepo.count({
      where: { colonyId, mode: ColonyOrbitAssignmentMode.BLOCKADE },
    });
    const nextBlocked = blockadeCount > 0;
    if (Boolean(colony.stats.isBlockaded) !== nextBlocked) {
      colony.stats.isBlockaded = nextBlocked;
      await this.statsRepo.save(colony.stats);
    }
  }

  private async cleanupInvalidOrbitAssignments(colony: Colony): Promise<void> {
    const assignments = await this.orbitAssignmentRepo.find({
      where: { colonyId: colony.id },
      relations: ['spacecraft'],
    });
    for (const assignment of assignments) {
      if (
        !assignment.spacecraft ||
        assignment.spacecraft.status === SpacecraftStatus.DESTROYED ||
        !this.isShipInColonyOrbit(colony, assignment.spacecraft)
      ) {
        await this.orbitAssignmentRepo.remove(assignment);
      }
    }
    await this.syncColonyBlockadeState(colony.id);
  }

  async setOrbitAssignment(
    colonyId: number,
    userId: number,
    shipId: number,
    mode: ColonyOrbitAssignmentMode,
  ): Promise<ColonyOrbitAssignment> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId },
      relations: ['fields', 'stats'],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    await this.cleanupInvalidOrbitAssignments(colony);

    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['fleet'],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (!this.isShipInColonyOrbit(colony, ship)) {
      throw new BadRequestException('Ship is not in colony orbit');
    }
    if (!ship.fleetId || !ship.fleet || ship.fleet.leaderId !== ship.id) {
      throw new BadRequestException(
        'Only fleet leaders can manage orbit orders',
      );
    }
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException(
        'Destroyed ship cannot manage orbit orders',
      );
    }

    const existingFleetAssignment = await this.orbitAssignmentRepo.findOne({
      where: { fleetId: ship.fleetId },
    });
    if (existingFleetAssignment) {
      throw new BadRequestException('Fleet already has an orbit order');
    }
    const existingShipAssignment = await this.orbitAssignmentRepo.findOne({
      where: { spacecraftId: ship.id },
    });
    if (existingShipAssignment) {
      throw new BadRequestException('Ship already has an orbit order');
    }

    const existingMode = await this.orbitAssignmentRepo.findOne({
      where: {
        colonyId: colony.id,
        mode:
          mode === ColonyOrbitAssignmentMode.DEFEND
            ? ColonyOrbitAssignmentMode.BLOCKADE
            : ColonyOrbitAssignmentMode.DEFEND,
      },
    });
    if (existingMode) {
      throw new BadRequestException(
        mode === ColonyOrbitAssignmentMode.DEFEND
          ? 'Colony is already blockaded'
          : 'Colony is already defended',
      );
    }

    if (mode === ColonyOrbitAssignmentMode.BLOCKADE) {
      const functionIds = this.getActiveBuildingFunctionIds(colony);
      if (
        this.colonyDefenseService.hasEnergyPhalanx(functionIds) ||
        this.colonyDefenseService.hasParticlePhalanx(functionIds) ||
        this.colonyDefenseService.hasAntiParticle(functionIds)
      ) {
        throw new BadRequestException('Colony has active orbital defense');
      }
    }

    const assignment = this.orbitAssignmentRepo.create({
      colonyId: colony.id,
      spacecraftId: ship.id,
      fleetId: ship.fleetId,
      mode,
    });
    const saved = await this.orbitAssignmentRepo.save(assignment);
    await this.syncColonyBlockadeState(colony.id);

    const startedBlockade = mode === ColonyOrbitAssignmentMode.BLOCKADE;
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId: colony.userId,
      type: startedBlockade
        ? ColonyEventType.ORBIT_BLOCKADE_STARTED
        : ColonyEventType.ORBIT_DEFENSE_STARTED,
      severity: startedBlockade
        ? ColonyEventSeverity.WARNING
        : ColonyEventSeverity.INFO,
      title: startedBlockade ? 'Blockade begonnen' : 'Verteidigung begonnen',
      message: `Flotte #${ship.fleetId} hat ${
        startedBlockade ? 'die Blockade' : 'die Verteidigung'
      } der Kolonie begonnen.`,
      payload: { shipId: ship.id, fleetId: ship.fleetId, mode },
    });

    return saved;
  }

  async clearOrbitAssignment(
    colonyId: number,
    userId: number,
    shipId: number,
  ): Promise<{ cleared: boolean }> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId },
      relations: ['stats'],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['fleet'],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (!ship.fleetId || !ship.fleet || ship.fleet.leaderId !== ship.id) {
      throw new BadRequestException(
        'Only fleet leaders can manage orbit orders',
      );
    }
    const assignment = await this.orbitAssignmentRepo.findOne({
      where: { colonyId: colony.id, fleetId: ship.fleetId },
    });
    if (!assignment) return { cleared: false };
    await this.orbitAssignmentRepo.remove(assignment);
    await this.syncColonyBlockadeState(colony.id);

    const stoppedBlockade =
      assignment.mode === ColonyOrbitAssignmentMode.BLOCKADE;
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId: colony.userId,
      type: stoppedBlockade
        ? ColonyEventType.ORBIT_BLOCKADE_STOPPED
        : ColonyEventType.ORBIT_DEFENSE_STOPPED,
      severity: ColonyEventSeverity.INFO,
      title: stoppedBlockade ? 'Blockade beendet' : 'Verteidigung beendet',
      message: `Flotte #${ship.fleetId} hat ${
        stoppedBlockade ? 'die Blockade' : 'die Verteidigung'
      } der Kolonie beendet.`,
      payload: {
        shipId: ship.id,
        fleetId: ship.fleetId,
        mode: assignment.mode,
      },
    });

    return { cleared: true };
  }

  async transferShuttles(
    colonyId: number,
    userId: number,
    shipId: number,
    items: Array<{ commodityId: number; amount: number }>,
  ): Promise<Colony> {
    const colony = await this.findOne(colonyId, userId);
    const ship = await this.shipRepo.findOne({ where: { id: shipId, userId } });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (!this.canManageOrbitShip(colony, ship)) {
      throw new BadRequestException('Ship is not in colony orbit');
    }

    const shipClass = await this.shipClassRepo.findOneBy({
      id: ship.shipClassId,
    });
    if (!shipClass) throw new BadRequestException('Unknown ship class');
    if (shipClass.shuttleSlots <= 0) {
      throw new BadRequestException('Ship has no shuttle ramp capacity');
    }

    const normalized = new Map<number, number>();
    for (const item of items ?? []) {
      if (
        !Number.isInteger(item?.commodityId) ||
        !Number.isInteger(item?.amount)
      ) {
        continue;
      }
      if (item.amount === 0) continue;
      const commodity = this.gameData.getCommodity(item.commodityId);
      if (!commodity?.isShuttle) {
        throw new BadRequestException(
          `Commodity ${item.commodityId} is not a shuttle`,
        );
      }
      normalized.set(
        item.commodityId,
        (normalized.get(item.commodityId) ?? 0) + item.amount,
      );
    }
    if (normalized.size === 0) {
      throw new BadRequestException('No shuttle transfers requested');
    }

    const shuttleCargoUsed = await this.getShuttleCargoUsed(ship.id);
    const requestedDelta = Array.from(normalized.values()).reduce(
      (sum, amount) => sum + amount,
      0,
    );
    if (shuttleCargoUsed + requestedDelta > shipClass.shuttleSlots) {
      throw new BadRequestException('Shuttle capacity exceeded');
    }
    if (shuttleCargoUsed + requestedDelta < 0) {
      throw new BadRequestException(
        'Cannot unload more shuttles than stored on ship',
      );
    }

    const maxStorage =
      this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
    const freeStorage = await this.colonyStorageService.getFreeStorage(
      colony,
      maxStorage,
    );
    const unloadAmount = Array.from(normalized.values())
      .filter((amount) => amount < 0)
      .reduce((sum, amount) => sum + Math.abs(amount), 0);
    if (unloadAmount > freeStorage) {
      throw new BadRequestException('Not enough colony storage capacity');
    }

    for (const [commodityId, amount] of normalized.entries()) {
      if (amount > 0) {
        const colonyStorage = await this.getColonyStorageItem(
          colony.id,
          commodityId,
        );
        if ((colonyStorage?.amount ?? 0) < amount) {
          throw new BadRequestException(
            `Not enough shuttle stock on colony for commodity ${commodityId}`,
          );
        }
      } else {
        const cargoItem = await this.getShipCargoItem(ship.id, commodityId);
        if ((cargoItem?.amount ?? 0) < Math.abs(amount)) {
          throw new BadRequestException(
            `Not enough shuttle stock on ship for commodity ${commodityId}`,
          );
        }
      }
    }

    for (const [commodityId, amount] of normalized.entries()) {
      if (amount > 0) {
        const colonyStorage = await this.getColonyStorageItem(
          colony.id,
          commodityId,
        );
        if (!colonyStorage) {
          throw new BadRequestException(
            `Not enough shuttle stock on colony for commodity ${commodityId}`,
          );
        }
        colonyStorage.amount -= amount;
        await this.storageRepo.save(colonyStorage);

        const cargoItem =
          (await this.getShipCargoItem(ship.id, commodityId)) ??
          this.cargoRepo.create({
            spacecraftId: ship.id,
            commodityId,
            amount: 0,
          });
        cargoItem.amount += amount;
        await this.cargoRepo.save(cargoItem);
      } else {
        const moveAmount = Math.abs(amount);
        const cargoItem = await this.getShipCargoItem(ship.id, commodityId);
        if (!cargoItem) {
          throw new BadRequestException(
            `Not enough shuttle stock on ship for commodity ${commodityId}`,
          );
        }
        cargoItem.amount -= moveAmount;
        await this.cargoRepo.save(cargoItem);

        const colonyStorage =
          (await this.getColonyStorageItem(colony.id, commodityId)) ??
          this.storageRepo.create({
            colonyId: colony.id,
            commodityId,
            amount: 0,
          });
        colonyStorage.amount += moveAmount;
        await this.storageRepo.save(colonyStorage);
      }
    }

    ship.cargoUsed = await this.getShipCargoUsed(ship.id);
    await this.shipRepo.save(ship);

    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.SHUTTLES_TRANSFERRED,
      severity: ColonyEventSeverity.INFO,
      title: 'Shuttles transferiert',
      message: `${ship.name}: Shuttle-Transfer zwischen Kolonie und Schiff durchgeführt.`,
      payload: {
        shipId: ship.id,
        shipClassId: ship.shipClassId,
        transfers: Array.from(normalized.entries()).map(
          ([commodityId, delta]) => ({
            commodityId,
            delta,
          }),
        ),
      },
    });

    return this.findOne(colonyId, userId);
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
        status: In([
          ColonyShipBuildQueueStatus.QUEUED,
          ColonyShipBuildQueueStatus.PAUSED,
        ]),
      },
    });
    return !!queue;
  }

  private getActiveRepairSlotCount(colony: Colony): number {
    const activeRepairBuildings = (colony.fields ?? []).filter(
      (field) =>
        field.buildingId &&
        !field.isBuilding &&
        field.isActive &&
        this.gameData
          .getBuildingFunctions(field.buildingId)
          .includes(this.repairShipyardFunctionId),
    ).length;
    return activeRepairBuildings * 2;
  }

  private async getActiveRepairQueueCount(colonyId: number): Promise<number> {
    return this.shipBuildQueueRepo.count({
      where: {
        colonyId,
        mode: ColonyShipBuildQueueMode.REPAIR,
        status: ColonyShipBuildQueueStatus.QUEUED,
      },
    });
  }

  private async getPausedRepairJobs(
    colonyId: number,
  ): Promise<ColonyShipBuildQueue[]> {
    return this.shipBuildQueueRepo.find({
      where: {
        colonyId,
        mode: ColonyShipBuildQueueMode.REPAIR,
        status: ColonyShipBuildQueueStatus.PAUSED,
      },
      order: { stoppedAt: 'ASC', id: 'ASC' },
    });
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
    const activeRepairSlots = this.getActiveRepairSlotCount(colony);
    const activeRepairJobs = await this.getActiveRepairQueueCount(colony.id);
    const startsActive = activeRepairJobs < activeRepairSlots;

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
      finishesAt: this.dateAfterScaledMinutes(repairPlan.durationMinutes),
      stoppedAt: startsActive ? null : new Date(),
      status: startsActive
        ? ColonyShipBuildQueueStatus.QUEUED
        : ColonyShipBuildQueueStatus.PAUSED,
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
      colony.id,
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
      finishesAt: this.dateAfterScaledMinutes(buildMinutes),
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
    if (
      ![
        ColonyShipBuildQueueStatus.QUEUED,
        ColonyShipBuildQueueStatus.PAUSED,
      ].includes(queue.status)
    ) {
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

  async reactivateShipyardQueue(
    colonyId: number,
    userId: number,
    queueId: number,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    const queue = await this.shipBuildQueueRepo.findOne({
      where: { id: queueId, colonyId: colony.id, userId },
    });
    if (!queue) throw new NotFoundException('Ship build queue not found');
    if (queue.mode !== ColonyShipBuildQueueMode.REPAIR) {
      throw new BadRequestException('Only repair jobs can be reactivated');
    }
    if (queue.status !== ColonyShipBuildQueueStatus.PAUSED) {
      throw new BadRequestException(
        'Only paused repair jobs can be reactivated',
      );
    }
    if (colony.stats?.isBlockaded) {
      throw new BadRequestException(
        'Ship repair is blocked while colony is blockaded',
      );
    }
    const activeRepairSlots = this.getActiveRepairSlotCount(colony);
    if (activeRepairSlots <= 0) {
      throw new BadRequestException('Active repair shipyard required');
    }
    const activeRepairJobs = await this.getActiveRepairQueueCount(colony.id);
    if (activeRepairJobs >= activeRepairSlots) {
      throw new BadRequestException('No active repair slot available');
    }

    const ship = queue.spacecraftId
      ? await this.shipRepo.findOne({
          where: { id: queue.spacecraftId, userId },
        })
      : null;
    if (!ship) {
      throw new BadRequestException('Repair target no longer exists');
    }
    const modules = await this.spacecraftModuleRepo.find({
      where: { spacecraftId: ship.id },
    });
    if (!this.isShipRepairNeeded(ship, modules)) {
      throw new BadRequestException('Ship is no longer damaged');
    }

    const now = new Date();
    if (queue.stoppedAt) {
      const pauseMs = now.getTime() - queue.stoppedAt.getTime();
      queue.finishesAt = new Date(
        queue.finishesAt.getTime() + Math.max(0, pauseMs),
      );
    } else if (queue.finishesAt <= now) {
      queue.finishesAt = this.dateAfterScaledMinutes(1);
    }
    queue.stoppedAt = null;
    queue.status = ColonyShipBuildQueueStatus.QUEUED;

    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.SHIP_REPAIR_REACTIVATED,
      severity: ColonyEventSeverity.INFO,
      title: 'Reparatur reaktiviert',
      message: `${queue.name} wurde reaktiviert.`,
      payload: { queueId: queue.id, spacecraftId: queue.spacecraftId },
    });

    return this.shipBuildQueueRepo.save(queue);
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

  private async assertSingleColonizerAvailability(
    userId: number,
    shipClass: ShipClassDef,
  ): Promise<void> {
    if (!shipClass.isColonizer) return;

    const activeColonizer = await this.shipRepo
      .createQueryBuilder('ship')
      .innerJoin(ShipClassDef, 'shipClass', 'shipClass.id = ship.shipClassId')
      .where('ship.userId = :userId', { userId })
      .andWhere('ship.status != :destroyed', {
        destroyed: SpacecraftStatus.DESTROYED,
      })
      .andWhere('shipClass.isColonizer = true')
      .getOne();
    if (activeColonizer) {
      throw new BadRequestException(
        'Only one operational colonization ship is allowed',
      );
    }

    const activeQueue = await this.shipBuildQueueRepo
      .createQueryBuilder('queue')
      .innerJoin(ShipClassDef, 'shipClass', 'shipClass.id = queue.shipClassId')
      .where('queue.userId = :userId', { userId })
      .andWhere('queue.status = :status', {
        status: ColonyShipBuildQueueStatus.QUEUED,
      })
      .andWhere('queue.mode = :mode', { mode: ColonyShipBuildQueueMode.BUILD })
      .andWhere('shipClass.isColonizer = true')
      .getOne();
    if (activeQueue) {
      throw new BadRequestException(
        'A colonization ship is already under construction',
      );
    }
  }

  async buildShip(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name: string,
    moduleTypes: string[] = [],
    buildPlanName?: string,
    moduleCommodityIds: number[] = [],
    sourceBuildplan?: ColonyShipBuildplan,
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
    await this.assertSingleColonizerAvailability(userId, shipClass);
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
    const buildPlan =
      sourceBuildplan ??
      (await this.getOrCreateBuildplan(
        colony.id,
        userId,
        shipClassId,
        buildPlanName?.trim() || `${shipClass.name} Buildplan`,
        buildPlanSignature,
        selectedModuleCommodityIds,
        selectedModuleTypes,
      ));

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
      finishesAt: this.dateAfterScaledMinutes(buildMinutes),
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

  private validateBuildplanName(name: string): string {
    const trimmed = name?.trim();
    if (!trimmed) {
      throw new BadRequestException('Buildplan name is required');
    }
    return trimmed;
  }

  private async assertBuildplanNameAvailable(
    colonyId: number,
    name: string,
    exceptId?: number,
  ): Promise<void> {
    const existing = await this.shipBuildplanRepo.findOne({
      where: { colonyId, name },
    });
    if (existing && existing.id !== exceptId) {
      throw new BadRequestException('Buildplan name already exists');
    }
  }

  private toBuildplanDto(buildplan: ColonyShipBuildplan) {
    return {
      id: buildplan.id,
      colonyId: buildplan.colonyId,
      shipClassId: buildplan.shipClassId,
      name: buildplan.name,
      signature: buildplan.signature,
      moduleCommodityIds: buildplan.moduleCommodityIds,
      moduleTypes: buildplan.moduleTypes,
    };
  }

  async createShipBuildplan(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name: string,
    moduleCommodityIds: number[] = [],
    moduleTypes: string[] = [],
  ) {
    const colony = await this.findOne(colonyId, userId);
    const trimmedName = this.validateBuildplanName(name);
    await this.assertBuildplanNameAvailable(colony.id, trimmedName);

    const shipClass = await this.shipClassRepo.findOneBy({ id: shipClassId });
    if (!shipClass || shipClass.isNpc) {
      throw new BadRequestException('Unknown ship class');
    }

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

    const buildplan = this.shipBuildplanRepo.create({
      colonyId: colony.id,
      userId,
      shipClassId,
      name: trimmedName,
      signature: this.createBuildplanSignature(
        shipClassId,
        selectedModuleCommodityIds,
      ),
      moduleCommodityIds: selectedModuleCommodityIds,
      moduleTypes: selectedModuleTypes,
    });
    return this.toBuildplanDto(await this.shipBuildplanRepo.save(buildplan));
  }

  async renameShipBuildplan(
    colonyId: number,
    userId: number,
    planId: number,
    name: string,
  ) {
    const colony = await this.findOne(colonyId, userId);
    const buildplan = await this.shipBuildplanRepo.findOne({
      where: { id: planId, colonyId: colony.id, userId },
    });
    if (!buildplan) throw new NotFoundException('Buildplan not found');

    const trimmedName = this.validateBuildplanName(name);
    await this.assertBuildplanNameAvailable(
      colony.id,
      trimmedName,
      buildplan.id,
    );
    buildplan.name = trimmedName;
    return this.toBuildplanDto(await this.shipBuildplanRepo.save(buildplan));
  }

  async deleteShipBuildplan(colonyId: number, userId: number, planId: number) {
    const colony = await this.findOne(colonyId, userId);
    const buildplan = await this.shipBuildplanRepo.findOne({
      where: { id: planId, colonyId: colony.id, userId },
    });
    if (!buildplan) throw new NotFoundException('Buildplan not found');
    await this.shipBuildplanRepo.delete({ id: buildplan.id });
    return { deleted: true, id: buildplan.id };
  }

  async buildShipFromBuildplan(
    colonyId: number,
    userId: number,
    planId: number,
    name: string,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    const buildplan = await this.shipBuildplanRepo.findOne({
      where: { id: planId, colonyId: colony.id, userId },
    });
    if (!buildplan) throw new NotFoundException('Buildplan not found');
    return this.buildShip(
      colony.id,
      userId,
      buildplan.shipClassId,
      name,
      buildplan.moduleTypes,
      buildplan.name,
      buildplan.moduleCommodityIds,
      buildplan,
    );
  }

  private async getOrCreateBuildplan(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name: string,
    signature: string,
    moduleCommodityIds: number[],
    moduleTypes: string[],
  ): Promise<ColonyShipBuildplan> {
    const existing = await this.shipBuildplanRepo.findOne({
      where: { colonyId, signature },
    });
    if (existing) return existing;

    const trimmedName = this.validateBuildplanName(name);
    await this.assertBuildplanNameAvailable(colonyId, trimmedName);
    const buildplan = this.shipBuildplanRepo.create({
      colonyId,
      userId,
      shipClassId,
      name: trimmedName,
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
    const jobs = await this.crewTrainingQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: ColonyCrewTrainingQueueStatus.QUEUED,
      },
    });
    for (const job of jobs) {
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
    const queuedJobs = await this.shipBuildQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: ColonyShipBuildQueueStatus.QUEUED,
      },
      relations: ['shipClass'],
      order: { finishesAt: 'ASC', id: 'ASC' },
    });
    const now = new Date();
    const activeRepairSlots = this.getActiveRepairSlotCount(colony);
    const canProgressRepair =
      !colony.stats?.isBlockaded && activeRepairSlots > 0;
    let remainingRepairSlots = activeRepairSlots;

    for (const job of queuedJobs) {
      if (job.mode === ColonyShipBuildQueueMode.REPAIR) {
        if (!canProgressRepair || remainingRepairSlots <= 0) {
          job.status = ColonyShipBuildQueueStatus.PAUSED;
          job.stoppedAt = now;
          await this.shipBuildQueueRepo.save(job);
          continue;
        }
        remainingRepairSlots -= 1;
      }
      if (job.finishesAt > now) continue;
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

    if (canProgressRepair && remainingRepairSlots > 0) {
      const pausedJobs = await this.getPausedRepairJobs(colony.id);
      for (const pausedJob of pausedJobs.slice(0, remainingRepairSlots)) {
        if (pausedJob.stoppedAt) {
          const pauseMs = now.getTime() - pausedJob.stoppedAt.getTime();
          pausedJob.finishesAt = new Date(
            pausedJob.finishesAt.getTime() + Math.max(0, pauseMs),
          );
        }
        pausedJob.stoppedAt = null;
        pausedJob.status = ColonyShipBuildQueueStatus.QUEUED;
        await this.shipBuildQueueRepo.save(pausedJob);
      }
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
    const summary = this.colonyEconomyService.calculateSummary(colony);
    const effectiveState = summary.effectiveState;
    const activeFunctionIds = effectiveState.functions.activeIds;
    const effectiveCurrentPopulation = effectiveState.population.current;
    if (colony.stats && colony.population !== effectiveCurrentPopulation) {
      colony.population = effectiveCurrentPopulation;
      await this.colonyRepo.save(colony);
    }
    const workers = effectiveState.population.workers;
    const available = effectiveState.population.available;
    const productionDelta = new Map([
      ...summary.productionDelta,
      ...summary.depositDelta,
    ]);

    await this.cleanupInvalidOrbitAssignments(colony);
    const orbitAssignments = await this.orbitAssignmentRepo.find({
      where: { colonyId: colony.id },
      order: { id: 'ASC' },
    });
    const orbitAssignmentByFleetId = new Map(
      orbitAssignments.map((assignment) => [assignment.fleetId, assignment]),
    );
    const defendingFleetIds = orbitAssignments
      .filter(
        (assignment) => assignment.mode === ColonyOrbitAssignmentMode.DEFEND,
      )
      .map((assignment) => assignment.fleetId);
    const blockadingFleetIds = orbitAssignments
      .filter(
        (assignment) => assignment.mode === ColonyOrbitAssignmentMode.BLOCKADE,
      )
      .map((assignment) => assignment.fleetId);
    const hasDefendingFleet = defendingFleetIds.length > 0;
    const hasBlockadingFleet = blockadingFleetIds.length > 0;
    const orbitShips = colony.starSystemId
      ? await this.shipRepo.find({
          where: {
            userId,
            starSystemId: colony.starSystemId,
            ...(colony.celestialObjectId
              ? { celestialObjectId: colony.celestialObjectId }
              : {}),
          },
          relations: ['fleet'],
          order: { id: 'ASC' },
        })
      : [];
    const orbitShipModules = orbitShips.length
      ? await this.spacecraftModuleRepo.find({
          where: { spacecraftId: In(orbitShips.map((ship) => ship.id)) },
          order: { id: 'ASC' },
        })
      : [];
    const orbitShipCargo = orbitShips.length
      ? await this.cargoRepo.find({
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
    const cargoByShipId = new Map<number, CargoItem[]>();
    for (const cargoItem of orbitShipCargo) {
      const cargo = cargoByShipId.get(cargoItem.spacecraftId) ?? [];
      cargo.push(cargoItem);
      cargoByShipId.set(cargoItem.spacecraftId, cargo);
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
      where: {
        colonyId: colony.id,
        status: In([
          ColonyShipBuildQueueStatus.QUEUED,
          ColonyShipBuildQueueStatus.PAUSED,
        ]),
      },
      order: { finishesAt: 'ASC' },
    });
    const buildplans = await this.shipBuildplanRepo.find({
      where: { colonyId: colony.id, userId },
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
      order: { id: 'ASC' },
    });
    const [
      assignedToColony,
      localCrewLimit,
      globalCrewLimit,
      remainingGlobal,
      trainableGlobal,
      inTraining,
      assignedTotal,
    ] = await Promise.all([
      this.colonyCrewService.getAssignedToColonyCount(colony.id),
      Promise.resolve(this.colonyCrewService.getLocalCrewLimit(colony)),
      this.colonyCrewService.getGlobalCrewLimit(userId),
      this.colonyCrewService.getRemainingCount(userId),
      this.colonyCrewService.getTrainableCount(userId),
      this.colonyCrewService.getInTrainingCount(userId),
      this.colonyCrewService.getAssignedCount(userId),
    ]);
    const featureAccess = this.colonyEconomyService.buildFeatureAccess(colony);
    const presentFabricationFunctionIds =
      featureAccess.functions.groups.fabrication.presentFunctionIds;
    const activeFabricationFunctionIds =
      featureAccess.functions.groups.fabrication.activeFunctionIds;
    const presentFabricationFunctionIdSet = new Set(
      presentFabricationFunctionIds,
    );
    const activeFabricationFunctionIdSet = new Set(
      activeFabricationFunctionIds,
    );
    const [eventUnreadCount, latestEvents] = await Promise.all([
      this.colonyEventService.getUnreadCountForColony(colony.id, userId),
      this.colonyEventService.getLatestForColony(colony.id, userId, 3),
    ]);
    const hangarInventory = await this.getHangarInventory(colony);
    const startableHangarShips = await this.getStartableHangarShips(
      userId,
      colony,
    );
    const hasAirfield =
      featureAccess.functions.groups.airfield.activeFunctionIds.length > 0;

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
            effectiveState.functions.active.find((fn) => fn.id === functionId)
              ?.name ?? String(functionId),
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

    const hasCompletedShipyard =
      featureAccess.tabs.shipyard?.visible ??
      fields.some((field) => this.isShipyardField(field, false));
    const hasShipyardInProgress = fields.some((field) =>
      this.isShipyardField(field, true),
    );

    return Object.assign(this.toColonySummary(colony), {
      fieldCount: fields.length,
      storageItemCount: storage.length,
      detailV2: {
        featureAccess,
        eventSummary: {
          unreadCount: eventUnreadCount,
          latest: latestEvents.map((event) => ({
            id: event.id,
            type: event.type,
            severity: event.severity,
            title: event.title,
            message: event.message,
            createdAt: event.createdAt,
            readAt: event.readAt,
          })),
        },
        activeFunctions: effectiveState.functions.active,
        effectiveState,
        options: {
          name: colony.name,
          colonyMessage: colony.stats?.colonyMessage ?? null,
          populationLimit: colony.stats?.populationLimit ?? 0,
          immigrationEnabled: colony.stats?.immigrationEnabled ?? true,
        },
        energy: {
          current: effectiveState.energy.current,
          max: effectiveState.energy.max,
          delta: effectiveState.energy.delta,
        },
        storage: {
          current: effectiveState.storage.current,
          max: effectiveState.storage.max,
          delta: effectiveState.storage.delta,
        },
        waste: {
          canDiscard: this.hasCompletedBuildingFunction(
            colony,
            this.warehouseFunctionId,
          ),
          requiredFunctionId: this.warehouseFunctionId,
        },
        population: {
          current: effectiveCurrentPopulation,
          max: summary.effectivePopulationMax,
          growth: this.calculatePopulationGrowth(colony, summary),
          workers,
          available,
          housing: summary.freeHousing,
          housingFree: summary.freeHousing,
          housingMax: summary.maxHousing,
          housingBonus: summary.housingBonus,
          populationLimit: colony.stats?.populationLimit ?? 0,
          immigrationEnabled: colony.stats?.immigrationEnabled ?? true,
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
        productionDeltas: Array.from(productionDelta.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([commodityId, amount]) => {
            const commodity = this.gameData.getCommodity(commodityId);
            return {
              commodityId,
              name: commodity?.name ?? `Ware #${commodityId}`,
              nameShort: commodity?.nameShort ?? String(commodityId),
              amount,
            };
          }),
        buildingManagement: {
          counts: {
            active: fields.filter(
              (field) =>
                field.buildingId && !field.isBuilding && field.isActive,
            ).length,
            inactive: fields.filter(
              (field) =>
                field.buildingId && !field.isBuilding && !field.isActive,
            ).length,
            damaged: fields.filter(
              (field) =>
                field.buildingId &&
                !field.isBuilding &&
                field.maxIntegrity > 0 &&
                field.integrity < field.maxIntegrity,
            ).length,
            building: fields.filter(
              (field) => field.buildingId && field.isBuilding,
            ).length,
          },
          fields: fields
            .filter((field) => field.buildingId)
            .map((field) => {
              const building = field.buildingId
                ? this.gameData.getBuilding(field.buildingId)
                : undefined;
              return {
                fieldIndex: field.fieldIndex,
                buildingId: field.buildingId,
                buildingName: building?.name ?? `Gebäude #${field.buildingId}`,
                isActive: field.isActive,
                isBuilding: field.isBuilding,
                integrity: field.integrity,
                maxIntegrity: field.maxIntegrity,
                epsProc: building?.epsProc ?? 0,
                bevUse: building?.bevUse ?? 0,
                bevPro: building?.bevPro ?? 0,
                production: building?.production ?? [],
                functions: (building?.functions ?? [])
                  .map(
                    (functionId) =>
                      effectiveState.functions.active.find(
                        (fn) => fn.id === functionId,
                      ) ?? this.gameData.getBuildingFunction(functionId),
                  )
                  .filter(Boolean),
              };
            }),
          usableCommodities: this.gameData
            .getAllCommodities()
            .filter((commodity) =>
              fields.some((field) => {
                const building = field.buildingId
                  ? this.gameData.getBuilding(field.buildingId)
                  : undefined;
                return building?.production?.some(
                  (entry) => entry.commodityId === commodity.id,
                );
              }),
            )
            .map((commodity) => ({ id: commodity.id, name: commodity.name })),
        },
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
          const cargo = cargoByShipId.get(ship.id) ?? [];
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
          const shuttleCapacity =
            shipClass && 'shuttleSlots' in shipClass
              ? Number(
                  (shipClass as ShipClassDef & { shuttleSlots?: number })
                    .shuttleSlots ?? 0,
                )
              : 0;
          const shuttleModelAvailable = shuttleCapacity > 0;
          const orbitAssignment = ship.fleetId
            ? orbitAssignmentByFleetId.get(ship.fleetId)
            : undefined;
          const isFleetLeader = ship.fleet?.leaderId === ship.id;
          const canDefend =
            isFleetLeader &&
            ship.fleetId != null &&
            !orbitAssignment &&
            !hasBlockadingFleet;
          const canBlock =
            isFleetLeader &&
            ship.fleetId != null &&
            !orbitAssignment &&
            !hasDefendingFleet &&
            !planetaryDefense.length;
          const shuttleStored = cargo
            .filter(
              (item: CargoItem) =>
                this.gameData.getCommodity(item.commodityId)?.isShuttle,
            )
            .reduce((sum: number, item: CargoItem) => sum + item.amount, 0);
          return {
            id: ship.id,
            name: ship.name,
            shipClassId: ship.shipClassId,
            shipClassKey: shipClass?.key ?? null,
            shipClassName:
              shipClass?.name ?? `Schiffsklasse #${ship.shipClassId}`,
            shipCategory: shipClass?.category ?? null,
            shipRole: shipClass?.role ?? null,
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
            canManage,
            canDefend,
            canBlock,
            orbitAssignment: orbitAssignment
              ? {
                  id: orbitAssignment.id,
                  mode: orbitAssignment.mode,
                  fleetId: orbitAssignment.fleetId,
                }
              : null,
            canManageShuttle: shuttleModelAvailable,
            shuttleCapacity,
            shuttleStored,
            orbitGroup: ship.fleetId != null ? 'FLEET' : 'SINGLE',
            orbitGroupLabel:
              ship.fleetId != null ? `Flotte #${ship.fleetId}` : 'Einzelschiff',
            fleetId: ship.fleetId,
            actionBlockers: {
              defend: canDefend
                ? null
                : orbitAssignment?.mode === ColonyOrbitAssignmentMode.DEFEND
                  ? 'Diese Flotte verteidigt die Kolonie bereits.'
                  : hasBlockadingFleet
                    ? 'Die Kolonie wird bereits blockiert.'
                    : !isFleetLeader
                      ? 'Nur Flottenführer können Kolonieverteidigung übernehmen.'
                      : null,
              block: canBlock
                ? null
                : orbitAssignment?.mode === ColonyOrbitAssignmentMode.BLOCKADE
                  ? 'Diese Flotte blockiert die Kolonie bereits.'
                  : hasDefendingFleet
                    ? 'Die Kolonie wird bereits verteidigt.'
                    : planetaryDefense.length
                      ? 'Kolonie verfügt über aktive Orbitalverteidigung.'
                      : !isFleetLeader
                        ? 'Nur Flottenführer können Kolonien blockieren.'
                        : null,
              shuttleManagement: shuttleModelAvailable
                ? null
                : 'Dieses Schiff hat keine Shuttle-Kapazität.',
              station:
                'No station entity is linked to colony orbit in SWU yet.',
            },
            station: null,
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
        defense: colony.stats
          ? {
              shields: {
                current: colony.stats.shields ?? 0,
                max: this.getMaxShields(colony),
                frequency: colony.stats.shieldFrequency,
              },
              activeFunctionIds,
              energyPhalanx:
                this.colonyDefenseService.hasEnergyPhalanx(activeFunctionIds),
              particlePhalanx:
                this.colonyDefenseService.hasParticlePhalanx(activeFunctionIds),
              antiParticle:
                this.colonyDefenseService.hasAntiParticle(activeFunctionIds),
              torpedoTypeId: colony.stats.torpedoTypeId,
              selectedTorpedoType: colony.stats.torpedoTypeId
                ? this.gameData.getTorpedoType(colony.stats.torpedoTypeId)
                : null,
              availableTorpedoTypes: this.gameData
                .getAllTorpedoTypes()
                .map((torpedo) => {
                  const inventoryItem = storage.find(
                    (item) => item.commodityId === torpedo.commodityId,
                  );
                  return { ...torpedo, amount: inventoryItem?.amount ?? 0 };
                })
                .filter((torpedo) => torpedo.amount > 0),
            }
          : null,
        shields: colony.stats
          ? {
              current: colony.stats.shields ?? 0,
              max: this.getMaxShields(colony),
              frequency: colony.stats.shieldFrequency,
            }
          : null,
        shipBuildQueue: shipBuildQueue.map((job) => {
          const mode = job.mode ?? ColonyShipBuildQueueMode.BUILD;
          const canReactivate =
            mode === ColonyShipBuildQueueMode.REPAIR &&
            job.status === ColonyShipBuildQueueStatus.PAUSED &&
            !colony.stats?.isBlockaded &&
            this.getActiveRepairSlotCount(colony) > 0;
          const reactivationBlockedReason =
            mode !== ColonyShipBuildQueueMode.REPAIR
              ? 'Nur Reparaturjobs können reaktiviert werden.'
              : job.status !== ColonyShipBuildQueueStatus.PAUSED
                ? 'Nur pausierte Reparaturjobs können reaktiviert werden.'
                : colony.stats?.isBlockaded
                  ? 'Reparaturen sind während einer Blockade gesperrt.'
                  : this.getActiveRepairSlotCount(colony) <= 0
                    ? 'Aktive Reparaturwerft erforderlich.'
                    : null;
          return {
            id: job.id,
            shipClassId: job.shipClassId,
            spacecraftId: job.spacecraftId,
            mode,
            name: job.name,
            canReactivate,
            reactivationBlockedReason,
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
            stoppedAt: job.stoppedAt,
            status: job.status,
          };
        }),
        shipyardQueue: shipBuildQueue.map((job) => {
          const mode = job.mode ?? ColonyShipBuildQueueMode.BUILD;
          const canReactivate =
            mode === ColonyShipBuildQueueMode.REPAIR &&
            job.status === ColonyShipBuildQueueStatus.PAUSED &&
            !colony.stats?.isBlockaded &&
            this.getActiveRepairSlotCount(colony) > 0;
          const reactivationBlockedReason =
            mode !== ColonyShipBuildQueueMode.REPAIR
              ? 'Nur Reparaturjobs können reaktiviert werden.'
              : job.status !== ColonyShipBuildQueueStatus.PAUSED
                ? 'Nur pausierte Reparaturjobs können reaktiviert werden.'
                : colony.stats?.isBlockaded
                  ? 'Reparaturen sind während einer Blockade gesperrt.'
                  : this.getActiveRepairSlotCount(colony) <= 0
                    ? 'Aktive Reparaturwerft erforderlich.'
                    : null;
          return {
            id: job.id,
            shipClassId: job.shipClassId,
            spacecraftId: job.spacecraftId,
            mode,
            name: job.name,
            canReactivate,
            reactivationBlockedReason,
            buildPlanName: job.buildPlanName,
            moduleCommodityIds: job.moduleCommodityIds,
            moduleTypes: job.moduleTypes,
            repairSnapshot: job.repairSnapshot,
            retrofitSnapshot: job.retrofitSnapshot,
            finishesAt: job.finishesAt,
            stoppedAt: job.stoppedAt,
            status: job.status,
          };
        }),
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
          .filter((item) =>
            item.buildingFunctionIds.some((functionId) =>
              presentFabricationFunctionIdSet.has(functionId),
            ),
          )
          .map((item) => ({
            ...item,
            available: item.buildingFunctionIds.some((functionId) =>
              activeFabricationFunctionIdSet.has(functionId),
            ),
          })),
        activeFabricationFunctionIds,
        social: this.colonySocialService.buildSocialSummary(colony, summary, {
          globalCrewLimit,
          crewOnShips: Math.max(0, assignedTotal - assignedToColony),
          availableCrewOnColony: assignedToColony,
          inTraining,
          trainableRemaining: remainingGlobal,
        }),
        crew: {
          available: assignedToColony,
          assignedToColony,
          inTraining,
          localLimit: localCrewLimit,
          globalLimit: globalCrewLimit,
          remainingGlobal,
          trainableNow: this.getColonyTrainableCrewNow(
            colony,
            trainableGlobal,
            inTraining,
          ),
          trainingFacility: (() => {
            const facility =
              this.colonyEconomyService.getCrewTrainingFacility(colony);
            return {
              ...facility,
              maxConcurrent: Number.isFinite(facility.maxConcurrent)
                ? facility.maxConcurrent
                : null,
            };
          })(),
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
        orbitBlockers: {
          shuttleManagement: null,
          station:
            'Blocked: SWU has no station entity attached to colony orbit; only general station influence types exist.',
          defense: null,
        },
        orbitAssignments: orbitAssignments.map((assignment) => ({
          id: assignment.id,
          mode: assignment.mode,
          fleetId: assignment.fleetId,
          spacecraftId: assignment.spacecraftId,
          createdAt: assignment.createdAt,
        })),
        shipyard: {
          unlocked: shipyardUnlocked,
          completed: hasCompletedShipyard,
          inProgress: hasShipyardInProgress,
          buildingId: shipyardBuilding?.id ?? 85010100,
          buildingName: shipyardBuilding?.name ?? 'Werfthub',
          hasAirfield:
            featureAccess.functions.groups.airfield.presentFunctionIds.length >
            0,
          airfieldPresentFunctionIds:
            featureAccess.functions.groups.airfield.presentFunctionIds,
          airfieldActiveFunctionIds:
            featureAccess.functions.groups.airfield.activeFunctionIds,
          airfield: {
            present:
              featureAccess.functions.groups.airfield.presentFunctionIds
                .length > 0,
            active:
              featureAccess.functions.groups.airfield.activeFunctionIds.length >
              0,
            buildableCount: startableHangarShips.length,
            startableCount: startableHangarShips.filter(
              ({ amount }) => amount > 0,
            ).length,
            landableCount: orbitShips.filter((ship) => {
              const shipClass = orbitShipClassMap.get(ship.shipClassId);
              return (
                this.canManageOrbitShip(colony, ship) &&
                hasAirfield &&
                !!shipClass &&
                !!this.getHangarDefForShipClass(shipClass)
              );
            }).length,
          },
          orbitalMaintenance: effectiveState.orbitalMaintenance,
          fighterPresentFunctionIds:
            featureAccess.functions.groups.fighterShipyards.presentFunctionIds,
          fighterActiveFunctionIds:
            featureAccess.functions.groups.fighterShipyards.activeFunctionIds,
          presentFunctionIds:
            featureAccess.functions.groups.shipyards.presentFunctionIds,
          activeFunctionIds:
            featureAccess.functions.groups.shipyards.activeFunctionIds,
          repairPresentFunctionIds:
            featureAccess.functions.groups.repairShipyards.presentFunctionIds,
          repairActiveFunctionIds:
            featureAccess.functions.groups.repairShipyards.activeFunctionIds,
          slotRules: this.gameData.getAllShipClassSlotRules(),
        },
      },
    });
  }

  private getColonyTrainableCrewNow(
    colony: Colony,
    trainableGlobal: number,
    inTraining: number,
  ): number {
    const trainingFacility =
      this.colonyEconomyService.getCrewTrainingFacility(colony);
    const globalTrainableNow = Math.max(0, trainableGlobal - inTraining);
    if (trainingFacility.mode !== 'CENTRAL') {
      return trainingFacility.active ? globalTrainableNow : 0;
    }
    if (!trainingFacility.active) return 0;
    return Math.min(globalTrainableNow, Math.max(0, 2 - inTraining));
  }

  private dateAfterScaledSeconds(seconds: number): Date {
    return new Date(Date.now() + this.scaleBuildTimeSeconds(seconds) * 1000);
  }

  private dateAfterScaledMinutes(minutes: number): Date {
    return this.dateAfterScaledSeconds(minutes * 60);
  }

  private scaleBuildTimeSeconds(seconds: number): number {
    const configured = Number(this.config.get('GAME_BUILD_TIME_MULTIPLIER'));
    const multiplier =
      Number.isFinite(configured) && configured > 0 ? configured : 1;
    return Math.max(1, Math.round(seconds * multiplier));
  }

  private calculatePopulationGrowth(
    colony: Colony,
    summary: ColonyInternalSummary,
  ): number {
    if (colony.stats?.immigrationEnabled === false) {
      return 0;
    }

    const currentPopulation = getEffectiveCurrentPopulation(colony);
    const freeHousing = summary.maxHousing - currentPopulation;
    if (freeHousing <= 0) {
      return 0;
    }

    const lifeStandardProduction = summary.productionDelta.get(1300) ?? 0;
    if (lifeStandardProduction === 0) {
      return 0;
    }

    const lifeStandardPercentage =
      lifeStandardProduction > currentPopulation || currentPopulation <= 0
        ? 100
        : Math.floor((lifeStandardProduction * 100) / currentPopulation);
    const bevGrowthRate =
      this.gameData.getColonyClass(colony.colonyClassId)?.bevGrowthRate ?? 100;

    let immigration = Math.ceil(
      (freeHousing / 3 / 100) * bevGrowthRate * (lifeStandardPercentage / 50),
    );

    if (currentPopulation + immigration > summary.maxHousing) {
      immigration = summary.maxHousing - currentPopulation;
    }

    const populationLimit = colony.stats?.populationLimit ?? 0;
    if (
      populationLimit > 0 &&
      currentPopulation + immigration > populationLimit
    ) {
      immigration = populationLimit - currentPopulation;
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
    this.syncDefenseStats(colony);
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

  private syncDefenseStats(colony: Colony): void {
    if (!colony.stats) return;
    this.colonyDefenseService.syncShieldCapacity(
      colony,
      this.getMaxShields(colony),
    );
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
          buildingName: definition.name,
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
            buildingName: this.gameData.getBuilding(victim.buildingId!)?.name,
            reason: 'Energie',
          });
          rewind = true;
        }
      }

      if (summary.workersUsed > getEffectiveCurrentPopulation(colony)) {
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
            buildingName: this.gameData.getBuilding(victim.buildingId!)?.name,
            reason: 'Arbeiter',
          });
          rewind = true;
        }
      }

      for (const [commodityId] of summary.depositConsumption) {
        const netDelta = summary.depositDelta.get(commodityId) ?? 0;
        if (netDelta >= 0) continue;
        const shortfall = Math.abs(netDelta);
        const mining = await this.ensureDepositMining(colony, commodityId);
        if (!mining || mining.amountLeft < shortfall) {
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
              buildingName: this.gameData.getBuilding(victim.buildingId!)?.name,
              commodityId,
              reason: `kein ${this.gameData.getCommodity(commodityId)?.name ?? 'Rohstoff'}`,
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
              buildingName: this.gameData.getBuilding(victim.buildingId!)?.name,
              commodityId,
              reason: `kein ${this.gameData.getCommodity(commodityId)?.name ?? 'Rohstoff'}`,
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
    await this.applyDepositConsumption(
      colony,
      summary.depositConsumption,
      summary.depositDelta,
    );

    if (summary.energyDelta !== 0) {
      colony.energy = Math.max(
        0,
        Math.min(
          colony.energy + summary.energyDelta,
          summary.effectiveState.energy.max,
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
        const actualStored = await this.colonyStorageService.upperStorage(
          colony,
          commodityId,
          storedAmount,
          summary.effectiveStorageMax,
        );
        currentStored += actualStored;
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

  private async ensureDepositMining(
    colony: Colony,
    commodityId: number,
  ): Promise<ColonyDepositMining | null> {
    const existing = await this.depositMiningRepo.findOne({
      where: { colonyId: colony.id, userId: colony.userId, commodityId },
    });
    if (existing) return existing;
    const deposits = this.gameData.getColonyClassDeposits(colony.colonyClassId);
    const def = deposits.find((d) => d.commodityId === commodityId);
    if (!def) return null;
    const mining = this.depositMiningRepo.create({
      userId: colony.userId,
      colonyId: colony.id,
      commodityId,
      amountLeft: def.maxAmount,
    });
    await this.depositMiningRepo.save(mining);
    return mining;
  }

  private async applyDepositConsumption(
    colony: Colony,
    depositConsumption: Map<number, number>,
    depositDelta: Map<number, number>,
  ): Promise<void> {
    for (const commodityId of depositConsumption.keys()) {
      const netDelta = depositDelta.get(commodityId) ?? 0;
      if (netDelta >= 0) continue;
      const mining = await this.ensureDepositMining(colony, commodityId);
      if (!mining) continue;
      mining.amountLeft = Math.max(0, mining.amountLeft + netDelta);
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
    const currentPopulation = getEffectiveCurrentPopulation(colony);
    const growth = this.calculatePopulationGrowth(colony, summary);
    if (growth <= 0) {
      if (colony.stats && colony.population !== currentPopulation) {
        colony.population = currentPopulation;
        await this.colonyRepo.save(colony);
      }
      return;
    }

    const nextPopulation = Math.min(
      currentPopulation + growth,
      summary.effectivePopulationMax,
    );
    const actualGrowth = nextPopulation - currentPopulation;

    if (actualGrowth > 0 && colony.stats) {
      colony.stats.workless += actualGrowth;
      await this.statsRepo.save(colony.stats);
    }
    colony.population = getEffectiveCurrentPopulation(colony);
    await this.colonyRepo.save(colony);
  }
}
