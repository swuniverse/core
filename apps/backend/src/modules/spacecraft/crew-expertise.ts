import { CrewType } from '../colony/entities/crew.entity';
import { CrewRank } from './crew-rank';

export { CrewRank } from './crew-rank';

export enum CrewEnhancementEvent {
  REACH_ASTRO_WAYPOINT = 'REACH_ASTRO_WAYPOINT',
  FINISH_ASTRO_MAPPING = 'FINISH_ASTRO_MAPPING',
  SPACECRAFT_DESTRUCTION = 'SPACECRAFT_DESTRUCTION',
  SPACECRAFT_TAKEOVER = 'SPACECRAFT_TAKEOVER',
  SALVAGE_EMERGENCY_PODS = 'SALVAGE_EMERGENCY_PODS',
  REPAIR_COMPLETED = 'REPAIR_COMPLETED',
  FOREIGN_SPACECRAFT_SCAN = 'FOREIGN_SPACECRAFT_SCAN',
  EVADE_ATTACK = 'EVADE_ATTACK',
  ESCAPE_TRACTOR_BEAM = 'ESCAPE_TRACTOR_BEAM',
  FOREIGN_CONTACT_MESSAGE = 'FOREIGN_CONTACT_MESSAGE',
  ACTIVATE_TRACTOR_BEAM = 'ACTIVATE_TRACTOR_BEAM',
  SET_ALERT_YELLOW_OR_RED = 'SET_ALERT_YELLOW_OR_RED',
  DECLOAK_FOREIGN_SPACECRAFT = 'DECLOAK_FOREIGN_SPACECRAFT',
  ION_STORM_FLIGHT = 'ION_STORM_FLIGHT',
  FOREIGN_COLONY_SCAN = 'FOREIGN_COLONY_SCAN',
  START_FOREIGN_SUBSPACE_ANALYSIS = 'START_FOREIGN_SUBSPACE_ANALYSIS',
  SUBSPACE_ELLIPSE_TICK = 'SUBSPACE_ELLIPSE_TICK',
  ATTACK_FOREIGN_COLONY = 'ATTACK_FOREIGN_COLONY',
  CONSTRUCTION_CREATED = 'CONSTRUCTION_CREATED',
  BEAM_COMMODITIES = 'BEAM_COMMODITIES',
  WARP_FLIGHT_WITHOUT_DEFLECTOR_ENERGY = 'WARP_FLIGHT_WITHOUT_DEFLECTOR_ENERGY',
  MAINTENANCE_TICK = 'MAINTENANCE_TICK',
}

export const CREW_RANKS = [
  { rank: CrewRank.CADET, label: 'Kadett', expertise: 0 },
  { rank: CrewRank.CREWMAN, label: 'Crewmitglied', expertise: 100 },
  { rank: CrewRank.ENSIGN, label: 'Fähnrich', expertise: 300 },
  { rank: CrewRank.JUNIOR_LIEUTENANT, label: 'Unterleutnant', expertise: 1_000 },
  { rank: CrewRank.LIEUTENANT, label: 'Leutnant', expertise: 2_000 },
  { rank: CrewRank.LIEUTENANT_COMMANDER, label: 'Oberleutnant', expertise: 5_000 },
  { rank: CrewRank.COMMANDER, label: 'Commander', expertise: 10_000, limit: 25 },
  { rank: CrewRank.CAPTAIN, label: 'Captain', expertise: 20_000, limit: 15 },
  { rank: CrewRank.COMMODORE, label: 'Commodore', expertise: 50_000, limit: 5 },
  { rank: CrewRank.ADMIRAL, label: 'Admiral', expertise: 100_000, limit: 3 },
] as const;

export const CREW_ENHANCEMENT_AMOUNTS: Record<
  CrewEnhancementEvent,
  Partial<Record<CrewType, number>>
> = {
  [CrewEnhancementEvent.REACH_ASTRO_WAYPOINT]: { [CrewType.NAVIGATION]: 10, [CrewType.SCIENCE]: 10 },
  [CrewEnhancementEvent.FINISH_ASTRO_MAPPING]: { [CrewType.NAVIGATION]: 50, [CrewType.SCIENCE]: 50 },
  [CrewEnhancementEvent.SPACECRAFT_DESTRUCTION]: { [CrewType.CAPTAIN]: 25, [CrewType.SECURITY]: 25 },
  [CrewEnhancementEvent.SPACECRAFT_TAKEOVER]: { [CrewType.SECURITY]: 25 },
  [CrewEnhancementEvent.SALVAGE_EMERGENCY_PODS]: { [CrewType.TECHNICAL]: 10 },
  [CrewEnhancementEvent.REPAIR_COMPLETED]: { [CrewType.TECHNICAL]: 10 },
  [CrewEnhancementEvent.FOREIGN_SPACECRAFT_SCAN]: { [CrewType.SCIENCE]: 5 },
  [CrewEnhancementEvent.EVADE_ATTACK]: { [CrewType.NAVIGATION]: 5 },
  [CrewEnhancementEvent.ESCAPE_TRACTOR_BEAM]: { [CrewType.NAVIGATION]: 10 },
  [CrewEnhancementEvent.FOREIGN_CONTACT_MESSAGE]: { [CrewType.COMMAND]: 5 },
  [CrewEnhancementEvent.ACTIVATE_TRACTOR_BEAM]: { [CrewType.TECHNICAL]: 5 },
  [CrewEnhancementEvent.SET_ALERT_YELLOW_OR_RED]: { [CrewType.CAPTAIN]: 5 },
  [CrewEnhancementEvent.DECLOAK_FOREIGN_SPACECRAFT]: { [CrewType.SCIENCE]: 10 },
  [CrewEnhancementEvent.ION_STORM_FLIGHT]: { [CrewType.NAVIGATION]: 10 },
  [CrewEnhancementEvent.FOREIGN_COLONY_SCAN]: { [CrewType.SCIENCE]: 10 },
  [CrewEnhancementEvent.START_FOREIGN_SUBSPACE_ANALYSIS]: { [CrewType.SCIENCE]: 10 },
  [CrewEnhancementEvent.SUBSPACE_ELLIPSE_TICK]: { [CrewType.SCIENCE]: 5 },
  [CrewEnhancementEvent.ATTACK_FOREIGN_COLONY]: { [CrewType.SECURITY]: 10 },
  [CrewEnhancementEvent.CONSTRUCTION_CREATED]: { [CrewType.TECHNICAL]: 10 },
  [CrewEnhancementEvent.BEAM_COMMODITIES]: { [CrewType.TECHNICAL]: 2 },
  [CrewEnhancementEvent.WARP_FLIGHT_WITHOUT_DEFLECTOR_ENERGY]: { [CrewType.NAVIGATION]: 5 },
  [CrewEnhancementEvent.MAINTENANCE_TICK]: { [CrewType.TECHNICAL]: 1 },
};

export function crewRankDefinition(rank: CrewRank) {
  return CREW_RANKS.find((definition) => definition.rank === rank)!;
}

export function automaticCrewRank(expertise: number): CrewRank {
  return [...CREW_RANKS]
    .reverse()
    .find((definition) => definition.expertise <= expertise && definition.expertise <= 5_000)!.rank;
}

export function nextPromotableRank(rank: CrewRank, highestExpertise: number) {
  const index = CREW_RANKS.findIndex((definition) => definition.rank === rank);
  const next = CREW_RANKS[index + 1];
  return next && next.expertise > 5_000 && highestExpertise >= next.expertise ? next : null;
}
