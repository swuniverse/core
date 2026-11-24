import { AlliancePermission, AllianceRole } from '@swuniverse/shared';

const P = AlliancePermission;

/** Standard roles of every new alliance (migration uses the same values). */
export const STANDARD_ALLIANCE_ROLES = {
  [AllianceRole.PRESIDENT]: {
    title: 'Präsident',
    sort: 1,
    permissions: [P.FOUNDER],
  },
  [AllianceRole.VICE]: {
    title: 'Vize-Präsident',
    sort: 2,
    permissions: [
      P.SUCCESSOR,
      P.ALLIANCE_LEADERSHIP,
      P.EDIT_ALLIANCE,
      P.MANAGE_APPLICATIONS,
      P.MANAGE_JOBS,
      P.VIEW_COLONIES,
      P.VIEW_MEMBER_DATA,
      P.VIEW_SHIPS,
      P.VIEW_ALLIANCE_STORAGE,
      P.VIEW_ALLIANCE_HISTORY,
    ],
  },
  [AllianceRole.DIPLOMAT]: {
    title: 'Diplomat',
    sort: 3,
    permissions: [P.DIPLOMATIC, P.CREATE_AGREEMENTS, P.EDIT_DIPLOMATIC_DOCUMENTS],
  },
} as const satisfies Record<
  Exclude<AllianceRole, AllianceRole.NONE>,
  { title: string; sort: number; permissions: AlliancePermission[] }
>;

export const ALLIANCE_NAME_MIN = 5;
export const ALLIANCE_NAME_MAX = 40;
export const ALLIANCE_DESCRIPTION_MAX = 10000;
export const ALLIANCE_HOMEPAGE_MAX = 255;
export const ALLIANCE_TITLE_MIN = 3;
export const ALLIANCE_TITLE_MAX = 30;

/** Page size of the diplomacy and the internal alliance chronicle. */
export const ALLIANCE_CHRONICLE_PAGE_DEFAULT = 20;
export const ALLIANCE_CHRONICLE_PAGE_MAX = 50;

/** Counterparty search of the Siedler diplomacy: bounded page and query. */
export const SETTLER_SEARCH_PAGE_DEFAULT = 20;
export const SETTLER_SEARCH_PAGE_MAX = 50;
export const SETTLER_SEARCH_QUERY_MAX = 40;
