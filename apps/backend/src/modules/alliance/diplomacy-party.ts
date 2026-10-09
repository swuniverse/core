import { DiplomacyPartyType } from '@swuniverse/shared';

/**
 * One side of a diplomatic relationship: an alliance or an alliance-less
 * player. The ID is an alliance ID or a user ID depending on `type`; it is
 * never the ID of the persistence row that backs the party.
 */
export interface PartyRef {
  type: DiplomacyPartyType;
  id: number;
}

/**
 * Store methods accept a bare number as shorthand for an alliance party, so
 * alliance-only callers stay unchanged.
 */
export type PartyInput = PartyRef | number;

export function allianceParty(allianceId: number): PartyRef {
  return { type: DiplomacyPartyType.ALLIANCE, id: allianceId };
}

export function playerParty(userId: number): PartyRef {
  return { type: DiplomacyPartyType.PLAYER, id: userId };
}

export function toPartyRef(party: PartyInput): PartyRef {
  return typeof party === 'number' ? allianceParty(party) : party;
}

export function samePartyRef(first: PartyRef, second: PartyRef): boolean {
  return first.type === second.type && first.id === second.id;
}

export function isAllianceParty(party: PartyRef): boolean {
  return party.type === DiplomacyPartyType.ALLIANCE;
}

/** The alliance ID of an alliance party, null for a player party. */
export function allianceIdOf(party: PartyRef | null): number | null {
  return party && isAllianceParty(party) ? party.id : null;
}

/** Whether two parties form exactly the given unordered pair. */
export function isPair(
  first: PartyRef,
  second: PartyRef,
  a: PartyRef,
  b: PartyRef,
): boolean {
  return (
    (samePartyRef(first, a) && samePartyRef(second, b)) ||
    (samePartyRef(first, b) && samePartyRef(second, a))
  );
}

/** The other side of a pair that contains `party`. */
export function otherParty(
  pair: { firstParty: PartyRef; secondParty: PartyRef },
  party: PartyRef,
): PartyRef {
  return samePartyRef(pair.firstParty, party)
    ? pair.secondParty
    : pair.firstParty;
}

export function involvesParty(
  pair: { firstParty: PartyRef; secondParty: PartyRef },
  party: PartyRef,
): boolean {
  return (
    samePartyRef(pair.firstParty, party) ||
    samePartyRef(pair.secondParty, party)
  );
}

/** Stable total order used where no persistence row order exists. */
export function comparePartyRefs(first: PartyRef, second: PartyRef): number {
  if (first.type !== second.type) {
    return first.type === DiplomacyPartyType.ALLIANCE ? -1 : 1;
  }
  return first.id - second.id;
}
