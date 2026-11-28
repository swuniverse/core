import { useState } from 'react';
import type { SpacecraftEpsTransferResultDto } from '@swuniverse/shared';
import { api } from '../../services/api';
import { ShipName } from '../ShipName';

export function EpsTransferDialog({
  shipId,
  target,
  onClose,
  onTransfer,
}: {
  shipId: number;
  target: { id: number; name: string };
  onClose: () => void;
  onTransfer: () => void;
}) {
  const [amount, setAmount] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function send() {
    setPending(true);
    setError(null);
    try {
      const result = await api.post<SpacecraftEpsTransferResultDto>(
        `/spacecraft/${shipId}/nearby/${target.id}/eps-transfer`,
        { amount },
      );
      setMessage(result.message);
      onTransfer();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Energietransfer fehlgeschlagen',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Energie transferieren"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
    >
      <section className="w-full max-w-sm border border-swu-border bg-swu-bg p-3 text-xs">
        <header className="mb-2 flex justify-between border-b border-swu-border pb-2">
          <h3 className="font-bold text-swu-primary">
            Energie zur <ShipName name={target.name} /> transferieren
          </h3>
          <button type="button" onClick={onClose}>
            Schließen
          </button>
        </header>
        <p className="mb-2 text-swu-muted">
          Jede übertragene Einheit kostet 3 Energie. Sie wird in die
          Ersatzbatterie des Ziels geladen.
        </p>
        <label className="flex items-center gap-2">
          Menge
          <input
            aria-label="Energiemenge"
            type="number"
            min={1}
            value={amount}
            onChange={(event) =>
              setAmount(
                Math.max(1, Math.floor(Number(event.target.value)) || 1),
              )
            }
            className="w-20 border border-swu-border bg-black px-1"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => void send()}
            className="border border-swu-accent px-2 py-0.5 text-swu-accent disabled:opacity-40"
          >
            Transferieren
          </button>
        </label>
        {message && <p className="mt-2 text-swu-text">{message}</p>}
        {error && (
          <p role="alert" className="mt-2 text-red-300">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
