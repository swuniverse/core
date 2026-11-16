export enum InteractionRule {
  POSITION = 'POSITION',
  SOURCE_CREW = 'SOURCE_CREW',
  SOURCE_COMBAT_CAPABLE = 'SOURCE_COMBAT_CAPABLE',
  SOURCE_UNHYPERSPACED = 'SOURCE_UNHYPERSPACED',
  TARGET_UNHYPERSPACED = 'TARGET_UNHYPERSPACED',
  SOURCE_UNCLOAKED = 'SOURCE_UNCLOAKED',
  TARGET_UNCLOAKED = 'TARGET_UNCLOAKED',
  TARGET_DETECTED = 'TARGET_DETECTED',
  SOURCE_UNSHIELDED = 'SOURCE_UNSHIELDED',
  TARGET_UNSHIELDED = 'TARGET_UNSHIELDED',
  TARGET_VACATION = 'TARGET_VACATION',
  SOURCE_INTACT = 'SOURCE_INTACT',
  TARGET_INTACT = 'TARGET_INTACT',
  SOURCE_UNBLOCKED = 'SOURCE_UNBLOCKED',
  SOURCE_UNTRACTORED = 'SOURCE_UNTRACTORED',
  TARGET_UNBLOCKED = 'TARGET_UNBLOCKED',
  STANCE = 'STANCE',
}

export interface InteractionContext {
  samePosition: boolean;
  sourceHasSufficientCrew: boolean;
  sourceCombatCapable: boolean;
  sourceInHyperspace: boolean;
  targetInHyperspace: boolean;
  sourceCloaked: boolean;
  targetCloaked: boolean;
  /** A fresh scan permits an attack on this foreign target at the same field. */
  targetCloakDetected?: boolean;
  sourceShieldsActive: boolean;
  targetShieldsActive: boolean;
  targetOnVacation: boolean;
  sourceDestroyed: boolean;
  targetDestroyed: boolean;
  sourceBlocked: boolean;
  sourceTractored?: boolean;
  targetBlocked: boolean;
  stanceAllowed: boolean;
  /** Docked to a station; ion storm hooks exempt docked ships. Absent means not docked. */
  sourceDocked?: boolean;
  targetDocked?: boolean;
}

export interface InteractionDecision {
  allowed: boolean;
  reason: string | null;
}

type InteractionCheck = {
  rejected: (context: InteractionContext) => boolean;
  reason: string | null;
};

const CHECKS: Record<InteractionRule, InteractionCheck> = {
  [InteractionRule.POSITION]: {
    rejected: (context) => !context.samePosition,
    reason: null,
  },
  [InteractionRule.SOURCE_CREW]: {
    rejected: (context) => !context.sourceHasSufficientCrew,
    reason: 'Nicht genügend Crew vorhanden',
  },
  [InteractionRule.SOURCE_COMBAT_CAPABLE]: {
    rejected: (context) => !context.sourceCombatCapable,
    reason: 'Das Schiff ist kampfunfähig',
  },
  [InteractionRule.SOURCE_UNHYPERSPACED]: {
    rejected: (context) => context.sourceInHyperspace,
    reason: 'Der Warpantrieb ist aktiviert',
  },
  [InteractionRule.TARGET_UNHYPERSPACED]: {
    rejected: (context) => context.targetInHyperspace,
    reason: 'Das Ziel hat den Warpantrieb aktiviert',
  },
  [InteractionRule.SOURCE_UNCLOAKED]: {
    rejected: (context) => context.sourceCloaked,
    reason: 'Die Tarnung ist aktiviert',
  },
  [InteractionRule.TARGET_UNCLOAKED]: {
    rejected: (context) => context.targetCloaked,
    reason: 'Das Ziel ist nicht erreichbar',
  },
  [InteractionRule.TARGET_DETECTED]: {
    rejected: (context) => context.targetCloaked && !context.targetCloakDetected,
    reason: 'Das Ziel ist nicht erreichbar',
  },
  [InteractionRule.SOURCE_UNSHIELDED]: {
    rejected: (context) => context.sourceShieldsActive,
    reason: 'Die Schilde sind aktiviert',
  },
  [InteractionRule.TARGET_UNSHIELDED]: {
    rejected: (context) => context.targetShieldsActive,
    reason: 'Das Ziel hat die Schilde aktiviert',
  },
  [InteractionRule.TARGET_VACATION]: {
    rejected: (context) => context.targetOnVacation,
    reason: 'Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!',
  },
  [InteractionRule.SOURCE_INTACT]: {
    rejected: (context) => context.sourceDestroyed,
    reason: 'Schiff ist zerstört',
  },
  [InteractionRule.TARGET_INTACT]: {
    rejected: (context) => context.targetDestroyed,
    reason: 'Ziel ist zerstört',
  },
  [InteractionRule.SOURCE_UNBLOCKED]: {
    rejected: (context) => context.sourceBlocked,
    reason: 'Die Kolonie wird blockiert.',
  },
  [InteractionRule.SOURCE_UNTRACTORED]: {
    rejected: (context) => context.sourceTractored === true,
    reason: 'Das Schiff wird von einem Traktorstrahl gehalten',
  },
  [InteractionRule.TARGET_UNBLOCKED]: {
    rejected: (context) => context.targetBlocked,
    reason: 'Das Ziel wird blockiert.',
  },
  [InteractionRule.STANCE]: {
    rejected: (context) => !context.stanceAllowed,
    reason: 'Transfer nur zwischen Freunden erlaubt',
  },
};

export function checkInteraction(
  context: InteractionContext,
  rules: readonly InteractionRule[],
): InteractionDecision {
  for (const rule of rules) {
    const check = CHECKS[rule];
    if (check.rejected(context)) {
      return { allowed: false, reason: check.reason };
    }
  }

  return { allowed: true, reason: null };
}
