import { PlayerName } from '../PlayerName';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { TradeLicenseDto, TradeShoutboxDto } from '@swuniverse/shared';
import { formatDateTime } from '../../lib/format';
import { api } from '../../services/api';

const buttonClass =
  'border border-swu-accent px-2 py-0.5 text-swu-accent hover:bg-swu-accent/10 disabled:cursor-not-allowed disabled:opacity-40';

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** „Shoutbox“: STU `ShowShoutBox` for every network the player holds a license in. */
export function TradeShoutboxTab() {
  const [networkIds, setNetworkIds] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<TradeLicenseDto[]>('/trade/licenses')
      .then((licenses) => {
        if (!cancelled) setNetworkIds([...new Set(licenses.map((license) => license.networkId))].sort((a, b) => a - b));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorText(err, 'Lizenzen konnten nicht geladen werden'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!networkIds) {
    return error ? <p role="alert" className="text-red-300">{error}</p> : <p className="text-swu-muted">Shoutboxen werden geladen...</p>;
  }
  if (networkIds.length === 0) {
    return (
      <p className="max-w-3xl border border-swu-border bg-black/30 p-2 text-swu-muted">
        Die Shoutbox eines Handelsnetzes steht dir mit einer gültigen Lizenz an einem seiner Posten offen.
      </p>
    );
  }
  return (
    <div className="grid max-w-5xl gap-2 lg:grid-cols-2">
      {networkIds.map((networkId) => <ShoutboxBox key={networkId} networkId={networkId} />)}
    </div>
  );
}

export function ShoutboxBox({ networkId }: { networkId: number }) {
  const [box, setBox] = useState<TradeShoutboxDto | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<TradeShoutboxDto>(`/trade/networks/${networkId}/shoutbox`)
      .then((next) => {
        if (!cancelled) setBox(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorText(err, 'Shoutbox konnte nicht geladen werden'));
      });
    return () => {
      cancelled = true;
    };
  }, [networkId]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return;
    setPending(true);
    setError(null);
    try {
      setBox(await api.post<TradeShoutboxDto>(`/trade/networks/${networkId}/shoutbox`, { message }));
      setMessage('');
    } catch (err) {
      setError(errorText(err, 'Nachricht konnte nicht gesendet werden'));
    } finally {
      setPending(false);
    }
  };

  const title = box?.networkName ?? `Handelsnetz ${networkId}`;
  return (
    <section aria-label={`Shoutbox ${title}`} className="flex flex-col border border-swu-border bg-black/30">
      <h2 className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">{title}</h2>
      <ol className="max-h-72 flex-1 space-y-1 overflow-y-auto p-2">
        {box?.entries.length === 0 && <li className="text-swu-muted">Noch keine Einträge.</li>}
        {box?.entries.map((entry) => (
          <li key={entry.id} className="break-words">
            <span className="mr-1 font-mono text-[10px] text-swu-muted">{formatDateTime(entry.createdAt)}</span>
            <Link to={`/players/${entry.userId}`} className="mr-1 text-swu-accent hover:underline"><PlayerName name={entry.username} /></Link>
            <span>{entry.message}</span>
          </li>
        ))}
      </ol>
      {error && <p role="alert" className="px-2 text-red-300">{error}</p>}
      <form onSubmit={(event) => void send(event)} className="flex gap-1 border-t border-swu-border p-2">
        <input
          aria-label="Nachricht"
          value={message}
          maxLength={200}
          onChange={(event) => setMessage(event.target.value)}
          className="min-w-0 flex-1 border border-swu-border bg-swu-bg px-1 py-0.5"
        />
        <button type="submit" disabled={pending || !message.trim()} className={buttonClass}>Senden</button>
      </form>
    </section>
  );
}
