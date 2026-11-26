import { useCallback, useEffect, useState } from 'react';
import type {
  TradeAccountTransferResultDto,
  TradeMenuDto,
  TradeMenuGoodDto,
} from '@swuniverse/shared';
import { commodityImage } from '../../lib/assets';
import { formatNumber } from '../../lib/format';
import { api } from '../../services/api';
import { TradeLicensePanel } from './TradeLicensePanel';

type Direction = 'to-account' | 'from-account';

/** STU trade menu: cargo and post account side by side, laid out like `TransferDialog`. */
export function TradeMenuDialog({
  shipId,
  tradePostId,
  onClose,
  onTransfer,
}: {
  shipId: number;
  tradePostId: number;
  onClose: () => void;
  onTransfer: () => void;
}) {
  const [menu, setMenu] = useState<TradeMenuDto | null>(null);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [result, setResult] = useState<TradeAccountTransferResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      setMenu(await api.get<TradeMenuDto>(`/spacecraft/${shipId}/trade/${tradePostId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Handelsmenü konnte nicht geladen werden');
    }
  }, [shipId, tradePostId]);

  useEffect(() => {
    void load();
  }, [load]);

  const transfer = async (direction: Direction, good: TradeMenuGoodDto) => {
    setPending(true);
    setError(null);
    try {
      const next = await api.post<TradeAccountTransferResultDto>(
        `/spacecraft/${shipId}/trade/${tradePostId}/${direction}`,
        [{ commodityId: good.commodityId, amount: amounts[`${direction}:${good.commodityId}`] ?? good.amount }],
      );
      setResult(next);
      await load();
      onTransfer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer fehlgeschlagen');
    } finally {
      setPending(false);
    }
  };

  const title = `Handelsmenü · ${menu?.tradePostName ?? 'Handelsposten'}`;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section className="w-full max-w-3xl border border-swu-border bg-swu-bg text-xs shadow-xl">
        <header className="flex items-center justify-between border-b border-swu-border px-3 py-2">
          <h2 className="text-sm font-bold text-swu-primary">{title}</h2>
          <button type="button" onClick={onClose} disabled={pending} className="text-swu-muted">
            Schließen
          </button>
        </header>
        {!menu ? (
          <p className="p-3 text-swu-muted">{error ?? 'Handelsmenü wird geladen...'}</p>
        ) : menu.reason ? (
          <p className="p-3 text-amber-200">{menu.reason}</p>
        ) : !menu.hasLicense ? (
          <TradeLicensePanel tradePostId={tradePostId} shipId={shipId} onChanged={() => void load()} />
        ) : (
          <>
            <div className="border-b border-swu-border px-3 py-2 text-swu-muted">
              Kein Energieverbrauch
            </div>
            <div className="grid divide-swu-border sm:grid-cols-2 sm:divide-x">
              <GoodsColumn
                title={`Frachtraum ${formatNumber(menu.cargoUsed)}/${formatNumber(menu.cargoMax)}`}
                goods={menu.cargo}
                direction="to-account"
                action="ins Konto"
                blockedLabel="nicht handelbar"
                amounts={amounts}
                setAmounts={setAmounts}
                pending={pending}
                onTransfer={transfer}
              />
              <GoodsColumn
                title={`Warenkonto ${formatNumber(menu.accountUsed)}/${formatNumber(menu.accountCapacity)}`}
                goods={menu.account}
                direction="from-account"
                action="aufs Schiff"
                blockedLabel="nicht beambar"
                amounts={amounts}
                setAmounts={setAmounts}
                pending={pending}
                onTransfer={transfer}
              />
            </div>
          </>
        )}
        {result && (
          <div role="status" className="border-t border-swu-border p-2">
            {result.transferred.length === 0
              ? 'Es wurden keine Waren transferiert.'
              : `Transferiert: ${result.transferred.map((line) => `${formatNumber(line.amount)} ${line.commodityName}`).join(', ')}`}
            {result.messages.map((message) => (
              <div key={message} className="text-amber-200">{message}</div>
            ))}
          </div>
        )}
        {error && menu && (
          <p role="alert" className="border-t border-red-500/40 p-2 text-red-300">{error}</p>
        )}
      </section>
    </div>
  );
}

function GoodsColumn({
  title,
  goods,
  direction,
  action,
  blockedLabel,
  amounts,
  setAmounts,
  pending,
  onTransfer,
}: {
  title: string;
  goods: TradeMenuGoodDto[];
  direction: Direction;
  action: string;
  blockedLabel: string;
  amounts: Record<string, number>;
  setAmounts: (update: (current: Record<string, number>) => Record<string, number>) => void;
  pending: boolean;
  onTransfer: (direction: Direction, good: TradeMenuGoodDto) => Promise<void>;
}) {
  return (
    <section aria-label={title} className="min-h-28">
      <h3 className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">{title}</h3>
      {goods.length === 0 ? (
        <p className="p-3 text-swu-muted">Keine Waren vorhanden.</p>
      ) : (
        <div className="divide-y divide-swu-border/60">
          {goods.map((good) => {
            const key = `${direction}:${good.commodityId}`;
            return (
              <div key={good.commodityId} className="flex items-center gap-2 p-2">
                <img src={commodityImage(good.commodityId)} alt="" className="size-6 object-contain" />
                <span className="flex-1">
                  {good.commodityName} · {formatNumber(good.amount)}
                </span>
                {good.transferable ? (
                  <>
                    <input
                      aria-label={`Menge ${good.commodityName} ${action}`}
                      type="number"
                      min={1}
                      max={good.amount}
                      value={amounts[key] ?? good.amount}
                      onChange={(event) =>
                        setAmounts((current) => ({ ...current, [key]: Math.max(1, Number(event.target.value) || 1) }))
                      }
                      className="w-16 border border-swu-border bg-black px-1 py-0.5 text-center"
                    />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void onTransfer(direction, good)}
                      className="border border-swu-accent px-2 py-0.5 text-swu-primary disabled:opacity-40"
                    >
                      {action}
                    </button>
                  </>
                ) : (
                  <span className="text-swu-muted">{blockedLabel}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
