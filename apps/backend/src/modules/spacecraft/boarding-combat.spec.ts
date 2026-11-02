import { CrewType } from '../colony/entities/crew.entity';
import { resolveBoardingCombat } from './boarding-combat';

describe('resolveBoardingCombat', () => {
  const crew = (id: number, type: CrewType) => ({ id, type });

  it('uses the strongest five crew and removes one defender on an attacker roll', () => {
    const result = resolveBoardingCombat(
      [
        crew(1, CrewType.SCIENCE),
        crew(2, CrewType.SECURITY),
        crew(3, CrewType.CAPTAIN),
        crew(4, CrewType.COMMAND),
        crew(5, CrewType.TECHNICAL),
        crew(6, CrewType.SCIENCE),
      ],
      [crew(7, CrewType.SECURITY)],
      { integer: () => 0 },
    );

    expect(result.winner).toBe('ATTACKER');
    expect(result.defenderLossIds).toEqual([7]);
    expect(result.attackerLossIds).toEqual([]);
    expect(result.attackerCombatantIds).not.toContain(6);
  });

  it('removes attackers until the defender wins', () => {
    const rolls = [Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER, 0];
    const result = resolveBoardingCombat(
      [crew(1, CrewType.CREWMAN), crew(2, CrewType.CREWMAN)],
      [crew(3, CrewType.SECURITY)],
      { integer: () => rolls.shift() ?? 0 },
    );

    expect(result.winner).toBe('DEFENDER');
    expect(result.attackerLossIds).toEqual([1, 2]);
    expect(result.defenderLossIds).toEqual([]);
  });
});
