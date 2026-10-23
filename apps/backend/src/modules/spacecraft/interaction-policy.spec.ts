import {
  checkInteraction,
  type InteractionContext,
  InteractionRule,
} from './interaction-policy';

const allowedContext = (): InteractionContext => ({
  samePosition: true,
  sourceHasSufficientCrew: true,
  sourceCombatCapable: true,
  sourceInHyperspace: false,
  targetInHyperspace: false,
  sourceShieldsActive: false,
  targetShieldsActive: false,
  targetOnVacation: false,
  sourceDestroyed: false,
  targetDestroyed: false,
  sourceBlocked: false,
  targetBlocked: false,
  stanceAllowed: true,
});

const allRules = Object.values(InteractionRule);

describe('interaction policy', () => {
  it.each([
    ['position', { samePosition: false }, null],
    [
      'crew',
      { sourceHasSufficientCrew: false },
      'Nicht genügend Crew vorhanden',
    ],
    [
      'combat capability',
      { sourceCombatCapable: false },
      'Das Schiff ist kampfunfähig',
    ],
    [
      'source hyperspace',
      { sourceInHyperspace: true },
      'Der Warpantrieb ist aktiviert',
    ],
    [
      'target hyperspace',
      { targetInHyperspace: true },
      'Das Ziel hat den Warpantrieb aktiviert',
    ],
    ['source shields', { sourceShieldsActive: true }, 'Die Schilde sind aktiviert'],
    [
      'target shields',
      { targetShieldsActive: true },
      'Das Ziel hat die Schilde aktiviert',
    ],
    [
      'vacation',
      { targetOnVacation: true },
      'Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!',
    ],
    ['source destruction', { sourceDestroyed: true }, 'Schiff ist zerstört'],
    ['target destruction', { targetDestroyed: true }, 'Ziel ist zerstört'],
    ['source blockade', { sourceBlocked: true }, 'Die Kolonie wird blockiert.'],
    ['target blockade', { targetBlocked: true }, 'Das Ziel wird blockiert.'],
    ['stance', { stanceAllowed: false }, 'Transfer nur zwischen Freunden erlaubt'],
  ] satisfies Array<[string, Partial<InteractionContext>, string | null]>) (
    'rejects by %s while preserving its message',
    (_name, override, reason) => {
      expect(checkInteraction({ ...allowedContext(), ...override }, allRules)).toEqual({
        allowed: false,
        reason,
      });
    },
  );

  it('allows an interaction when every requested rule passes', () => {
    expect(checkInteraction(allowedContext(), allRules)).toEqual({
      allowed: true,
      reason: null,
    });
  });

  it('returns the first rejection in declaration order', () => {
    expect(
      checkInteraction(
        {
          ...allowedContext(),
          sourceHasSufficientCrew: false,
          targetOnVacation: true,
        },
        [InteractionRule.SOURCE_CREW, InteractionRule.TARGET_VACATION],
      ),
    ).toEqual({ allowed: false, reason: 'Nicht genügend Crew vorhanden' });
  });

  it('only evaluates requested rules', () => {
    expect(
      checkInteraction(
        { ...allowedContext(), targetShieldsActive: true },
        [InteractionRule.POSITION],
      ),
    ).toEqual({ allowed: true, reason: null });
  });
});
