import { useEffect, useRef, useState } from 'react';
import type { SpacecraftSelfDestructResultDto } from '@swuniverse/shared';
import { api } from '../../services/api';
import { ShipSymbol } from './ShipSymbol';

interface Props {
  shipId: number;
  shipName: string;
  destroyed: boolean;
  open: boolean;
  onClose: () => void;
  onDestroyed: () => void;
}

export function SelfDestructPanel({
  shipId,
  shipName,
  destroyed,
  open,
  onClose,
  onDestroyed,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConfirmed(false);
    setTypedName('');
    setError(null);
  }, [shipId, open]);

  useEffect(() => {
    if (open) {
      dialogRef.current?.querySelector<HTMLElement>('button, input')?.focus();
    }
  }, [open, confirmed]);

  async function execute() {
    setPending(true);
    setError(null);
    try {
      await api.post<SpacecraftSelfDestructResultDto>(
        `/spacecraft/${shipId}/self-destruct`,
        {},
      );
      onClose();
      onDestroyed();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Selbstzerstörung fehlgeschlagen',
      );
    } finally {
      setPending(false);
    }
  }

  if (destroyed || !open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Selbstzerstörung bestätigen"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section className="w-full max-w-md space-y-3 rounded border border-red-700 bg-swu-bg p-4 shadow-xl">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-red-300">
          <ShipSymbol kind="self-destruct" className="size-4" />
          Selbstzerstörung
        </h2>
        <div className="space-y-2">
          {!confirmed ? (
            <>
              <p className="text-xs text-red-200">
                Die Zerstörung ist sofort und kann nicht abgebrochen werden.
              </p>
              <button
                type="button"
                onClick={() => setConfirmed(true)}
                className="rounded border border-red-500 px-2 py-1 text-xs"
              >
                Risiko verstanden
              </button>
            </>
          ) : (
            <>
              <label className="block text-xs text-swu-muted">
                Schiffsname zur Bestätigung
                <input
                  value={typedName}
                  onChange={(event) => setTypedName(event.target.value)}
                  className="mt-1 block w-full rounded border border-red-700 bg-swu-bg px-2 py-1 text-swu-primary"
                />
              </label>
              <button
                type="button"
                disabled={pending || typedName !== shipName}
                onClick={() => void execute()}
                className="rounded bg-red-700 px-2 py-1 text-xs font-bold text-white disabled:opacity-40"
              >
                {pending
                  ? 'Zerstörung läuft…'
                  : 'Jetzt unwiderruflich zerstören'}
              </button>
            </>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="text-xs text-swu-muted hover:text-swu-primary"
          >
            Schließen
          </button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-300">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
