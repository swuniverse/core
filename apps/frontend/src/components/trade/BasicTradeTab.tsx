import { useCallback, useEffect, useState } from 'react';
import type { BasicTradeItemDto, BasicTradeOverviewDto } from '@swuniverse/shared';
import { commodityImage } from '../../lib/assets';
import { formatNumber } from '../../lib/format';
import { api } from '../../services/api';
import { BasicTradeLineChart } from './BasicTradeLineChart';

export const BASIC_TRADE_LIMIT_KEY = 'swu.basicTradeChartLimit';
const LIMITS = [5, 10, 25, 50, 100];
const NETWORK_NAMES: Record<number, string> = { 1: 'Imperium', 2: 'Rebellenallianz' };
const buttonClass =
  'border border-swu-accent px-2 py-0.5 text-swu-accent hover:bg-swu-accent/10 disabled:cursor-not-allowed disabled:opacity-40';

function storedLimit(): number {
  try {
    const value = Number(localStorage.getItem(BASIC_TRADE_LIMIT_KEY));
    return LIMITS.includes(value) ? value : 25;
  } catch {
    return 25;
  }
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** „Basishandel“: Aurodium for goods at licensed NPC posts, with rate charts. */
export function BasicTradeTab() {
  const [limit, setLimit] = useState(storedLimit);
  const [overview, setOverview] = useState<BasicTradeOverviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      setOverview(await api.get<BasicTradeOverviewDto>(`/trade/basic?limit=${limit}`));
    } catch (err) {
      setError(errorText(err, 'Basishandel konnte nicht geladen werden'));
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeLimit = (value: number) => {
    setLimit(value);
    try {
      localStorage.setItem(BASIC_TRADE_LIMIT_KEY, String(value));
    } catch {
      // The limit is a convenience; trading works without storage.
    }
  };

  const trade = async (direction: 'buy' | 'sell', postId: number, item: BasicTradeItemDto) => {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.post<{ message: string }>(`/trade/basic/${direction}`, { postId, rateId: item.rateId });
      setNotice(result.message);
    } catch (err) {
      setError(errorText(err, 'Handel fehlgeschlagen'));
    } finally {
      await load();
      setPending(false);
    }
  };

  if (!overview) {
    return error ? <p role="alert" className="text-red-300">{error}</p> : <p className="text-swu-muted">Basishandel wird geladen...</p>;
  }
  return (
    <div className="max-w-5xl space-y-2">
      {notice && <p role="status" className="text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="text-red-300">{error}</p>}
      {overview.accounts.length === 0 ? (
        <p className="border border-swu-border bg-black/30 p-2 text-swu-muted">
          Basishandel ist nur mit einer gültigen Lizenz an einem NPC-Handelsposten deines Fraktionsnetzes möglich.
        </p>
      ) : (
        overview.accounts.map((account) => (
          <section key={account.tradePostId} aria-label={account.tradePostName} className="border border-swu-border bg-black/30">
            <h2 className="flex justify-between border-b border-swu-border px-2 py-1 font-bold text-swu-primary">
              <span>{account.tradePostName}</span>
              <span className="font-mono text-swu-muted">Aurodium: {formatNumber(account.aurodium)}</span>
            </h2>
            <table className="w-full">
              <tbody>
                {account.items.map((item) => (
                  <tr key={item.commodityId} className="border-t border-swu-border/60">
                    <td className="px-2 py-1">
                      <span className="flex items-center gap-2">
                        <img src={commodityImage(item.commodityId)} alt="" className="size-6 object-contain" />
                        {item.commodityName}
                        <span className="text-swu-muted">({formatNumber(item.stored)})</span>
                      </span>
                    </td>
                    <td className="px-2 py-1">1 Aurodium → {formatNumber(item.buyValue)}</td>
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        aria-label={`${item.commodityName} kaufen`}
                        disabled={pending || account.aurodium < 1}
                        onClick={() => void trade('buy', account.tradePostId, item)}
                        className={buttonClass}
                      >
                        Kaufen
                      </button>
                    </td>
                    <td className="px-2 py-1">{formatNumber(item.sellValue)} → 1 Aurodium</td>
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        aria-label={`${item.commodityName} verkaufen`}
                        disabled={pending || item.stored < item.sellValue}
                        onClick={() => void trade('sell', account.tradePostId, item)}
                        className={buttonClass}
                      >
                        Verkaufen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
      {overview.charts.length > 0 && (
        <section aria-label="Kursverlauf" className="space-y-2">
          <label className="flex items-center gap-2">
            <span className="text-swu-muted">Letzte Kurse</span>
            <select
              value={limit}
              onChange={(event) => changeLimit(Number(event.target.value))}
              className="border border-swu-border bg-swu-bg px-1 py-0.5"
            >
              {LIMITS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {overview.charts.map((chart) => (
              <BasicTradeLineChart
                key={`${chart.networkId}-${chart.commodityId}`}
                chart={chart}
                title={`${chart.commodityName} · ${NETWORK_NAMES[chart.networkId] ?? `Netz ${chart.networkId}`}`}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
