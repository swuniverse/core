import { useEffect, useState } from 'react';
import type { TradeNetworkTransferTargetsDto } from '@swuniverse/shared';
import { formatNumber } from '../../lib/format';
import { api } from '../../services/api';

const buttonClass =
  'border border-swu-accent px-2 py-0.5 text-swu-accent hover:bg-swu-accent/10 disabled:cursor-not-allowed disabled:opacity-40';
const inputClass = 'border border-swu-border bg-swu-bg px-1 py-0.5';

/** STU `ShowTransferMenu`: send goods to an own account at another post of the network. */
export function TradeNetworkTransferDialog({
  tradePostId,
  commodityId,
  commodityName,
  stock,
  onClose,
  onTransferred,
}: {
  tradePostId: number;
  commodityId: number;
  commodityName: string;
  stock: number;
  onClose: () => void;
  onTransferred: (message: string) => Promise<void>;
}) {
  const [menu, setMenu] = useState<TradeNetworkTransferTargetsDto | null>(null);
  const [targetPostId, setTargetPostId] = useState<number | null>(null);
  const [amount, setAmount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<TradeNetworkTransferTargetsDto>(`/trade/posts/${tradePostId}/transfer-targets`)
      .then((next) => {
        if (cancelled) return;
        setMenu(next);
        setTargetPostId(next.targets[0]?.tradePostId ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Transferziele konnten nicht geladen werden');
      });
    return () => {
      cancelled = true;
    };
  }, [tradePostId]);

  const valid = Number.isInteger(amount) && amount >= 1 && targetPostId !== null;
  const transfer = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await api.post<{ message: string }>(`/trade/posts/${tradePostId}/transfer`, { targetPostId, commodityId, amount });
      await onTransferred(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer fehlgeschlagen');
    } finally {
      setPending(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Waren transferieren" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <section className="w-full max-w-md space-y-2 border border-swu-border bg-swu-bg p-3 text-xs shadow-xl">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-swu-primary">{commodityName} transferieren</h2>
          <button type="button" onClick={onClose} disabled={pending} className="text-swu-muted">Schließen</button>
        </header>
        {!menu ? (
          error ? null : <p className="text-swu-muted">Transferziele werden geladen...</p>
        ) : menu.targets.length === 0 ? (
          <p className="text-swu-muted">Du besitzt an keinem anderen Posten dieses Handelsnetzes eine gültige Lizenz.</p>
        ) : (
          <>
            <p>
              Bestand: {formatNumber(stock)} · Transferkapazität: {formatNumber(menu.free)} / {formatNumber(menu.capacity)} (24 h)
            </p>
            <label className="flex items-center gap-1">
              <span>Zielposten</span>
              <select
                value={targetPostId ?? ''}
                onChange={(event) => setTargetPostId(Number(event.target.value))}
                className={inputClass}
              >
                {menu.targets.map((target) => (
                  <option key={target.tradePostId} value={target.tradePostId}>
                    {target.tradePostName} ({formatNumber(target.freeStorage)} frei)
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1">
              <span>Menge</span>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className={`${inputClass} w-20 text-center`}
              />
            </label>
            <p className="text-swu-muted">Die Menge wird auf Bestand, freien Platz am Ziel und freie Transferkapazität gekürzt.</p>
            <button type="button" disabled={pending || !valid} onClick={() => void transfer()} className={buttonClass}>
              Transferieren
            </button>
          </>
        )}
        {error && <p role="alert" className="text-red-300">{error}</p>}
      </section>
    </div>
  );
}
