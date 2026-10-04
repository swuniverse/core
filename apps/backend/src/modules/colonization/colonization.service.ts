import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import {
  COLONIZATION_CLASS_GATE_RULES,
  COLONIZATION_LIMIT_RULES,
  COLONIZATION_MAX_LIMITS,
  type ColonizationLimitType,
  getClassGateRequiredTechPair,
  getColonizationClassGate,
  getColonizationLimitType,
  getFactionTechId,
} from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import { AsteroidResourceDeposit } from '../colony/entities/asteroid-resource-deposit.entity';
import {
  ColonySeedService,
  SWU_AURODIUM_DEPOSIT_MAX,
  SWU_AURODIUM_DEPOSIT_MIN,
} from '../colony/colony-seed.service';
import { ColonyEventService } from '../colony/colony-event.service';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from '../colony/entities/colony-event.entity';
import {
  CelestialObject,
  CelestialObjectType,
} from '../starmap/entities/celestial-object.entity';
import { Spacecraft, SpacecraftStatus } from '../spacecraft/entities/spacecraft.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import {
  findArchetypeBySwuClassId,
  getColonizationProposals,
  getSwuArchetypeAtmosphere,
  getSwuUndergroundMixin,
  getSwuZoneLetter,
  type SwuColonizationProposal,
} from '../starmap/generator/swu-archetype-registry';
import {
  computeSwuDayNightPhaseHours,
  computeSwuDayNightSwitchMinutes,
  computeSwuTerminatorShiftHours,
  resolveSwuInstance,
  type SwuRotationType,
  type SwuZoneSlot,
} from '../starmap/generator/swu-planet-archetypes.generator';
import {
  computeSwuOrbitDistance,
  solarOutputTJ,
} from '../starmap/generator/swu-solar';
import { GameDataService } from '../game-data/game-data.service';
import { classifyZoneOres, oreDisplayName, zoneDeuteriumSources, zoneOreSources, type SwuZoneOre } from './swu-zone-ores';
import {
  rateSwuSettlement,
  type SwuSettlementAssessment,
} from '../starmap/generator/swu-settlement-rating';

export interface SwuColonyEcosystemDto {
  archetype: string;
  rotation: SwuRotationType;
  primaryBiome: string | null;
  secondaryBiome: string | null;
  temperatureRangeK: [number, number] | null;
  solarOutputTJ: number | null;
  /** Besiedlungs-Bedingungen der gewaehlten Zone (Perfekt/Gut/Schwierig/Herausfordernd). */
  settlement: SwuSettlementAssessment | null;
  /**
   * Tag/Nacht-Wechsel-Intervall in Ingame-Minuten (Anzeige-Konvention: die UI
   * zeigt diesen Wert als "X Stunden", siehe computeSwuDayNightSwitchMinutes).
   * null bei gebundener Rotation (da gibt's keinen Wechsel, siehe tidalLocked).
   */
  dayNightSwitchMinutes: number | null;
  /** Nur gebundene Rotation: Dauer eines Terminator-Pendelzyklus (Stunden). */
  terminatorShiftHours: number | null;
  /** Gewaehlte Zone (1 Polar/Nacht, 2 Gemaessigt/Terminator, 3 Aequator/Tag) - fuer die Tag/Nacht-Darstellung der Felder. */
  zoneSlot: number;
  /** Startphase des Tag/Nacht- bzw. Terminator-Zyklus in Stunden, damit Koerper nicht synchron laufen. */
  dayNightPhaseHours: number;
  tidalLocked: boolean;
}
import { resolveSpacecraftLocation } from '../spacecraft/spacecraft-field';

export interface ColonizationLimitStatus {
  type: ColonizationLimitType;
  count: number;
  limit: number;
  max: number;
}

export interface ColonizationStatusDto {
  limits: Record<ColonizationLimitType, ColonizationLimitStatus>;
}

export interface StarterZoneStatusDto {
  layerId: number;
  layerName: string;
  isNoobzone: boolean;
  accountAgeAllowed: boolean;
  currentColoniesInLayer: number;
  maxColoniesInLayer: number;
}

export interface ColonizationTargetCheckDto {
  canColonize: boolean;
  reasons: string[];
  target: {
    id: number;
    objectType: CelestialObjectType;
    classId: number | null;
    systemId: number;
    posX: number;
    posY: number;
    limitType: ColonizationLimitType | null;
    classGate: string | null;
    starterZone?: StarterZoneStatusDto;
    reclaimed?: boolean;
  } | null;
  surface?: {
    width: number;
    fields: Array<{
      fieldIndex: number;
      fieldType: number;
      terrainTileId: number | null;
      layer: string | null;
      selectable: boolean;
    }>;
  } | null;
  /** Zonen-Vorschlaege (Cold/Mid/Hot) fuer SWU-Archetyp-Ziele - Alternative zum STU surface-Feld. */
  swu?: {
    archetype: string;
    rotation: SwuRotationType;
    tidalLocked: boolean;
    /** Siehe computeSwuDayNightSwitchMinutes - UI zeigt diesen Wert als "X Stunden". null bei gebundener Rotation. */
    dayNightSwitchMinutes: number | null;
    /** Nur gebundene Rotation: Dauer eines Terminator-Pendelzyklus (Stunden). */
    terminatorShiftHours: number | null;
    /** Erwartetes Aurodium-Vorkommen (Verbrauchsgut, beim Gruenden gewuerfelt, unabhaengig von der Zone). */
    aurodiumDeposit: { min: number; max: number };
    proposals: Array<
      SwuColonizationProposal & {
        ores: SwuZoneOre[];
        settlement: SwuSettlementAssessment | null;
      }
    >;
  } | null;
  status: ColonizationStatusDto;
  ship?: {
    id: number;
    shipClassId: number;
    isColonizer: boolean;
    colonizerTier: number | null;
    colonizationBuildingId: number | null;
  } | null;
}
const STARTER_NOOBZONE_MAX_ACCOUNT_AGE_MS = 12_960_000 * 1000;
const STARTER_NOOBZONE_MAX_COLONIES_PER_LAYER = 4;

@Injectable()
export class ColonizationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(CelestialObject)
    private readonly objectRepo: Repository<CelestialObject>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    @InjectRepository(CrewAssignment)
    private readonly crewAssignmentRepo: Repository<CrewAssignment>,
    private readonly unlockResolver: UnlockResolverService,
    private readonly colonySeedService: ColonySeedService,
    private readonly colonyEventService: ColonyEventService,
    private readonly gameData: GameDataService,
  ) {}

  async getColonizationStatus(userId: number): Promise<ColonizationStatusDto> {
    const user = await this.getUser(userId);
    const [planetLimit, moonLimit, asteroidLimit, counts] = await Promise.all([
      this.calculateLimit(userId, this.getFactionKey(user), 'planet'),
      this.calculateLimit(userId, this.getFactionKey(user), 'moon'),
      this.calculateLimit(userId, this.getFactionKey(user), 'asteroid'),
      this.getColonyCountsByType(userId),
    ]);

    return {
      limits: {
        planet: {
          type: 'planet',
          count: counts.planet,
          limit: planetLimit,
          max: COLONIZATION_MAX_LIMITS.planet,
        },
        moon: {
          type: 'moon',
          count: counts.moon,
          limit: moonLimit,
          max: COLONIZATION_MAX_LIMITS.moon,
        },
        asteroid: {
          type: 'asteroid',
          count: counts.asteroid,
          limit: asteroidLimit,
          max: COLONIZATION_MAX_LIMITS.asteroid,
        },
      },
    };
  }

  /**
   * Kolonietyp-Vorschlaege (Cold/Mid/Hot-Zone) fuer ein SWU-Ziel. Rotation ist
   * noch keine Objekt-Eigenschaft und wird vom Aufrufer angegeben.
   */
  async getSwuColonizationProposals(
    celestialObjectId: number,
    rotation: SwuRotationType = 'rotating',
  ): Promise<{ archetype: string; rotation: SwuRotationType; proposals: SwuColonizationProposal[] }> {
    const target = await this.objectRepo.findOneBy({ id: celestialObjectId });
    if (!target) throw new NotFoundException('Ziel nicht gefunden');
    const archetype =
      target.classId != null ? findArchetypeBySwuClassId(target.classId) : null;
    if (!archetype) {
      throw new BadRequestException('Ziel ist kein SWU-Planet');
    }
    return {
      archetype: archetype.typeName,
      rotation,
      proposals: getColonizationProposals(archetype, rotation),
    };
  }

  /** Besiedlungs-Bedingungen einer Zone aus Erzquellen, Bergbaufeldern, Atmosphaere und Solareintrag. */
  private assessSwuZone(
    archetype: NonNullable<ReturnType<typeof findArchetypeBySwuClassId>>,
    proposal: Pick<SwuColonizationProposal, 'miningFields' | 'solarOutputTJ' | 'colonizable'>,
    ores: SwuZoneOre[],
    isMoon: boolean,
  ): SwuSettlementAssessment | null {
    if (!proposal.miningFields || !proposal.colonizable) return null;
    return rateSwuSettlement({
      mining: proposal.miningFields,
      oreSources: zoneOreSources(ores),
      atmosphere: getSwuArchetypeAtmosphere(archetype),
      solarOutputTJ: proposal.solarOutputTJ,
      deuteriumSources: zoneDeuteriumSources(ores),
      isMoon,
    });
  }

  /**
   * Erzvorkommen einer Zone - gleiche Buchstaben-/Untergrund-Mixin-Logik wie
   * ColonyStatsService.getSwuBaseProduction, damit die Vorschau der spaeteren
   * Kolonie-Produktion entspricht.
   */
  private getSwuZoneOres(
    archetype: NonNullable<ReturnType<typeof findArchetypeBySwuClassId>>,
    zoneSlot: SwuZoneSlot,
    rotation: SwuRotationType,
    bodyFeature: Parameters<typeof getSwuZoneLetter>[3],
    isMoon: boolean,
    kyberMarkers = 0,
  ): SwuZoneOre[] {
    const amounts = new Map<number, number>();
    const addLetter = (letter: string | null, factor = 1) => {
      if (!letter) return;
      for (const entry of this.gameData.getSwuLetterResources(letter)) {
        const amount = Math.round((isMoon ? entry.moon : entry.planet) * factor);
        if (amount === 0) continue;
        amounts.set(entry.commodityId, (amounts.get(entry.commodityId) ?? 0) + amount);
      }
    };
    addLetter(getSwuZoneLetter(archetype, zoneSlot, rotation, bodyFeature));
    const mixin = getSwuUndergroundMixin(archetype);
    if (mixin) addLetter(mixin.letter, mixin.factor);
    // Kyber-Marker = eine zusaetzliche Quelle je Marker (wie in ColonyStatsService).
    if (kyberMarkers > 0) {
      amounts.set(1508, (amounts.get(1508) ?? 0) + kyberMarkers);
    }
    return classifyZoneOres(amounts, isMoon, (id) =>
      oreDisplayName(id, this.gameData.getCommodity(id)?.name),
    );
  }

  async explainTarget(
    userId: number,
    celestialObjectId: number,
    shipId?: number,
  ): Promise<ColonizationTargetCheckDto> {
    const user = await this.getUser(userId);
    const factionKey = this.getFactionKey(user);
    const status = await this.getColonizationStatus(userId);
    const reasons: string[] = [];
    const target = await this.objectRepo.findOne({
      where: { id: celestialObjectId },
      relations: ['starSystem', 'starSystem.layer'],
    });
    const ship = shipId
      ? await this.shipRepo.findOne({
          where: { id: shipId, userId },
          relations: ['location', 'location.systemField'],
        })
      : null;
    const shipClass = ship
      ? await this.shipClassRepo.findOneBy({ id: ship.shipClassId })
      : null;

    if (!target) {
      return {
        canColonize: false,
        reasons: ['Ziel nicht gefunden'],
        target: null,
        status,
        surface: null,
      };
    }

    const limitType = getColonizationLimitType(target.objectType);
    const swuArchetype =
      target.classId != null ? findArchetypeBySwuClassId(target.classId) : null;
    // SWU-Archetypen sind der STU-Klassen-Gate-Tabelle unbekannt (keine STU-
    // classId) - fuer sie gilt stattdessen nur archetype.landable (bereits in
    // target.isColonizable eingeflossen, siehe swu-system-generator.ts).
    const classGate = swuArchetype ? null : getColonizationClassGate(target.classId);

    if (!target.isColonizable) reasons.push('Ziel ist nicht kolonisierbar');
    if (!limitType) reasons.push('Unbekannter Zieltyp');
    if (!classGate && !swuArchetype)
      reasons.push('Kolonieklasse ist nicht freigeschaltet oder unbewohnbar');

    const existing = await this.colonyRepo.findOne({
      where: { celestialObjectId: target.id },
    });
    if (existing && !existing.isAbandoned) {
      reasons.push('Ziel ist bereits kolonisiert');
    }
    if (target.objectType === CelestialObjectType.ASTEROID) {
      const deposits = await this.objectRepo.manager
        .getRepository(AsteroidResourceDeposit)
        .find({
          where: { userId, celestialObjectId: target.id },
        });
      if (
        deposits.length > 0 &&
        deposits.every((deposit) => deposit.amountLeft <= 0)
      ) {
        reasons.push('Dieser Asteroid ist für dich erschöpft');
      }
    }

    if (limitType) {
      const limitStatus = status.limits[limitType];
      if (limitStatus.count >= limitStatus.limit) {
        reasons.push(
          `Kolonielimit für ${this.labelLimitType(limitType)} erreicht (${limitStatus.count}/${limitStatus.limit})`,
        );
      }
    }

    if (limitType && classGate) {
      const requiredTech = getClassGateRequiredTechPair(classGate, limitType);
      if (requiredTech) {
        const techId = getFactionTechId(requiredTech, factionKey);
        if (!(await this.unlockResolver.hasTech(userId, techId))) {
          const gateLabel =
            COLONIZATION_CLASS_GATE_RULES.find(
              (rule) => rule.gate === classGate,
            )?.label ?? classGate;
          reasons.push(`Forschung fehlt: ${gateLabel}`);
        }
      }
    }
    await this.collectStarterZoneReasons(user, target, reasons);

    if (shipId) {
      if (!ship) {
        reasons.push('Kolonieschiff nicht gefunden');
      } else if (!shipClass) {
        reasons.push('Schiffsklasse nicht gefunden');
      } else {
        this.collectShipReasons(reasons, ship, shipClass, target);
      }
    }

    const swuOrbitDistance = swuArchetype
      ? await this.computeSwuOrbitDistance(target)
      : null;

    return {
      canColonize: reasons.length === 0,
      reasons,
      target: {
        id: target.id,
        objectType: target.objectType,
        classId: target.classId,
        systemId: target.systemId,
        posX: target.posX,
        posY: target.posY,
        limitType,
        classGate,
        starterZone: await this.buildStarterZoneStatus(user, target),
        reclaimed: existing?.isAbandoned === true,
      },
      status,
      surface:
        existing?.isAbandoned || swuArchetype
          ? null
          : (() => {
              const surface = this.colonySeedService.generateSurfaceSnapshot(
                target.classId ?? 0,
                `colony-${userId}-${target.id}`,
                target.starSystem?.bonusFields ?? 2,
              );
              return {
                width: surface.width,
                fields: surface.fields.map((field) => ({
                  fieldIndex: field.fieldIndex,
                  fieldType: field.fieldType,
                  terrainTileId: field.terrainTileId ?? null,
                  layer: field.layer ?? null,
                  selectable:
                    field.layer === 'SURFACE' && field.fieldType !== 201,
                })),
              };
            })(),
      swu:
        swuArchetype && !existing?.isAbandoned
          ? (() => {
              const instance = resolveSwuInstance(target);
              const tidalLocked = instance.rotation === 'tidal-locked';
              return {
                archetype: swuArchetype.typeName,
                rotation: instance.rotation,
                tidalLocked,
                aurodiumDeposit: {
                  min: SWU_AURODIUM_DEPOSIT_MIN,
                  max: SWU_AURODIUM_DEPOSIT_MAX,
                },
                // Planeten-Eigenschaft, nicht zonenabhaengig - derselbe key wie in
                // getSwuColonyEcosystem, damit die Vorschau vor der Gruendung mit
                // dem Wert nach der Gruendung uebereinstimmt.
                dayNightSwitchMinutes: tidalLocked
                  ? null
                  : computeSwuDayNightSwitchMinutes(
                      swuArchetype,
                      `celestial-${target.id}`,
                      target.objectType === CelestialObjectType.MOON,
                    ),
                terminatorShiftHours: tidalLocked
                  ? computeSwuTerminatorShiftHours(`celestial-${target.id}`)
                  : null,
                // Gleicher seed wie createFollowUpSwuColony() spaeter verwendet -
                // die Vorschau zeigt exakt das, was beim Gruenden entsteht.
                proposals: getColonizationProposals(swuArchetype, instance.rotation, {
                  seed: `colony-${userId}-${target.id}`,
                  bodyFeature: instance.bodyFeature,
                  orbitDistance: swuOrbitDistance ?? undefined,
                  classify: (tile) =>
                    this.gameData.getCategoriesForTerrainTile(tile),
                }).map((proposal) => {
                  const ores = this.getSwuZoneOres(
                    swuArchetype,
                    proposal.zoneSlot,
                    instance.rotation,
                    instance.bodyFeature,
                    target.objectType === CelestialObjectType.MOON,
                    proposal.bonusMarkers.filter(
                      (marker) => marker.type === 'KYBER',
                    ).length,
                  );
                  return {
                    ...proposal,
                    ores,
                    settlement: this.assessSwuZone(
                      swuArchetype,
                      proposal,
                      ores,
                      target.objectType === CelestialObjectType.MOON,
                    ),
                  };
                }),
              };
            })()
          : null,
      ship: ship
        ? {
            id: ship.id,
            shipClassId: ship.shipClassId,
            isColonizer: shipClass?.isColonizer ?? false,
            colonizerTier: shipClass?.colonizerTier ?? null,
            colonizationBuildingId: shipClass?.colonizationBuildingId ?? null,
          }
        : undefined,
    };
  }

  async colonize(
    userId: number,
    shipId: number,
    celestialObjectId: number,
    initialFieldIndex?: number,
    swuZoneSlot?: SwuZoneSlot,
  ): Promise<{
    success: true;
    colonyId: number;
    colonyName: string;
    consumedShipId: number;
    transferredCrewCount: number;
  }> {
    const check = await this.explainTarget(userId, celestialObjectId, shipId);
    if (!check.canColonize) {
      throw new BadRequestException(check.reasons.join('; '));
    }
    const [user, ship, target] = await Promise.all([
      this.getUser(userId),
      this.shipRepo.findOne({ where: { id: shipId, userId } }),
      this.objectRepo.findOneBy({ id: celestialObjectId }),
    ]);
    if (!ship) throw new NotFoundException('Kolonieschiff nicht gefunden');
    if (!target) throw new NotFoundException('Ziel nicht gefunden');
    const shipClass = await this.shipClassRepo.findOneBy({
      id: ship.shipClassId,
    });
    if (!shipClass?.colonizationBuildingId) {
      throw new BadRequestException('Schiff kann keine Kolonie gründen');
    }
    const abandonedColony = await this.colonyRepo.findOne({
      where: { celestialObjectId, isAbandoned: true },
      relations: ['changeable'],
    });
    const swuArchetype =
      target.classId != null ? findArchetypeBySwuClassId(target.classId) : null;
    const swuInstance = swuArchetype ? resolveSwuInstance(target) : null;
    if (!abandonedColony) {
      if (swuArchetype) {
        if (swuZoneSlot == null) {
          throw new BadRequestException('Zone muss gewählt werden');
        }
        const proposal = getColonizationProposals(
          swuArchetype,
          swuInstance!.rotation,
        ).find((entry) => entry.zoneSlot === swuZoneSlot);
        if (!proposal || !proposal.colonizable) {
          throw new BadRequestException('Gewählte Zone ist nicht kolonisierbar');
        }
      } else {
        const surface = this.colonySeedService.generateSurfaceSnapshot(
          target.classId ?? 0,
          `colony-${userId}-${target.id}`,
          target.starSystem?.bonusFields ?? 2,
        );
        const field = surface.fields.find(
          (entry) => entry.fieldIndex === initialFieldIndex,
        );
        if (!field || field.layer !== 'SURFACE' || field.fieldType === 201) {
          throw new BadRequestException('Ungültiges Startfeld');
        }
      }
    }
    const colony = abandonedColony
      ? await this.reclaimAbandonedColony(abandonedColony, userId)
      : swuArchetype
        ? await this.colonySeedService.createFollowUpSwuColony({
            userId,
            username: user.username,
            celestialObjectId,
            buildingId: shipClass.colonizationBuildingId,
            archetype: swuArchetype,
            rotation: swuInstance!.rotation,
            bodyFeature: swuInstance!.bodyFeature,
            zoneSlot: swuZoneSlot!,
            // Aendert sich nach der Gruendung nie mehr (Zone/Rotation/Archetyp/
            // Orbit-Distanz sind fix) - einmalig berechnen und speichern, statt
            // bei jeder Tick-Berechnung erneut die Sternposition abzufragen.
            solarOutputTJ: solarOutputTJ(
              await this.computeSwuOrbitDistance(target),
              swuZoneSlot!,
              swuInstance!.rotation,
              swuArchetype.typeId,
              swuArchetype.variant,
            ),
          })
        : await this.colonySeedService.createFollowUpColony({
            userId,
            username: user.username,
            celestialObjectId,
            buildingId: shipClass.colonizationBuildingId,
            initialFieldIndex,
          });
    if (target.objectType === CelestialObjectType.ASTEROID) {
      await this.colonySeedService.ensureAsteroidDepositMining(userId, target);
    }

    const crewAssignments = await this.crewAssignmentRepo.find({
      where: { spacecraftId: ship.id, userId },
    });
    for (const assignment of crewAssignments) {
      assignment.spacecraftId = null;
      assignment.colonyId = colony.id;
    }
    if (crewAssignments.length)
      await this.crewAssignmentRepo.save(crewAssignments);
    await this.shipRepo.delete({ id: ship.id, userId });
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: abandonedColony
        ? ColonyEventType.COLONY_RECLAIMED
        : ColonyEventType.COLONY_FOUNDED,
      severity: ColonyEventSeverity.INFO,
      title: abandonedColony ? 'Kolonie übernommen' : 'Kolonie gegründet',
      message: abandonedColony
        ? `${colony.name} wurde übernommen. Das Kolonieschiff ${ship.name} wurde verbraucht.`
        : `${colony.name} wurde gegründet. Das Kolonieschiff ${ship.name} wurde verbraucht.`,
      payload: {
        celestialObjectId,
        consumedShipId: ship.id,
        shipClassId: ship.shipClassId,
        colonizerTier: shipClass.colonizerTier,
        initialBuildingId: abandonedColony
          ? null
          : shipClass.colonizationBuildingId,
        reclaimed: !!abandonedColony,
        ruinsPreserved: !!abandonedColony,
        transferredCrewCount: crewAssignments.length,
        initialFieldIndex: abandonedColony ? null : (initialFieldIndex ?? null),
        swuZoneSlot: abandonedColony ? null : (swuZoneSlot ?? null),
      },
    });

    return {
      success: true,
      colonyId: colony.id,
      colonyName: colony.name,
      consumedShipId: ship.id,
      transferredCrewCount: crewAssignments.length,
    };
  }

  private async reclaimAbandonedColony(
    colony: Colony,
    userId: number,
  ): Promise<Colony> {
    colony.userId = userId;
    colony.isAbandoned = false;
    colony.abandonedAt = null;
    colony.previousUserId = null;
    const changeable = colony.changeable;
    if (changeable) {
      changeable.energy = Math.max(0, colony.energy);
      changeable.immigrationEnabled = true;
      changeable.isBlockaded = false;
      changeable.shields = 0;
      changeable.shieldFrequency = null;
      changeable.torpedoTypeId = null;
      changeable.trainedCrew = 0;
      changeable.workless = Math.max(
        1,
        changeable.workers + changeable.workless,
      );
      changeable.workers = 0;
      await this.colonyRepo.manager.save(changeable);
    }
    return this.colonyRepo.save(colony);
  }

  private async calculateLimit(
    userId: number,
    factionKey: string | null,
    type: ColonizationLimitType,
  ): Promise<number> {
    let limit = 0;
    for (const rule of COLONIZATION_LIMIT_RULES.filter(
      (candidate) => candidate.type === type,
    )) {
      if (!rule.tech) {
        limit += 1;
        continue;
      }
      const techId = getFactionTechId(rule.tech, factionKey);
      if (await this.unlockResolver.hasTech(userId, techId)) limit += 1;
    }
    return Math.min(limit, COLONIZATION_MAX_LIMITS[type]);
  }

  private async getColonyCountsByType(
    userId: number,
  ): Promise<Record<ColonizationLimitType, number>> {
    const colonies = await this.colonyRepo.find({
      where: { userId, isAbandoned: false },
      relations: ['celestialObject'],
    });
    const counts: Record<ColonizationLimitType, number> = {
      planet: 0,
      moon: 0,
      asteroid: 0,
    };
    for (const colony of colonies) {
      const type = getColonizationLimitType(colony.celestialObject?.objectType);
      if (type) counts[type] += 1;
    }
    return counts;
  }

  /**
   * "Oekosystem"-Legende fuer eine bereits gegruendete SWU-Kolonie (Biom,
   * Temperatur, Tag/Nacht-Rhythmus, Solarertrag) - dieselben Werte, die der
   * Spieler schon bei der Zonenwahl im Kolonisierungsdialog sah, jetzt aus
   * der gespeicherten swuZoneSlot rekonstruiert. null fuer STU-Kolonien oder
   * Kolonien ohne gespeicherte Zonenwahl (vor dieser Migration gegruendet).
   */
  async getSwuColonyEcosystem(
    colonyId: number,
    userId: number,
  ): Promise<SwuColonyEcosystemDto | null> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId, userId },
      relations: ['celestialObject', 'celestialObject.starSystem'],
    });
    if (!colony) throw new NotFoundException('Kolonie nicht gefunden');
    if (colony.swuZoneSlot == null || !colony.celestialObject) return null;

    const archetype =
      colony.celestialObject.classId != null
        ? findArchetypeBySwuClassId(colony.celestialObject.classId)
        : null;
    if (!archetype) return null;

    const instance = resolveSwuInstance(colony.celestialObject);
    const orbitDistance = await this.computeSwuOrbitDistance(
      colony.celestialObject,
    );
    const proposals = getColonizationProposals(archetype, instance.rotation, {
      orbitDistance,
      // Gleicher seed wie bei der Gruendung - Bewertung entspricht der Vorschau.
      seed: `colony-${userId}-${colony.celestialObject.id}`,
      bodyFeature: instance.bodyFeature,
      classify: (tile) => this.gameData.getCategoriesForTerrainTile(tile),
    });
    const chosen = proposals.find((p) => p.zoneSlot === colony.swuZoneSlot);
    if (!chosen) return null;
    const settlement = this.assessSwuZone(
      archetype,
      chosen,
      this.getSwuZoneOres(
        archetype,
        chosen.zoneSlot,
        instance.rotation,
        instance.bodyFeature,
        colony.celestialObject.objectType === CelestialObjectType.MOON,
        chosen.bonusMarkers.filter((marker) => marker.type === 'KYBER').length,
      ),
      colony.celestialObject.objectType === CelestialObjectType.MOON,
    );

    const tidalLocked = instance.rotation === 'tidal-locked';
    const isMoon = colony.celestialObject.objectType === CelestialObjectType.MOON;
    const seedKey = `celestial-${colony.celestialObject.id}`;
    const dayNightSwitchMinutes = tidalLocked
      ? null
      : computeSwuDayNightSwitchMinutes(archetype, seedKey, isMoon);
    return {
      archetype: archetype.typeName,
      rotation: instance.rotation,
      primaryBiome: chosen.primaryBiome,
      secondaryBiome: chosen.secondaryBiome,
      temperatureRangeK: chosen.temperatureRangeK,
      solarOutputTJ: chosen.solarOutputTJ,
      settlement,
      dayNightSwitchMinutes,
      terminatorShiftHours: tidalLocked
        ? computeSwuTerminatorShiftHours(seedKey)
        : null,
      zoneSlot: colony.swuZoneSlot,
      dayNightPhaseHours: computeSwuDayNightPhaseHours(
        seedKey,
        dayNightSwitchMinutes ?? computeSwuTerminatorShiftHours(seedKey) / 2,
      ),
      tidalLocked,
    };
  }

  /**
   * Distanz zum Systemstern, normiert 0 (sonnennah) bis 1 (sonnenfern) relativ
   * zur maximal moeglichen Distanz innerhalb der Systemgrenzen (maxX/maxY) -
   * fuer swu-solar.ts. 0.5 (neutral) als Fallback, wenn kein Stern gefunden
   * wird oder Systemgroesse fehlt (sollte in der Praxis nicht vorkommen).
   */
  private async computeSwuOrbitDistance(
    target: CelestialObject,
  ): Promise<number> {
    if (!target.starSystem) return computeSwuOrbitDistance(target, null, null);
    const star = await this.objectRepo
      .createQueryBuilder('object')
      .where('object.systemId = :systemId', { systemId: target.systemId })
      .andWhere('object.classId BETWEEN 9001 AND 9005')
      .getOne();
    return computeSwuOrbitDistance(target, star, target.starSystem);
  }

  private collectShipReasons(
    reasons: string[],
    ship: Spacecraft,
    shipClass: ShipClassDef,
    target: CelestialObject,
  ): void {
    if (!shipClass.isColonizer) reasons.push('Schiff ist kein Kolonieschiff');
    if (!shipClass.colonizationBuildingId) {
      reasons.push('Kolonieschiff hat kein Startgebäude konfiguriert');
    }
    if (ship.status !== SpacecraftStatus.IDLE) {
      reasons.push('Kolonieschiff muss betriebsbereit sein');
    }
    const location = resolveSpacecraftLocation(ship);
    if (location?.scope !== 'SYSTEM') {
      reasons.push('Kolonieschiff muss im Sternsystem sein');
    } else if (location.systemId !== target.systemId) {
      reasons.push('Kolonieschiff ist nicht im Zielsystem');
    }
    if (
      location?.scope !== 'SYSTEM' ||
      location.x !== target.posX ||
      location.y !== target.posY
    ) {
      reasons.push('Kolonieschiff muss exakt auf dem Zielfeld stehen');
    }
  }

  private async getUser(userId: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['factionRef'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async collectStarterZoneReasons(
    user: User,
    target: CelestialObject,
    reasons: string[],
  ): Promise<void> {
    const starterZone = await this.buildStarterZoneStatus(user, target);
    if (!starterZone?.isNoobzone) {
      return;
    }

    if (!starterZone.accountAgeAllowed) {
      reasons.push(
        'Kolonisierung in der Noobzone nur für neue Accounts erlaubt',
      );
    }
    if (starterZone.currentColoniesInLayer >= starterZone.maxColoniesInLayer) {
      reasons.push(
        `Kolonielimit in dieser Noobzone erreicht (${starterZone.currentColoniesInLayer}/${starterZone.maxColoniesInLayer})`,
      );
    }
  }

  private async countUserColoniesInLayer(
    userId: number,
    layerId: number,
  ): Promise<number> {
    return this.colonyRepo
      .createQueryBuilder('colony')
      .innerJoin('colony.starSystem', 'starSystem')
      .where('colony.userId = :userId', { userId })
      .andWhere('colony.isAbandoned = false')
      .andWhere('starSystem.layerId = :layerId', { layerId })
      .getCount();
  }

  private async buildStarterZoneStatus(
    user: User,
    target: CelestialObject,
  ): Promise<StarterZoneStatusDto | undefined> {
    const layer = target.starSystem?.layer;
    if (!layer) {
      return undefined;
    }

    const accountAgeAllowed =
      Date.now() - user.createdAt.getTime() <=
      STARTER_NOOBZONE_MAX_ACCOUNT_AGE_MS;
    const currentColoniesInLayer = await this.countUserColoniesInLayer(
      user.id,
      layer.id,
    );

    return {
      layerId: layer.id,
      layerName: layer.name,
      isNoobzone: layer.isNoobzone,
      accountAgeAllowed,
      currentColoniesInLayer,
      maxColoniesInLayer: STARTER_NOOBZONE_MAX_COLONIES_PER_LAYER,
    };
  }

  private getFactionKey(user: User): string | null {
    return user.factionRef?.key ?? user.faction ?? null;
  }

  private labelLimitType(type: ColonizationLimitType): string {
    switch (type) {
      case 'planet':
        return 'Planeten';
      case 'moon':
        return 'Monde';
      case 'asteroid':
        return 'Asteroiden';
    }
  }
}
