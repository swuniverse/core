import type { Colony, ColonyDetailV2 } from '../types';
import { formatSignedAmount } from '../utils';

function StatusItem({
  label,
  value,
  delta,
  tone = 'text-swu-primary',
}: {
  label: string;
  value: string;
  delta?: number;
  tone?: string;
}) {
  return (
    <div className="min-w-[130px] rounded border border-swu-border/50 bg-swu-bg/35 px-2 py-1.5">
      <div className="text-[9px] font-bold uppercase tracking-wide text-swu-muted">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1 text-xs">
        <span className={`font-mono ${tone}`}>{value}</span>
        {delta != null && (
          <span
            className={`font-mono text-[10px] ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {formatSignedAmount(delta)}
          </span>
        )}
      </div>
    </div>
  );
}

export function ColonyStatusBar({
  colony,
  detail,
}: {
  colony: Colony;
  detail?: ColonyDetailV2;
}) {
  const shield = detail?.defense?.shields;
  return (
    <div className="overflow-x-auto rounded border border-swu-border bg-swu-surface px-2 py-2">
      <div className="flex min-w-max gap-2">
        <StatusItem
          label="Energie"
          value={`${detail?.energy.current ?? colony.energy}/${detail?.energy.max ?? colony.energyMax}`}
          delta={detail?.energy.delta}
          tone="text-swu-warning"
        />
        <StatusItem
          label="Bevölkerung"
          value={`${detail?.population.current ?? colony.population}/${detail?.population.max ?? colony.populationMax}`}
          delta={detail?.population.growth}
          tone="text-swu-success"
        />
        <StatusItem
          label="Lager"
          value={`${detail?.storage.current ?? colony.storageUsed}/${detail?.storage.max ?? colony.storageMax}`}
          delta={detail?.storage.delta}
        />
        <StatusItem
          label="Orbit"
          value={`${detail?.orbitShips.length ?? 0} Schiffe`}
          tone="text-swu-muted"
        />
        {shield && (
          <StatusItem
            label="Schilde"
            value={`${shield.current}/${shield.max}`}
            tone="text-swu-accent"
          />
        )}
      </div>
    </div>
  );
}
