import { useCallback, useEffect, useState } from 'react';
import {
  WsEventType,
  type DatabaseAwardCategory,
  type DatabaseCategoryProgressDto,
} from '@swuniverse/shared';
import { useSocket } from '../../hooks/use-socket';
import { api } from '../../services/api';

const LABELS: Record<DatabaseAwardCategory, string> = {
  SHIP_HULLS: 'Schiffsrümpfe',
  PLANET_TYPES: 'Planetentypen',
  SYSTEM_TYPES: 'Sternensystemtypen',
  SYSTEMS: 'Sternensysteme',
};

/**
 * Discovery progress per database category from the backend contract; star
 * systems per known layer. Nothing is counted here.
 */
export function DatabaseProgress() {
  const [rows, setRows] = useState<DatabaseCategoryProgressDto[] | null>(null);
  const load = useCallback(() => {
    void api
      .get<DatabaseCategoryProgressDto[]>('/database/category-progress')
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);
  useSocket(WsEventType.DATABASE_ENTRY_DISCOVERED, load);
  useSocket(WsEventType.AWARD_GRANTED, load);

  if (!rows?.length) return null;
  return (
    <section aria-label="Entdeckungsfortschritt" className="max-w-5xl border border-swu-border bg-black/30">
      <h2 className="border-b border-swu-border px-2 py-1 text-center text-sm font-bold text-swu-primary">
        Entdeckungsfortschritt
      </h2>
      <ul className="grid gap-x-4 p-2 text-sm sm:grid-cols-2">
        {rows.map((row) => (
          <li key={`${row.category}:${row.layerId ?? ''}`} className="flex justify-between gap-2 px-1 py-0.5">
            <span className="text-swu-text">
              {LABELS[row.category]}
              {row.category === 'SYSTEMS' && row.layerName ? ` · ${row.layerName}` : ''}
            </span>
            <span className={row.completed ? 'text-swu-positive' : 'text-swu-muted'}>
              {row.discovered} / {row.total} entdeckt
              {row.awarded && <span className="ml-1" title="Award erhalten">★</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
