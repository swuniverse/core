import { isRpgHidden } from '../spacecraft/rpg-visibility';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isVacationEffective, type CombatReportDto } from '@swuniverse/shared';
import {
  RelationshipResolverService,
  type ResolvedStance,
} from '../alliance/relationship-resolver.service';
import { BattleResolverService } from '../combat/battle-resolver.service';
import { attackingParty } from '../combat/battle-parties';
import { CombatCause } from '../combat/combat-cause';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import {
  AlertState,
  Spacecraft,
  SpacecraftKind,
  SpacecraftOperatingMode,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { Fleet } from '../spacecraft/entities/fleet.entity';
import { isHiddenFromViewer } from '../spacecraft/spacecraft-cloak';
import {
  MOVEMENT_REACTIONS,
  type MovementReaction,
  type MovementReactionContext,
  type MovementReactionOutcome,
} from '../spacecraft/movement-reaction.port';

export const COMBAT_RELATIONS = [
  'user',
  'location',
  'location.galaxyField',
  'location.galaxyField.fieldType',
  'location.systemField',
  'location.systemField.fieldType',
];

/** STU `SkipDetection`: yellow fires on enemies only, red on everyone but friends. */
export function reactsToIncoming(alertState: AlertState, stance: ResolvedStance): boolean {
  if (alertState === AlertState.YELLOW) return stance.isEnemy;
  if (alertState === AlertState.RED) return !stance.isFriend;
  return false;
}

export const ALERT_DESCRIPTIONS: Partial<Record<AlertState, string>> = {
  [AlertState.YELLOW]: 'Alarm-Gelb',
  [AlertState.RED]: 'Alarm-Rot',
};

/** Fisher-Yates like STU's `shuffle` of the alerted battle parties. */
function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export const operational = (ship: Spacecraft) =>
  !isRpgHidden(ship) &&
  ship.status === SpacecraftStatus.IDLE &&
  ship.operatingMode !== SpacecraftOperatingMode.STANDBY;

const ALERT_LEVEL: Record<AlertState, number> = {
  [AlertState.GREEN]: 0,
  [AlertState.YELLOW]: 1,
  [AlertState.RED]: 2,
};

/** STU `AlertStateBattleParty::initMembers`: not warped and alerted at least like the leader. */
const joinsAlertParty = (ship: Spacecraft, leader: Spacecraft) =>
  !(
    ship.location?.kind === 'GALAXY_FIELD' &&
    (ship.runtimeSystems?.WARPDRIVE as { active?: boolean } | undefined)?.active === true
  ) && ALERT_LEVEL[ship.alertState] >= ALERT_LEVEL[leader.alertState];

/**
 * Alert reaction on a reached field (STU `AlertReactionFacade`): every
 * eligible foreign alerted ship or fleet attacks the incoming party in random
 * order until it is defeated. Like STU the flight itself continues with the
 * survivors.
 */
@Injectable()
export class AlertReactionService implements MovementReaction, OnModuleInit {
  constructor(
    @Inject(MOVEMENT_REACTIONS)
    private readonly reactions: MovementReaction[],
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(Fleet)
    private readonly fleetRepo: Repository<Fleet>,
    private readonly relationships: RelationshipResolverService,
    private readonly battleResolver: BattleResolverService,
    private readonly messaging: MessagingService,
  ) {}

  onModuleInit(): void {
    if (!this.reactions.includes(this)) this.reactions.push(this);
  }

  async afterTransition({
    leader,
    participants,
    coordinate,
  }: MovementReactionContext): Promise<MovementReactionOutcome | void> {
    const incomingUserId = leader.userId;
    const participantIds = new Set(participants.map((ship) => ship.id));
    const ships = await this.shipRepo.find({
      where: { locationId: leader.locationId },
      relations: COMBAT_RELATIONS,
      order: { id: 'ASC' },
    });
    let incoming = ships.filter((ship) => participantIds.has(ship.id) && operational(ship));
    const incomingUser = ships.find((ship) => ship.id === leader.id)?.user;
    if (!incoming.length || !incomingUser || isVacationEffective(incomingUser)) return;

    const foreign = ships.filter(
      (ship) =>
        ship.userId !== incomingUserId &&
        operational(ship) &&
        !isHiddenFromViewer(ship, incomingUserId) &&
        !isVacationEffective(ship.user),
    );
    const fleetIds = [...new Set(foreign.flatMap((ship) => (ship.fleetId == null ? [] : [ship.fleetId])))];
    const fleetLeaders = new Map(
      (fleetIds.length ? await this.fleetRepo.findBy({ id: In(fleetIds) }) : []).map((fleet) => [
        fleet.id,
        fleet.leaderId,
      ]),
    );
    const candidates = foreign.filter(
      (ship) =>
        ship.alertState !== AlertState.GREEN &&
        (ship.fleetId == null || fleetLeaders.get(ship.fleetId) === ship.id),
    );
    if (!candidates.length) return;

    const stances = new Map<number, ResolvedStance>();
    const eligible: Spacecraft[] = [];
    for (const candidate of candidates) {
      let stance = stances.get(candidate.userId);
      if (!stance) {
        stance = await this.relationships.resolve(candidate.userId, incomingUserId);
        stances.set(candidate.userId, stance);
      }
      if (reactsToIncoming(candidate.alertState, stance)) eligible.push(candidate);
    }

    const reports: CombatReportDto[] = [];
    for (const candidate of shuffled(eligible)) {
      if (!incoming.length) break;
      if (candidate.status === SpacecraftStatus.DESTROYED) continue;
      const attackers = attackingParty(
        candidate,
        candidate.fleetId == null ? null : fleetLeaders.get(candidate.fleetId),
        foreign.filter(
          (ship) => ship.status !== SpacecraftStatus.DESTROYED && joinsAlertParty(ship, candidate),
        ),
      );
      const defenders = incoming.filter((ship) => !isHiddenFromViewer(ship, candidate.userId));
      if (!defenders.length) continue;

      const report = await this.battleResolver.resolve({
        attackers,
        defenders,
        initiatorShipId: candidate.id,
        targetShipId: defenders.find((ship) => ship.id === leader.id)?.id ?? defenders[0].id,
        attackerUserId: candidate.userId,
        defenderUserId: incomingUserId,
        cause: candidate.alertState === AlertState.RED ? CombatCause.ALERT_RED : CombatCause.ALERT_YELLOW,
      });
      reports.push(report);
      const destroyed = new Set(report.outcome.destroyedShipIds);
      for (const ship of [...attackers, ...defenders]) {
        if (destroyed.has(ship.id)) ship.status = SpacecraftStatus.DESTROYED;
      }
      for (const ship of participants) {
        if (destroyed.has(ship.id)) ship.status = SpacecraftStatus.DESTROYED;
      }
      incoming = incoming.filter((ship) => !destroyed.has(ship.id));
      await this.inform(candidate, incomingUserId, `${coordinate.x}|${coordinate.y}`, report);
    }
    if (!reports.length) return;
    return { reports, changedParticipants: true };
  }

  /** STU `performAttackCycle` messages: both sides get the fight log. */
  private async inform(
    alerted: Spacecraft,
    incomingUserId: number,
    sector: string,
    report: CombatReportDto,
  ): Promise<void> {
    const alert = ALERT_DESCRIPTIONS[alerted.alertState] ?? 'Alarm';
    const log = report.rounds.flatMap((round) => round.lines.map((line) => line.text)).join('\n');
    const body = `Kampf in Sektor ${sector}\n${log}`;
    await this.messaging.sendSystem(
      alerted.userId,
      `Eigene Schiffe auf ${alert}`,
      body,
      undefined,
      alerted.kind === SpacecraftKind.STATION ? MessageFolder.STATION : MessageFolder.SHIP,
    );
    await this.messaging.sendSystem(
      incomingUserId,
      `Fremde Schiffe auf ${alert}`,
      body,
      undefined,
      MessageFolder.SHIP,
    );
  }
}
