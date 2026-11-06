import { useCallback, useEffect, useState } from 'react';
import { WsEventType } from '@swuniverse/shared';
import { api } from '../services/api';
import { useSocket } from '../hooks/use-socket';
import { useAuthStore } from '../stores/auth.store';
import { orderBroadcastImage } from '../lib/assets';
import { PlayerAvatar } from './PlayerAvatar';

export type OrderBroadcast = {
  id: number;
  message: string;
  createdAt: string;
};

/** Neueste Nachricht zuerst; doppelte IDs (Push + Nachladen) werden entfernt. */
export function mergeBroadcasts(
  current: OrderBroadcast[],
  incoming: OrderBroadcast[],
): OrderBroadcast[] {
  const byId = new Map<number, OrderBroadcast>();
  for (const item of [...current, ...incoming]) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => b.id - a.id);
}

export function OrderBroadcastOverlay() {
  const user = useAuthStore((s) => s.user);
  const [queue, setQueue] = useState<OrderBroadcast[]>([]);
  const [pending, setPending] = useState(false);

  const load = useCallback(() => {
    void api
      .get<OrderBroadcast[]>('/order-broadcasts/pending')
      .then((items) => setQueue((q) => mergeBroadcasts(q, items)))
      .catch(() => undefined);
  }, []);

  useEffect(load, [load]);

  useSocket(WsEventType.ORDER_BROADCAST, (payload) => {
    setQueue((q) => mergeBroadcasts(q, [payload as OrderBroadcast]));
  });

  if (queue.length === 0 || !user) return null;

  const current = queue[0];
  const isLast = queue.length === 1;

  const confirm = async () => {
    setPending(true);
    try {
      await api.post('/order-broadcasts/acknowledge', { ids: [current.id] });
    } catch {
      // Beim nächsten Login erscheint die Nachricht erneut.
    } finally {
      setQueue((q) => q.filter((item) => item.id !== current.id));
      setPending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nachricht der Spielleitung"
      className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4"
    >
      <section className="w-full min-w-[min(100%,320px)] border border-swu-border bg-swu-bg text-xs md:w-1/3">
        <header className="flex justify-between border-b border-swu-border px-3 py-2">
          <h3 className="font-bold text-swu-primary">Nachricht</h3>
          {queue.length > 1 && (
            <span className="text-swu-muted">
              {queue.length} ungelesen
            </span>
          )}
        </header>
        <div className="flex gap-3 p-3">
          <PlayerAvatar
            name={user.username}
            avatar={orderBroadcastImage(user.faction)}
            faction={user.faction}
            decorative
            className="size-24"
          />
          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-swu-primary">
            {current.message}
          </p>
        </div>
        <footer className="flex justify-end border-t border-swu-border px-3 py-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void confirm()}
            className="rounded border border-swu-accent bg-swu-accent/10 px-4 py-1.5 font-semibold text-swu-accent transition hover:bg-swu-accent/20 disabled:opacity-50"
          >
            {isLast ? 'Bestätigen' : 'Weiter'}
          </button>
        </footer>
      </section>
    </div>
  );
}
