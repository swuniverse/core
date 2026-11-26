import { useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  SpaceLocationDto,
  TradeAccountBoxDto,
  TradeOfferDto,
  TradePostSpacecraftDto,
} from '@swuniverse/shared';
import { commodityImage, npcTradeNetworkImage } from '../../lib/assets';
import { formatNumber } from '../../lib/format';
import { api } from '../../services/api';
import { TradeLicensePanel } from './TradeLicensePanel';
import { TradeNetworkTransferDialog } from './TradeNetworkTransferDialog';
import { NewOfferDialog } from './TradeOffersTab';
import { ShoutboxBox } from './TradeShoutboxTab';

const linkClass = 'text-swu-accent hover:underline';
const buttonClass =
  'border border-swu-accent px-2 py-0.5 text-swu-accent hover:bg-swu-accent/10 disabled:cursor-not-allowed disabled:opacity-40';

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function Location({ location }: { location: SpaceLocationDto | null }) {
  if (!location) return <span className="text-swu-muted">Unbekannt</span>;
  if (location.scope === 'GALAXY') {
    return (
      <Link to={`/starmap?layer=${location.layerId}&x=${location.x}&y=${location.y}`} className={linkClass}>
        Ebene {location.layerId} {location.x}:{location.y}
      </Link>
    );
  }
  return <span>System {location.systemId} {location.x}:{location.y}</span>;
}

type Panel = 'ships' | 'shoutbox' | 'license' | 'rename' | null;

/** STU `tradeAccounts.twig`: one account box with its goods workflow. */
export function TradeAccountBox({
  box,
  ships,
  commodityName,
  onSelect,
  onChanged,
}: {
  box: TradeAccountBoxDto;
  ships: TradePostSpacecraftDto[];
  commodityName: (id: number) => string;
  onSelect: (postId: number) => void;
  onChanged: () => Promise<void>;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [goodsMenu, setGoodsMenu] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{ kind: 'offer' | 'transfer'; commodityId: number } | null>(null);
  const [offersOf, setOffersOf] = useState<{ commodityId: number; offers: TradeOfferDto[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(box.name);

  const toggle = (next: Panel) => setPanel((current) => (current === next ? null : next));
  const fail = (err: unknown, fallback: string) => setError(errorText(err, fallback));

  const loadOffers = async (commodityId: number) => {
    setError(null);
    try {
      const mine = await api.get<TradeOfferDto[]>('/trade/offers/mine');
      setOffersOf({
        commodityId,
        offers: mine.filter((o) => o.tradePostId === box.tradePostId && o.offeredCommodityId === commodityId),
      });
    } catch (err) {
      fail(err, 'Angebote konnten nicht geladen werden');
    }
  };

  const withdraw = async (offer: TradeOfferDto) => {
    setError(null);
    try {
      const result = await api.delete<{ message: string }>(`/trade/offers/${offer.id}`);
      setNotice(result.message);
      await loadOffers(offer.offeredCommodityId);
      await onChanged();
    } catch (err) {
      fail(err, 'Angebot konnte nicht zurückgezogen werden');
    }
  };

  const rename = async () => {
    setError(null);
    try {
      await api.patch(`/trade/posts/${box.tradePostId}`, { name });
      setNotice('Der Name des Handelspostens wurde geändert');
      setPanel(null);
      await onChanged();
    } catch (err) {
      fail(err, 'Umbenennen fehlgeschlagen');
    }
  };

  const done = async (message: string) => {
    setDialog(null);
    setNotice(message);
    await onChanged();
  };

  const networkIcon = box.isNpcPost ? npcTradeNetworkImage(box.networkId) : null;
  const stockAmount = (id: number) => box.stock.find((s) => s.commodityId === id)?.amount ?? 0;
  const goods = (
    entries: TradeAccountBoxDto['stock'],
    label: string,
    onPick: (commodityId: number) => void,
  ) => (
    <div className="px-2 py-1">
      <div className="text-swu-muted">{label}</div>
      <div className="flex flex-wrap gap-1">
        {entries.length === 0 && <span className="text-swu-muted">—</span>}
        {entries.map((entry) => (
          <button
            key={entry.commodityId}
            type="button"
            aria-label={`${label} ${commodityName(entry.commodityId)}`}
            onClick={() => onPick(entry.commodityId)}
            className="flex items-center gap-1 border border-swu-border/60 px-1 hover:border-swu-accent"
          >
            <img src={commodityImage(entry.commodityId)} alt="" className="h-6 w-6 object-contain" />
            <span className="font-mono">{formatNumber(entry.amount)}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <section aria-label={`Warenkonto ${box.name}`} className="border border-swu-border bg-black/30">
      <h2 className="flex justify-between border-b border-swu-border px-2 py-1 font-bold text-swu-primary">
        <button type="button" onClick={() => onSelect(box.tradePostId)} className={linkClass}>{box.name}</button>
        {box.isOwner && <button type="button" onClick={() => toggle('rename')} className={`${linkClass} font-normal`}>Umbenennen</button>}
      </h2>
      {notice && <p role="status" className="px-2 py-1 text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="px-2 py-1 text-red-300">{error}</p>}
      {panel === 'rename' && (
        <div className="flex items-end gap-2 border-b border-swu-border/60 px-2 py-1">
          <label className="flex flex-col">
            <span className="text-swu-muted">Name</span>
            <input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} className="border border-swu-border bg-swu-bg px-1 py-0.5" />
          </label>
          <button type="button" onClick={() => void rename()} className={buttonClass}>Speichern</button>
        </div>
      )}
      {goods(box.stock, 'Waren lagernd', (id) => { setGoodsMenu(goodsMenu === id ? null : id); setNotice(null); })}
      {goodsMenu !== null && (
        <div className="flex gap-3 px-2 pb-1">
          <span>{commodityName(goodsMenu)}:</span>
          <button type="button" className={linkClass} onClick={() => { setDialog({ kind: 'offer', commodityId: goodsMenu }); setGoodsMenu(null); }}>
            Angebot erstellen
          </button>
          {box.isNpcPost && (
            <button type="button" className={linkClass} onClick={() => { setDialog({ kind: 'transfer', commodityId: goodsMenu }); setGoodsMenu(null); }}>
              Transferieren
            </button>
          )}
        </div>
      )}
      {goods(box.offerStock, 'Waren in Angeboten', (id) => { setNotice(null); void loadOffers(id); })}
      {offersOf && (
        <div className="px-2 pb-1">
          <div className="text-swu-muted">Eigene Angebote: {commodityName(offersOf.commodityId)}</div>
          {offersOf.offers.length === 0 && <p className="text-swu-muted">Keine Angebote.</p>}
          {offersOf.offers.map((offer) => (
            <div key={offer.id} className="flex items-center gap-2">
              <span>
                {formatNumber(offer.offeredAmount)} {offer.offeredCommodityName} gegen {formatNumber(offer.wantedAmount)} {offer.wantedCommodityName} ({offer.offerCount}×, Reserve {formatNumber(offer.reservedAmount)})
              </span>
              <button type="button" onClick={() => void withdraw(offer)} className={buttonClass}>Zurückziehen</button>
            </div>
          ))}
        </div>
      )}
      <dl className="grid grid-cols-[10rem_1fr] gap-x-2 gap-y-1 border-t border-swu-border/60 px-2 py-1">
        <dt className="text-swu-muted">Standort</dt>
        <dd className="flex gap-2">
          <Location location={box.location} />
          <button type="button" onClick={() => toggle('ships')} className={linkClass}>Schiffe vor Ort</button>
        </dd>
        <dt className="text-swu-muted">Handelsnetz</dt>
        <dd className="flex items-center gap-2">
          {networkIcon && <img src={networkIcon} alt="" className="h-5 w-5 object-contain" />}
          <span>{box.networkName}</span>
          <button type="button" onClick={() => toggle('shoutbox')} className={linkClass}>Schwarzes Brett</button>
        </dd>
        {box.transferCapacity && (
          <>
            <dt className="text-swu-muted">Transferkapazität</dt>
            <dd>{formatNumber(box.transferCapacity.free)} frei ({formatNumber(box.transferCapacity.capacity)} pro Tag)</dd>
          </>
        )}
        <dt className="text-swu-muted">Lagerraum</dt>
        <dd className={`font-mono ${box.storage.isOverStorage ? 'text-red-400' : 'text-emerald-400'}`}>
          {formatNumber(box.storage.occupied)} / {formatNumber(box.storage.limit)}
        </dd>
        {box.isOwner && (
          <>
            <dt className="text-swu-muted">Ausgestellte Lizenzen</dt>
            <dd className="flex gap-2">
              <span>{formatNumber(box.issuedLicenseCount)}</span>
              {/* Opens the existing license admin (lists licensees); a dedicated list follows with tmw-AUD-10. */}
              <button type="button" onClick={() => toggle('license')} className={linkClass}>Liste anzeigen</button>
            </dd>
          </>
        )}
        <dt className="text-swu-muted">Handelslizenz Gebühren</dt>
        <dd>
          <button type="button" onClick={() => toggle('license')} className={linkClass}>
            {box.isOwner ? 'Bearbeiten' : 'Anzeigen'}
          </button>
        </dd>
      </dl>
      {panel === 'ships' && (
        <ul className="border-t border-swu-border/60 px-2 py-1">
          {ships.length === 0 && <li className="text-swu-muted">Keine eigenen Schiffe vor Ort.</li>}
          {ships.map((ship) => (
            <li key={ship.spacecraftId}>
              <Link to={`/spacecraft/${ship.spacecraftId}`} className={linkClass}>{ship.spacecraftName}</Link>
            </li>
          ))}
        </ul>
      )}
      {panel === 'shoutbox' && <ShoutboxBox networkId={box.networkId} />}
      {panel === 'license' && <TradeLicensePanel tradePostId={box.tradePostId} shipId={null} />}
      {dialog?.kind === 'offer' && (
        <NewOfferDialog
          initial={{ tradePostId: box.tradePostId, commodityId: dialog.commodityId }}
          onClose={() => setDialog(null)}
          onCreated={done}
        />
      )}
      {dialog?.kind === 'transfer' && (
        <TradeNetworkTransferDialog
          tradePostId={box.tradePostId}
          commodityId={dialog.commodityId}
          commodityName={commodityName(dialog.commodityId)}
          stock={stockAmount(dialog.commodityId)}
          onClose={() => setDialog(null)}
          onTransferred={done}
        />
      )}
    </section>
  );
}
