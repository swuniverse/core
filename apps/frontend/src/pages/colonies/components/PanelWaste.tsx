import { useMemo, useState } from 'react';
import { commodityImage } from '../../../lib/assets';
import type { ColonyDetailV2 } from '../types';

type PanelWasteProps = {
  detail: ColonyDetailV2;
  onDiscardStorage: (
    items: Array<{ commodityId: number; amount: number }>,
  ) => Promise<void> | void;
};

export function PanelWaste({ detail, onDiscardStorage }: PanelWasteProps) {
  const [discardAmounts, setDiscardAmounts] = useState<Record<number, string>>(
    {},
  );
  const [discarding, setDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);

  const discardItems = useMemo(
    () =>
      Object.entries(discardAmounts)
        .map(([commodityId, amount]) => ({
          commodityId: Number(commodityId),
          amount: Math.floor(Number(amount)),
        }))
        .filter((item) => item.amount > 0),
    [discardAmounts],
  );
  const selectedTotal = useMemo(
    () => discardItems.reduce((sum, item) => sum + item.amount, 0),
    [discardItems],
  );

  const handleDiscard = async () => {
    if (discardItems.length === 0) return;
    setDiscarding(true);
    setDiscardError(null);
    try {
      await onDiscardStorage(discardItems);
      setDiscardAmounts({});
    } catch (error: unknown) {
      setDiscardError(
        error instanceof Error ? error.message : 'Entsorgung fehlgeschlagen',
      );
    } finally {
      setDiscarding(false);
    }
  };

  const inventory = useMemo(
    () =>
      [...detail.inventory]
        .filter((item) => item.amount > 0)
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name, 'de') || a.commodityId - b.commodityId,
        ),
    [detail.inventory],
  );

  return (
    <div className="space-y-2">
      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <div className="text-[10px] font-bold text-swu-muted uppercase">
              Waren entsorgen
            </div>
            <div className="text-[10px] text-swu-muted">
              Entsorgung ist nur mit Lagergebäude verfügbar.
            </div>
          </div>
          <div className="text-[10px] text-swu-muted">
            Lagerfunktion #{detail.waste?.requiredFunctionId ?? 23}
          </div>
        </div>

        {inventory.length === 0 ? (
          <div className="text-xs text-swu-muted">
            Keine Waren im Lager vorhanden.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[10px]">
              {inventory.map((item) => {
                const amount = discardAmounts[item.commodityId] ?? '';
                const isSelected = Number(amount) > 0;
                return (
                  <label
                    key={item.commodityId}
                    className={`flex items-center gap-2 rounded border px-2 py-1.5 transition-colors ${
                      isSelected
                        ? 'border-red-400/50 bg-red-900/10'
                        : 'border-swu-border/50 hover:border-swu-accent/50'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-swu-bg/70 border border-swu-border/40">
                      <img
                        src={commodityImage(item.commodityId, item.name)}
                        alt=""
                        className="h-7 w-7 object-contain"
                        loading="lazy"
                      />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-swu-primary">
                        {item.name}
                      </span>
                      <span className="block text-[9px] text-swu-muted">
                        Bestand{' '}
                        <span className="font-mono text-swu-muted">
                          {item.amount}
                        </span>
                        {item.delta !== 0 && (
                          <span
                            className={
                              item.delta > 0
                                ? 'ml-1 text-green-400'
                                : 'ml-1 text-red-400'
                            }
                          >
                            {item.delta > 0 ? '+' : ''}
                            {item.delta}/Tick
                          </span>
                        )}
                      </span>
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={item.amount}
                      value={amount}
                      onChange={(event) => {
                        const next = event.target.value;
                        setDiscardAmounts((current) => {
                          if (next === '' || Number(next) <= 0) {
                            const updated = { ...current };
                            delete updated[item.commodityId];
                            return updated;
                          }
                          return {
                            ...current,
                            [item.commodityId]: String(
                              Math.min(item.amount, Math.max(0, Number(next))),
                            ),
                          };
                        });
                      }}
                      className="w-20 rounded border border-swu-border bg-swu-bg px-2 py-1 text-right font-mono text-swu-primary focus:outline-none focus:border-swu-accent"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              +{' '}
              <div className="text-[10px] text-swu-muted">
                + Ausgewählt: +{' '}
                <span className="font-mono text-swu-primary">
                  + {selectedTotal}+{' '}
                </span>
                +{' '}
              </div>
              <button
                onClick={handleDiscard}
                disabled={discarding || discardItems.length === 0}
                className="px-2 py-1 rounded border border-red-500/50 bg-red-900/20 text-[10px] text-red-300 disabled:opacity-40"
              >
                {discarding ? 'Entsorge…' : 'Ausgewählte Waren entsorgen'}
              </button>
              <button
                onClick={() => setDiscardAmounts({})}
                disabled={
                  discarding || Object.keys(discardAmounts).length === 0
                }
                className="px-2 py-1 rounded border border-swu-border text-[10px] text-swu-muted disabled:opacity-40"
              >
                Zurücksetzen
              </button>
            </div>

            {discardError && (
              <div className="text-[10px] text-red-400">{discardError}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
