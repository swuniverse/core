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
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { UnlockResolverService } from '../research/unlock-resolver.service';

export interface ColonizationLimitStatus {
  type: ColonizationLimitType;
  count: number;
  limit: number;
  max: number;
}

export interface ColonizationStatusDto {
  limits: Record<ColonizationLimitType, ColonizationLimitStatus>;
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

  async explainTarget(
    userId: number,
    celestialObjectId: number,
    shipId?: number,
  ): Promise<ColonizationTargetCheckDto> {
    const user = await this.getUser(userId);
    const factionKey = this.getFactionKey(user);
    const status = await this.getColonizationStatus(userId);
    const reasons: string[] = [];
    const target = await this.objectRepo.findOneBy({ id: celestialObjectId });
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
    if (existing) reasons.push('Ziel ist bereits kolonisiert');

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

    const colony = await this.colonySeedService.createFollowUpColony({
      userId,
      username: user.username,
      celestialObjectId,
      buildingId: shipClass.colonizationBuildingId,
    });

    await this.shipRepo.delete({ id: ship.id, userId });
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.COLONY_FOUNDED,
      severity: ColonyEventSeverity.INFO,
      title: 'Kolonie gegründet',
      message: `${colony.name} wurde gegründet. Das Kolonieschiff ${ship.name} wurde verbraucht.`,
      payload: {
        celestialObjectId,
        consumedShipId: ship.id,
        shipClassId: ship.shipClassId,
        colonizerTier: shipClass.colonizerTier,
        initialBuildingId: shipClass.colonizationBuildingId,
      },
    });

    return { success: true, colonyId: colony.id, consumedShipId: ship.id };
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
      where: { userId },
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
