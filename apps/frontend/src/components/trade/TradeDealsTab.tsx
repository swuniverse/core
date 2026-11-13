import { useCallback, useEffect, useState } from 'react';
import type { TradeDealDto, TradeDealsDto } from '@swuniverse/shared';
import { formatDateTime, formatNumber } from '../../lib/format';
import { api } from '../../services/api';

const buttonClass =
  'border border-swu-accent px-2 py-0.5 text-swu-accent hover:bg-swu-accent/10 disabled:cursor-not-allowed disabled:opacity-40';
const inputClass = 'border border-swu-border bg-swu-bg px-1 py-0.5';

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function giftLabel(deal: TradeDealDto): string {
  if (deal.give) return `${formatNumber(deal.give.amount)} ${deal.give.commodityName}`;
  const plan = deal.buildplan;
  const name = plan ? `${plan.name} (${plan.shipClassName})` : 'unbekannter Bauplan';
  return deal.kind === 'SHIP' ? `Schiff: ${name}` : `Bauplan: ${name}`;
}

function priceLabel(deal: TradeDealDto): string {
  return deal.want ? `${formatNumber(deal.want.amount)} ${deal.want.commodityName}` : `${formatNumber(deal.wantPrestige ?? 0)} Prestige`;
}

/** „Hutten-Deals“: STU `ShowDeals` instant deals at the Hutt Cartel post. */
export function TradeDealsTab() {
  const [data, setData] = useState<TradeDealsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [taking, setTaking] = useState<TradeDealDto | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.get<TradeDealsDto>('/trade/deals'));
      setError(null);
    } catch (err) {
      setError(errorText(err, 'Deals konnten nicht geladen werden'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    return error ? <p role="alert" className="text-red-300">{error}</p> : <p className="text-swu-muted">Deals werden geladen...</p>;
  }
  if (!data.hasLicense) {
    return <p className="max-w-5xl border border-swu-border bg-black/30 p-2 text-swu-muted">{data.notice}</p>;
  }
  const aurodium = data.account.find((entry) => entry.commodityId === 50)?.amount ?? 0;
  return (
    <div className="max-w-5xl space-y-2">
      {notice && <p role="status" className="text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="text-red-300">{error}</p>}
      <section aria-label="Deals des Hutten-Kartells" className="border border-swu-border bg-black/30">
        <h2 className="flex flex-wrap justify-between gap-2 border-b border-swu-border px-2 py-1 font-bold text-swu-primary">
          <span>Deals des Hutten-Kartells · {data.tradePostName}</span>
          <span className="font-mono text-swu-muted">Aurodium am Posten: {formatNumber(aurodium)} · Prestige: {formatNumber(data.prestige)}</span>
        </h2>
        {data.deals.length === 0 ? (
          <p className="p-2 text-swu-muted">Das Hutten-Kartell bietet derzeit keine Deals an.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-left text-swu-muted">
                <tr>
                  <th className="px-2 py-1">Angebot</th>
                  <th className="px-2 py-1">Preis je Annahme</th>
                  <th className="px-2 py-1">Verfügbar</th>
                  <th className="px-2 py-1">Endet</th>
                  <th className="px-2 py-1" />
                </tr>
              </thead>
              <tbody>
                {data.deals.map((deal) => (
                  <tr key={deal.id} className="border-t border-swu-border/60">
                    <td className="px-2 py-1">
                      <span>{giftLabel(deal)}</span>
                      {deal.factionName && <span className="ml-2 text-swu-muted">nur {deal.factionName}</span>}
                    </td>
                    <td className="px-2 py-1">{priceLabel(deal)}</td>
                    <td className="px-2 py-1">{deal.amount === null ? 'unbegrenzt' : `noch ${formatNumber(deal.amount)}`}</td>
                    <td className="px-2 py-1">{formatDateTime(deal.endsAt)}</td>
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        aria-label={`${deal.give?.commodityName ?? deal.buildplan?.name ?? 'Deal'} annehmen`}
                        onClick={() => { setNotice(null); setTaking(deal); }}
                        className={buttonClass}
                      >
                        Annehmen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {taking && (
        <TakeDealDialog
          deal={taking}
          onClose={() => setTaking(null)}
          onTaken={async (message) => {
            setTaking(null);
            setNotice(message);
            await load();
          }}
        />
      )}
    </div>
  );
}

function TakeDealDialog({
  deal,
  onClose,
  onTaken,
}: {
  deal: TradeDealDto;
  onClose: () => void;
  onTaken: (message: string) => Promise<void>;
}) {
  const repeatable = deal.kind === 'COMMODITY';
  const [amount, setAmount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const valid = Number.isInteger(amount) && amount >= 1 && (deal.amount === null || amount <= deal.amount);

  const take = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await api.post<{ message: string }>(`/trade/deals/${deal.id}/take`, { amount: repeatable ? amount : 1 });
      await onTaken(result.message);
    } catch (err) {
      setError(errorText(err, 'Deal konnte nicht angenommen werden'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Deal annehmen" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <section className="w-full max-w-md space-y-2 border border-swu-border bg-swu-bg p-3 text-xs shadow-xl">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-swu-primary">Deal annehmen</h2>
          <button type="button" onClick={onClose} disabled={pending} className="text-swu-muted">Schließen</button>
        </header>
        <p>{giftLabel(deal)} für {priceLabel(deal)} je Annahme.</p>
        {repeatable ? (
          <>
            <label className="flex items-center gap-1">
              <span>Anzahl</span>
              <input
                type="number"
                min={1}
                max={deal.amount ?? undefined}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className={`${inputClass} w-16 text-center`}
              />
            </label>
            {valid && deal.give && (
              <p>
                Du gibst {deal.want ? `${formatNumber(amount * deal.want.amount)} ${deal.want.commodityName}` : `${formatNumber(amount * (deal.wantPrestige ?? 0))} Prestige`}{' '}
                und erhältst {formatNumber(amount * deal.give.amount)} {deal.give.commodityName}.
              </p>
            )}
            <p className="text-swu-muted">Die Anzahl wird auf Bestand und freien Platz im Warenkonto gekürzt.</p>
          </>
        ) : (
          <p className="text-swu-muted">
            {deal.kind === 'SHIP' ? 'Das Schiff entsteht am Hutten-Handelsposten.' : 'Der Bauplan wird deinen Bauplänen hinzugefügt.'}
          </p>
        )}
        {error && <p role="alert" className="text-red-300">{error}</p>}
        <button type="button" disabled={pending || (repeatable && !valid)} onClick={() => void take()} className={buttonClass}>
          Deal annehmen
        </button>
      </section>
    </div>
  );
}
