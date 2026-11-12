import { useCallback, useEffect, useState } from 'react';
import type {
  TakeTradeOfferResultDto,
  TradeOfferListItemDto,
  TradeOfferSearchDto,
  TradeOfferSearchMode,
} from '@swuniverse/shared';
import { commodityImage } from '../../lib/assets';
import { formatNumber } from '../../lib/format';
import { api } from '../../services/api';

const MODES: Array<{ value: TradeOfferSearchMode; label: string }> = [
  { value: 'both', label: 'Angebot und Nachfrage' },
  { value: 'offer', label: 'Im Angebot' },
  { value: 'demand', label: 'In der Nachfrage' },
];
const buttonClass =
  'border border-swu-accent px-2 py-0.5 text-swu-accent hover:bg-swu-accent/10 disabled:cursor-not-allowed disabled:opacity-40';
const inputClass = 'border border-swu-border bg-swu-bg px-1 py-0.5';

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** „Angebote“: offers at licensed posts with STU search filters. */
export function TradeMarketTab() {
  const [commodityId, setCommodityId] = useState<number | null>(null);
  const [mode, setMode] = useState<TradeOfferSearchMode>('both');
  const [postId, setPostId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<TradeOfferSearchDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [taking, setTaking] = useState<TradeOfferListItemDto | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ mode, page: String(page) });
    if (commodityId) params.set('commodityId', String(commodityId));
    if (postId) params.set('postId', String(postId));
    try {
      setResult(await api.get<TradeOfferSearchDto>(`/trade/offers?${params.toString()}`));
      setError(null);
    } catch (err) {
      setError(errorText(err, 'Angebote konnten nicht geladen werden'));
    }
  }, [commodityId, mode, postId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const filter = (update: () => void) => {
    update();
    setPage(1);
  };
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div className="max-w-5xl space-y-2">
      {result && (
        <div className="space-y-2 border border-swu-border bg-black/30 p-2">
          <div role="group" aria-label="Ware" className="flex flex-wrap gap-1">
            <button
              type="button"
              aria-pressed={commodityId == null}
              onClick={() => filter(() => setCommodityId(null))}
              className={`border px-2 py-0.5 ${commodityId == null ? 'border-swu-accent text-swu-primary' : 'border-swu-border text-swu-muted'}`}
            >
              Alle Waren
            </button>
            {result.commodities.map((commodity) => (
              <button
                key={commodity.id}
                type="button"
                aria-label={commodity.name}
                aria-pressed={commodityId === commodity.id}
                title={commodity.name}
                onClick={() => filter(() => setCommodityId(commodity.id))}
                className={`border p-0.5 ${commodityId === commodity.id ? 'border-swu-accent bg-swu-accent/10' : 'border-swu-border'}`}
              >
                <img src={commodityImage(commodity.id, commodity.name)} alt="" className="size-6 object-contain" />
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-1">
              <span className="text-swu-muted">Modus</span>
              <select value={mode} onChange={(event) => filter(() => setMode(event.target.value as TradeOfferSearchMode))} className={inputClass}>
                {MODES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1">
              <span className="text-swu-muted">Handelsposten</span>
              <select
                value={postId ?? ''}
                onChange={(event) => filter(() => setPostId(event.target.value ? Number(event.target.value) : null))}
                className={inputClass}
              >
                <option value="">Alle lizenzierten Posten</option>
                {result.licensedPosts.map((post) => <option key={post.id} value={post.id}>{post.name}</option>)}
              </select>
            </label>
          </div>
        </div>
      )}
      {notice && <p role="status" className="text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="text-red-300">{error}</p>}
      {!result ? (
        <p className="text-swu-muted">Angebote werden geladen...</p>
      ) : result.licensedPosts.length === 0 ? (
        <p className="border border-swu-border bg-black/30 p-2 text-swu-muted">Du besitzt keine gültige Handelslizenz.</p>
      ) : result.items.length === 0 ? (
        <p className="border border-swu-border bg-black/30 p-2 text-swu-muted">Keine Angebote gefunden.</p>
      ) : (
        <div className="overflow-x-auto border border-swu-border bg-black/30">
          <table className="w-full">
            <thead className="bg-swu-bg/60 text-left text-swu-muted">
              <tr>
                <th className="px-2 py-1">Handelsposten</th>
                <th className="px-2 py-1">Anbieter</th>
                <th className="px-2 py-1">Bietet</th>
                <th className="px-2 py-1">Verlangt</th>
                <th className="px-2 py-1">Anzahl</th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {result.items.map((offer) => (
                <tr key={offer.id} className="border-t border-swu-border/60">
                  <td className="px-2 py-1">{offer.tradePostName}</td>
                  <td className="px-2 py-1">{offer.ownerName}</td>
                  <td className="px-2 py-1"><Goods id={offer.offeredCommodityId} name={offer.offeredCommodityName} amount={offer.offeredAmount} /></td>
                  <td className="px-2 py-1"><Goods id={offer.wantedCommodityId} name={offer.wantedCommodityName} amount={offer.wantedAmount} /></td>
                  <td className="px-2 py-1 font-mono">{offer.offerCount}×</td>
                  <td className="px-2 py-1 text-right">
                    {offer.isOwn ? (
                      <span className="text-swu-muted">Eigenes Angebot</span>
                    ) : (
                      <button type="button" disabled={offer.maxTake < 1} onClick={() => setTaking(offer)} className={buttonClass}>
                        Annehmen
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {result && pages > 1 && (
        <nav aria-label="Seiten" className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={buttonClass}>Zurück</button>
          <span>Seite {page} von {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className={buttonClass}>Weiter</button>
        </nav>
      )}
      {taking && (
        <TakeOfferDialog
          offer={taking}
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

function Goods({ id, name, amount }: { id: number; name: string; amount: number }) {
  return (
    <span className="flex items-center gap-1">
      <img src={commodityImage(id, name)} alt="" className="size-5 object-contain" />
      {formatNumber(amount)} {name}
    </span>
  );
}

function TakeOfferDialog({
  offer,
  onClose,
  onTaken,
}: {
  offer: TradeOfferListItemDto;
  onClose: () => void;
  onTaken: (message: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const valid = Number.isInteger(amount) && amount >= 1 && amount <= offer.maxTake;

  const take = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await api.post<TakeTradeOfferResultDto>(`/trade/offers/${offer.id}/take`, { amount });
      await onTaken(result.message);
    } catch (err) {
      setError(errorText(err, 'Angebot konnte nicht angenommen werden'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Annehmen" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <section className="w-full max-w-md space-y-2 border border-swu-border bg-swu-bg p-3 text-xs shadow-xl">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-swu-primary">Annehmen</h2>
          <button type="button" onClick={onClose} disabled={pending} className="text-swu-muted">Schließen</button>
        </header>
        <p>
          {offer.ownerName} bietet je {formatNumber(offer.offeredAmount)} {offer.offeredCommodityName} für{' '}
          {formatNumber(offer.wantedAmount)} {offer.wantedCommodityName} am {offer.tradePostName}.
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1">
            <span>Anzahl</span>
            <input
              type="number"
              min={1}
              max={offer.maxTake}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              className={`${inputClass} w-16 text-center`}
            />
          </label>
          <button type="button" onClick={() => setAmount(offer.maxTake)} className="border border-swu-border px-1">max</button>
          <span className="text-swu-muted">höchstens {offer.maxTake}</span>
        </div>
        {valid && (
          <p>
            Du gibst {formatNumber(amount * offer.wantedAmount)} {offer.wantedCommodityName} und erhältst{' '}
            {formatNumber(amount * offer.offeredAmount)} {offer.offeredCommodityName}.
          </p>
        )}
        {error && <p role="alert" className="text-red-300">{error}</p>}
        <button type="button" disabled={pending || !valid} onClick={() => void take()} className={buttonClass}>
          Angebot annehmen
        </button>
      </section>
    </div>
  );
}
