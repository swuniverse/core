import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import { CombatEngine, CombatResult } from './combat.engine';
import { GameGateway } from '../websocket/game.gateway';
import { WsEventType } from '@swuniverse/shared';
import { SpacecraftCrewService } from '../spacecraft/spacecraft-crew.service';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStats } from '../colony/entities/colony-stats.entity';
import { ColonyField } from '../colony/entities/colony-field.entity';
import { ColonyDefenseService } from '../colony/colony-defense.service';
import { GameDataService } from '../game-data/game-data.service';
import { ColonyEventService } from '../colony/colony-event.service';
import {
  ColonyDamageService,
  DamagedColonyFieldResult,
} from '../colony/colony-damage.service';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from '../colony/entities/colony-event.entity';
import {
  getColonyChangeable,
  syncLegacyColonySnapshot,
} from '../colony/colony-stats.service';

@Injectable()
export class CombatService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(SpacecraftModule)
    private readonly moduleRepo: Repository<SpacecraftModule>,
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyStats)
    private readonly colonyStatsRepo: Repository<ColonyStats>,
    @InjectRepository(ColonyField)
    private readonly colonyFieldRepo: Repository<ColonyField>,
    private readonly engine: CombatEngine,
    private readonly gateway: GameGateway,
    private readonly spacecraftCrewService: SpacecraftCrewService,
    private readonly colonyDefenseService: ColonyDefenseService,
    private readonly gameData: GameDataService,
    private readonly colonyEventService: ColonyEventService,
    private readonly colonyDamageService: ColonyDamageService,
  ) {}

  async attack(
    attackerId: number,
    targetId: number,
    userId: number,
  ): Promise<CombatResult> {
    const attacker = await this.shipRepo.findOne({
      where: { id: attackerId, userId },
    });
    if (!attacker) throw new NotFoundException('Attacker not found');

    const defender = await this.shipRepo.findOne({
      where: { id: targetId },
    });
    if (!defender) throw new NotFoundException('Target not found');

    if (attacker.userId === defender.userId) {
      throw new BadRequestException('Cannot attack own ship');
    }
    if (attacker.status !== SpacecraftStatus.DOCKED) {
      throw new BadRequestException('Ship must be idle to initiate combat');
    }
    if (defender.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Target already destroyed');
    }
    if (defender.status === SpacecraftStatus.IN_FLIGHT) {
      throw new BadRequestException('Target is in flight');
    }
    if (!(await this.spacecraftCrewService.hasEnoughCrew(attacker))) {
      throw new BadRequestException('Not enough crew');
    }

    if (attacker.inSystem && defender.inSystem) {
      if (
        attacker.starSystemId !== defender.starSystemId ||
        attacker.currentSystemFieldX !== defender.currentSystemFieldX ||
        attacker.currentSystemFieldY !== defender.currentSystemFieldY
      ) {
        throw new BadRequestException('Target must be on same field');
      }
    } else if (!attacker.inSystem && !defender.inSystem) {
      if (
        attacker.currentLayerId !== defender.currentLayerId ||
        attacker.posX !== defender.posX ||
        attacker.posY !== defender.posY
      ) {
        throw new BadRequestException('Target must be on same field');
      }
    } else {
      throw new BadRequestException('Target must be on same field');
    }

    const attackerModules = await this.moduleRepo.find({
      where: { spacecraftId: attacker.id },
    });
    const defenderModules = await this.moduleRepo.find({
      where: { spacecraftId: defender.id },
    });

    this.gateway.emitToUser(attacker.userId, WsEventType.COMBAT_STARTED, {
      attackerId: attacker.id,
      defenderId: defender.id,
    });
    this.gateway.emitToUser(defender.userId, WsEventType.COMBAT_STARTED, {
      attackerId: attacker.id,
      defenderId: defender.id,
    });

    const result = await this.engine.resolveCombat(
      attacker,
      defender,
      attackerModules,
      defenderModules,
    );

    await this.shipRepo.save(attacker);
    await this.shipRepo.save(defender);
    await this.moduleRepo.save([...attackerModules, ...defenderModules]);

    return result;
  }

  async attackColony(
    attackerId: number,
    colonyId: number,
    userId: number,
  ): Promise<
    CombatResult & {
      defenderType: 'COLONY';
      colonyShields: number;
      damagedFields: DamagedColonyFieldResult[];
    }
  > {
    const attacker = await this.shipRepo.findOne({
      where: { id: attackerId, userId },
    });
    if (!attacker) throw new NotFoundException('Attacker not found');
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId },
      relations: ['fields', 'stats', 'changeable'],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    if (colony.userId == null || colony.isAbandoned) {
      throw new BadRequestException('Cannot attack abandoned colony');
    }
    if (colony.userId === attacker.userId) {
      throw new BadRequestException('Cannot attack own colony');
    }
    if (attacker.status !== SpacecraftStatus.DOCKED) {
      throw new BadRequestException('Ship must be idle to initiate combat');
    }
    if (!(await this.spacecraftCrewService.hasEnoughCrew(attacker))) {
      throw new BadRequestException('Not enough crew');
    }
    if (
      attacker.starSystemId !== colony.starSystemId ||
      (colony.celestialObjectId != null &&
        attacker.celestialObjectId !== colony.celestialObjectId)
    ) {
      throw new BadRequestException('Colony must be in same orbit');
    }
    if (!colony.stats) throw new BadRequestException('Colony stats missing');

    const functionIds = this.getActiveColonyFunctionIds(colony);
    const maxShields =
      this.colonyDefenseService.calculateMaxShieldsByFunctions(functionIds);
    this.colonyDefenseService.syncShieldCapacity(colony, maxShields);
    const changeable = getColonyChangeable(colony);

    const attackerModules = await this.moduleRepo.find({
      where: { spacecraftId: attacker.id },
    });
    let outgoingDamage = this.calculateShipAttackDamage(attackerModules);
    const hasProjectileAttack = attackerModules.some(
      (module) =>
        module.isActive !== false &&
        module.integrity > 0 &&
        module.category === 'PROJECTILE',
    );
    if (
      hasProjectileAttack &&
      this.colonyDefenseService.hasAntiParticle(functionIds)
    ) {
      outgoingDamage = Math.ceil(
        (outgoingDamage *
          (100 -
            this.colonyDefenseService.constants.phalanx.antiParticle
              .incomingProjectileReductionPercent)) /
          100,
      );
    }
    const shieldsBefore = colony.stats.shields ?? 0;
    const absorbed = Math.min(shieldsBefore, outgoingDamage);
    colony.stats.shields = Math.max(0, shieldsBefore - outgoingDamage);
    const remainingDamage = Math.max(0, outgoingDamage - absorbed);
    const damagedFields = this.colonyDamageService.applyIncomingDamage(
      colony,
      remainingDamage,
    );
    const log = [
      {
        action: 'COLONY_SHIELD_ABSORB' as any,
        source: 'defender' as const,
        value: absorbed,
      },
    ];

    if (
      this.colonyDefenseService.hasEnergyPhalanx(functionIds) &&
      changeable.energy >=
        this.colonyDefenseService.constants.phalanx.energy.energyCost
    ) {
      changeable.energy -=
        this.colonyDefenseService.constants.phalanx.energy.energyCost;
      syncLegacyColonySnapshot(colony);
      attacker.hull = Math.max(
        0,
        attacker.hull -
          this.colonyDefenseService.constants.phalanx.energy.damage,
      );
      log.push({
        action: 'ENERGY_PHALANX_HIT' as any,
        source: 'defender' as const,
        value: this.colonyDefenseService.constants.phalanx.energy.damage,
      });
    }

    if (this.colonyDefenseService.hasParticlePhalanx(functionIds)) {
      const torpedoType = colony.stats.torpedoTypeId
        ? this.gameData.getTorpedoType(colony.stats.torpedoTypeId)
        : null;
      const consumed =
        await this.colonyDefenseService.consumeParticlePhalanxTorpedo(colony);
      if (
        torpedoType &&
        consumed &&
        changeable.energy >=
          this.colonyDefenseService.constants.phalanx.particle.energyCost
      ) {
        changeable.energy -=
          this.colonyDefenseService.constants.phalanx.particle.energyCost;
        syncLegacyColonySnapshot(colony);
        const damage = torpedoType.baseDamage;
        attacker.hull = Math.max(0, attacker.hull - damage);
        log.push({
          action: 'PARTICLE_PHALANX_HIT' as any,
          source: 'defender' as const,
          value: damage,
        });
      }
    }

    attacker.status =
      attacker.hull <= 0 ? SpacecraftStatus.DESTROYED : SpacecraftStatus.DOCKED;
    await this.shipRepo.save(attacker);
    for (const damagedField of damagedFields) {
      const field = (colony.fields ?? []).find(
        (candidate) => candidate.fieldIndex === damagedField.fieldIndex,
      );
      if (field) await this.colonyFieldRepo.save(field);
    }
    await this.colonyStatsRepo.save(colony.stats);
    await this.colonyRepo.save(colony);

    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId: colony.userId,
      type: ColonyEventType.COLONY_ATTACKED,
      severity:
        attacker.hull <= 0
          ? ColonyEventSeverity.WARNING
          : ColonyEventSeverity.CRITICAL,
      title: 'Kolonie angegriffen',
      message: `Die Kolonie wurde von Schiff #${attacker.id} angegriffen.`,
      payload: {
        attackerId: attacker.id,
        absorbed,
        remainingDamage,
        damagedFields,
        colonyShields: colony.stats.shields,
        log,
      },
    });

    const result = {
      defenderType: 'COLONY' as const,
      colonyShields: colony.stats.shields ?? 0,
      damagedFields,
      rounds: [
        {
          round: 1,
          attackerShields: attacker.shields,
          defenderShields: colony.stats.shields ?? 0,
          attackerHull: attacker.hull,
          defenderHull: 0,
          log,
        },
      ],
      winner:
        attacker.hull <= 0 ? ('defender' as const) : ('attacker' as const),
      attackerDestroyed: attacker.hull <= 0,
      defenderDestroyed: false,
    };
    return result;
  }

  private getActiveColonyFunctionIds(colony: Colony): number[] {
    return (colony.fields ?? [])
      .filter(
        (field) => field.buildingId && !field.isBuilding && field.isActive,
      )
      .flatMap((field) =>
        this.gameData.getBuildingFunctions(field.buildingId!),
      );
  }

  private calculateShipAttackDamage(modules: SpacecraftModule[]): number {
    const activeWeapons = modules.filter(
      (module) =>
        module.isActive !== false &&
        module.integrity > 0 &&
        ['WEAPONS', 'PROJECTILE'].includes(module.category),
    );
    if (activeWeapons.length === 0) return 50;
    return activeWeapons.reduce(
      (sum, module) => sum + 100 * Math.max(1, module.level),
      0,
    );
  }
}
