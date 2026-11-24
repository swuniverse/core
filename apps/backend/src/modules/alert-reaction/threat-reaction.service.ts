import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CombatReportDto } from '@swuniverse/shared';
import { RelationshipResolverService } from '../alliance/relationship-resolver.service';
import { attackingParty } from '../combat/battle-parties';
import { BattleResolverService } from '../combat/battle-resolver.service';
import { CombatCause } from '../combat/combat-cause';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import { Fleet } from '../spacecraft/entities/fleet.entity';
import { AlertState, Spacecraft, SpacecraftKind } from '../spacecraft/entities/spacecraft.entity';
import { resolveSpacecraftLocation } from '../spacecraft/spacecraft-field';
import {
  THREAT_REACTIONS,
  type ThreatInteraction,
  type ThreatReaction,
} from '../spacecraft/threat-reaction.port';
import { COMBAT_RELATIONS, operational } from './alert-reaction.service';

const INTERACTION_TEXT: Record<ThreatInteraction, (ship: string, target: string, sector: string) => string> = {
  ACTIVATE_TRACTOR: (ship, target, sector) =>
    `Die ${ship} versucht die ${target} in Sektor ${sector} mit dem Traktorstrahl zu erfassen.`,
  BOARD_SHIP: (ship, target, sector) => `Die ${ship} versucht die ${target} in Sektor ${sector} zu entern.`,
};

/**
 * STU `ThreatReaction::reactToThreat`: an alerted, non-friendly target fires
 * a one-way battle with its attacking party at the causing ship alone.
 */
@Injectable()
export class ThreatReactionService implements ThreatReaction, OnModuleInit {
  constructor(
    @Inject(THREAT_REACTIONS)
    private readonly reactions: ThreatReaction[],
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

  async reactToThreat(
    sourceId: number,
    targetId: number,
    interaction: ThreatInteraction,
  ): Promise<CombatReportDto | null> {
    const source = await this.shipRepo.findOne({ where: { id: sourceId }, relations: COMBAT_RELATIONS });
    if (!source) return null;
    const ships = await this.shipRepo.find({
      where: { locationId: source.locationId },
      relations: COMBAT_RELATIONS,
      order: { id: 'ASC' },
    });
    const target = ships.find((ship) => ship.id === targetId);
    if (!target || target.alertState === AlertState.GREEN || !operational(target)) return null;
    if (target.userId === source.userId) return null;
    if ((await this.relationships.resolve(target.userId, source.userId)).isFriend) return null;

    const fleetLeaderId =
      target.fleetId == null ? null : (await this.fleetRepo.findOneBy({ id: target.fleetId }))?.leaderId;
    const attackers = attackingParty(target, fleetLeaderId, ships.filter(operational));
    const defender = ships.find((ship) => ship.id === source.id) ?? source;
    const report = await this.battleResolver.resolve({
      attackers,
      defenders: [defender],
      initiatorShipId: target.id,
      targetShipId: source.id,
      attackerUserId: target.userId,
      defenderUserId: source.userId,
      cause: CombatCause[interaction],
    });
    const log = report.rounds.flatMap((round) => round.lines.map((line) => line.text));
    if (!log.length) return null;

    const field = resolveSpacecraftLocation(source);
    const cause = INTERACTION_TEXT[interaction](source.name, target.name, field ? `${field.x}|${field.y}` : '?');
    await this.messaging.sendSystem(
      target.userId,
      `${cause}\nFolgende Aktionen wurden ausgeführt:\n${log.join('\n')}`,
      undefined,
      target.kind === SpacecraftKind.STATION ? MessageFolder.STATION : MessageFolder.SHIP,
    );
    return report;
  }
}
