export const DEFAULT_ALLIANCE_TITLES = {
  president: 'Präsident',
  vice: 'Vize-Präsident',
  diplomat: 'Diplomat',
} as const;

export const ALLIANCE_NAME_MIN = 5;
export const ALLIANCE_NAME_MAX = 40;
export const ALLIANCE_DESCRIPTION_MAX = 10000;
export const ALLIANCE_HOMEPAGE_MAX = 255;
export const ALLIANCE_TITLE_MIN = 3;
export const ALLIANCE_TITLE_MAX = 30;

/** Page size of the diplomacy and the internal alliance chronicle. */
export const ALLIANCE_CHRONICLE_PAGE_DEFAULT = 20;
export const ALLIANCE_CHRONICLE_PAGE_MAX = 50;
