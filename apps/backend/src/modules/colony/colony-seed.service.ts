import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colony } from './entities/colony.entity';
import { housingYieldFactor } from './colony-bonus-marker.util';
import { assertOwnedColony, OwnedColony } from './colony-owner.util';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { ColonyStats } from './entities/colony-stats.entity';
import { ColonyChangeable } from './entities/colony-changeable.entity';
import { ColonyDepositMining } from './entities/colony-deposit-mining.entity';
import { AsteroidResourceDeposit } from './entities/asteroid-resource-deposit.entity';
import {
  CelestialObject,
  CelestialObjectType,
} from '../starmap/entities/celestial-object.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { GameDataService } from '../game-data/game-data.service';
import {
  STU_DEFAULT_COLONY_CLASS_ID,
  stuColonySurfaceGenerator,
  type StuColonyFieldData,
} from './stu-colony-surface.generator';
import type { SwuBonusMarkerType } from '../starmap/generator/swu-bonus-markers';
import { foundSwuColony } from '../starmap/generator/swu-archetype-registry';
import {
  computeSwuOrbitDistance,
  solarOutputTJ,
} from '../starmap/generator/swu-solar';
import type {
  SwuPlanetArchetype,
  SwuRotationType,
  SwuBodyFeature,
  SwuZoneSlot,
} from '../starmap/generator/swu-planet-archetypes.generator';
const FIELD_TYPES = {
  PLAINS: 101,
};

/**
 * Gameplay-Feldtyp fuer SWU-Felder. Es gibt (noch) keine numerische
 * SWU-Code -> fieldType-Zuordnung, aber das ist inzwischen unproblematisch:
 * die Bebaubarkeits- und Terraforming-Pruefung laeuft fuer SWU-Felder
 * zusaetzlich ueber terrainTileId + die Feldkategorien aus
 * swu-field-build-categories.yaml (siehe GameDataService.getCategoriesForTerrainTile
 * und ColonyConstructionService.isBuildingAllowedOnField/terraformField).
 */
const SWU_PLACEHOLDER_FIELD_TYPE = 0;

/** Monde haben nur 6 Orbit-Spalten (Planeten 10). */
const SWU_MOON_ORBIT_WIDTH = 6;

/**
 * Aurodium (Latinum)-Vorkommen: jeder Planet/Mond bekommt eines (kein
 * Asteroid, siehe createInitialDepositMining), zufaellig 300-900, komplett
 * unabhaengig von Klasse/Archetyp/Biom. Reines Verbrauchsgut - kein
 * baseProduction-Eintrag, regeneriert also nicht.
 */
export const SWU_AURODIUM_DEPOSIT_COMMODITY_ID = 1523;
export const SWU_AURODIUM_DEPOSIT_MIN = 300;
export const SWU_AURODIUM_DEPOSIT_MAX = 900;

/** Inklusive Zufallszahl zwischen min und max. */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type SwuColonyFieldSeed = {
  fieldIndex: number;
  fieldType: number;
  terrainTileId: string;
  layer: 'ORBIT' | 'SURFACE' | 'UNDERGROUND';
  bonusMarker?: SwuBonusMarkerType | null;
};

const STU_STARTER_BUILDINGS_BY_FACTION_ID: Record<number, number> = {
  1: 82010100, // Föderation -> später Rebel
  2: 82010300, // Klingonen -> später Imperial
};

const STARTING_COMMODITIES = [
  { commodityId: 2, amount: 180 }, // Baumaterial
  { commodityId: 4, amount: 50 }, // Transparistahl
  { commodityId: 5, amount: 50 }, // Deuterium
  { commodityId: 21, amount: 50 }, // Durastahl
];

const FOLLOW_UP_STARTING_COMMODITIES = [
  { commodityId: 2, amount: 150 },
  { commodityId: 4, amount: 75 },
  { commodityId: 5, amount: 50 },
  { commodityId: 21, amount: 75 },
];

export interface CreateFollowUpSwuColonyOptions {
  userId: number;
  username: string;
  celestialObjectId: number;
  buildingId: number;
  archetype: SwuPlanetArchetype;
  rotation: SwuRotationType;
  bodyFeature: SwuBodyFeature;
  zoneSlot: SwuZoneSlot;
  resources?: Array<{ commodityId: number; amount: number }>;
  /** Kolonie-Name; Default "<username>'s Kolonie". */
  name?: string;
  /** Solarertrag in TJ (siehe swu-solar.ts) - vom Aufrufer berechnet, der die Sternposition kennt. */
  solarOutputTJ?: number | null;
}

export interface CreateFollowUpColonyOptions {
  userId: number;
  username: string;
  celestialObjectId: number;
  buildingId: number;
  resources?: Array<{ commodityId: number; amount: number }>;
  name?: string;
  initialFieldIndex?: number;
  systemFieldId?: number | null;
}

@Injectable()
export class ColonySeedService {
  private readonly logger = new Logger(ColonySeedService.name);

  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
    @InjectRepository(ColonyStats)
    private readonly statsRepo: Repository<ColonyStats>,
    @InjectRepository(ColonyChangeable)
    private readonly changeableRepo: Repository<ColonyChangeable>,
    @InjectRepository(ColonyDepositMining)
    private readonly depositMiningRepo: Repository<ColonyDepositMining>,
    @InjectRepository(CelestialObject)
    private readonly objectRepo: Repository<CelestialObject>,
    @InjectRepository(SystemField)
    private readonly systemFieldRepo: Repository<SystemField>,
    private readonly gameData: GameDataService,
  ) {}

  async createStarterColony(
    userId: number,
    username: string,
    preferredCelestialObjectId?: number,
    factionId?: number | null,
  ): Promise<Colony> {
    const starterTargets = await this.findStarterTargets();
    const planet = preferredCelestialObjectId
      ? (starterTargets.find(
          (target) => target.id === preferredCelestialObjectId,
        ) ?? null)
      : (starterTargets[0] ?? null);

    if (!planet) {
      throw new BadRequestException('Starterplanet ist nicht verfügbar');
    }
    const systemField = await this.systemFieldRepo.findOneBy({
      starSystemId: planet.systemId,
      sx: planet.posX,
      sy: planet.posY,
    });
    const surface = this.generateSurfaceSnapshot(
      planet.classId || STU_DEFAULT_COLONY_CLASS_ID,
      `starter-${userId}-${planet.id}`,
      planet.starSystem?.bonusFields ?? 2,
    );
    const colony = this.colonyRepo.create({
      name: `${username}'s Homeworld`,
      userId,
      starSystemId: planet.systemId,
      systemFieldId: systemField?.id ?? null,
      celestialObjectId: planet.id,
      posX: planet.posX,
      posY: planet.posY,
      colonyClassId: planet.classId || STU_DEFAULT_COLONY_CLASS_ID,
      surfaceMask: surface.mask,
      surfaceWidth: surface.width,
      rotationFactor: surface.rotationFactor,
      energy: 150,
      energyMax: 150,
      population: 20,
      populationMax: 100,
      storageUsed: 0,
      storageMax: 3000,
    });
    await this.colonyRepo.save(colony);

    await this.generateFields(colony, { factionId, fields: surface.fields });
    await this.createInitialStats(colony);
    await this.createInitialChangeable(colony);
    assertOwnedColony(colony);
    await this.createInitialDepositMining(colony, planet);
    await this.grantStartingResources(colony, STARTING_COMMODITIES);

    this.logger.log(
      `Starter colony created for user ${username} (id: ${colony.id})`,
    );
    return colony;
  }

  async createFollowUpColony(
    options: CreateFollowUpColonyOptions,
  ): Promise<Colony> {
    const object = await this.objectRepo.findOne({
      where: { id: options.celestialObjectId, isColonizable: true },
      relations: ['starSystem'],
    });
    const classId = object?.classId || STU_DEFAULT_COLONY_CLASS_ID;
    const systemField = object
      ? await this.systemFieldRepo.findOneBy({
          starSystemId: object.systemId,
          sx: object.posX,
          sy: object.posY,
        })
      : null;
    const surface = this.generateSurfaceSnapshot(
      classId,
      `colony-${options.userId}-${options.celestialObjectId}`,
      object?.starSystem?.bonusFields ?? 2,
    );

    const colony = this.colonyRepo.create({
      name: options.name?.trim() || `${options.username}'s Kolonie`,
      userId: options.userId,
      starSystemId: object?.systemId || null,
      systemFieldId: options.systemFieldId ?? systemField?.id ?? null,
      celestialObjectId: object?.id || null,
      posX: object?.posX || 10,
      posY: object?.posY || 10,
      colonyClassId: classId,
      surfaceMask: surface.mask,
      surfaceWidth: surface.width,
      rotationFactor: surface.rotationFactor,
      energy: 50,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageUsed: 0,
      storageMax: 1500,
    });
    await this.colonyRepo.save(colony);

    await this.generateFields(colony, {
      initialBuildingId: options.buildingId,
      initialFieldIndex: options.initialFieldIndex,
      fields: surface.fields,
    });
    await this.createInitialStats(colony);
    await this.createInitialChangeable(colony);
    assertOwnedColony(colony);
    await this.createInitialDepositMining(colony, object);
    await this.grantStartingResources(
      colony,
      options.resources ?? FOLLOW_UP_STARTING_COMMODITIES,
    );

    this.logger.log(
      `Follow-up colony created for user ${options.username} (id: ${colony.id})`,
    );
    return colony;
  }

  /**
   * Gruendet eine Kolonie auf einem SWU-Archetyp-Planeten (siehe
   * starmap/generator/swu-archetype-registry.ts) in der vom Spieler gewaehlten
   * Zone. Analog zu createFollowUpColony, aber mit den echten SWU-Feldcodes
   * statt der STU-Oberflaechen-Generierung. Bebaubarkeit laeuft fuer diese
   * Felder ueber terrainTileId + Feldkategorien, siehe SWU_PLACEHOLDER_FIELD_TYPE.
   */
  async createFollowUpSwuColony(
    options: CreateFollowUpSwuColonyOptions,
  ): Promise<Colony> {
    const object = await this.objectRepo.findOne({
      where: { id: options.celestialObjectId, isColonizable: true },
      relations: ['starSystem'],
    });
    const classId = object?.classId ?? 0;
    const founded = foundSwuColony(
      options.archetype,
      options.rotation,
      options.bodyFeature,
      options.zoneSlot,
      `colony-${options.userId}-${options.celestialObjectId}`,
      (tile) => this.gameData.getCategoriesForTerrainTile(tile),
    );
    // Monde haben niemals einen Untergrund.
    const isMoon = object?.objectType === CelestialObjectType.MOON;
    const orbit = isMoon
      ? {
          upper: founded.orbit.upper.slice(0, SWU_MOON_ORBIT_WIDTH),
          lower: founded.orbit.lower.slice(0, SWU_MOON_ORBIT_WIDTH),
        }
      : founded.orbit;
    const fields = this.flattenSwuFoundedColony({ ...founded, orbit }, !isMoon);
    const surfaceWidth = founded.surface[0]?.length ?? 10;
    const mask = Buffer.from(
      JSON.stringify(
        fields.map((field) => ({
          fieldIndex: field.fieldIndex,
          fieldType: field.fieldType,
          terrainTileId: field.terrainTileId,
          layer: field.layer,
        })),
      ),
    ).toString('base64');

    const colony = this.colonyRepo.create({
      name: options.name ?? `${options.username}'s Kolonie`,
      userId: options.userId,
      starSystemId: object?.systemId || null,
      celestialObjectId: object?.id || null,
      posX: object?.posX || 10,
      posY: object?.posY || 10,
      colonyClassId: classId,
      swuZoneSlot: options.zoneSlot,
      solarOutputTJ: options.solarOutputTJ ?? null,
      surfaceMask: mask,
      surfaceWidth,
      rotationFactor: 1,
      energy: 50,
      energyMax: 100,
      population: 10,
      populationMax: 100,
      storageUsed: 0,
      storageMax: 1500,
    });
    await this.colonyRepo.save(colony);

    await this.generateSwuFields(colony, {
      buildingId: options.buildingId,
      fields,
    });
    await this.createInitialStats(colony);
    await this.createInitialChangeable(colony);
    assertOwnedColony(colony);
    await this.createInitialDepositMining(colony, object);
    await this.grantStartingResources(
      colony,
      options.resources ?? FOLLOW_UP_STARTING_COMMODITIES,
    );

    this.logger.log(
      `SWU follow-up colony created for user ${options.username} (id: ${colony.id}, archetype: ${options.archetype.typeName}, zone: ${options.zoneSlot})`,
    );
    return colony;
  }

  /**
   * Starterkolonie (Onboarding) auf einem SWU-Archetyp-Planeten in der
   * gewaehlten Zone - Startgebaeude der Fraktion, Starter-Rohstoffe.
   */
  async createStarterSwuColony(options: {
    userId: number;
    username: string;
    celestialObjectId: number;
    factionId?: number | null;
    archetype: SwuPlanetArchetype;
    rotation: SwuRotationType;
    bodyFeature: SwuBodyFeature;
    zoneSlot: SwuZoneSlot;
  }): Promise<Colony> {
    const object = await this.objectRepo.findOne({
      where: { id: options.celestialObjectId },
      relations: ['starSystem'],
    });
    const star = object
      ? await this.objectRepo
          .createQueryBuilder('object')
          .where('object.systemId = :systemId', { systemId: object.systemId })
          .andWhere('object.classId BETWEEN 9001 AND 9005')
          .getOne()
      : null;
    const orbitDistance = object
      ? computeSwuOrbitDistance(object, star, object.starSystem)
      : 0.5;
    return this.createFollowUpSwuColony({
      userId: options.userId,
      username: options.username,
      celestialObjectId: options.celestialObjectId,
      buildingId:
        STU_STARTER_BUILDINGS_BY_FACTION_ID[options.factionId ?? 1] ??
        STU_STARTER_BUILDINGS_BY_FACTION_ID[1],
      archetype: options.archetype,
      rotation: options.rotation,
      bodyFeature: options.bodyFeature,
      zoneSlot: options.zoneSlot,
      name: `${options.username}'s Homeworld`,
      resources: STARTING_COMMODITIES,
      solarOutputTJ: solarOutputTJ(
        orbitDistance,
        options.zoneSlot,
        options.rotation,
        options.archetype.typeId,
        options.archetype.variant,
      ),
    });
  }

  private flattenSwuFoundedColony(founded: {
    surface: string[][];
    untergrund: string[][];
    orbit: { lower: string[]; upper: string[] };
    bonusMarkers?: Array<{
      type: SwuBonusMarkerType;
      layer: 'SURFACE' | 'UNDERGROUND';
      x: number;
      y: number;
    }>;
  }, hasUnderground = true): SwuColonyFieldSeed[] {
    const markerAt = (
      layer: SwuColonyFieldSeed['layer'],
      x: number,
      y: number,
    ): SwuBonusMarkerType | null =>
      founded.bonusMarkers?.find(
        (marker) => marker.layer === layer && marker.x === x && marker.y === y,
      )?.type ?? null;
    const flattenGrid = (
      grid: string[][],
      layer: SwuColonyFieldSeed['layer'],
      startIndex: number,
    ): SwuColonyFieldSeed[] => {
      const seeds: SwuColonyFieldSeed[] = [];
      let index = startIndex;
      grid.forEach((row, y) => {
        row.forEach((code, x) => {
          seeds.push({
            fieldIndex: index,
            fieldType: SWU_PLACEHOLDER_FIELD_TYPE,
            terrainTileId: code,
            layer,
            bonusMarker: markerAt(layer, x, y),
          });
          index += 1;
        });
      });
      return seeds;
    };

    const fields: SwuColonyFieldSeed[] = [];
    fields.push(
      ...flattenGrid([founded.orbit.upper, founded.orbit.lower], 'ORBIT', 0),
    );
    fields.push(
      ...flattenGrid(founded.surface, 'SURFACE', fields.length),
    );
    if (hasUnderground) {
      fields.push(
        ...flattenGrid(founded.untergrund, 'UNDERGROUND', fields.length),
      );
    }
    return fields;
  }

  private async generateSwuFields(
    colony: Colony,
    options: { buildingId: number; fields: SwuColonyFieldSeed[] },
  ): Promise<void> {
    const fields = options.fields.map((field) =>
      this.fieldRepo.create({
        colonyId: colony.id,
        fieldIndex: field.fieldIndex,
        fieldType: field.fieldType,
        terrainTileId: field.terrainTileId,
        layer: field.layer,
        bonusMarker: field.bonusMarker ?? null,
        buildingId: null,
        isBuilding: false,
      }),
    );

    // Das Startgebaeude ersetzt das Terrain NICHT - das Feld behaelt seinen Code.
    const hqField = this.findSwuHeadquartersField(fields);
    hqField.buildingId = options.buildingId;
    hqField.buildProgress = 100;
    hqField.isActive = true;

    await this.fieldRepo.save(fields);
  }

  /**
   * SWU-Pendant zu findHeadquartersField: dessen fieldType<800-Heuristik
   * passt nicht (alle SWU-Felder haben aktuell denselben Platzhalter-
   * fieldType, egal welcher Layer) - hier zaehlt `layer` und die Feldkategorie.
   * Aussenposten/Kommandozentrale duerfen auf jedes "standard"-Feld; gewaehlt
   * wird das der Kartenmitte naechste. Ohne "standard"-Feld faellt die Wahl auf
   * das mittlere SURFACE-Feld zurueck.
   */
  private findSwuHeadquartersField(
    fields: ColonyField[],
    surfaceWidth = 10,
  ): ColonyField {
    const surfaceFields = fields.filter((field) => field.layer === 'SURFACE');
    const standardFields = surfaceFields.filter(
      (field) =>
        field.terrainTileId != null &&
        this.gameData
          .getCategoriesForTerrainTile(field.terrainTileId)
          .includes('standard'),
    );
    const candidates = standardFields.length > 0 ? standardFields : surfaceFields;
    if (candidates.length === 0) return fields[0];

    const rows = Math.max(1, Math.ceil(surfaceFields.length / surfaceWidth));
    const centerX = (surfaceWidth - 1) / 2;
    const centerY = (rows - 1) / 2;
    const distance = (field: ColonyField) => {
      const position = surfaceFields.indexOf(field);
      return Math.hypot(
        (position % surfaceWidth) - centerX,
        Math.floor(position / surfaceWidth) - centerY,
      );
    };
    return candidates.reduce((best, field) =>
      distance(field) < distance(best) ? field : best,
    );
  }

  private async findStarterTargets(): Promise<CelestialObject[]> {
    return this.objectRepo
      .createQueryBuilder('obj')
      .leftJoin(
        Colony,
        'colony',
        'colony.celestialObjectId = obj.id AND colony.isAbandoned = false',
      )
      .where('obj.isColonizable = true')
      .andWhere('obj.objectType = :objectType', {
        objectType: CelestialObjectType.PLANET,
      })
      .andWhere('obj.classId IS NOT NULL')
      .andWhere('colony.id IS NULL')
      .orderBy('obj.id', 'ASC')
      .getMany();
  }

  generateSurfaceSnapshot(
    classId: number,
    seed: string,
    bonusFields: number,
  ): {
    mask: string;
    width: number;
    rotationFactor: number;
    fields: StuColonyFieldData[];
  } {
    const generated = stuColonySurfaceGenerator.generate(
      classId,
      seed,
      bonusFields,
    );
    const mask = Buffer.from(
      JSON.stringify(
        generated.fields.map((field) => ({
          fieldIndex: field.fieldIndex,
          fieldType: field.fieldType,
          terrainTileId: field.terrainTileId,
          layer: field.layer,
        })),
      ),
    ).toString('base64');
    return {
      mask,
      width: generated.width,
      rotationFactor: 1,
      fields: generated.fields,
    };
  }

  private async generateFields(
    colony: Colony,
    options: {
      factionId?: number | null;
      initialBuildingId?: number;
      initialFieldIndex?: number;
      fields: StuColonyFieldData[];
    },
  ): Promise<void> {
    const fields = options.fields.map((field) =>
      this.fieldRepo.create({
        colonyId: colony.id,
        fieldIndex: field.fieldIndex,
        fieldType: field.fieldType,
        terrainTileId:
          field.terrainTileId != null ? String(field.terrainTileId) : null,
        layer: field.layer,
        buildingId: null,
        isBuilding: false,
      }),
    );

    const hqField =
      fields.find((field) => field.fieldIndex === options.initialFieldIndex) ??
      this.findHeadquartersField(fields);
    hqField.fieldType = FIELD_TYPES.PLAINS;
    hqField.terrainTileId = String(FIELD_TYPES.PLAINS);
    hqField.layer = 'SURFACE';
    hqField.buildingId =
      options.initialBuildingId ??
      STU_STARTER_BUILDINGS_BY_FACTION_ID[options.factionId ?? 1] ??
      STU_STARTER_BUILDINGS_BY_FACTION_ID[1];
    hqField.buildProgress = 100;
    hqField.isActive = true;

    await this.fieldRepo.save(fields);
  }

  private async createInitialStats(colony: Colony): Promise<void> {
    const activeFields = await this.fieldRepo.find({
      where: { colonyId: colony.id, isBuilding: false, isActive: true },
    });
    const activeHousing = activeFields.reduce((sum, field) => {
      const building = field.buildingId
        ? this.gameData.getBuilding(field.buildingId)
        : undefined;
      return sum + (building?.bevPro ?? 0) * housingYieldFactor(field, this.gameData);
    }, 0);

    await this.statsRepo.save(
      this.statsRepo.create({
        colonyId: colony.id,
        workers: 0,
        workless: colony.population,
        maxPopulation: activeHousing || colony.populationMax,
        populationLimit: 0,
        immigrationEnabled: true,
        colonyMessage: null,
        maxEnergy: colony.energyMax,
        maxStorage: colony.storageMax,
        shields: null,
        maxShields: 0,
        shieldFrequency: null,
        torpedoTypeId: null,
        trainedCrew: 0,
        isBlockaded: false,
      }),
    );
  }

  private async createInitialChangeable(colony: Colony): Promise<void> {
    const activeFields = await this.fieldRepo.find({
      where: { colonyId: colony.id, isBuilding: false, isActive: true },
    });
    const activeHousing = activeFields.reduce((sum, field) => {
      const building = field.buildingId
        ? this.gameData.getBuilding(field.buildingId)
        : undefined;
      return sum + (building?.bevPro ?? 0) * housingYieldFactor(field, this.gameData);
    }, 0);

    await this.changeableRepo.save(
      this.changeableRepo.create({
        colonyId: colony.id,
        workers: 0,
        workless: colony.population,
        maxPopulation: activeHousing || colony.populationMax,
        populationLimit: 0,
        immigrationEnabled: true,
        energy: colony.energy,
        maxEnergy: colony.energyMax,
        maxStorage: colony.storageMax,
        shields: 0,
        maxShields: 0,
        shieldFrequency: null,
        torpedoTypeId: null,
        colonyMessage: null,
        isBlockaded: false,
        trainedCrew: 0,
      }),
    );
  }

  async ensureAsteroidDepositMining(
    userId: number,
    celestialObject: CelestialObject,
  ): Promise<void> {
    if (celestialObject.objectType !== CelestialObjectType.ASTEROID) return;
    const asteroidDepositRepo = this.objectRepo.manager.getRepository(
      AsteroidResourceDeposit,
    );
    const existing = await asteroidDepositRepo.count({
      where: { userId, celestialObjectId: celestialObject.id },
    });
    if (existing > 0) return;
    const deposits = this.gameData.getColonyClassDeposits(
      celestialObject.classId ?? 0,
    );
    if (deposits.length === 0) return;
    await asteroidDepositRepo.save(
      deposits.map((deposit) =>
        asteroidDepositRepo.create({
          userId,
          celestialObjectId: celestialObject.id,
          commodityId: deposit.commodityId,
          amountLeft: deposit.maxAmount,
        }),
      ),
    );
  }

  private async createInitialDepositMining(
    colony: OwnedColony,
    celestialObject?: CelestialObject | null,
  ): Promise<void> {
    if (celestialObject?.objectType === CelestialObjectType.ASTEROID) {
      await this.ensureAsteroidDepositMining(colony.userId, celestialObject);
      return;
    }
    const deposits = this.gameData.getColonyClassDeposits(colony.colonyClassId);
    const rows = deposits.map((deposit) =>
      this.depositMiningRepo.create({
        userId: colony.userId,
        colonyId: colony.id,
        commodityId: deposit.commodityId,
        amountLeft: deposit.maxAmount,
      }),
    );
    // Aurodium-Vorkommen: jeder Planet/Mond bekommt eines, unabhaengig von
    // Klasse/Archetyp/Biom (Auftraggeber-Vorgabe: "kein Biom/Planet bevorzugt"),
    // mit zufaelliger Streuung 300-900 - ein reines Verbrauchsgut ohne
    // Regeneration (kein baseProduction-Eintrag, siehe SWU_AURODIUM_...-Konstanten).
    rows.push(
      this.depositMiningRepo.create({
        userId: colony.userId,
        colonyId: colony.id,
        commodityId: SWU_AURODIUM_DEPOSIT_COMMODITY_ID,
        amountLeft: randomInt(
          SWU_AURODIUM_DEPOSIT_MIN,
          SWU_AURODIUM_DEPOSIT_MAX,
        ),
      }),
    );
    await this.depositMiningRepo.save(rows);
  }

  private async grantStartingResources(
    colony: Colony,
    resources: Array<{ commodityId: number; amount: number }>,
  ): Promise<void> {
    const storage = resources.map((c) =>
      this.storageRepo.create({
        colonyId: colony.id,
        commodityId: c.commodityId,
        amount: c.amount,
      }),
    );
    await this.storageRepo.save(storage);
  }

  private findHeadquartersField(fields: ColonyField[]): ColonyField {
    const surfaceFields = fields.filter((field) => field.fieldType < 800);
    const center = Math.floor(surfaceFields.length / 2);
    return (
      surfaceFields
        .slice()
        .sort(
          (a, b) =>
            Math.abs(a.fieldIndex - surfaceFields[center].fieldIndex) -
            Math.abs(b.fieldIndex - surfaceFields[center].fieldIndex),
        )
        .find((field) => field.fieldType !== 201) ??
      surfaceFields[center] ??
      fields[0]
    );
  }
}
