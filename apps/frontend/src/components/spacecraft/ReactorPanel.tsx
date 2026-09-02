import { useCallback, useRef, useState } from 'react';
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
  reactorWarpSplit: number;
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
  reactorWarpSplit,
  onUpdate,
}: ReactorPanelProps) {
  const [split, setSplit] = useState(reactorWarpSplit);
  const [recharging, setRecharging] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const epsUsage = 4; // ponytail: hardcoded for now, matches backend SYSTEM_EPS_USAGE sum
  const flightCost = 1; // ponytail: from shipClass, hardcode until passed
  const maxWarpGain =
    flightCost > 0
      ? Math.max(0, Math.floor((reactorOutput - epsUsage) / flightCost))
      : 0;
  const warpProduction = Math.round((1 - split / 100) * maxWarpGain);
  const epsProduction = reactorOutput - warpProduction * flightCost;
  const netEps = Math.max(0, epsProduction - epsUsage);

  const updateSplit = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(100, value));
      setSplit(clamped);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        await api.patch(`/spacecraft/${shipId}/reactor-distribution`, {
          warpSplit: clamped,
        });
        onUpdate();
      }, 300);
    },
    [shipId, onUpdate],
  );

  async function recharge() {
    setRecharging(true);
    await api.post(`/spacecraft/${shipId}/recharge`, {});
    onUpdate();
    setRecharging(false);
  }

  return (
    <section className="rounded-lg border border-swu-border bg-swu-surface p-3">
      <h3 className="mb-2 border-b border-swu-border/60 pb-1 text-center text-xs font-bold text-swu-primary">
        Reaktor + Antrieb
      </h3>

      <div className="space-y-3">
        {/* EPS */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-swu-muted">EPS</span>
            <span className="font-mono text-swu-primary">
              {energy}/{energyMax}
            </span>
          </div>
          <ResourceBar current={energy} max={energyMax} color="bg-emerald-500" />
          <div className="flex gap-1">
            <button
              onClick={recharge}
              disabled={recharging}
              className="rounded border border-swu-border bg-black/40 px-2 py-0.5 text-[10px] text-swu-muted hover:border-swu-accent hover:text-swu-primary disabled:opacity-50"
            >
              aufladen
            </button>
          </div>
        </div>

        {/* Reactor Distribution Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-swu-muted">
            <span>EPS +{netEps}</span>
            <span>Warp +{warpProduction}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateSplit(split + 5)}
              className="rounded border border-swu-border bg-black/40 px-1.5 py-0.5 text-[10px] text-swu-accent hover:border-swu-accent"
            >
              +5
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(e) => updateSplit(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded bg-swu-border [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-swu-accent"
            />
            <button
              onClick={() => updateSplit(split - 5)}
              className="rounded border border-swu-border bg-black/40 px-1.5 py-0.5 text-[10px] text-swu-accent hover:border-swu-accent"
            >
              +5
            </button>
          </div>
          <div className="text-center text-[10px] text-swu-muted">
            Reaktorleistung: {reactorOutput} · Verteilung EPS{' '}
            {100 - split}% / Warp {split}%
          </div>
        </div>

        {/* Warpdrive */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-swu-muted">Warpantrieb</span>
            <span className="font-mono text-swu-primary">
              {warpdrive}/{warpdriveMax}
            </span>
          </div>
          <ResourceBar
            current={warpdrive}
            max={warpdriveMax}
            color="bg-blue-500"
          />
        </div>

        {/* Battery */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-swu-muted">Ersatzbatterie</span>
            <span className="font-mono text-swu-primary">
              {battery}/{batteryMax}
            </span>
          </div>
          <ResourceBar
            current={battery}
            max={batteryMax}
            color="bg-yellow-500"
          />
        </div>
      </div>
    </section>
  );
}

function ResourceBar({
  current,
  max,
  color,
}: {
  current: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded bg-black/60 border border-swu-border/40">
      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}
