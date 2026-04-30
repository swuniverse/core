import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Colony {
  id: number;
  name: string;
  energy: number;
  energyMax: number;
  population: number;
  populationMax: number;
  storageUsed: number;
  storageMax: number;
  starSystem?: { name: string };
}

export function ColoniesPage() {
  const [colonies, setColonies] = useState<Colony[]>([]);
  const [selected, setSelected] = useState<Colony | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Colony[]>('/colonies').then((data) => {
      setColonies(data);
      if (data.length > 0) setSelected(data[0]);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-6 text-swu-muted">Loading colonies...</div>;

  if (colonies.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-swu-accent">Colonies</h1>
        <p className="text-swu-muted mt-4">No colonies yet. Your first colony will be assigned upon registration.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-swu-accent mb-4">Colonies</h1>
      <div className="flex gap-4">
        {/* Colony List */}
        <div className="w-48 space-y-2">
          {colonies.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={`w-full text-left p-3 rounded border transition-colors ${
                selected?.id === c.id
                  ? 'border-swu-accent bg-swu-accent/10 text-swu-accent'
                  : 'border-swu-border text-swu-muted hover:border-swu-primary'
              }`}
            >
              <div className="font-bold text-sm">{c.name}</div>
              <div className="text-xs mt-1">{c.starSystem?.name || 'Unknown'}</div>
            </button>
          ))}
        </div>

        {/* Colony Detail */}
        {selected && <ColonyDetail colony={selected} />}
      </div>
    </div>
  );
}

function ColonyDetail({ colony }: { colony: Colony }) {
  return (
    <div className="flex-1 bg-swu-surface border border-swu-border rounded-lg p-6">
      <h2 className="text-xl font-bold text-swu-primary mb-4">{colony.name}</h2>
      <div className="grid grid-cols-3 gap-4">
        <ResourceBar
          label="Energy"
          current={colony.energy}
          max={colony.energyMax}
          color="text-swu-warning"
        />
        <ResourceBar
          label="Population"
          current={colony.population}
          max={colony.populationMax}
          color="text-swu-success"
        />
        <ResourceBar
          label="Storage"
          current={colony.storageUsed}
          max={colony.storageMax}
          color="text-swu-primary"
        />
      </div>
      <div className="mt-6 bg-swu-bg border border-swu-border rounded p-4">
        <p className="text-swu-muted text-sm">Colony grid and building system coming soon.</p>
      </div>
    </div>
  );
}

function ResourceBar({
  label,
  current,
  max,
  color,
}: {
  label: string;
  current: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-swu-muted mb-1">
        <span>{label}</span>
        <span className={color}>
          {current}/{max}
        </span>
      </div>
      <div className="h-2 bg-swu-bg rounded-full overflow-hidden border border-swu-border">
        <div
          className="h-full bg-swu-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
