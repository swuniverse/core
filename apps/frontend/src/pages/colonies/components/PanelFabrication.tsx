import { useMemo, useState } from 'react';
import type {
  ColonyDetailV2,
  ColonyEffectiveFunction,
  CommodityDef,
} from '../types';
import { formatBuildTime } from '../utils';

// ─── Panel: Fabrikation ──────────────────────────────────────

export function PanelFabrication({
  catalog,
  queue,
  activeFunctionIds,
  presentFunctions = [],
  commodityMap,
  onStartFabrication,
  onCancelFabrication,
}: {
  catalog: NonNullable<ColonyDetailV2['fabricationCatalog']>;
  queue: NonNullable<ColonyDetailV2['fabricationQueue']>;
  activeFunctionIds: number[];
  presentFunctions?: ColonyEffectiveFunction[];
  commodityMap: Record<number, CommodityDef>;
  onStartFabrication: (
    itemKey: string,
    queueType: 'MODULE' | 'TORPEDO',
    buildingFunctionId: number,
  ) => Promise<void> | void;
  onCancelFabrication: (queueId: number) => Promise<void> | void;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeFunctionSet = useMemo(
    () => new Set(activeFunctionIds),
    [activeFunctionIds],
  );

  const startItem = async (
    item: NonNullable<ColonyDetailV2['fabricationCatalog']>[number],
  ) => {
    const buildingFunctionId = item.buildingFunctionIds.find((functionId) =>
      activeFunctionSet.has(functionId),
    );
    if (!buildingFunctionId) return;
    setBusyKey(item.itemKey);
    setError(null);
    try {
      await onStartFabrication(
        item.itemKey,
        item.queueType,
        buildingFunctionId,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fabrikation fehlgeschlagen');
    } finally {
      setBusyKey(null);
    }
  };

  const cancelJob = async (queueId: number) => {
    setBusyKey(`queue-${queueId}`);
    setError(null);
    try {
      await onCancelFabrication(queueId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Abbruch fehlgeschlagen');
    } finally {
      setBusyKey(null);
    }
  };

  const presentFunctionMap = useMemo(
    () => new Map(presentFunctions.map((fn) => [fn.id, fn])),
    [presentFunctions],
  );

  const groupedCatalog = useMemo(() => {
    const groups = new Map<
      number,
      NonNullable<ColonyDetailV2['fabricationCatalog']>
    >();
    for (const item of catalog) {
      const functionId =
        item.buildingFunctionIds.find((id) => presentFunctionMap.has(id)) ??
        item.buildingFunctionIds[0];
      groups.set(functionId, [...(groups.get(functionId) ?? []), item]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [catalog, presentFunctionMap]);

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
        <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
          Aktive Fertigung
        </div>
        {queue.length === 0 ? (
          <div className="text-xs text-swu-muted">Keine aktiven Jobs.</div>
        ) : (
          <div className="space-y-1 text-xs">
            {queue.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between gap-2 border-b border-swu-border/20 pb-1 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="font-bold text-swu-primary truncate">
                    {job.amount}× {job.displayName}
                  </div>
                  <div className="text-[10px] text-swu-muted">
                    {job.functionName} · bis{' '}
                    {new Date(job.finishesAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => cancelJob(job.id)}
                  disabled={busyKey === `queue-${job.id}`}
                  className="px-2 py-1 rounded bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                >
                  Abbrechen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-swu-surface border border-swu-border rounded divide-y divide-swu-border/20">
        {groupedCatalog.map(([functionId, items]) => (
          <div key={functionId}>
            <div className="px-3 py-1 text-[10px] font-bold text-swu-muted uppercase bg-swu-bg/40">
              {presentFunctionMap.get(functionId)?.name ??
                `Funktion #${functionId}`}{' '}
              {activeFunctionSet.has(functionId) ? (
                <span className="text-green-400">aktiv</span>
              ) : (
                <span className="text-yellow-400">inaktiv</span>
              )}
            </div>
            {items.map((item) => {
              const output = commodityMap[item.outputCommodityId];
              const canStart = item.buildingFunctionIds.some((functionId) =>
                activeFunctionSet.has(functionId),
              );
              return (
                <div key={item.itemKey} className="px-3 py-2 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-swu-primary truncate">
                        {item.displayName}
                      </div>
                      <div className="text-[10px] text-swu-muted">
                        Output: {item.outputAmount}×{' '}
                        {output?.name ?? `Ware #${item.outputCommodityId}`} ·{' '}
                        {formatBuildTime(item.durationSeconds)}
                      </div>
                    </div>
                    <button
                      onClick={() => startItem(item)}
                      disabled={!canStart || busyKey === item.itemKey}
                      className="px-2 py-1 rounded bg-swu-accent/15 text-swu-accent hover:bg-swu-accent/25 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Starten
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] text-swu-muted">
                    {item.costs.map((cost) => (
                      <span key={cost.commodityId}>
                        {cost.amount}{' '}
                        {commodityMap[cost.commodityId]?.name ??
                          cost.commodityId}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
