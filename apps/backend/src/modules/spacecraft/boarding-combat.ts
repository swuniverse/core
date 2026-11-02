import { CrewType } from '../colony/entities/crew.entity';

export interface BoardingCrewMember {
  id: number;
  type: CrewType;
}

export interface BoardingRandom {
  integer(min: number, max: number): number;
}

export interface BoardingCombatResult {
  winner: 'ATTACKER' | 'DEFENDER';
  attackerCombatantIds: number[];
  defenderCombatantIds: number[];
  attackerLossIds: number[];
  defenderLossIds: number[];
}

const FIGHT_CAPABILITY: Record<CrewType, number> = {
  [CrewType.CAPTAIN]: 10,
  [CrewType.SECURITY]: 20,
  [CrewType.COMMAND]: 8,
  [CrewType.TECHNICAL]: 4,
  [CrewType.NAVIGATION]: 2,
  [CrewType.SCIENCE]: 0,
  [CrewType.CREWMAN]: 6,
};

const MAX_COMBATANTS = 5;

export function resolveBoardingCombat(
  attackerCrew: BoardingCrewMember[],
  defenderCrew: BoardingCrewMember[],
  random: BoardingRandom,
  attackerFactionScore = 1,
  defenderFactionScore = 1,
): BoardingCombatResult {
  const attackers = combatGroup(attackerCrew);
  const defenders = combatGroup(defenderCrew);
  const attackerCombatantIds = attackers.map(({ id }) => id);
  const defenderCombatantIds = defenders.map(({ id }) => id);
  const attackerLossIds: number[] = [];
  const defenderLossIds: number[] = [];

  while (attackers.length > 0 && defenders.length > 0) {
    const attackerValue = combatValue(attackers, attackerFactionScore);
    const defenderValue = combatValue(defenders, defenderFactionScore);
    const roll = random.integer(0, attackerValue + defenderValue);
    const casualties = roll <= attackerValue ? defenders : attackers;
    const lossIds = roll <= attackerValue ? defenderLossIds : attackerLossIds;
    const index = random.integer(0, casualties.length - 1);
    lossIds.push(casualties[index].id);
    casualties.splice(index, 1);
  }

  return {
    winner: attackers.length > 0 ? 'ATTACKER' : 'DEFENDER',
    attackerCombatantIds,
    defenderCombatantIds,
    attackerLossIds,
    defenderLossIds,
  };
}

function combatGroup(crew: BoardingCrewMember[]): BoardingCrewMember[] {
  return [...crew]
    .sort(
      (left, right) =>
        FIGHT_CAPABILITY[right.type] - FIGHT_CAPABILITY[left.type] ||
        left.id - right.id,
    )
    .slice(0, MAX_COMBATANTS);
}

function combatValue(crew: BoardingCrewMember[], factionScore: number): number {
  return crew.reduce(
    (sum, member) => sum + FIGHT_CAPABILITY[member.type] * factionScore,
    0,
  );
}
