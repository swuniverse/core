import { useMemo, useState } from 'react';
import { commodityImage } from '../../../lib/assets';
import type { ColonyDetailV2, ColonyStorageItem, CommodityDef } from '../types';
import { formatSignedAmount } from '../utils';

type FilterKey = 'all' | 'critical' | 'consuming' | 'producing' | 'neutral';

const filterLabels: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Alle' },
  { key: 'critical', label: 'Kritisch' },
  { key: 'consuming', label: 'Verbrauch' },
  { key: 'producing', label: 'Produktion' },
  { key: 'neutral', label: 'Neutral' },
];

function getLabel(
  commodityMap: Record<number, CommodityDef>,
  detail: ColonyDetailV2 | undefined,
  commodityId: number,
) {
  return (
    commodityMap[commodityId]?.name ||
    commodityMap[commodityId]?.nameShort ||
    detail?.inventory.find((item) => item.commodityId === commodityId)?.name ||
    detail?.productionDeltas.find((item) => item.commodityId === commodityId)
      ?.name ||
    `Ware #${commodityId}`
  );
}

export function SupplyDock({
  storage,
  detail,
  commodityMap,
}: {
  storage: ColonyStorageItem[];
  detail?: ColonyDetailV2;
  commodityMap: Record<number, CommodityDef>;
}) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const current =
    detail?.storage.current ??
    storage.reduce((sum, item) => sum + item.amount, 0);
  const max = detail?.storage.max ?? 0;
  const percent =
    max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;

  const rows = useMemo(() => {
    return storage
      .map((item) => {
        const delta = detail?.productionDeltas.find(
          (d) => d.commodityId === item.commodityId,
        )?.amount;
        return {
          item,
          delta,
          label: getLabel(commodityMap, detail, item.commodityId),
        };
      })
      .sort((a, b) => {
        const rank = (row: { item: ColonyStorageItem; delta?: number }) => {
          if (row.item.amount <= 0 || (row.delta ?? 0) < 0) return 0;
          if ((row.delta ?? 0) > 0) return 1;
          return 2;
        };
        const rankDiff = rank(a) - rank(b);
        if (rankDiff !== 0) return rankDiff;
        if (b.item.amount !== a.item.amount)
          return b.item.amount - a.item.amount;
        return a.label.localeCompare(b.label, 'de');
      });
  }, [commodityMap, detail, storage]);

  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = {
      all: rows.length,
      critical: 0,
      consuming: 0,
      producing: 0,
      neutral: 0,
    };
    for (const row of rows) {
      if (row.item.amount <= 0 || (row.delta ?? 0) < 0) result.critical += 1;
      if ((row.delta ?? 0) < 0) result.consuming += 1;
      else if ((row.delta ?? 0) > 0) result.producing += 1;
      else result.neutral += 1;
    }
    return result;
  }, [rows]);

  const filteredRows = rows.filter((row) => {
    if (filter === 'all') return true;
    if (filter === 'critical')
      return row.item.amount <= 0 || (row.delta ?? 0) < 0;
    if (filter === 'consuming') return (row.delta ?? 0) < 0;
    if (filter === 'producing') return (row.delta ?? 0) > 0;
    return (row.delta ?? 0) === 0;
  });

  return (
    <section className="rounded border border-swu-border bg-swu-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-swu-muted">
            Versorgung / Lager
          </div>
          <div className="mt-0.5 text-xs text-swu-primary">
            <span className="font-mono">
              {current}/{max || '∞'}
            </span>
            {max > 0 && <span className="text-swu-muted"> · {percent}%</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {filterLabels.map((entry) => (
            <button
              key={entry.key}
              onClick={() => setFilter(entry.key)}
              className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                filter === entry.key
                  ? 'border-swu-accent bg-swu-accent/10 text-swu-accent'
                  : 'border-swu-border/60 text-swu-muted hover:text-swu-primary'
              }`}
            >
              {entry.label} {counts[entry.key]}
            </button>
          ))}
        </div>
      </div>

      {max > 0 && (
        <div className="mt-2 h-2 overflow-hidden rounded bg-swu-bg border border-swu-border/40">
          <div
            className={`h-full ${percent >= 90 ? 'bg-red-400' : percent >= 75 ? 'bg-yellow-400' : 'bg-swu-accent'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {filteredRows.length === 0 ? (
        <div className="mt-3 rounded border border-swu-border/40 bg-swu-bg/30 px-3 py-2 text-xs text-swu-muted">
          Keine Waren in dieser Ansicht.
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          {filteredRows.map(({ item, delta, label }) => {
            const critical = item.amount <= 0 || (delta ?? 0) < 0;
            return (
              <div
                key={item.commodityId}
                title={label}
                className={`flex min-w-0 items-center gap-2 rounded border px-2 py-1.5 ${
                  critical
                    ? 'border-red-500/40 bg-red-950/20'
                    : 'border-swu-border/50 bg-swu-bg/30'
                }`}
              >
                <img
                  src={commodityImage(
                    item.commodityId,
                    commodityMap[item.commodityId]?.name,
                  )}
                  alt=""
                  className="h-6 w-6 shrink-0 object-contain"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] text-swu-primary">
                    {label}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-swu-muted">{item.amount}</span>
                    {delta != null && (
                      <span
                        className={
                          delta >= 0 ? 'text-green-400' : 'text-red-400'
                        }
                      >
                        {formatSignedAmount(delta)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
