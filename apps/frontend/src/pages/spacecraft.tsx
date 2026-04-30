import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Spacecraft {
  id: number;
  name: string;
  shipClassId: number;
  status: string;
  alertState: string;
  hull: number;
  hullMax: number;
  shields: number;
  shieldsMax: number;
  energy: number;
  energyMax: number;
  warpSpeed: number;
  warpCooldown: number;
  crew: number;
  crewMax: number;
  posX: number;
  posY: number;
  starSystem?: { id: number; name: string };
  arrivalAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  DOCKED: 'text-green-400',
  IN_FLIGHT: 'text-swu-success',
  IN_COMBAT: 'text-red-400',
  DESTROYED: 'text-gray-500',
};

const ALERT_COLORS: Record<string, string> = {
  GREEN: 'bg-green-500',
  YELLOW: 'bg-yellow-500',
  RED: 'bg-red-500',
};

export function SpacecraftPage() {
  const [ships, setShips] = useState<Spacecraft[]>([]);
  const [selected, setSelected] = useState<Spacecraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [navTarget, setNavTarget] = useState({ x: '', y: '' });

  useEffect(() => {
    api.get<Spacecraft[]>('/spacecraft').then((data) => {
      setShips(data);
      if (data.length > 0) setSelected(data[0]);
      setLoading(false);
    });
  }, []);

  const refresh = async () => {
    const data = await api.get<Spacecraft[]>('/spacecraft');
    setShips(data);
    if (selected) {
      const updated = data.find((s) => s.id === selected.id);
      if (updated) setSelected(updated);
    }
  };

  const handleNavigate = async () => {
    if (!selected || !navTarget.x || !navTarget.y) return;
    await api.post(`/spacecraft/${selected.id}/navigate`, {
      targetX: Number(navTarget.x),
      targetY: Number(navTarget.y),
    });
    setNavTarget({ x: '', y: '' });
    refresh();
  };

  if (loading) return <div className="p-6 text-swu-muted">Loading fleet...</div>;

  if (ships.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-swu-accent">Spacecraft</h1>
        <p className="text-swu-muted mt-4">No ships in your fleet. Build one in a colony shipyard.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-swu-accent mb-4">Spacecraft</h1>
      <div className="flex gap-4">
        {/* Ship List */}
        <div className="w-52 space-y-2">
          {ships.map((ship) => (
            <button
              key={ship.id}
              onClick={() => setSelected(ship)}
              className={`w-full text-left p-3 rounded border transition-colors ${
                selected?.id === ship.id
                  ? 'border-swu-accent bg-swu-accent/10'
                  : 'border-swu-border hover:border-swu-primary'
              }`}
            >
              <div className="font-bold text-sm text-swu-primary">{ship.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${ALERT_COLORS[ship.alertState]}`} />
                <span className={`text-xs ${STATUS_COLORS[ship.status]}`}>{ship.status}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Ship Detail */}
        {selected && (
          <div className="flex-1 space-y-4">
            {/* Header */}
            <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-swu-primary">{selected.name}</h2>
                  <p className="text-xs text-swu-muted">
                    Class: {selected.shipClassId} · {selected.starSystem?.name || 'Deep Space'} [{selected.posX},{selected.posY}]
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${ALERT_COLORS[selected.alertState]}`} />
                  <span className={`text-sm font-bold ${STATUS_COLORS[selected.status]}`}>
                    {selected.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-swu-surface border border-swu-border rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-bold text-swu-muted">Ship Systems</h3>
                <ShipBar label="Hull" current={selected.hull} max={selected.hullMax} color="bg-red-500" />
                <ShipBar label="Shields" current={selected.shields} max={selected.shieldsMax} color="bg-blue-400" />
                <ShipBar label="Energy" current={selected.energy} max={selected.energyMax} color="bg-yellow-400" />
              </div>
              <div className="bg-swu-surface border border-swu-border rounded-lg p-4 space-y-2">
                <h3 className="text-xs font-bold text-swu-muted">Specs</h3>
                <StatRow label="Warp Speed" value={selected.warpSpeed.toString()} />
                <StatRow label="Warp Cooldown" value={selected.warpCooldown > 0 ? `${selected.warpCooldown} ticks` : 'Ready'} />
                <StatRow label="Crew" value={`${selected.crew}/${selected.crewMax}`} />
                {selected.arrivalAt && (
                  <StatRow label="ETA" value={new Date(selected.arrivalAt).toLocaleTimeString()} />
                )}
              </div>
            </div>

            {/* Navigation */}
            {selected.status === 'DOCKED' && (
              <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
                <h3 className="text-xs font-bold text-swu-muted mb-2">Navigate (in-system)</h3>
                <div className="flex items-end gap-2">
                  <div>
                    <label className="text-[10px] text-swu-muted">X</label>
                    <input
                      type="number"
                      value={navTarget.x}
                      onChange={(e) => setNavTarget({ ...navTarget, x: e.target.value })}
                      className="w-16 bg-swu-bg border border-swu-border rounded px-2 py-1 text-sm text-swu-primary"
                      min={0}
                      max={20}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-swu-muted">Y</label>
                    <input
                      type="number"
                      value={navTarget.y}
                      onChange={(e) => setNavTarget({ ...navTarget, y: e.target.value })}
                      className="w-16 bg-swu-bg border border-swu-border rounded px-2 py-1 text-sm text-swu-primary"
                      min={0}
                      max={20}
                    />
                  </div>
                  <button
                    onClick={handleNavigate}
                    className="px-3 py-1 bg-swu-primary/20 border border-swu-primary text-swu-primary text-sm rounded hover:bg-swu-primary/30 transition-colors"
                  >
                    Go
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ShipBar({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-swu-muted mb-1">
        <span>{label}</span>
        <span>{current}/{max}</span>
      </div>
      <div className="h-2 bg-swu-bg rounded-full overflow-hidden border border-swu-border">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-swu-muted">{label}</span>
      <span className="text-swu-primary font-mono">{value}</span>
    </div>
  );
}
