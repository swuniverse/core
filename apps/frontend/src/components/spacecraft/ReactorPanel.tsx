import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpacecraftEnergyFlowDto } from '@swuniverse/shared';
import { api } from '../../services/api';

interface ReactorPanelProps {
  shipId: number;
  warpdrive: number;
  warpdriveMax: number;
  battery: number;
  batteryMax: number;
  reactorFuel: number;
  reactorFuelMax: number;
  reactorWarpSplit: number;
  reactorAutoCarryOver: boolean;
  hyperdriveActive: boolean;
  inSystem: boolean;
  onUpdate: () => void;
}

export function ReactorPanel({
  shipId,
  warpdrive,
  warpdriveMax,
  battery,
  batteryMax,
  reactorFuel,
  reactorFuelMax,
  reactorWarpSplit,
  reactorAutoCarryOver,
  hyperdriveActive,
  inSystem,
  onUpdate,
}: ReactorPanelProps) {
  const [split, setSplit] = useState(reactorWarpSplit);
  const [autoCarryOver, setAutoCarryOver] = useState(reactorAutoCarryOver);
  const [confirmedDistribution, setConfirmedDistribution] = useState({
    split: reactorWarpSplit,
    autoCarryOver: reactorAutoCarryOver,
  });
  const [savingSplit, setSavingSplit] = useState(false);
  const [flow, setFlow] = useState<SpacecraftEnergyFlowDto | null>(null);
  const [engineering, setEngineering] = useState<'reactor' | 'battery' | null>(
    null,
  );
  const [amount, setAmount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSplit(reactorWarpSplit);
    setAutoCarryOver(reactorAutoCarryOver);
    setConfirmedDistribution({
      split: reactorWarpSplit,
      autoCarryOver: reactorAutoCarryOver,
    });
  }, [reactorAutoCarryOver, reactorWarpSplit]);

  useEffect(() => {
    api
      .get<SpacecraftEnergyFlowDto>(`/spacecraft/${shipId}/energy-flow`)
      .then(setFlow)
      .catch(() => setFlow(null));
  }, [shipId, reactorAutoCarryOver, reactorWarpSplit, warpdrive]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const updateDistribution = useCallback(
    (nextSplit: number, nextAutoCarryOver: boolean, debounce = true) => {
      const clamped = Math.max(0, Math.min(100, nextSplit));
      setSplit(clamped);
      setAutoCarryOver(nextAutoCarryOver);
      setError(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const save = async () => {
        setSavingSplit(true);
        try {
          const result = await api.patch<{
            reactorWarpSplit: number;
            reactorAutoCarryOver: boolean;
          }>(`/spacecraft/${shipId}/reactor-distribution`, {
            warpSplit: clamped,
            autoCarryOver: nextAutoCarryOver,
          });
          setConfirmedDistribution({
            split: result.reactorWarpSplit,
            autoCarryOver: result.reactorAutoCarryOver,
          });
          onUpdate();
        } catch (err: unknown) {
          setSplit(confirmedDistribution.split);
          setAutoCarryOver(confirmedDistribution.autoCarryOver);
          setError(
            err instanceof Error
              ? err.message
              : 'Reaktorverteilung fehlgeschlagen',
          );
        } finally {
          setSavingSplit(false);
        }
      };
      if (debounce) debounceRef.current = setTimeout(() => void save(), 300);
      else void save();
    },
    [confirmedDistribution, shipId, onUpdate],
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

  const warpProduction = flow?.warpProduction ?? 0;
  const epsProduction = flow?.epsProduction ?? 0;

  return (
    <section
      aria-labelledby="reactor-panel-heading"
      className="rounded-lg border border-swu-border bg-swu-surface p-3 text-xs"
    >
      <h3
        id="reactor-panel-heading"
        className="mb-2 border-b border-swu-border/60 pb-1 text-center font-bold text-swu-primary"
      >
        <img
          src="/assets/system/3.png"
          alt=""
          aria-hidden="true"
          className="mr-1 inline size-5 align-middle"
        />
        Reaktor + Antrieb
      </h3>

      <div className="overflow-hidden rounded-md border border-swu-border/60 divide-y divide-swu-border/60">
        <div className="flex flex-wrap items-center gap-2 p-2">
          <img
            src="/assets/system/3.png"
            alt=""
            aria-hidden="true"
            className="size-4"
          />
          <span className="flex-1 font-mono text-swu-primary">
            Reaktortreibstoff {reactorFuel}/{reactorFuelMax}
          </span>
          <EngineeringControls
            label="aufladen"
            amountLabel="Reaktor laden Menge"
            pending={engineering === 'reactor'}
            amount={amount}
            onAmount={setAmount}
            onSubmit={(value) => transferEngineering('reactor/load', value)}
          />
        </div>

        <div className="space-y-2 p-2">
          <div className="flex items-center gap-1">
            <img
              src="/assets/buttons/warpsys.png"
              alt=""
              aria-hidden="true"
              className="size-5"
            />
            <span className="w-16 font-mono text-swu-primary">
              Antrieb +{warpProduction}
            </span>
            <button
              type="button"
              onClick={() => updateDistribution(split - 5, autoCarryOver)}
              disabled={savingSplit}
              aria-label="Hyperantriebsaufladung erhöhen"
              className="rounded border border-swu-border bg-black/40 px-1 text-[10px] text-swu-primary hover:border-swu-accent disabled:opacity-40"
            >
              −
            </button>
            <input
              aria-label="Reaktorverteilung EPS-Anteil"
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(event) =>
                updateDistribution(Number(event.target.value), autoCarryOver)
              }
              className="h-2 min-w-20 flex-1 cursor-pointer appearance-none rounded bg-swu-border accent-swu-accent"
            />
            <button
              type="button"
              onClick={() => updateDistribution(split + 5, autoCarryOver)}
              disabled={savingSplit}
              aria-label="EPS-Anteil erhöhen"
              className="rounded border border-swu-border bg-black/40 px-1 text-[10px] text-swu-primary hover:border-swu-accent disabled:opacity-40"
            >
              +
            </button>
            <img
              src="/assets/buttons/eps.png"
              alt=""
              aria-hidden="true"
              className="size-5"
            />
            <span className="w-14 font-mono text-swu-primary">EPS +{epsProduction}</span>
          </div>
          <label
            title="Überschüssige Energie wird in andere Speicher übertragen"
            className="inline-flex items-center gap-1 text-[10px] text-swu-muted"
          >
            <img
              src="/assets/buttons/e_trans2.png"
              alt=""
              aria-hidden="true"
              className="size-5"
            />
            <input
              type="checkbox"
              checked={autoCarryOver}
              disabled={savingSplit}
              onChange={(event) =>
                updateDistribution(split, event.target.checked, false)
              }
              aria-label="Überschüssige Energie übertragen"
              className="accent-swu-accent"
            />
            Überschüssige Energie übertragen
          </label>
        </div>

        {!inSystem && (
          <div className="flex items-center justify-between gap-2 p-2">
            <span className="font-mono text-swu-primary">
              Hyperantrieb {warpdrive}/{warpdriveMax}
            </span>
            <button
              type="button"
              onClick={() => void toggleHyperdrive()}
              className="rounded border border-swu-border px-2 py-0.5 text-[10px] text-swu-primary hover:border-swu-accent"
            >
              {hyperdriveActive ? 'deaktivieren' : 'aktivieren'}
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 p-2">
          <img
            src="/assets/buttons/batt.png"
            alt=""
            aria-hidden="true"
            className="size-4"
          />
          <span className="flex-1 font-mono text-swu-primary">
            Ersatzbatterie {battery}/{batteryMax}
          </span>
          <EngineeringControls
            label="entladen"
            amountLabel="Batterie entladen Menge"
            pending={engineering === 'battery'}
            amount={amount}
            onAmount={setAmount}
            onSubmit={(value) => transferEngineering('battery/discharge', value)}
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
  amountLabel,
  pending,
  amount,
  onAmount,
  onSubmit,
}: {
  label: string;
  amountLabel: string;
  pending: boolean;
  amount: number;
  onAmount: (amount: number) => void;
  onSubmit: (amount: number | 'MAX') => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <label className="sr-only" htmlFor={`${amountLabel}-amount`}>
        Menge
      </label>
      <input
        id={`${amountLabel}-amount`}
        aria-label={amountLabel}
        type="number"
        min={1}
        value={amount}
        onChange={(event) =>
          onAmount(Math.max(1, Number(event.target.value) || 1))
        }
        className="w-12 border border-swu-border bg-swu-bg px-1 text-xs"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => void onSubmit(amount)}
        className="border border-swu-border bg-swu-surface px-2 py-0.5 text-[10px] hover:bg-white/5 disabled:opacity-40"
      >
        {pending ? 'läuft…' : label}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => void onSubmit('MAX')}
        className="border border-swu-border bg-swu-surface px-2 py-0.5 text-[10px] hover:bg-white/5 disabled:opacity-40"
      >
        max
      </button>
    </div>
  );
}
