import type { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { isCloaked } from '../spacecraft/spacecraft-cloak';

/**
 * Shared STU party formation for manual attacks, alert reactions and threat
 * reactions. `nearby` holds the fight-ready spacecraft on the field; the
 * acting ship itself is always part of its party.
 */

/** STU `AttackingBattleParty`: the whole fleet only behind its leader. */
export function attackingParty(
  attacker: Spacecraft,
  fleetLeaderId: number | null | undefined,
  nearby: Spacecraft[],
): Spacecraft[] {
  const self = nearby.find((ship) => ship.id === attacker.id) ?? attacker;
  if (attacker.fleetId == null || fleetLeaderId !== attacker.id) return [self];
  return [
    self,
    ...nearby.filter(
      (ship) =>
        ship.id !== attacker.id &&
        ship.userId === attacker.userId &&
        ship.fleetId === attacker.fleetId,
    ),
  ];
}

/**
 * STU `AttackedBattleParty`: the target and its uncloaked fleet members plus
 * the non-NPC stations they are docked at. The target counts as uncloaked
 * because an accepted attack reveals it.
 */
export function attackedParty(
  target: Spacecraft,
  nearby: Spacecraft[],
): Spacecraft[] {
  const self = nearby.find((ship) => ship.id === target.id) ?? target;
  const members = [
    self,
    ...(target.fleetId == null
      ? []
      : nearby.filter(
          (ship) =>
            ship.id !== target.id &&
            ship.userId === target.userId &&
            ship.fleetId === target.fleetId &&
            !isCloaked(ship),
        )),
  ];
  const ids = new Set(members.map((ship) => ship.id));
  const stations: Spacecraft[] = [];
  for (const member of members) {
    const station = nearby.find((ship) => ship.id === member.dockedAtId);
    if (!station || ids.has(station.id) || station.user?.isNpc) continue;
    ids.add(station.id);
    stations.push(station);
  }
  return [...members, ...stations];
}
