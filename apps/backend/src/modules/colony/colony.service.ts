import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Research, ResearchStatus } from '../research/entities/research.entity';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { ColonyStats } from './entities/colony-stats.entity';
import { ColonyShipBuildQueue } from './entities/colony-ship-build-queue.entity';
import { ColonyShipBuildplan } from './entities/colony-ship-buildplan.entity';
import {
  ColonyFabricationQueue,
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
import { GameDataService, HangarShipDef } from '../game-data/game-data.service';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { ColonyStatsService } from './colony-stats.service';
import { ColonyEconomyService } from './colony-economy.service';
import { ColonyStorageService } from './colony-storage.service';
import { ColonyCrewService } from './colony-crew.service';
import { ColonyDefenseService } from './colony-defense.service';
import { ColonyEventService } from './colony-event.service';
import { SpacecraftTorpedoService } from '../spacecraft/spacecraft-torpedo.service';
import { ColonyOwnershipService } from './colony-ownership.service';
import { ColonyAbandonmentService } from './colony-abandonment.service';
import { ColonySettingsService } from './colony-settings.service';
import { ColonyFabricationService } from './colony-fabrication.service';
import { ColonyOrbitService } from './colony-orbit.service';
import { ColonyProjectionService } from './colony-projection.service';
import { ColonyShipyardService } from './colony-shipyard.service';
import { ColonyConstructionService } from './colony-construction.service';
import { ColonyTickProcessorService } from './colony-tick-processor.service';
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
  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyStorage)
    readonly storageRepo: Repository<ColonyStorage>,
    @InjectRepository(ColonyStats)
    private readonly statsRepo: Repository<ColonyStats>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(CargoItem)
    private readonly cargoRepo: Repository<CargoItem>,
    @InjectRepository(Research)
    private readonly researchRepo: Repository<Research>,
    @InjectRepository(SpacecraftModule)
    private readonly spacecraftModuleRepo: Repository<SpacecraftModule>,
    @InjectRepository(ColonyCrewTrainingQueue)
    private readonly crewTrainingQueueRepo: Repository<ColonyCrewTrainingQueue>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    private readonly gameData: GameDataService,
    private readonly unlockResolver: UnlockResolverService,
    private readonly colonyStatsService: ColonyStatsService,
    private readonly colonyEconomyService: ColonyEconomyService,
    private readonly colonyStorageService: ColonyStorageService,
    private readonly spacecraftStatsService: SpacecraftStatsService,
    private readonly colonyCrewService: ColonyCrewService,
    private readonly colonyDefenseService: ColonyDefenseService,
    private readonly colonyEventService: ColonyEventService,
    private readonly spacecraftTorpedoService: SpacecraftTorpedoService,
    private readonly colonyOwnershipService: ColonyOwnershipService,
    private readonly colonyAbandonmentService: ColonyAbandonmentService,
    private readonly colonySettingsService: ColonySettingsService,
    private readonly colonyFabricationService: ColonyFabricationService,
    private readonly colonyOrbitService: ColonyOrbitService,
    private readonly colonyProjectionService: ColonyProjectionService,
    private readonly colonyShipyardService: ColonyShipyardService,
    private readonly colonyConstructionService: ColonyConstructionService,
    private readonly colonyTickProcessorService: ColonyTickProcessorService,
  ) {}

  giveUpColony(colonyId: number, userId: number, confirmation: string) {
    return this.colonyAbandonmentService.giveUpColony(
      colonyId,
      userId,
      confirmation,
    );
  }

  async getEvents(
    colonyId: number,
    userId: number,
    limit = 50,
    unreadOnly = false,
  ) {
    await this.colonyOwnershipService.findOwnedColony(colonyId, userId);
    return this.colonyEventService.listForColony(colonyId, userId, {
      limit,
      unreadOnly,
    });
  }

  async markEventRead(colonyId: number, userId: number, eventId: number) {
    await this.colonyOwnershipService.findOwnedColony(colonyId, userId);
    return this.colonyEventService.markRead(colonyId, userId, eventId);
  }

  async markAllEventsRead(colonyId: number, userId: number) {
    await this.colonyOwnershipService.findOwnedColony(colonyId, userId);
    return this.colonyEventService.markAllRead(colonyId, userId);
  }

  async activateBuildings(
    colonyId: number,
    userId: number,
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number } = {},
  ) {
    return this.colonyConstructionService.activateBuildings(
      colonyId,
      userId,
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
    return this.colonyConstructionService.deactivateBuildings(
      colonyId,
      userId,
      mode,
      options,
    );
  }

  async getAvailableBuildings(userId: number, fieldType?: number) {
    return this.colonyConstructionService.getAvailableBuildings(
      userId,
      fieldType,
    );
  }

  async getAvailableTerraforming(userId: number) {
    const completedTechIds =
      await this.unlockResolver.getCompletedTechIds(userId);
    return this.gameData
      .getAllTerraforming()
      .filter(
        (option) =>
          option.researchId == null || completedTechIds.has(option.researchId),
      );
  }

  async findAllByUser(userId: number) {
    const colonies = await this.colonyRepo.find({
      where: { userId, isAbandoned: false },
      relations: ['starSystem', 'celestialObject', 'fields', 'stats'],
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

      const base = this.colonyProjectionService.toColonySummary(colony);
      delete (base as any).fields;
      (base as any).population = summary.effectiveState.population.current;
      (base as any).populationMax = summary.effectivePopulationMax;
      (base as any).energyMax = summary.effectiveState.energy.max;
      (base as any).storageMax = summary.effectiveStorageMax;
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
    const colony = await this.colonyOwnershipService.findOwnedColony(
      colonyId,
      userId,
    );
    return this.colonyProjectionService.toColonyDetail(colony, userId);
  }

  async getCurrentObjective(userId: number) {
    const colonies = await this.colonyRepo.find({
      where: { userId, isAbandoned: false },
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
    return this.colonySettingsService.rename(colonyId, userId, name);
  }

  async setPopulationLimit(
    colonyId: number,
    userId: number,
    limit: number,
  ): Promise<{ populationLimit: number }> {
    return this.colonySettingsService.setPopulationLimit(
      colonyId,
      userId,
      limit,
    );
  }

  async setImmigration(
    colonyId: number,
    userId: number,
    enabled: boolean,
  ): Promise<{ immigrationEnabled: boolean }> {
    return this.colonySettingsService.setImmigration(colonyId, userId, enabled);
  }

  async setColonyMessage(
    colonyId: number,
    userId: number,
    message: string | null,
  ): Promise<{ colonyMessage: string | null }> {
    return this.colonySettingsService.setColonyMessage(
      colonyId,
      userId,
      message,
    );
  }

  async discardStorage(
    colonyId: number,
    userId: number,
    items: Array<{ commodityId: number; amount: number }>,
  ): Promise<{
    discarded: Array<{ commodityId: number; amount: number; name: string }>;
  }> {
    return this.colonySettingsService.discardStorage(colonyId, userId, items);
  }

  async build(
    colonyId: number,
    userId: number,
    fieldIndex: number,
    buildingId: number,
  ): Promise<ColonyField> {
    return this.colonyConstructionService.build(
      colonyId,
      userId,
      fieldIndex,
      buildingId,
    );
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

    await Promise.all(
      costMap
        .filter(([, required]) => required > 0)
        .map(([commodityId, required]) =>
          this.colonyStorageService.lowerStorage(colony, commodityId, required),
        ),
    );
  }

  async demolish(
    colonyId: number,
    userId: number,
    fieldIndex: number,
  ): Promise<ColonyField> {
    return this.colonyConstructionService.demolish(
      colonyId,
      userId,
      fieldIndex,
    );
  }

  async repairBuilding(
    colonyId: number,
    userId: number,
    fieldIndex: number,
  ): Promise<ColonyField> {
    return this.colonyConstructionService.repairBuilding(
      colonyId,
      userId,
      fieldIndex,
    );
  }

  async getBuildingRepairPreview(
    colonyId: number,
    userId: number,
    fieldIndexes?: number[],
  ) {
    return this.colonyConstructionService.getBuildingRepairPreview(
      colonyId,
      userId,
      fieldIndexes,
    );
  }

  async repairDamagedBuildings(
    colonyId: number,
    userId: number,
    fieldIndexes?: number[],
  ) {
    return this.colonyConstructionService.repairDamagedBuildings(
      colonyId,
      userId,
      fieldIndexes,
    );
  }

  async terraformField(
    colonyId: number,
    userId: number,
    fieldIndex: number,
    terraformingId: number,
  ): Promise<ColonyField> {
    return this.colonyConstructionService.terraformField(
      colonyId,
      userId,
      fieldIndex,
      terraformingId,
    );
  }

  async upgradeBuilding(
    colonyId: number,
    userId: number,
    fieldIndex: number,
    upgradeId: number,
  ): Promise<ColonyField> {
    return this.colonyConstructionService.upgradeBuilding(
      colonyId,
      userId,
      fieldIndex,
      upgradeId,
    );
  }

  async toggleBuilding(
    colonyId: number,
    userId: number,
    fieldIndex: number,
  ): Promise<ColonyField> {
    return this.colonyConstructionService.toggleBuilding(
      colonyId,
      userId,
      fieldIndex,
    );
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

  private hasActiveAirfield(colony: Colony): boolean {
    return this.hasActiveBuildingFunction(colony, this.airfieldFunctionId);
  }

  private getHangarDefForShipClass(
    shipClass: ShipClassDef,
  ): HangarShipDef | undefined {
    return this.gameData.getHangarShipDef(shipClass.key);
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
    return this.colonyFabricationService.queueFabrication(
      colonyId,
      userId,
      queueType,
      itemKey,
      amount,
      buildingFunctionId,
    );
  }

  async cancelFabricationQueue(
    colonyId: number,
    userId: number,
    queueId: number,
  ): Promise<ColonyFabricationQueue> {
    return this.colonyFabricationService.cancelFabricationQueue(
      colonyId,
      userId,
      queueId,
    );
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

    await Promise.all(
      cargo.map(async (item) => {
        await this.colonyStorageService.upperStorage(
          colony,
          item.commodityId,
          item.amount,
          maxStorage,
        );
        item.amount = 0;
        return this.cargoRepo.save(item);
      }),
    );
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
    await Promise.all(
      cargo.map(async (item) => {
        const stored = await this.colonyStorageService.upperStorage(
          colony,
          item.commodityId,
          item.amount,
          maxStorage,
        );
        item.amount = Math.max(0, item.amount - stored);
        return this.cargoRepo.save(item);
      }),
    );
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

  async setOrbitAssignment(
    colonyId: number,
    userId: number,
    shipId: number,
    mode: ColonyOrbitAssignmentMode,
  ): Promise<ColonyOrbitAssignment> {
    return this.colonyOrbitService.setOrbitAssignment(
      colonyId,
      userId,
      shipId,
      mode,
    );
  }

  async clearOrbitAssignment(
    colonyId: number,
    userId: number,
    shipId: number,
  ): Promise<{ cleared: boolean }> {
    return this.colonyOrbitService.clearOrbitAssignment(
      colonyId,
      userId,
      shipId,
    );
  }

  async transferShuttles(
    colonyId: number,
    userId: number,
    shipId: number,
    items: Array<{ commodityId: number; amount: number }>,
  ): Promise<Colony> {
    await this.colonyOrbitService.transferShuttles(
      colonyId,
      userId,
      shipId,
      items,
    );
    return this.findOne(colonyId, userId);
  }

  async queueShipRepair(
    colonyId: number,
    userId: number,
    shipId: number,
  ): Promise<ColonyShipBuildQueue> {
    return this.colonyShipyardService.queueShipRepair(colonyId, userId, shipId);
  }

  async queueShipRetrofit(
    colonyId: number,
    userId: number,
    shipId: number,
    moduleCommodityIds: number[] = [],
    buildPlanName?: string,
  ): Promise<ColonyShipBuildQueue> {
    return this.colonyShipyardService.queueShipRetrofit(
      colonyId,
      userId,
      shipId,
      moduleCommodityIds,
      buildPlanName,
    );
  }

  async cancelShipBuildQueue(
    colonyId: number,
    userId: number,
    queueId: number,
  ): Promise<ColonyShipBuildQueue> {
    return this.colonyShipyardService.cancelShipBuildQueue(
      colonyId,
      userId,
      queueId,
    );
  }

  async cancelShipyardQueue(
    colonyId: number,
    userId: number,
    queueId: number,
  ): Promise<ColonyShipBuildQueue> {
    return this.colonyShipyardService.cancelShipyardQueue(
      colonyId,
      userId,
      queueId,
    );
  }

  async reactivateShipyardQueue(
    colonyId: number,
    userId: number,
    queueId: number,
  ): Promise<ColonyShipBuildQueue> {
    return this.colonyShipyardService.reactivateShipyardQueue(
      colonyId,
      userId,
      queueId,
    );
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
    return this.colonyShipyardService.buildShip(
      colonyId,
      userId,
      shipClassId,
      name,
      moduleTypes,
      buildPlanName,
      moduleCommodityIds,
      sourceBuildplan,
    );
  }

  async createShipBuildplan(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name: string,
    moduleCommodityIds: number[] = [],
    moduleTypes: string[] = [],
  ) {
    return this.colonyShipyardService.createShipBuildplan(
      colonyId,
      userId,
      shipClassId,
      name,
      moduleCommodityIds,
      moduleTypes,
    );
  }

  async renameShipBuildplan(
    colonyId: number,
    userId: number,
    planId: number,
    name: string,
  ) {
    return this.colonyShipyardService.renameShipBuildplan(
      colonyId,
      userId,
      planId,
      name,
    );
  }

  async deleteShipBuildplan(colonyId: number, userId: number, planId: number) {
    return this.colonyShipyardService.deleteShipBuildplan(
      colonyId,
      userId,
      planId,
    );
  }

  async buildShipFromBuildplan(
    colonyId: number,
    userId: number,
    planId: number,
    name: string,
  ): Promise<ColonyShipBuildQueue> {
    return this.colonyShipyardService.buildShipFromBuildplan(
      colonyId,
      userId,
      planId,
      name,
    );
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

  calculatePopulationGrowth(colony: Colony, summary: unknown): number {
    return (
      this.colonyTickProcessorService as unknown as {
        calculatePopulationGrowth: (colony: Colony, summary: unknown) => number;
      }
    ).calculatePopulationGrowth(colony, summary);
  }

  async growPopulation(colony: Colony): Promise<void> {
    return (
      this.colonyTickProcessorService as unknown as {
        growPopulation: (colony: Colony) => Promise<void>;
      }
    ).growPopulation(colony);
  }

  async balanceAndProduce(
    colony: Colony,
    events: ColonyTickEvent[] = [],
  ): Promise<void> {
    return (
      this.colonyTickProcessorService as unknown as {
        balanceAndProduce: (
          colony: Colony,
          events?: ColonyTickEvent[],
        ) => Promise<void>;
      }
    ).balanceAndProduce(colony, events);
  }

  async processCrewTrainingQueue(colony: Colony): Promise<void> {
    return (
      this.colonyTickProcessorService as unknown as {
        processCrewTrainingQueue: (colony: Colony) => Promise<void>;
      }
    ).processCrewTrainingQueue(colony);
  }

  async processFabricationQueue(colony: Colony): Promise<void> {
    return this.colonyFabricationService.processFabricationQueue(colony);
  }

  async processShipBuildQueue(colony: Colony): Promise<void> {
    return this.colonyShipyardService.processShipBuildQueue(colony);
  }

  async processTick(colony: Colony): Promise<ColonyTickResult> {
    return this.colonyTickProcessorService.processTick(colony);
  }

  async checkBuildingCompletions(
    colony: Colony,
    events: ColonyTickEvent[] = [],
  ): Promise<void> {
    return this.colonyTickProcessorService.checkBuildingCompletions(
      colony,
      events,
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
}
