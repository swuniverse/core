import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isVacationEffective } from '@swuniverse/shared';
import {
  RelationshipResolverService,
  type ResolvedStance,
} from '../alliance/relationship-resolver.service';
import { BattleResolverService } from '../combat/battle-resolver.service';
import {
  AlertState,
  Spacecraft,
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

const COMBAT_RELATIONS = [
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

const operational = (ship: Spacecraft) =>
  ship.status === SpacecraftStatus.IDLE &&
  ship.operatingMode !== SpacecraftOperatingMode.STANDBY;

/**
 * Alert reaction on a reached field (STU `AlertReactionFacade`): the first
 * eligible foreign alerted ship or fleet, by ship id, attacks the incoming
 * party once per transition and stops the flight.
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
  ) {}

  onModuleInit(): void {
    if (!this.reactions.includes(this)) this.reactions.push(this);
  }

  async afterTransition({
    leader,
    participants,
  }: MovementReactionContext): Promise<MovementReactionOutcome | void> {
    const incomingUserId = leader.userId;
    const participantIds = new Set(participants.map((ship) => ship.id));
    const ships = await this.shipRepo.find({
      where: { locationId: leader.locationId },
      relations: COMBAT_RELATIONS,
      order: { id: 'ASC' },
    });
    const incoming = ships.filter((ship) => participantIds.has(ship.id) && operational(ship));
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
    for (const candidate of candidates) {
      let stance = stances.get(candidate.userId);
      if (!stance) {
        stance = await this.relationships.resolve(candidate.userId, incomingUserId);
        stances.set(candidate.userId, stance);
      }
      if (!reactsToIncoming(candidate.alertState, stance)) continue;
      const defenders = incoming.filter((ship) => !isHiddenFromViewer(ship, candidate.userId));
      if (!defenders.length) continue;
      const attackers = foreign.filter(
        (ship) =>
          ship.userId === candidate.userId &&
          (ship.id === candidate.id ||
            (candidate.fleetId != null && ship.fleetId === candidate.fleetId)),
      );

      const report = await this.battleResolver.resolve({
        attackers,
        defenders,
        initiatorShipId: candidate.id,
        targetShipId: defenders.find((ship) => ship.id === leader.id)?.id ?? defenders[0].id,
        attackerUserId: candidate.userId,
        defenderUserId: incomingUserId,
      });
      const destroyed = new Set(report.outcome.destroyedShipIds);
      for (const ship of participants) {
        if (destroyed.has(ship.id)) ship.status = SpacecraftStatus.DESTROYED;
      }
      return { stop: true, report };
    }
  }
}
