import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';

type Torpedo = {
  torpedoTypeId: number;
  amount: number;
  name: string;
  isActive: boolean;
};
type Storage = {
  capacity: number;
  fireable: Torpedo[];
  transport: Torpedo[];
  compatible: Array<{ id: number; name: string }>;
};
type Colony = { id: number; name: string };

export function TorpedoPanel({
  shipId,
  onTransfer,
}: {
  shipId: number;
  onTransfer: () => void;
}) {
  const [storage, setStorage] = useState<Storage | null>(null);
  const [colonies, setColonies] = useState<Colony[]>([]);
  const [colonyId, setColonyId] = useState<number | null>(null);
  const [torpedoTypeId, setTorpedoTypeId] = useState<number | null>(null);
  const [amount, setAmount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const [torpedoes, colonyList] = await Promise.all([
        api.get<Storage>(`/spacecraft/${shipId}/torpedoes`),
        api.get<Colony[]>('/colonies'),
      ]);
      setStorage(torpedoes);
      setColonies(colonyList);
      setColonyId((current) => current ?? colonyList[0]?.id ?? null);
      setTorpedoTypeId(
        (current) => current ?? torpedoes.compatible[0]?.id ?? null,
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Torpedos konnten nicht geladen werden',
      );
    }
  }, [shipId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function transfer(action: 'load' | 'unload') {
    if (!colonyId || !torpedoTypeId) return;
    setError(null);
    try {
      await api.post(
        `/spacecraft/${shipId}/torpedoes/${action}`,
        action === 'load'
          ? { colonyId, torpedoTypeId, amount }
          : { colonyId, torpedoTypeId, amount },
      );
      await refresh();
      onTransfer();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Torpedotransfer fehlgeschlagen',
      );
    }
  }
  if (error && !storage) {
    return (
      <p role="alert" className="text-xs text-red-300">
        {error}
      </p>
    );
  }
  if (!storage)
    return <p className="text-xs text-swu-muted">Torpedos werden geladen…</p>;
  return (
    <section className="rounded-lg border border-swu-border bg-swu-surface p-3 text-xs">
      <h3 className="mb-2 font-bold text-swu-primary">
        Torpedos ·{' '}
        {storage.fireable.reduce((sum, entry) => sum + entry.amount, 0)}/
        {storage.capacity}
      </h3>
      {storage.compatible.length === 0 ? (
        <p className="text-swu-muted">
          Diese Schiffsklasse kann keine Torpedos verwenden.
        </p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              aria-label="Kolonie"
              value={colonyId ?? ''}
              onChange={(event) =>
                setColonyId(Number(event.target.value) || null)
              }
              className="border border-swu-border bg-swu-bg p-1"
            >
              {colonies.map((colony) => (
                <option key={colony.id} value={colony.id}>
                  {colony.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Torpedotyp"
              value={torpedoTypeId ?? ''}
              onChange={(event) =>
                setTorpedoTypeId(Number(event.target.value) || null)
              }
              className="border border-swu-border bg-swu-bg p-1"
            >
              {storage.compatible.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Menge"
              type="number"
              min={1}
              value={amount}
              onChange={(event) =>
                setAmount(Math.max(1, Number(event.target.value) || 1))
              }
              className="border border-swu-border bg-swu-bg p-1"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void transfer('load')}
              className="border border-swu-accent px-2 py-1 text-swu-accent"
            >
              Laden
            </button>
            <button
              type="button"
              onClick={() => void transfer('unload')}
              className="border border-swu-border px-2 py-1 text-swu-text"
            >
              Entladen
            </button>
          </div>
        </>
      )}
      {storage.transport.length > 0 && (
        <p className="mt-2 text-swu-muted">
          Im Transport:{' '}
          {storage.transport
            .map((entry) => `${entry.name}: ${entry.amount}`)
            .join(', ')}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
