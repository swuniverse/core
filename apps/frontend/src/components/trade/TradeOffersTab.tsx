import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CreateTradeOfferDto,
  TradeLicenseDto,
  TradeOfferDto,
  TradeOfferOptionsDto,
} from '@swuniverse/shared';
import { formatNumber } from '../../lib/format';
import { api } from '../../services/api';

const MAX_OFFER_COUNT = 99;
const ratioFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
const buttonClass =
  'border border-swu-accent px-2 py-0.5 text-swu-accent hover:bg-swu-accent/10 disabled:cursor-not-allowed disabled:opacity-40';
const inputClass = 'border border-swu-border bg-swu-bg px-1 py-0.5';

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** „Meine Angebote“: own offers per post, cancel and the new-offer dialog. */
export function TradeOffersTab() {
  const [offers, setOffers] = useState<TradeOfferDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setOffers(await api.get<TradeOfferDto[]>('/trade/offers/mine'));
    } catch (err) {
      setError(errorText(err, 'Angebote konnten nicht geladen werden'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (offer: TradeOfferDto) => {
    setError(null);
    try {
      const result = await api.delete<{ message: string }>(`/trade/offers/${offer.id}`);
      setNotice(result.message);
      await load();
    } catch (err) {
      setError(errorText(err, 'Angebot konnte nicht zurückgezogen werden'));
    }
  };

  const byPost = useMemo(() => {
    const groups = new Map<number, TradeOfferDto[]>();
    for (const offer of offers ?? []) groups.set(offer.tradePostId, [...(groups.get(offer.tradePostId) ?? []), offer]);
    return [...groups.values()];
  }, [offers]);

  return (
    <div className="max-w-4xl space-y-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setCreating(true)} className={buttonClass}>
          Neues Angebot
        </button>
        {notice && <span role="status" className="text-emerald-300">{notice}</span>}
      </div>
      {error && <p role="alert" className="text-red-300">{error}</p>}
      {!offers ? (
        <p className="text-swu-muted">Angebote werden geladen...</p>
      ) : offers.length === 0 ? (
        <p className="border border-swu-border bg-black/30 p-2 text-swu-muted">Du hast keine Angebote.</p>
      ) : (
        byPost.map((group) => (
          <section key={group[0].tradePostId} aria-label={group[0].tradePostName} className="border border-swu-border bg-black/30">
            <h2 className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">{group[0].tradePostName}</h2>
            <table className="w-full">
              <thead className="text-left text-swu-muted">
                <tr>
                  <th className="px-2 py-1">Gibt</th>
                  <th className="px-2 py-1">Verlangt</th>
                  <th className="px-2 py-1">Anzahl</th>
                  <th className="px-2 py-1">Reserve</th>
                  <th className="px-2 py-1" />
                </tr>
              </thead>
              <tbody>
                {group.map((offer) => (
                  <tr key={offer.id} className="border-t border-swu-border/60">
                    <td className="px-2 py-1">{formatNumber(offer.offeredAmount)} {offer.offeredCommodityName}</td>
                    <td className="px-2 py-1">{formatNumber(offer.wantedAmount)} {offer.wantedCommodityName}</td>
                    <td className="px-2 py-1 font-mono">{offer.offerCount}×</td>
                    <td className="px-2 py-1 font-mono">{formatNumber(offer.reservedAmount)}</td>
                    <td className="px-2 py-1 text-right">
                      <button type="button" onClick={() => void cancel(offer)} className={buttonClass}>
                        Zurückziehen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
      {creating && (
        <NewOfferDialog
          onClose={() => setCreating(false)}
          onCreated={async (message) => {
            setCreating(false);
            setNotice(message);
            await load();
          }}
        />
      )}
    </div>
  );
}

export function offerProblems(
  options: TradeOfferOptionsDto,
  input: CreateTradeOfferDto,
): string[] {
  const problems: string[] = [];
  const stock = options.accountGoods.find((good) => good.commodityId === input.offeredCommodityId)?.amount ?? 0;
  if (!options.hasLicense) problems.push('Du benötigst eine gültige Lizenz für diesen Handelsposten');
  if (options.accountFree <= 0) problems.push('Dein Warenkonto auf diesem Handelsposten ist überfüllt');
  if (!input.offeredCommodityId) problems.push('Wähle eine angebotene Ware');
  if (!input.wantedCommodityId) problems.push('Wähle eine verlangte Ware');
  if (input.offeredCommodityId && input.offeredCommodityId === input.wantedCommodityId) {
    problems.push('Es kann nicht die gleiche Ware eingetauscht werden');
  }
  if (!(input.offeredAmount >= 1)) problems.push('Die angebotene Menge muss mindestens 1 sein');
  if (!(input.wantedAmount >= 1)) problems.push('Die verlangte Menge muss mindestens 1 sein');
  if (!(input.offerCount >= 1 && input.offerCount <= MAX_OFFER_COUNT)) {
    problems.push(`Die Anzahl muss zwischen 1 und ${MAX_OFFER_COUNT} liegen`);
  }
  if (input.offeredCommodityId && input.offeredAmount >= 1 && stock < input.offeredAmount) {
    problems.push('Nicht genügend Waren im Warenkonto');
  }
  return problems;
}

export function NewOfferDialog({
  initial,
  onClose,
  onCreated,
}: {
  /** Preselects post and offered commodity (STU offer menu from the account box). */
  initial?: { tradePostId: number; commodityId: number };
  onClose: () => void;
  onCreated: (message: string) => Promise<void>;
}) {
  const [licenses, setLicenses] = useState<TradeLicenseDto[] | null>(null);
  const [postId, setPostId] = useState<number | null>(null);
  const [options, setOptions] = useState<TradeOfferOptionsDto | null>(null);
  const [input, setInput] = useState<CreateTradeOfferDto>({
    offeredCommodityId: 0,
    offeredAmount: 1,
    wantedCommodityId: 0,
    wantedAmount: 1,
    offerCount: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api
      .get<TradeLicenseDto[]>('/trade/licenses')
      .then((next) => {
        setLicenses(next);
        setPostId(initial?.tradePostId ?? next[0]?.tradePostId ?? null);
      })
      .catch((err: unknown) => setError(errorText(err, 'Lizenzen konnten nicht geladen werden')));
  }, []);

  useEffect(() => {
    if (postId == null) return;
    setOptions(null);
    api
      .get<TradeOfferOptionsDto>(`/trade/posts/${postId}/offer-options`)
      .then((next) => {
        setOptions(next);
        const offeredId =
          next.accountGoods.find((good) => good.commodityId === initial?.commodityId)?.commodityId ??
          next.accountGoods[0]?.commodityId ??
          0;
        setInput((current) => ({
          ...current,
          offeredCommodityId: offeredId,
          wantedCommodityId: next.tradeableCommodities.find((entry) => entry.id !== offeredId)?.id ?? 0,
        }));
      })
      .catch((err: unknown) => setError(errorText(err, 'Angebotsdaten konnten nicht geladen werden')));
  }, [postId, initial?.commodityId]);

  const problems = options ? offerProblems(options, input) : [];
  const offered = options?.accountGoods.find((good) => good.commodityId === input.offeredCommodityId);
  const wanted = options?.tradeableCommodities.find((entry) => entry.id === input.wantedCommodityId);
  const possibleCount = offered && input.offeredAmount >= 1 ? Math.min(input.offerCount, Math.floor(offered.amount / input.offeredAmount)) : 0;
  const number = (key: 'offeredAmount' | 'wantedAmount' | 'offerCount') => (value: string) =>
    setInput((current) => ({ ...current, [key]: Number(value) }));

  const submit = async () => {
    if (postId == null || problems.length) return;
    setPending(true);
    setError(null);
    try {
      const result = await api.post<{ message: string }>(`/trade/posts/${postId}/offers`, input);
      await onCreated(result.message);
    } catch (err) {
      setError(errorText(err, 'Angebot konnte nicht erstellt werden'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Neues Angebot" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <section className="w-full max-w-lg space-y-2 border border-swu-border bg-swu-bg p-3 text-xs shadow-xl">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-swu-primary">Neues Angebot</h2>
          <button type="button" onClick={onClose} disabled={pending} className="text-swu-muted">Schließen</button>
        </header>
        {licenses && licenses.length === 0 ? (
          <p className="text-amber-200">Du besitzt keine gültige Handelslizenz.</p>
        ) : (
          <>
            <label className="flex flex-col">
              <span className="text-swu-muted">Handelsposten</span>
              <select value={postId ?? ''} onChange={(event) => setPostId(Number(event.target.value))} className={inputClass}>
                {(licenses ?? []).map((license) => (
                  <option key={license.tradePostId} value={license.tradePostId}>{license.tradePostName}</option>
                ))}
              </select>
            </label>
            {options && (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col">
                  <span className="text-swu-muted">Angebotene Ware</span>
                  <select
                    value={input.offeredCommodityId}
                    onChange={(event) => setInput((current) => ({ ...current, offeredCommodityId: Number(event.target.value) }))}
                    className={inputClass}
                  >
                    {options.accountGoods.map((good) => (
                      <option key={good.commodityId} value={good.commodityId}>
                        {good.commodityName} ({formatNumber(good.amount)})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col">
                  <span className="text-swu-muted">Angebotene Menge</span>
                  <input type="number" min={1} value={input.offeredAmount} onChange={(event) => number('offeredAmount')(event.target.value)} className={inputClass} />
                </label>
                <label className="flex flex-col">
                  <span className="text-swu-muted">Verlangte Ware</span>
                  <select
                    value={input.wantedCommodityId}
                    onChange={(event) => setInput((current) => ({ ...current, wantedCommodityId: Number(event.target.value) }))}
                    className={inputClass}
                  >
                    {options.tradeableCommodities.map((entry) => (
                      <option key={entry.id} value={entry.id}>{entry.name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col">
                  <span className="text-swu-muted">Verlangte Menge</span>
                  <input type="number" min={1} value={input.wantedAmount} onChange={(event) => number('wantedAmount')(event.target.value)} className={inputClass} />
                </label>
                <label className="flex flex-col">
                  <span className="text-swu-muted">Anzahl</span>
                  <input type="number" min={1} max={MAX_OFFER_COUNT} value={input.offerCount} onChange={(event) => number('offerCount')(event.target.value)} className={inputClass} />
                </label>
              </div>
            )}
            {options && offered && wanted && input.offeredAmount >= 1 && input.wantedAmount >= 1 && (
              <p aria-label="Vorschau">
                Verhältnis: 1 {offered.commodityName} = {ratioFormat.format(input.wantedAmount / input.offeredAmount)} {wanted.name}
                {possibleCount >= 1 && ` · Reserve: ${formatNumber(possibleCount * input.offeredAmount)}`}
                {possibleCount >= 1 && possibleCount < input.offerCount && ` · Anzahl wird auf ${possibleCount} gekürzt`}
              </p>
            )}
            {problems.length > 0 && (
              <ul aria-label="Eingabefehler" className="list-disc pl-4 text-amber-200">
                {problems.map((problem) => <li key={problem}>{problem}</li>)}
              </ul>
            )}
            {error && <p role="alert" className="text-red-300">{error}</p>}
            <button type="button" disabled={pending || !options || problems.length > 0} onClick={() => void submit()} className={buttonClass}>
              Angebot erstellen
            </button>
          </>
        )}
      </section>
    </div>
  );
}
