import { useEffect, useState } from 'react';
import type { SpacecraftLssMode } from '@swuniverse/shared';
import { api } from '../../services/api';

interface Props {
  shipId: number;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const LSS_MODES: Array<{ value: SpacecraftLssMode; label: string }> = [
  { value: 'DISABLED', label: 'LSS Filter deaktivieren' },
  { value: 'TERRITORY', label: 'Territorialansicht' },
  { value: 'IMPASSABLE', label: 'Unpassierbarkeitsansicht' },
  { value: 'CARTOGRAPHY', label: 'Kartographieansicht' },
];

export function SensorOperationsPanel({
  shipId,
  open,
  onClose,
  onUpdate,
}: Props) {
  const [mode, setMode] = useState<SpacecraftLssMode>('DISABLED');
  const [available, setAvailable] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    api
      .get<{ mode: SpacecraftLssMode; available: boolean }>(
        `/spacecraft/${shipId}/lss-mode`,
      )
      .then((result) => {
        setMode(result.mode);
        setAvailable(result.available);
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : 'LSS-Filter konnte nicht geladen werden',
        ),
      );
  }, [open, shipId]);

  async function changeMode(next: SpacecraftLssMode) {
    setPending(true);
    setError(null);
    try {
      await api.patch(`/spacecraft/${shipId}/lss-mode`, { mode: next });
      setMode(next);
      onUpdate();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'LSS-Filter konnte nicht geändert werden',
      );
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="LSS Filter"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section className="w-full max-w-xs border border-swu-border bg-swu-bg shadow-xl">
        <header className="flex items-center justify-between border-b border-swu-border px-3 py-2">
          <h2 className="text-sm font-bold text-swu-primary">LSS Filter</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Dialog schließen"
            className="text-swu-muted"
          >
            Schließen
          </button>
        </header>
        <div className="p-2">
          {LSS_MODES.map((entry) => (
            <button
              key={entry.value}
              type="button"
              disabled={pending || (!available && entry.value !== 'DISABLED')}
              onClick={() => void changeMode(entry.value)}
              aria-pressed={mode === entry.value}
              className="block w-full border-b border-swu-border px-2 py-2 text-left text-xs text-swu-primary hover:bg-white/5 aria-pressed:text-swu-accent disabled:opacity-40"
            >
              {entry.label}
            </button>
          ))}
          {!available && (
            <p className="mt-2 text-[10px] text-amber-300">
              Langstreckensensoren sind nicht aktiv.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
