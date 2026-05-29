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
import {
  AlertState,
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { GameDataService, BuildingCosts } from '../game-data/game-data.service';
import { UnlockResolverService } from '../research/unlock-resolver.service';

@Injectable()
export class ColonyService {
  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    @InjectRepository(ColonyStorage)
    readonly storageRepo: Repository<ColonyStorage>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(Research)
    private readonly researchRepo: Repository<Research>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    private readonly gameData: GameDataService,
    private readonly unlockResolver: UnlockResolverService,
  ) {}

  async getAvailableBuildings(userId: number, fieldType?: number) {
    const buildings = fieldType
      ? this.gameData.getBuildingsForFieldType(fieldType)
      : this.gameData.getAllBuildings();
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
      relations: ['fields', 'storage', 'starSystem', 'celestialObject'],
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
      colony.fields?.some(
        (field) => field.buildingId === 11 && !field.isBuilding,
      ),
    );
    const hasShipyardInProgress = colonies.some((colony) =>
      colony.fields?.some(
        (field) => field.buildingId === 11 && field.isBuilding,
      ),
    );
    const shipCount = await this.shipRepo.count({ where: { userId } });

    if (!completedTechIds.has(220101)) {
      return {
        key: 'RESEARCH_AQUAFARM',
        label: 'Aquafarm erforschen',
        description:
          activeResearch?.techId === 220101
            ? 'Forschung laeuft. Fehlt Baumaterial, pausiert der Fortschritt automatisch.'
            : 'Erweitere deine Nahrungsproduktion auf Wasserfelder. Kostet Baumaterial pro Tick.',
        href: '/research?focus=220101',
        completed: false,
        colonyId: primaryColony.id,
      };
    }

    if (!completedTechIds.has(230101)) {
      return {
        key: 'RESEARCH_WATER_POWER',
        label: 'Wasserenergieanlage erforschen',
        description:
          activeResearch?.techId === 230101
            ? 'Forschung laeuft. Fehlt Baumaterial, pausiert der Fortschritt automatisch.'
            : 'Schalte eine fruehe Energieoption fuer Wasserfelder frei.',
        href: '/research?focus=230101',
        completed: false,
        colonyId: primaryColony.id,
      };
    }

    if (!completedTechIds.has(254001)) {
      return {
        key: 'RESEARCH_BASIC_CHEMISTRY',
        label: 'Grundstoffchemie erforschen',
        description:
          activeResearch?.techId === 254001
            ? 'Forschung laeuft. Fehlt Baumaterial, pausiert der Fortschritt automatisch.'
            : 'Schalte chemische Komponenten als naechsten Industriezweig frei.',
        href: '/research?focus=254001',
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
        if (tech.id === 1001 || tech.id === 1002) return false;
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

    if (buildingDef.researchRequired) {
      const unlocked = await this.unlockResolver.isBuildingUnlocked(
        userId,
        buildingId,
      );
      if (!unlocked) {
        throw new BadRequestException(
          `Research required: ${buildingDef.researchRequired}`,
        );
      }
    }

    if (buildingDef.isUnique) {
      const existing = colony.fields.find(
        (f) => f.buildingId === buildingId && !f.isBuilding,
      );
      if (existing) {
        throw new BadRequestException('This building is unique per colony');
      }
    }

    await this.deductBuildCosts(
      colony,
      buildingDef.costs,
      buildingDef.resourceCosts,
    );

    const buildTimeMs = buildingDef.costs.buildTime * 1000;
    field.buildingId = buildingId;
    field.isBuilding = true;
    field.buildProgress = 0;
    field.buildFinishesAt = new Date(Date.now() + buildTimeMs);

    return this.fieldRepo.save(field);
  }

  private async deductBuildCosts(
    colony: Colony,
    costs: BuildingCosts,
    resourceCosts?: Array<{ commodityId: number; amount: number }>,
  ): Promise<void> {
    const costMap: [number, number][] = resourceCosts?.length
      ? resourceCosts.map((cost) => [cost.commodityId, cost.amount])
      : [
          [1, costs.credits || 0],
          [2, costs.durastahl || 0],
          [3, costs.tibannaGas || 0],
          [4, costs.kyberKristalle || 0],
          [5, costs.beskar || 0],
          [6, costs.kristallinesSilizium || 0],
          [7, costs.energiemodule || 0],
        ];

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
      const storage = await this.storageRepo.findOne({
        where: { colonyId: colony.id, commodityId },
      });
      storage!.amount -= required;
      await this.storageRepo.save(storage!);
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
    if (field.buildingId === 1) {
      throw new BadRequestException('Cannot demolish headquarters');
    }
    if (field.isBuilding) {
      throw new BadRequestException(
        'Cannot demolish a building under construction',
      );
    }

    field.buildingId = null;
    field.buildProgress = 0;
    field.buildFinishesAt = null;
    return this.fieldRepo.save(field);
  }

  async buildShip(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name: string,
  ): Promise<Spacecraft> {
    const colony = await this.findOne(colonyId, userId);

    const hasShipyard = colony.fields.some(
      (f) => f.buildingId === 11 && !f.isBuilding,
    );
    if (!hasShipyard) {
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

    const costs = this.calculateShipBuildCosts(shipClass);
    await this.deductBuildCosts(colony, {
      ...costs,
      buildTime: shipClass.buildTimeTicks,
    });

    const ship = this.shipRepo.create({
      name: name?.trim() || shipClass.name,
      shipClassId,
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

    return this.shipRepo.save(ship);
  }

  private calculateShipBuildCosts(shipClass: ShipClassDef): BuildingCosts {
    return {
      credits: Math.max(100, Math.round(shipClass.hullBase * 4)),
      durastahl: Math.max(50, Math.round(shipClass.hullBase * 1.5)),
      tibannaGas: Math.max(20, Math.round(shipClass.shieldBase * 0.5)),
      kyberKristalle: Math.max(0, Math.round(shipClass.epsBase * 0.1)),
      beskar: 0,
      kristallinesSilizium: Math.max(
        20,
        Math.round(shipClass.cargoCapacity * 0.25),
      ),
      energiemodule: Math.max(20, Math.round(shipClass.epsBase * 0.4)),
      buildTime: shipClass.buildTimeTicks,
    };
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
    const completedBuildings = fields.filter(
      (field) => field.buildingId && !field.isBuilding,
    );
    const productionDelta = new Map<number, number>();
    let energyDelta = 0;
    let researchPoints = 1;

    for (const field of completedBuildings) {
      const definition = this.gameData.getBuilding(field.buildingId!);
      if (!definition) continue;
      energyDelta += definition.bonuses.energy || 0;
      researchPoints += definition.researchPoints || 0;
      for (const output of definition.production) {
        productionDelta.set(
          output.commodityId,
          (productionDelta.get(output.commodityId) || 0) + output.amount,
        );
      }
    }

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
    const shipyardUnlocked = await this.unlockResolver.isBuildingUnlocked(
      userId,
      11,
    );
    const hasCompletedShipyard = fields.some(
      (field) => field.buildingId === 11 && !field.isBuilding,
    );
    const hasShipyardInProgress = fields.some(
      (field) => field.buildingId === 11 && field.isBuilding,
    );

    return Object.assign(this.toColonySummary(colony), {
      fieldCount: fields.length,
      storageItemCount: storage.length,
      detailV2: {
        energy: {
          current: colony.energy,
          max: colony.energyMax,
          delta: energyDelta,
        },
        storage: {
          current: colony.storageUsed,
          max: colony.storageMax,
          delta: Array.from(productionDelta.values()).reduce(
            (sum, value) => sum + value,
            0,
          ),
        },
        population: {
          current: colony.population,
          max: colony.populationMax,
          growth: this.calculatePopulationGrowth(fields),
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
        effects: this.buildEffectSummary(fields),
        orbitShips: orbitShips.map((ship) => ({
          id: ship.id,
          name: ship.name,
          shipClassId: ship.shipClassId,
          hull: ship.hull,
          hullMax: ship.hullMax,
          shields: ship.shields,
          shieldsMax: ship.shieldsMax,
          energy: ship.energy,
          energyMax: ship.energyMax,
          status: ship.status,
        })),
        research: {
          pointsPerTick: researchPoints,
        },
        shipyard: {
          unlocked: shipyardUnlocked,
          completed: hasCompletedShipyard,
          inProgress: hasShipyardInProgress,
          buildingId: 11,
          buildingName: this.gameData.getBuilding(11)?.name ?? 'Werfthub',
        },
      },
    });
  }

  private calculatePopulationGrowth(fields: ColonyField[]): number {
    return fields.reduce((growth, field) => {
      if (!field.buildingId || field.isBuilding) return growth;
      const definition = this.gameData.getBuilding(field.buildingId);
      return growth + (definition?.bonuses.population || 0);
    }, 1);
  }

  private buildEffectSummary(fields: ColonyField[]) {
    const effects: Array<{ label: string; value: number; source: string }> = [];
    let researchPoints = 1;
    for (const field of fields) {
      if (!field.buildingId || field.isBuilding) continue;
      const definition = this.gameData.getBuilding(field.buildingId);
      if (!definition) continue;
      if (definition.bonuses.energy !== 0) {
        effects.push({
          label: 'Energie',
          value: definition.bonuses.energy,
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
        researchPoints += definition.researchPoints;
        effects.push({
          label: 'Forschungspunkte',
          value: definition.researchPoints,
          source: definition.name,
        });
      }
    }
    effects.unshift({
      label: 'Basis-Forschung',
      value: researchPoints > 0 ? 1 : 0,
      source: 'Kolonie',
    });
    return effects;
  }

  async processTick(colony: Colony): Promise<void> {
    await this.checkBuildingCompletions(colony);
    await this.produceResources(colony);
    await this.growPopulation(colony);
  }

  async checkBuildingCompletions(colony: Colony): Promise<void> {
    const now = new Date();
    for (const field of colony.fields) {
      if (
        field.isBuilding &&
        field.buildFinishesAt &&
        field.buildFinishesAt <= now
      ) {
        field.isBuilding = false;
        field.buildProgress = 100;
        field.buildFinishesAt = null;
        await this.fieldRepo.save(field);
      }
    }
  }

  private async produceResources(colony: Colony): Promise<void> {
    const completedBuildings = colony.fields.filter(
      (f) => f.buildingId && !f.isBuilding,
    );

    const production = new Map<number, number>();
    let energyDelta = 0;

    for (const field of completedBuildings) {
      const def = this.gameData.getBuilding(field.buildingId!);
      if (!def) continue;

      for (const out of def.production) {
        production.set(
          out.commodityId,
          (production.get(out.commodityId) || 0) + out.amount,
        );
      }

      if (def.bonuses.energy) {
        energyDelta += def.bonuses.energy;
      }
    }

    if (energyDelta !== 0) {
      colony.energy = Math.max(
        0,
        Math.min(colony.energy + energyDelta, colony.energyMax),
      );
    }

    if (production.size > 0) {
      for (const [commodityId, amount] of production) {
        const commodity = this.gameData.getCommodity(commodityId);
        if (commodity?.isTradeOnly) {
          continue;
        }

        let storage = await this.storageRepo.findOne({
          where: { colonyId: colony.id, commodityId },
        });
        if (amount < 0 && (!storage || storage.amount + amount < 0)) {
          continue;
        }
        if (storage) {
          storage.amount += amount;
        } else if (amount > 0) {
          storage = this.storageRepo.create({
            colonyId: colony.id,
            commodityId,
            amount,
          });
        }
        if (storage) {
          await this.storageRepo.save(storage);
        }
      }

      const totalStored = await this.storageRepo
        .createQueryBuilder('s')
        .select('SUM(s.amount)', 'total')
        .where('s.colonyId = :id', { id: colony.id })
        .getRawOne();
      colony.storageUsed = Number(totalStored?.total || 0);
    }

    if (energyDelta !== 0 || production.size > 0) {
      await this.colonyRepo.save(colony);
    }
  }

  private async growPopulation(colony: Colony): Promise<void> {
    const completedBuildings = colony.fields.filter(
      (f) => f.buildingId && !f.isBuilding,
    );

    let growth = 1;
    for (const field of completedBuildings) {
      const def = this.gameData.getBuilding(field.buildingId!);
      if (def?.bonuses.population) {
        growth += def.bonuses.population;
      }
    }

    if (colony.population < colony.populationMax) {
      colony.population = Math.min(
        colony.population + growth,
        colony.populationMax,
      );
      await this.colonyRepo.save(colony);
    }
  }
}
