import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  locationLabel?: string;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [colonies, setColonies] = useState<ColonySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ColonySummary[]>('/colonies').then((data) => {
      setColonies(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-swu-accent">Maindesk</h1>

      <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-swu-primary font-bold text-lg">
              {user?.username}
            </p>
            <p className="text-xs text-swu-muted mt-1">
              Faction: <span className="text-swu-accent">{user?.faction}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-swu-muted">Prestige</p>
            <p className="text-xl font-bold text-swu-accent">
              {user?.prestige ?? 0}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Colonies"
          value={loading ? '...' : String(colonies.length)}
        />
        <StatCard
          title="Total Population"
          value={
            loading
              ? '...'
              : String(
                  colonies.reduce((sum, colony) => sum + colony.population, 0),
                )
          }
        />
        <StatCard
          title="Total Energy"
          value={
            loading
              ? '...'
              : String(colonies.reduce((sum, colony) => sum + colony.energy, 0))
          }
        />
      </div>

      {!loading && colonies.length === 0 && (
        <section className="bg-swu-accent/10 border border-swu-accent rounded-lg p-5">
          <h2 className="text-lg font-bold text-swu-accent">Keine Heimatwelt</h2>
          <p className="text-sm text-swu-muted mt-1">
            Du hast noch keine Kolonie. Waehle einen Planeten um deine Heimatwelt zu gruenden.
          </p>
          <Link
            to="/claim-colony"
            className="inline-block mt-3 px-4 py-2 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm font-semibold rounded hover:bg-swu-accent/30 transition-colors"
          >
            Planet waehlen
          </Link>
        </section>
      )}

      {colonies.length > 0 && (
        <section className="bg-swu-surface border border-swu-border rounded-lg p-4">
          <h2 className="text-sm font-bold text-swu-muted mb-3">
            Colony Overview
          </h2>
          <div className="space-y-3">
            {colonies.map((colony) => (
              <Link
                key={colony.id}
                to={`/colonies?selected=${colony.id}`}
                className="flex items-center gap-4 p-2 bg-swu-bg/50 rounded border border-swu-border/50 hover:border-swu-primary transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-swu-primary truncate">
                    {colony.name}
                  </p>
                  <p className="text-xs text-swu-muted mt-0.5">
                    {colony.locationLabel || 'Unknown location'}
                  </p>
                </div>
                <MiniBar
                  label="E"
                  current={colony.energy}
                  max={colony.energyMax}
                  color="bg-yellow-500"
                />
                <MiniBar
                  label="P"
                  current={colony.population}
                  max={colony.populationMax}
                  color="bg-swu-success"
                />
                <MiniBar
                  label="S"
                  current={colony.storageUsed}
                  max={colony.storageMax}
                  color="bg-swu-primary"
                />
              </Link>
            ))}
          </div>
        </section>
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

function MiniBar({
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
    <div className="w-20">
      <div className="flex justify-between text-[10px] text-swu-muted mb-0.5">
        <span>{label}</span>
        <span>{current}</span>
      </div>
      <div className="h-1.5 bg-swu-bg rounded-full overflow-hidden border border-swu-border/50">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
