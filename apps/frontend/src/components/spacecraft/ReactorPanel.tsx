import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

interface ReactorPanelProps {
  shipId: number;
  energy: number;
  energyMax: number;
  reactorOutput: number;
  warpdrive: number;
  warpdriveMax: number;
  battery: number;
  batteryMax: number;
  reactorFuel: number;
  reactorFuelMax: number;
  reactorWarpSplit: number;
  hyperdriveActive: boolean;
  inSystem: boolean;
  onUpdate: () => void;
}

export function ReactorPanel({
  shipId,
  energy,
  energyMax,
  reactorOutput,
  warpdrive,
  warpdriveMax,
  battery,
  batteryMax,
  reactorFuel,
  reactorFuelMax,
  reactorWarpSplit,
  hyperdriveActive,
  inSystem,
  onUpdate,
}: ReactorPanelProps) {
  const [split, setSplit] = useState(reactorWarpSplit);
  const [confirmedSplit, setConfirmedSplit] = useState(reactorWarpSplit);
  const [savingSplit, setSavingSplit] = useState(false);
  const [engineering, setEngineering] = useState<'reactor' | 'battery' | null>(
    null,
  );
  const [amount, setAmount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSplit(reactorWarpSplit);
    setConfirmedSplit(reactorWarpSplit);
  }, [reactorWarpSplit]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const updateSplit = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(100, value));
      setSplit(clamped);
      setError(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSavingSplit(true);
        try {
          await api.patch(`/spacecraft/${shipId}/reactor-distribution`, {
            warpSplit: clamped,
          });
          setConfirmedSplit(clamped);
          onUpdate();
        } catch (err: unknown) {
          setSplit(confirmedSplit);
          setError(
            err instanceof Error
              ? err.message
              : 'Reaktorverteilung fehlgeschlagen',
          );
        } finally {
          setSavingSplit(false);
        }
      }, 300);
    },
    [confirmedSplit, shipId, onUpdate],
  );

  async function transferEngineering(
    action: 'reactor/load' | 'battery/discharge',
    requested: number | 'MAX',
  ) {
    setEngineering(action.startsWith('reactor') ? 'reactor' : 'battery');
    setError(null);
    try {
      await api.post(`/spacecraft/${shipId}/${action}`, { amount: requested });
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transfer fehlgeschlagen');
    } finally {
      setEngineering(null);
    }
  }

  async function toggleHyperdrive() {
    setError(null);
    try {
      await api.patch(`/spacecraft/${shipId}/systems/WARPDRIVE`, {
        active: !hyperdriveActive,
      });
      onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Hyperantrieb konnte nicht umgeschaltet werden',
      );
    }
  }

  return (
    <section
      className="rounded-lg border border-swu-border bg-swu-surface p-3"
      aria-labelledby="reactor-panel-heading"
    >
      <h3
        id="reactor-panel-heading"
        className="mb-2 border-b border-swu-border/60 pb-1 text-center text-xs font-bold text-swu-primary"
      >
        Reaktor + Hyperantrieb
      </h3>

      <div className="divide-y divide-swu-border/60 border border-swu-border/60 text-xs">
        <div className="flex items-center gap-2 p-2">
          <span className="flex-1 font-mono text-swu-primary">
            Reaktortreibstoff {reactorFuel}/{reactorFuelMax}
          </span>
          <EngineeringControls
            label="Reaktor laden"
            pending={engineering === 'reactor'}
            amount={amount}
            onAmount={setAmount}
            onSubmit={(value) => transferEngineering('reactor/load', value)}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-swu-muted">
            <span>Hyperantriebsaufladung {100 - split}%</span>
            <span>EPS-Anteil {split}%</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => updateSplit(split - 5)}
              disabled={savingSplit}
              aria-label="Reaktorverteilung um 5 Prozent Richtung Hyperantriebsaufladung erhöhen"
              className="rounded border border-swu-border bg-black/40 px-1.5 py-0.5 text-[10px] text-swu-accent hover:border-swu-accent disabled:opacity-40"
            >
              -5
            </button>
            <input
              aria-label="Reaktorverteilung EPS-Anteil"
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(e) => updateSplit(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded bg-swu-border [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-swu-accent"
            />
            <button
              type="button"
              onClick={() => updateSplit(split + 5)}
              disabled={savingSplit}
              aria-label="Reaktorverteilung um 5 Prozent Richtung EPS erhöhen"
              className="rounded border border-swu-border bg-black/40 px-1.5 py-0.5 text-[10px] text-swu-accent hover:border-swu-accent disabled:opacity-40"
            >
              +5
            </button>
          </div>
          <div className="text-center text-[10px] text-swu-muted">
            EPS {energy}/{energyMax} · Reaktorleistung: {reactorOutput} · Server
            bestätigt {confirmedSplit}% EPS
          </div>
        </div>

        {!inSystem && (
          <div className="flex items-center justify-between gap-2 p-2">
            <span className="font-mono text-swu-primary">
              Hyperantriebsenergie {warpdrive}/{warpdriveMax}
            </span>
            <button
              type="button"
              onClick={() => void toggleHyperdrive()}
              className="border border-swu-border px-2 py-1 text-xs text-swu-primary"
            >
              Hyperantrieb {hyperdriveActive ? 'deaktivieren' : 'aktivieren'}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 p-2">
          <span className="font-mono text-swu-primary">
            Ersatzbatterie {battery}/{batteryMax}
          </span>
          <EngineeringControls
            label="Batterie entladen"
            pending={engineering === 'battery'}
            amount={amount}
            onAmount={setAmount}
            onSubmit={(value) =>
              transferEngineering('battery/discharge', value)
            }
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}

function EngineeringControls({
  label,
  pending,
  amount,
  onAmount,
  onSubmit,
}: {
  label: string;
  pending: boolean;
  amount: number;
  onAmount: (amount: number) => void;
  onSubmit: (amount: number | 'MAX') => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <label className="sr-only" htmlFor={`${label}-amount`}>
        Menge
      </label>
      <input
        id={`${label}-amount`}
        aria-label={`${label} Menge`}
        type="number"
        min={1}
        value={amount}
        onChange={(event) =>
          onAmount(Math.max(1, Number(event.target.value) || 1))
        }
        className="w-16 rounded border border-swu-border bg-swu-bg px-1 text-xs"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => void onSubmit(amount)}
        className="rounded border border-swu-border px-2 py-0.5 text-[10px] disabled:opacity-40"
      >
        {pending ? 'läuft…' : label}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => void onSubmit('MAX')}
        className="rounded border border-swu-border px-2 py-0.5 text-[10px] disabled:opacity-40"
      >
        max
      </button>
    </div>
  );
}
