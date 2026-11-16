import { useEffect, useRef, useState } from 'react';
import type { SpacecraftCargoDisposeResultDto } from '@swuniverse/shared';
import { api } from '../../services/api';
import { commodityImage } from '../../lib/assets';
import type { CargoItem } from './ShipStoragePanel';

export function CargoDisposeDialog({
  shipId,
  cargo,
  onClose,
  onComplete,
}: {
  shipId: number;
  cargo: CargoItem[];
  onClose: () => void;
  onComplete: (result: SpacecraftCargoDisposeResultDto) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inventory = cargo.filter((item) => item.amount > 0);
  const items = inventory
    .map((item) => ({
      commodityId: item.commodityId,
      amount: Math.min(
        item.amount,
        Math.max(0, Math.floor(Number(amounts[item.commodityId] ?? 0)) || 0),
      ),
    }))
    .filter((item) => item.amount > 0);

  async function dispose() {
    if (pending || !items.length) return;
    setPending(true);
    setError(null);
    try {
      const result = await api.post<SpacecraftCargoDisposeResultDto>(
        `/spacecraft/${shipId}/cargo/dispose`,
        { items },
      );
      onComplete(result);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Waren konnten nicht entsorgt werden',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Waren entsorgen"
      className="fixed inset-x-0 bottom-0 top-[58px] md:top-[86px] md:ml-[68px] z-50 grid place-items-center bg-black/70 p-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !pending) onClose();
        if (event.key === 'Tab') {
          const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled)',
          );
          const first = controls?.[0];
          const last = controls?.[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <section className="max-h-[80vh] w-full max-w-lg overflow-auto border border-swu-border bg-swu-bg p-3 text-xs">
        <header className="mb-3 flex justify-between border-b border-swu-border pb-2">
          <h2 className="font-bold text-swu-primary">Waren entsorgen</h2>
          <button type="button" disabled={pending} onClick={onClose}>
            Schließen
          </button>
        </header>
        <p className="mb-3">
          Die ausgewählten Waren werden unwiderruflich vernichtet.
        </p>
        <div className="space-y-2">
          {inventory.map((item) => {
            const name = item.commodityName ?? `Ware #${item.commodityId}`;
            return (
              <div key={item.commodityId} className="flex items-center gap-2">
                <img
                  src={commodityImage(item.commodityId, name)}
                  alt=""
                  className="size-5 object-contain"
                />
                <label className="flex flex-1 items-center justify-between gap-2">
                  <span>
                    {name} (Bestand: {item.amount})
                  </span>
                  <input
                    aria-label={`Menge ${name}`}
                    type="number"
                    min={0}
                    max={item.amount}
                    step={1}
                    disabled={pending}
                    value={amounts[item.commodityId] ?? ''}
                    onChange={(event) =>
                      setAmounts((current) => ({
                        ...current,
                        [item.commodityId]: event.target.value,
                      }))
                    }
                    className="w-20 border border-swu-border bg-swu-bg p-1 text-right"
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Alles ${name}`}
                  disabled={pending}
                  onClick={() =>
                    setAmounts((current) => ({
                      ...current,
                      [item.commodityId]: String(item.amount),
                    }))
                  }
                >
                  alles
                </button>
              </div>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-red-300">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={pending || !items.length}
          onClick={() => void dispose()}
          className="mt-3 border border-red-500/50 bg-red-900/20 px-3 py-1 text-red-300 disabled:opacity-40"
        >
          {pending ? 'Entsorgung läuft…' : 'Ausgewählte Waren entsorgen'}
        </button>
      </section>
    </div>
  );
}
