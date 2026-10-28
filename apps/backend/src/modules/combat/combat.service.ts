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
  SpacecraftOperatingMode,
  AlertState,
} from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import { CombatEngine, CombatResult } from './combat.engine';
import { GameGateway } from '../websocket/game.gateway';
import { FieldEffect, knownFieldEffects, WsEventType } from '@swuniverse/shared';
import { SpacecraftCrewService } from '../spacecraft/spacecraft-crew.service';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStats } from '../colony/entities/colony-stats.entity';
import { ColonyField } from '../colony/entities/colony-field.entity';
import { ColonyDefenseService } from '../colony/colony-defense.service';
import { GameDataService } from '../game-data/game-data.service';
import { ColonyEventService } from '../messaging/colony-event.service';
import {
  ColonyDamageService,
  DamagedColonyFieldResult,
} from '../colony/colony-damage.service';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from '../messaging/colony-event.types';
import {
  deductColonyEnergy,
  getColonyChangeable,
} from '../colony/colony-stats.service';
import { assertSpacecraftNotInStandby } from '../spacecraft/spacecraft-mode.util';
import { SpacecraftDestructionService } from '../spacecraft/spacecraft-destruction.service';
import { CombatReportFormatter } from './combat-report.formatter';
import {
  COMBATS_EVENT,
  DESTROYED_SHIPS_EVENT,
} from '../statistics/statistic-events';
import { StatisticsService } from '../statistics/statistics.service';
import {
  matchesColonyOrbit,
  sameSpacecraftLocation,
} from '../spacecraft/spacecraft-field';

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
    private readonly destructionService: SpacecraftDestructionService,
    private readonly reportFormatter: CombatReportFormatter,
    private readonly statisticsService: StatisticsService,
  ) {}

  async attack(
    attackerId: number,
    targetId: number,
    userId: number,
  ): Promise<ReturnType<CombatReportFormatter['formatBattle']>> {
    const attacker = await this.shipRepo.findOne({
      where: { id: attackerId, userId },
      relations: this.combatLocationRelations,
    });
    if (!attacker) throw new NotFoundException('Attacker not found');
    assertSpacecraftNotInStandby(attacker, 'einem Angriff');

    const defender = await this.shipRepo.findOne({
      where: { id: targetId },
      relations: this.combatLocationRelations,
    });
    if (!defender) throw new NotFoundException('Target not found');

    if (attacker.id === defender.id) {
      throw new BadRequestException('Cannot attack own ship');
    }
    if (attacker.status !== SpacecraftStatus.IDLE) {
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

    if (!sameSpacecraftLocation(attacker, defender)) {
      throw new BadRequestException('Target must be on same field');
    }

    const nearby = await this.shipRepo.find({
      where: { locationId: attacker.locationId },
      relations: this.combatLocationRelations,
    });
    const operational = (ship: Spacecraft) =>
      ship.status === SpacecraftStatus.IDLE &&
      ship.operatingMode !== SpacecraftOperatingMode.STANDBY;
    const attackers = nearby.filter(
      (ship) =>
        ship.userId === attacker.userId &&
        operational(ship) &&
        (ship.id === attacker.id ||
          (attacker.fleetId != null && ship.fleetId === attacker.fleetId)),
    );
    const defenders = nearby.filter(
      (ship) =>
        ship.userId === defender.userId &&
        operational(ship) &&
        (ship.id === defender.id ||
          (defender.fleetId != null && ship.fleetId === defender.fleetId) ||
          [AlertState.YELLOW, AlertState.RED].includes(ship.alertState)),
    );
    if (!attackers.some((ship) => ship.id === attacker.id)) attackers.push(attacker);
    if (!defenders.some((ship) => ship.id === defender.id)) defenders.push(defender);
    const participants = [...attackers, ...defenders];
    const modules = await this.moduleRepo.find({
      where: participants.map((ship) => ({ spacecraftId: ship.id })),
    });
    const party = (ships: Spacecraft[]) =>
      ships.map((ship) => ({
        ship,
        modules: modules.filter((module) => module.spacecraftId === ship.id),
        ...this.fieldEffectContext(ship),
      }));

    for (const ownerId of new Set(participants.map((ship) => ship.userId))) {
      this.gateway.emitToUser(ownerId, WsEventType.COMBAT_STARTED, {
        attackerId: attacker.id,
        defenderId: defender.id,
      });
    }

    const result = await this.engine.resolveBattle(party(attackers), party(defenders));
    const destroyedIds = new Set(result.destroyedShipIds);
    for (const ship of participants) {
      if (destroyedIds.has(ship.id)) {
        const destroyerUserId = attackers.some(
          (participant) => participant.id === ship.id,
        )
          ? defender.userId
          : attacker.userId;
        await this.destructionService.destroyFromCombat(
          ship.id,
          destroyerUserId,
        );
      } else {
        await this.destructionService.saveCombatSurvivor(ship);
      }
    }
    await this.moduleRepo.save(modules);
    await this.countCombat(destroyedIds.size);

    return this.reportFormatter.formatBattle(result, attackers, defenders);
  }

  async attackColony(
    attackerId: number,
    colonyId: number,
    fieldIndex: number,
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
      relations: ['location', 'location.systemField'],
    });
    if (!attacker) throw new NotFoundException('Attacker not found');
    assertSpacecraftNotInStandby(attacker, 'einem Angriff');
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId },
      relations: ['fields', 'stats', 'changeable', 'systemField'],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    if (colony.userId == null || colony.isAbandoned) {
      throw new BadRequestException('Cannot attack abandoned colony');
    }
    if (colony.userId === attacker.userId) {
      throw new BadRequestException('Cannot attack own colony');
    }
    if (attacker.status !== SpacecraftStatus.IDLE) {
      throw new BadRequestException('Ship must be idle to initiate combat');
    }
    if (!(await this.spacecraftCrewService.hasEnoughCrew(attacker))) {
      throw new BadRequestException('Not enough crew');
    }
    if (!matchesColonyOrbit(attacker, colony)) {
      throw new BadRequestException('Colony must be in same orbit');
    }
    if (!colony.stats) throw new BadRequestException('Colony stats missing');
    const targetField = (colony.fields ?? []).find(
      (field) => field.fieldIndex === fieldIndex,
    );
    if (!targetField) throw new BadRequestException('Selected field not found');
    if (!targetField.buildingId || targetField.isBuilding) {
      throw new BadRequestException('Selected field has no finished building');
    }
    if (targetField.layer === 'UNDERGROUND') {
      throw new BadRequestException('Underground fields cannot be attacked');
    }

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
    const damagedFields =
      remainingDamage > 0
        ? [
            this.colonyDamageService.damageField(
              targetField,
              Math.max(1, Math.ceil(remainingDamage / 10)),
            ),
          ]
        : [];
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
      deductColonyEnergy(
        colony,
        this.colonyDefenseService.constants.phalanx.energy.energyCost,
      );
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
        deductColonyEnergy(
          colony,
          this.colonyDefenseService.constants.phalanx.particle.energyCost,
        );
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
      attacker.hull <= 0 ? SpacecraftStatus.DESTROYED : SpacecraftStatus.IDLE;
    if (attacker.hull <= 0) {
      await this.destructionService.destroyFromCombat(
        attacker.id,
        colony.userId,
      );
    } else {
      await this.destructionService.saveCombatSurvivor(attacker);
    }
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

    await this.countCombat(attacker.hull <= 0 ? 1 : 0);

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

  private readonly combatLocationRelations = [
    'location',
    'location.galaxyField',
    'location.galaxyField.fieldType',
    'location.systemField',
    'location.systemField.fieldType',
  ];

  private fieldEffectContext(ship: Spacecraft): {
    fieldEffects: FieldEffect[];
    fieldTypeName?: string;
  } {
    const field =
      ship.location.kind === 'SYSTEM_FIELD'
        ? ship.location.systemField
        : ship.location.galaxyField;
    return {
      fieldEffects: knownFieldEffects([
        ...(field?.fieldType?.effects ?? []),
        ...(field && 'effects' in field ? (field.effects ?? []) : []),
      ]),
      fieldTypeName: field?.fieldType?.name,
    };
  }

  /** Zählt ein abgeschlossenes Gefecht und die darin zerstörten Schiffe. */
  private async countCombat(destroyedShips: number): Promise<void> {
    await this.statisticsService.countEvent(COMBATS_EVENT);
    if (destroyedShips > 0) {
      await this.statisticsService.countEvent(
        DESTROYED_SHIPS_EVENT,
        destroyedShips,
      );
    }
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
