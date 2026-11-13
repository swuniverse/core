import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { TradeLotteryDto } from '@swuniverse/shared';
import { formatNumber } from '../../lib/format';
import { api } from '../../services/api';

const buttonClass =
  'border border-swu-accent px-2 py-0.5 text-swu-accent hover:bg-swu-accent/10 disabled:cursor-not-allowed disabled:opacity-40';

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** „Lotterie“: STU `ShowLottery`, run by the Hutt Cartel. Drawn on the first of each month. */
export function TradeLotteryTab() {
  const [lottery, setLottery] = useState<TradeLotteryDto | null>(null);
  const [amount, setAmount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      setLottery(await api.get<TradeLotteryDto>('/trade/lottery'));
    } catch (err) {
      setError(errorText(err, 'Lotterie konnte nicht geladen werden'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const buy = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      setNotice((await api.post<{ message: string }>('/trade/lottery/tickets', { amount })).message);
      await load();
    } catch (err) {
      setError(errorText(err, 'Lose konnten nicht gekauft werden'));
    } finally {
      setPending(false);
    }
  };

  if (!lottery) {
    return error ? <p role="alert" className="text-red-300">{error}</p> : <p className="text-swu-muted">Lotterie wird geladen...</p>;
  }
  const valid = Number.isInteger(amount) && amount >= 1;
  return (
    <div className="max-w-3xl space-y-2">
      {notice && <p role="status" className="text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="text-red-300">{error}</p>}
      <section aria-label={`Lotterie ${lottery.period}`} className="border border-swu-border bg-black/30">
        <h2 className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">
          Lotterie des Hutten-Kartells · Zeitraum {lottery.period}
        </h2>
        <div className="space-y-0.5 p-2">
          <p>Lose im Topf: <span className="font-mono">{formatNumber(lottery.tickets)}</span></p>
          <p>Deine Lose: <span className="font-mono">{formatNumber(lottery.ownTickets)}</span></p>
          <p>Möglicher Jackpot: <span className="font-mono">{formatNumber(lottery.jackpot)}</span> Aurodium</p>
        </div>
        <p className="px-2 text-swu-muted">
          Ein Los kostet 1 Aurodium. Am Monatsersten gewinnt ein zufälliges Los 80 % der Lose als Aurodium, dazu Prestige in Höhe der eigenen Lose und
          eventuell ein Schiff.
        </p>
        {lottery.hasLicense ? (
          <form onSubmit={(event) => void buy(event)} className="flex flex-wrap items-center gap-2 p-2">
            <span className="text-swu-muted">
              Aurodium am {lottery.tradePostName}: <span className="font-mono">{formatNumber(lottery.aurodium)}</span>
            </span>
            <label className="flex items-center gap-1">
              <span>Anzahl Lose</span>
              <input
                type="number"
                min={1}
                max={lottery.aurodium || undefined}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="w-20 border border-swu-border bg-swu-bg px-1 py-0.5 text-center"
              />
            </label>
            <button type="submit" disabled={pending || !valid} className={buttonClass}>Lose kaufen</button>
          </form>
        ) : (
          <p className="p-2 text-amber-200">{lottery.notice}</p>
        )}
      </section>
      {lottery.lastDraw && (
        <section aria-label={`Letzte Ziehung ${lottery.lastDraw.period}`} className="border border-swu-border bg-black/30 p-2">
          <h2 className="font-bold text-swu-primary">Letzte Ziehung · Zeitraum {lottery.lastDraw.period}</h2>
          <p>
            {lottery.lastDraw.winner
              ? `Gewinner: ${lottery.lastDraw.winner.username} – ${formatNumber(lottery.lastDraw.jackpot)} Aurodium aus ${formatNumber(lottery.lastDraw.tickets)} Losen`
              : `Noch nicht gezogen – ${formatNumber(lottery.lastDraw.tickets)} Lose im Topf`}
          </p>
          <p className="text-swu-muted">Deine Lose: {formatNumber(lottery.lastDraw.ownTickets)}</p>
        </section>
      )}
    </div>
  );
}
