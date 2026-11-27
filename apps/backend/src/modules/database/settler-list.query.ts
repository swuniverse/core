import {
  DATABASE_SETTLER_SORT_FIELDS,
  type DatabaseSettlerSortField,
  type DatabaseSettlerSortOrder,
} from '@swuniverse/shared';

export interface SettlerListQuery {
  page: number;
  sort: DatabaseSettlerSortField;
  order: DatabaseSettlerSortOrder;
  search: string;
}

const MAX_SEARCH_LENGTH = 100;

/** Raw query strings to a safe query; anything invalid falls back to id ascending, page 1. */
export function parseSettlerListQuery(raw: {
  page?: string;
  sort?: string;
  order?: string;
  search?: string;
}): SettlerListQuery {
  return {
    page: Math.max(1, Math.trunc(Number(raw.page)) || 1),
    sort: (DATABASE_SETTLER_SORT_FIELDS as readonly string[]).includes(raw.sort ?? '')
      ? (raw.sort as DatabaseSettlerSortField)
      : 'id',
    order: raw.order === 'desc' ? 'desc' : 'asc',
    search: (raw.search ?? '').trim().slice(0, MAX_SEARCH_LENGTH),
  };
}
