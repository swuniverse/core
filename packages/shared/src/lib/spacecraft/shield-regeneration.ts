export const SHIELD_REGENERATION_INTERVAL_MS = 15 * 60_000;

export interface ShieldRegenerationInput {
  shields: number;
  shieldsMax: number;
  crew: number;
  crewRequired: number;
  shieldSystem?: {
    active: boolean;
    integrity: number;
    regenerationStartedAt?: number;
  };
  status?: string;
  rpgHidden?: boolean;
  fieldEffects?: readonly string[];
  anomalyTypes?: readonly string[];
}

/** STU ShieldRegeneration: one free, capped, rounded-up step when due. */
export function getShieldRegenerationRate(
  input: ShieldRegenerationInput,
  now = Date.now(),
): number {
  const system = input.shieldSystem;
  if (
    !system ||
    system.active !== false ||
    !(system.integrity > 0) ||
    input.rpgHidden === true ||
    ['DESTROYED', 'UNDER_CONSTRUCTION', 'UNDER_SCRAPPING'].includes(
      input.status ?? '',
    ) ||
    !Number.isFinite(input.shieldsMax) ||
    input.shieldsMax <= 0 ||
    !Number.isFinite(input.shields) ||
    input.shields < 0 ||
    input.shields >= input.shieldsMax ||
    !Number.isFinite(input.crew) ||
    !Number.isFinite(input.crewRequired) ||
    input.crew < input.crewRequired ||
    input.fieldEffects?.includes('SHIELD_MALFUNCTION') ||
    input.anomalyTypes?.some(
      (type) => type === 'ION_STORM' || type === 'SUBSPACE_ELLIPSE',
    )
  )
    return 0;
  const timer = system.regenerationStartedAt ?? 0;
  if (
    !Number.isFinite(timer) ||
    !Number.isFinite(now) ||
    timer > now - SHIELD_REGENERATION_INTERVAL_MS
  )
    return 0;
  return Math.min(
    input.shieldsMax - input.shields,
    Math.ceil(input.shieldsMax / 10),
  );
}
