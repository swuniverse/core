import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../services/api';

interface ColonySummary {
  id: number;
  name: string;
  energy: number;
  energyMax: number;
  population: number;
  populationMax: number;
  storageUsed: number;
  storageMax: number;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [colonies, setColonies] = useState<ColonySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ColonySummary[]>('/colonies').then((data) => {
      setColonies(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-swu-accent mb-4">Maindesk</h1>

      {/* User Info */}
      <div className="bg-swu-surface border border-swu-border rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-swu-primary font-bold text-lg">{user?.username}</p>
            <p className="text-xs text-swu-muted mt-1">
              Faction: <span className="text-swu-accent">{user?.faction}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-swu-muted">Prestige</p>
            <p className="text-xl font-bold text-swu-accent">{user?.prestige ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Colonies" value={loading ? '...' : String(colonies.length)} />
        <StatCard title="Total Population" value={loading ? '...' : String(colonies.reduce((sum, c) => sum + c.population, 0))} />
        <StatCard title="Total Energy" value={loading ? '...' : String(colonies.reduce((sum, c) => sum + c.energy, 0))} />
      </div>

      {/* Colony Overview */}
      {colonies.length > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
          <h2 className="text-sm font-bold text-swu-muted mb-3">Colony Overview</h2>
          <div className="space-y-3">
            {colonies.map((c) => (
              <div key={c.id} className="flex items-center gap-4 p-2 bg-swu-bg/50 rounded border border-swu-border/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-swu-primary truncate">{c.name}</p>
                </div>
                <MiniBar label="E" current={c.energy} max={c.energyMax} color="bg-yellow-500" />
                <MiniBar label="P" current={c.population} max={c.populationMax} color="bg-swu-success" />
                <MiniBar label="S" current={c.storageUsed} max={c.storageMax} color="bg-swu-primary" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
      <h3 className="text-xs text-swu-muted">{title}</h3>
      <p className="text-2xl font-bold text-swu-primary mt-1">{value}</p>
    </div>
  );
}

function MiniBar({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  return (
    <div className="w-20">
      <div className="flex justify-between text-[10px] text-swu-muted mb-0.5">
        <span>{label}</span>
        <span>{current}</span>
      </div>
      <div className="h-1.5 bg-swu-bg rounded-full overflow-hidden border border-swu-border/50">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
