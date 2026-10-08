import type {
  StarmapContactReason,
  StarmapContactStance,
} from '@swuniverse/shared';

/** Display texts shared by the starmap ship markers and the contact panel. */
export const CONTACT_REASON_LABELS: Record<StarmapContactReason, string> = {
  OWN: 'Eigenes Schiff',
  ALLIANCE: 'Allianzschiff',
  SHARED_LIVE_POSITION: 'Geteilte Position',
};

export const CONTACT_STANCE_LABELS: Record<StarmapContactStance, string> = {
  FRIEND: 'Freund',
  NEUTRAL: 'Neutral',
  ENEMY: 'Feind',
};

/** Stance symbols, so the stance is recognisable without colour perception. */
export const CONTACT_STANCE_SYMBOLS: Record<StarmapContactStance, string> = {
  FRIEND: '+',
  NEUTRAL: '○',
  ENEMY: '×',
};
