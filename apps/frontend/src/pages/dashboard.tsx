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

interface CurrentObjective {
  key: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
  colonyId?: number;
}

const TICK_HOURS = [0, 12, 15, 18, 21];
const DAY_MS = 24 * 60 * 60 * 1000;

function getTickState(now = new Date()) {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const elapsedMs = now.getTime() - dayStart.getTime();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentTickIndex = TICK_HOURS.reduce(
    (latest, hour, index) => (currentHour >= hour ? index : latest),
    TICK_HOURS.length - 1,
  );
  const nextTickHour = TICK_HOURS.find((hour) => hour > currentHour);
  const nextTickDate = new Date(dayStart);
  if (nextTickHour === undefined) {
    nextTickDate.setDate(nextTickDate.getDate() + 1);
    nextTickDate.setHours(TICK_HOURS[0], 0, 0, 0);
  } else {
    nextTickDate.setHours(nextTickHour, 0, 0, 0);
  }
  const msToNext = Math.max(0, nextTickDate.getTime() - now.getTime());

  return {
    dayProgressPercent: (elapsedMs / DAY_MS) * 100,
    currentTickIndex,
    nextTickDate,
    msToNext,
  };
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [colonies, setColonies] = useState<ColonySummary[]>([]);
  const [objective, setObjective] = useState<CurrentObjective | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickState, setTickState] = useState(() => getTickState());

  useEffect(() => {
    const interval = setInterval(() => setTickState(getTickState()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Promise.all([
      api.get<ColonySummary[]>('/colonies'),
      api.get<CurrentObjective>('/colonies/objectives/current'),
    ]).then(([colonyData, objectiveData]) => {
      setColonies(colonyData);
      setObjective(objectiveData);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-swu-accent">Maindesk</h1>

      <TickTimeline tickState={tickState} />

      <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-swu-primary font-bold text-lg">
              {user?.username}
            </p>
            <p className="text-xs text-swu-muted mt-1">
              Fraktion:{' '}
              <span className="text-swu-accent">
                {user?.faction === 'REBEL_ALLIANCE'
                  ? 'Rebellenallianz'
                  : user?.faction === 'GALACTIC_EMPIRE'
                    ? 'Galaktisches Imperium'
                    : user?.faction}
              </span>
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
          title="Kolonien"
          value={loading ? '...' : String(colonies.length)}
        />
        <StatCard
          title="Bevoelkerung"
          value={
            loading
              ? '...'
              : String(
                  colonies.reduce((sum, colony) => sum + colony.population, 0),
                )
          }
        />
        <StatCard
          title="Energie"
          value={
            loading
              ? '...'
              : String(colonies.reduce((sum, colony) => sum + colony.energy, 0))
          }
        />
      </div>

      {!loading && objective && (
        <section className="bg-swu-accent/10 border border-swu-accent rounded-lg p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-swu-muted mb-2">
            Naechste Aufgabe
          </p>
          <h2 className="text-lg font-bold text-swu-accent">
            {objective.label}
          </h2>
          <p className="text-sm text-swu-muted mt-1">{objective.description}</p>
          <Link
            to={objective.href}
            className="inline-block mt-3 px-4 py-2 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm font-semibold rounded hover:bg-swu-accent/30 transition-colors"
          >
            {objective.key === 'CLAIM_HOMEWORLD'
              ? 'Planet waehlen'
              : objective.key.startsWith('RESEARCH')
                ? 'Forschung oeffnen'
                : objective.key === 'OPEN_SPACECRAFT'
                  ? 'Raumschiffe oeffnen'
                  : 'Aufgabe oeffnen'}
          </Link>
        </section>
      )}

      {colonies.length > 0 && (
        <section className="bg-swu-surface border border-swu-border rounded-lg p-4">
          <h2 className="text-sm font-bold text-swu-muted mb-3">
            Kolonie-Uebersicht
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
                    {colony.locationLabel || 'Unbekannter Standort'}
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

function TickTimeline({
  tickState,
}: {
  tickState: ReturnType<typeof getTickState>;
}) {
  return (
    <section className="bg-swu-surface border border-swu-border rounded-lg p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-swu-muted">
            Tageszyklus
          </p>
          <h2 className="text-lg font-bold text-swu-primary mt-1">
            Tick {tickState.currentTickIndex + 1} / {TICK_HOURS.length}
          </h2>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs text-swu-muted">Naechster Tick</p>
          <p className="font-mono text-lg font-bold text-swu-accent">
            {formatDuration(tickState.msToNext)}
          </p>
          <p className="text-[10px] text-swu-muted">
            {tickState.nextTickDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      <div className="relative mt-4 h-12 rounded border border-swu-border bg-swu-bg/60 px-3 py-5">
        <div className="absolute left-3 right-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-swu-border/50" />
        <div
          className="absolute left-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-swu-accent/70 shadow-[0_0_12px_rgba(194,185,66,0.35)]"
          style={{
            width: `calc((100% - 1.5rem) * ${tickState.dayProgressPercent / 100})`,
          }}
        />
        <div
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-swu-accent bg-swu-surface shadow-[0_0_18px_rgba(194,185,66,0.5)]"
          style={{
            left: `calc(0.75rem + (100% - 1.5rem) * ${tickState.dayProgressPercent / 100})`,
          }}
          title="Aktuelle Tagesposition"
        />
        {TICK_HOURS.map((hour, index) => {
          const left = (hour / 24) * 100;
          const active = index === tickState.currentTickIndex;
          return (
            <div
              key={hour}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
              style={{
                left: `calc(0.75rem + (100% - 1.5rem) * ${left / 100})`,
              }}
            >
              <div
                className={`mx-auto h-3 w-3 rounded-full border ${
                  active
                    ? 'border-swu-accent bg-swu-accent'
                    : 'border-swu-muted bg-swu-bg'
                }`}
              />
              <div className="mt-3 font-mono text-[10px] text-swu-muted">
                {String(hour).padStart(2, '0')}:00
              </div>
            </div>
          );
        })}
      </div>
    </section>
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
