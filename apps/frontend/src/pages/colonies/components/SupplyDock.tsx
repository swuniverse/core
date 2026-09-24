import { useMemo } from 'react';
import { commodityImage } from '../../../lib/assets';
import type { ColonyDetailV2, ColonyStorageItem, CommodityDef } from '../types';
import { formatSignedAmount } from '../utils';

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
  onOpenCommodityLocations,
}: {
  storage: ColonyStorageItem[];
  detail?: ColonyDetailV2;
  commodityMap: Record<number, CommodityDef>;
  onOpenCommodityLocations: (commodityId: number, trigger: HTMLElement) => void;
}) {
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

  return (
    <section className="rounded border border-swu-border bg-swu-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-swu-muted">
            Lagerraum
          </div>
          <div className="mt-0.5 text-xs text-swu-primary">
            <span className="font-mono">
              {current}/{max || '∞'}
            </span>
            {detail?.storage.delta != null && (
              <span
                className={
                  detail.storage.delta >= 0
                    ? 'ml-1 font-mono text-green-400'
                    : 'ml-1 font-mono text-red-400'
                }
              >
                {formatSignedAmount(detail.storage.delta)}
              </span>
            )}
            {max > 0 && <span className="text-swu-muted"> · {percent}%</span>}
          </div>
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

      {rows.length === 0 ? (
        <div className="mt-3 rounded border border-swu-border/40 bg-swu-bg/30 px-3 py-2 text-xs text-swu-muted">
          Keine Waren in dieser Ansicht.
        </div>
      ) : (
        <div role="list" className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {rows.map(({ item, delta, label }) => {
            const critical = item.amount <= 0 || (delta ?? 0) < 0;
            return (
              <div
                key={item.commodityId}
                role="listitem"
                aria-label={`${label} Lagerbestand`}
                className={`grid min-w-0 grid-cols-[2rem_4rem_minmax(0,1fr)_3.5rem] items-center gap-2 rounded border px-2 py-1 ${
                  critical
                    ? 'border-red-500/40 bg-red-950/20'
                    : 'border-swu-border/50 bg-swu-bg/30'
                }`}
              >
                <button
                  type="button"
                  title={label}
                  aria-label={`Lagerorte für ${label} anzeigen`}
                  data-testid="storage-cell"
                  onClick={(event) =>
                    onOpenCommodityLocations(
                      item.commodityId,
                      event.currentTarget,
                    )
                  }
                  className="flex h-7 w-7 items-center justify-center rounded border border-swu-border/50 bg-swu-bg/50 hover:border-swu-accent focus:outline-none focus:ring-1 focus:ring-swu-accent"
                >
                  <img
                    src={commodityImage(
                      item.commodityId,
                      commodityMap[item.commodityId]?.name,
                    )}
                    alt=""
                    className="h-6 w-6 object-contain"
                    loading="lazy"
                  />
                </button>
                <span
                  data-testid="storage-cell"
                  className="text-right font-mono text-xs tabular-nums text-swu-primary"
                >
                  {item.amount}
                </span>
                <span
                  data-testid="storage-cell"
                  className="min-w-0 text-xs text-swu-primary"
                >
                  {label}
                </span>
                <span
                  data-testid="storage-cell"
                  className={`text-right font-mono text-xs tabular-nums ${
                    delta == null || delta === 0
                      ? 'text-swu-muted'
                      : delta > 0
                        ? 'text-green-400'
                        : 'text-red-400'
                  }`}
                >
                  {delta == null || delta === 0
                    ? '-'
                    : formatSignedAmount(delta)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
