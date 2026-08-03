import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  COLONIZATION_CLASS_GATE_RULES,
  COLONIZATION_LIMIT_RULES,
  COLONIZATION_MAX_LIMITS,
  STU_STARTER_PLANET_CLASS_IDS,
  type ColonizationLimitType,
  getClassGateRequiredTechPair,
  getColonizationClassGate,
  getColonizationLimitType,
  getFactionTechId,
} from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import { ColonySeedService } from '../colony/colony-seed.service';
import { ColonyEventService } from '../colony/colony-event.service';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from '../colony/entities/colony-event.entity';
import {
  CelestialObject,
  CelestialObjectType,
} from '../starmap/entities/celestial-object.entity';
import {
  FactionZone,
  GalaxyField,
} from '../starmap/entities/galaxy-field.entity';
import {
  AlertState,
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { Research, ResearchStatus } from '../research/entities/research.entity';
import { UnlockResolverService } from '../research/unlock-resolver.service';

export interface StarterColonizationOptionsDto {
  mode: 'required' | 'not-required';
  reservedStarterColonyId: number | null;
  starterShipId: number | null;
  targets: Array<{
    id: number;
    systemId: number;
    posX: number;
    posY: number;
    classId: number | null;
    name: string | null;
  }>;
}
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
export interface StarterColonizationRequestDto {
  celestialObjectId: number;
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
    @InjectRepository(Research)
    private readonly researchRepo: Repository<Research>,
    private readonly unlockResolver: UnlockResolverService,
    private readonly colonySeedService: ColonySeedService,
    private readonly colonyEventService: ColonyEventService,
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

  async getStarterColonizationOptions(
    userId: number,
  ): Promise<StarterColonizationOptionsDto> {
    const user = await this.getUser(userId);
    const activeColony = await this.colonyRepo.findOne({
      where: { userId, isAbandoned: false },
      select: ['id'],
    });

    if (activeColony) {
      await this.ensureBaseResearchCompleted(user.id, user.factionId);
      if (!user.onboardingCompleted) {
        user.onboardingCompleted = true;
        await this.userRepo.save(user);
      }
      return {
        mode: 'not-required',
        reservedStarterColonyId: user.starterColonyId,
        starterShipId: user.starterShipId,
        targets: [],
      };
    }

    if (user.onboardingCompleted) {
      await this.ensureBaseResearchCompleted(user.id, user.factionId);
      return {
        mode: 'not-required',
        reservedStarterColonyId: user.starterColonyId,
        starterShipId: user.starterShipId,
        targets: [],
      };
    }

    const targets = await this.findStarterTargetsForUser(user);
    return {
      mode: 'required',
      reservedStarterColonyId: user.starterColonyId,
      starterShipId: user.starterShipId,
      targets: targets.map((target) => ({
        id: target.id,
        systemId: target.systemId,
        posX: target.posX,
        posY: target.posY,
        classId: target.classId,
        name: target.name,
      })),
    };
  }

  async createStarterColonizationShip(
    userId: number,
  ): Promise<{ success: true; shipId: number }> {
    const user = await this.getUser(userId);
    await this.assertStarterFlowOpen(user);

    if (user.starterShipId) {
      const existingShip = await this.shipRepo.findOne({
        where: { id: user.starterShipId, userId },
        select: ['id'],
      });
      if (existingShip) {
        return { success: true, shipId: existingShip.id };
      }
    }

    const shipClass = user.factionId
      ? await this.shipClassRepo.findOne({
          where: {
            starterAllowed: true,
            factionId: user.factionId,
            isColonizer: true,
          },
          order: { id: 'ASC' },
        })
      : null;
    if (!shipClass) {
      throw new BadRequestException(
        'Keine Starter-Kolonisierungsklasse konfiguriert',
      );
    }

    const ship = await this.shipRepo.save(
      this.shipRepo.create({
        name: `${user.username} Starterkolonieschiff`,
        shipClassId: shipClass.id,
        userId,
        starSystemId: null,
        currentLayerId: null,
        celestialObjectId: null,
        inSystem: false,
        currentSystemFieldX: null,
        currentSystemFieldY: null,
        posX: 0,
        posY: 0,
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
        epsMax: shipClass.epsBase,
        reactorOutput: 0,
        warpdriveMax: shipClass.warpBase,
        evadeChance: 0,
        fleetId: null,
      }),
    );

    user.starterShipId = ship.id;
    await this.userRepo.save(user);

    return { success: true, shipId: ship.id };
  }

  async foundStarterColony(
    userId: number,
    celestialObjectId: number,
  ): Promise<{ success: true; colonyId: number }> {
    const user = await this.getUser(userId);
    await this.assertStarterFlowOpen(user);

    const starterTargets = await this.findStarterTargetsForUser(user);
    const isAllowedTarget = starterTargets.some(
      (target) => target.id === celestialObjectId,
    );
    if (!isAllowedTarget) {
      throw new BadRequestException('Starterplanet ist nicht verfügbar');
    }

    const colony = await this.colonySeedService.createStarterColony(
      user.id,
      user.username,
      celestialObjectId,
      user.factionId,
    );
    user.starterColonyId = colony.id;
    user.onboardingCompleted = true;
    await this.userRepo.save(user);
    await this.ensureBaseResearchCompleted(user.id, user.factionId);

    return { success: true, colonyId: colony.id };
  }

  private async ensureBaseResearchCompleted(
    userId: number,
    factionId: number | null,
  ): Promise<void> {
    const baseResearchId = factionId === 2 ? 1003 : 1001;
    const existing = await this.researchRepo.findOne({
      where: { userId, techId: baseResearchId },
    });
    if (existing) {
      existing.status = ResearchStatus.COMPLETED;
      existing.progress = 0;
      existing.remainingPoints = 0;
      existing.spentPoints = 0;
      existing.blockedReason = null;
      await this.researchRepo.save(existing);
      return;
    }

    await this.researchRepo.save({
      userId,
      techId: baseResearchId,
      status: ResearchStatus.COMPLETED,
      progress: 0,
      remainingPoints: 0,
      spentPoints: 0,
      sourceCommodityId: 1701,
      blockedReason: null,
    });
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
      ? await this.shipRepo.findOne({ where: { id: shipId, userId } })
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
      };
    }

    const limitType = getColonizationLimitType(target.objectType);
    const classGate = getColonizationClassGate(target.classId);

    if (!target.isColonizable) reasons.push('Ziel ist nicht kolonisierbar');
    if (!limitType) reasons.push('Unbekannter Zieltyp');
    if (!classGate)
      reasons.push('Kolonieklasse ist nicht freigeschaltet oder unbewohnbar');

    const existing = await this.colonyRepo.findOne({
      where: { celestialObjectId: target.id },
    });
    if (existing && !existing.isAbandoned) {
      reasons.push('Ziel ist bereits kolonisiert');
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
      },
      status,
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
  ): Promise<{ success: true; colonyId: number; consumedShipId: number }> {
    const check = await this.explainTarget(userId, celestialObjectId, shipId);
    if (!check.canColonize) {
      throw new BadRequestException(check.reasons.join('; '));
    }

    const [user, ship] = await Promise.all([
      this.getUser(userId),
      this.shipRepo.findOne({ where: { id: shipId, userId } }),
    ]);
    if (!ship) throw new NotFoundException('Kolonieschiff nicht gefunden');
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
    const colony = abandonedColony
      ? await this.reclaimAbandonedColony(abandonedColony, userId)
      : await this.colonySeedService.createFollowUpColony({
          userId,
          username: user.username,
          celestialObjectId,
          buildingId: shipClass.colonizationBuildingId,
        });

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
        initialBuildingId: shipClass.colonizationBuildingId,
        reclaimed: !!abandonedColony,
      },
    });

    return { success: true, colonyId: colony.id, consumedShipId: ship.id };
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
    if (ship.status !== SpacecraftStatus.DOCKED) {
      reasons.push('Kolonieschiff muss betriebsbereit sein');
    }
    if (!ship.inSystem) reasons.push('Kolonieschiff muss im Sternsystem sein');
    if (ship.starSystemId !== target.systemId) {
      reasons.push('Kolonieschiff ist nicht im Zielsystem');
    }
    if (
      ship.currentSystemFieldX !== target.posX ||
      ship.currentSystemFieldY !== target.posY
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

  private async assertStarterFlowOpen(user: User): Promise<void> {
    if (user.onboardingCompleted) {
      throw new BadRequestException(
        'Starterkolonisierung bereits abgeschlossen',
      );
    }
  }

  private async findStarterTargetsForUser(
    user: User,
  ): Promise<CelestialObject[]> {
    const homeZone = user.factionRef?.homeZone;
    const starterZones =
      homeZone === FactionZone.REBEL || homeZone === FactionZone.EMPIRE
        ? [homeZone]
        : user.factionId === 1
          ? [FactionZone.REBEL]
          : user.factionId === 2
            ? [FactionZone.EMPIRE]
            : [];
    if (starterZones.length === 0) {
      return [];
    }

    return this.objectRepo
      .createQueryBuilder('target')
      .innerJoinAndSelect('target.starSystem', 'starSystem')
      .innerJoin(
        GalaxyField,
        'galaxyField',
        'galaxyField.starSystemId = starSystem.id',
      )
      .leftJoin(
        Colony,
        'colony',
        'colony.celestialObjectId = target.id AND colony.isAbandoned = false',
      )
      .where('target.isColonizable = true')
      .andWhere('target.objectType = :objectType', {
        objectType: CelestialObjectType.PLANET,
      })
      .andWhere('target.classId IN (:...starterClassIds)', {
        starterClassIds: STU_STARTER_PLANET_CLASS_IDS,
      })
      .andWhere('colony.id IS NULL')
      .andWhere('galaxyField.factionZone IN (:...starterZones)', {
        starterZones,
      })
      .orderBy('target.id', 'ASC')
      .getMany();
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
