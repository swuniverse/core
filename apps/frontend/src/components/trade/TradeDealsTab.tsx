import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type {
  TradeAuctionDto,
  TradeDealDto,
  TradeDealPlayerDto,
  TradeDealsDto,
  TradeWonAuctionDto,
} from '@swuniverse/shared';
import { commodityImage, shipImage } from '../../lib/assets';
import { formatDateTime, formatNumber } from '../../lib/format';
import { api } from '../../services/api';
import { PlayerName } from '../PlayerName';

const buttonClass =
  'border border-swu-accent px-2 py-0.5 text-swu-accent hover:bg-swu-accent/10 disabled:cursor-not-allowed disabled:opacity-40';
const inputClass = 'border border-swu-border bg-swu-bg px-1 py-0.5';

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

type DealItem = Pick<TradeDealDto, 'kind' | 'give' | 'buildplan'>;

function currencyLabel(currency: TradeAuctionDto['currency']): string {
  return currency ? currency.commodityName : 'Prestige';
}

function remaining(endsAt: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `noch ${hours} h ${minutes % 60} min` : `noch ${minutes} min`;
}

function giftLabel(deal: DealItem): string {
  if (deal.give) return `${formatNumber(deal.give.amount)} ${deal.give.commodityName}`;
  const plan = deal.buildplan;
  const name = plan ? `${plan.name} (${plan.shipClassName})` : 'unbekannter Bauplan';
  return deal.kind === 'SHIP' ? `Schiff: ${name}` : `Bauplan: ${name}`;
}

const KIND_LABEL: Record<TradeDealDto['kind'], string> = { COMMODITY: 'Waren', SHIP: 'Schiffe', BUILDPLAN: 'Baupläne' };

/** STU `deals.twig` sections: goods, ships, buildplans, each against goods or against prestige. */
function groupByTypeAndCurrency<T extends { kind: TradeDealDto['kind'] }>(
  entries: T[],
  paysPrestige: (entry: T) => boolean,
): Array<{ label: string; entries: T[] }> {
  const groups = new Map<string, T[]>();
  for (const kind of ['COMMODITY', 'SHIP', 'BUILDPLAN'] as const) {
    for (const prestige of [false, true]) {
      const matching = entries.filter((entry) => entry.kind === kind && paysPrestige(entry) === prestige);
      if (matching.length) groups.set(`${KIND_LABEL[kind]} gegen ${prestige ? 'Prestige' : 'Waren'}`, matching);
    }
  }
  return [...groups].map(([label, grouped]) => ({ label, entries: grouped }));
}

/** Offer cell: goods with icon, or hull image, buildplan modules and required crew. */
function DealOffer({ deal, children }: { deal: DealItem; children?: ReactNode }) {
  const plan = deal.buildplan;
  if (deal.give || !plan) {
    return (
      <span className="flex items-center gap-1.5">
        {deal.give && <img src={commodityImage(deal.give.commodityId)} alt="" className="size-5 object-contain" />}
        {giftLabel(deal)}
        {children}
      </span>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <img src={shipImage(plan.shipClassId, plan.shipClassKey)} alt={plan.shipClassName} className="h-12 w-16 object-contain" />
      <div>
        <div>{deal.kind === 'SHIP' ? 'Schiff' : 'Bauplan'}: {plan.name} <span className="text-swu-muted">({plan.shipClassName})</span>{children}</div>
        <div className="mt-0.5 flex flex-wrap gap-0.5" aria-label="Module">
          {plan.modules.map((module, index) => (
            <img key={`${module.commodityId}-${index}`} src={commodityImage(module.commodityId)} alt={module.name} title={module.name} className="size-5 object-contain" />
          ))}
        </div>
        <div className="text-swu-muted">Crew: {plan.crew}</div>
      </div>
    </div>
  );
}

function Bidder({ bidder }: { bidder: TradeDealPlayerDto | null }) {
  return bidder ? (
    <Link to={`/players/${bidder.id}`} className="text-swu-accent hover:underline"><PlayerName name={bidder.name} /></Link>
  ) : (
    <span className="text-swu-muted">—</span>
  );
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
  const act = async (path: string, body: object, fallback: string) => {
    setError(null);
    setNotice(null);
    try {
      setNotice((await api.post<{ message: string }>(path, body)).message);
    } catch (err) {
      setError(errorText(err, fallback));
    } finally {
      await load();
    }
  };
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
              {groupByTypeAndCurrency(data.deals, (deal) => deal.want === null).map((group) => (
              <tbody key={group.label} aria-label={group.label}>
                <tr><th colSpan={5} className="bg-swu-bg/60 px-2 py-1 text-left text-xs uppercase text-swu-muted">{group.label}</th></tr>
                {group.entries.map((deal) => (
                  <tr key={deal.id} className="border-t border-swu-border/60 align-top">
                    <td className="px-2 py-1">
                      <DealOffer deal={deal}>
                        {deal.factionName && <span className="ml-2 text-swu-muted">nur {deal.factionName}</span>}
                      </DealOffer>
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
              ))}
            </table>
          </div>
        )}
      </section>
      {(data.auctions ?? []).length > 0 && (
        <section aria-label="Auktionen" className="border border-swu-border bg-black/30">
          <h2 className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">Auktionen</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-left text-swu-muted">
                <tr>
                  <th className="px-2 py-1">Angebot</th>
                  <th className="px-2 py-1">Höchstgebot</th>
                  <th className="px-2 py-1">Höchstbietender</th>
                  <th className="px-2 py-1">Endet</th>
                  <th className="px-2 py-1">Maximalgebot</th>
                </tr>
              </thead>
              {groupByTypeAndCurrency(data.auctions, (auction) => auction.currency === null).map((group) => (
                <tbody key={group.label} aria-label={group.label}>
                  <tr><th colSpan={5} className="bg-swu-bg/60 px-2 py-1 text-left text-xs uppercase text-swu-muted">{group.label}</th></tr>
                  {group.entries.map((auction) => (
                    <AuctionRow
                      key={auction.id}
                      auction={auction}
                      onBid={(maxAmount) => act(`/trade/deals/${auction.id}/bid`, { maxAmount }, 'Gebot fehlgeschlagen')}
                    />
                  ))}
                </tbody>
              ))}
            </table>
          </div>
          <p className="px-2 py-1 text-swu-muted">
            Dein Maximalgebot wird vollständig reserviert. Wirst du überboten, bekommst du es zurück; nach dem Ende erhältst du den Rest über dem Preis zurück.
          </p>
        </section>
      )}
      {(data.wonAuctions ?? []).length > 0 && (
        <section aria-label="Gewonnene Auktionen" className="border border-swu-border bg-black/30">
          <h2 className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">Gewonnene Auktionen</h2>
          <ul>
            {data.wonAuctions.map((won: TradeWonAuctionDto) => (
              <li key={won.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-swu-border/60 px-2 py-1">
                <span>
                  {giftLabel(won)} · Preis: {formatNumber(won.price)} {currencyLabel(won.currency)}, Rückerstattung: {formatNumber(won.refund)}
                </span>
                <button
                  type="button"
                  aria-label={`${won.give?.commodityName ?? won.buildplan?.name ?? 'Gewinn'} abholen`}
                  onClick={() => void act(`/trade/deals/${won.id}/claim`, {}, 'Abholen fehlgeschlagen')}
                  className={buttonClass}
                >
                  Abholen
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {(data.endedAuctions ?? []).length > 0 && (
        <section aria-label="Beendete Auktionen" className="border border-swu-border bg-black/30">
          <h2 className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">Beendete Auktionen (letzte 30 Tage)</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-left text-swu-muted">
                <tr>
                  <th className="px-2 py-1">Angebot</th>
                  <th className="px-2 py-1">Endpreis</th>
                  <th className="px-2 py-1">Höchstbietender</th>
                  <th className="px-2 py-1">Beendet</th>
                </tr>
              </thead>
              {groupByTypeAndCurrency(data.endedAuctions, (ended) => ended.currency === null).map((group) => (
                <tbody key={group.label} aria-label={group.label}>
                  <tr><th colSpan={4} className="bg-swu-bg/60 px-2 py-1 text-left text-xs uppercase text-swu-muted">{group.label}</th></tr>
                  {group.entries.map((ended) => (
                    <tr key={ended.id} className="border-t border-swu-border/60 align-top">
                      <td className="px-2 py-1"><DealOffer deal={ended} /></td>
                      <td className="px-2 py-1">{formatNumber(ended.price)} {currencyLabel(ended.currency)}</td>
                      <td className="px-2 py-1"><Bidder bidder={ended.highestBidder} /></td>
                      <td className="px-2 py-1">{formatDateTime(ended.endedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </section>
      )}
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

function AuctionRow({ auction, onBid }: { auction: TradeAuctionDto; onBid: (maxAmount: number) => Promise<void> }) {
  const minimum = (auction.ownMaxAmount ?? auction.currentAmount ?? 0) + 1;
  const [maxAmount, setMaxAmount] = useState(minimum);
  const [pending, setPending] = useState(false);
  const valid = Number.isInteger(maxAmount) && maxAmount >= 1;
  const bid = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      await onBid(maxAmount);
    } finally {
      setPending(false);
    }
  };
  return (
    <tr className="border-t border-swu-border/60 align-top">
      <td className="px-2 py-1">
        <DealOffer deal={auction}>
          {auction.factionName && <span className="ml-2 text-swu-muted">nur {auction.factionName}</span>}
        </DealOffer>
      </td>
      <td className="px-2 py-1">
        {auction.currentAmount === null ? (
          <span>Noch kein Gebot · {currencyLabel(auction.currency)}</span>
        ) : (
          <span>{formatNumber(auction.currentAmount)} {currencyLabel(auction.currency)}</span>
        )}
        {auction.isHighestBidder && auction.ownMaxAmount !== null && (
          <span className="block text-emerald-300">Dein Maximum: {formatNumber(auction.ownMaxAmount)} (Höchstbietender)</span>
        )}
      </td>
      <td className="px-2 py-1"><Bidder bidder={auction.highestBidder} /></td>
      <td className="px-2 py-1">
        {remaining(auction.endsAt)}
        <span className="block text-swu-muted">{formatDateTime(auction.endsAt)}</span>
      </td>
      <td className="px-2 py-1">
        <form onSubmit={(event) => void bid(event)} className="flex items-center gap-1">
          <input
            aria-label="Maximalgebot"
            type="number"
            min={1}
            value={maxAmount}
            onChange={(event) => setMaxAmount(Number(event.target.value))}
            className={`${inputClass} w-20 text-center`}
          />
          <button type="submit" disabled={pending || !valid} className={buttonClass}>Bieten</button>
        </form>
      </td>
    </tr>
  );
}
