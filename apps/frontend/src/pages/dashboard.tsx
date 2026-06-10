import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../services/api';

interface ActiveResearch {
  name: string;
  progress: number;
  pointsRequired: number;
  ticksRemaining?: number | null;
  commodity?: { id: number; name: string } | null;
  blockedReason?: string | null;
}

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
  const [activeResearch, setActiveResearch] = useState<ActiveResearch | null>(null);
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
      api.get<Array<{ status: string; name: string; progress: number; pointsRequired: number; ticksRemaining?: number | null; commodity?: { id: number; name: string } | null; blockedReason?: string | null }>>('/research'),
    ]).then(([colonyData, objectiveData, researchData]) => {
      setColonies(colonyData);
      setObjective(objectiveData);
      const active = researchData.find((r) => r.status === 'IN_PROGRESS');
      setActiveResearch(active ?? null);
      setLoading(false);
    });
  }, []);

  const totalPopulation = colonies.reduce((sum, c) => sum + c.population, 0);
  const totalEnergy = colonies.reduce((sum, c) => sum + c.energy, 0);
  const totalEnergyMax = colonies.reduce((sum, c) => sum + c.energyMax, 0);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-swu-accent">Maindesk</h1>

      {!loading && objective && (
        <section className="bg-swu-accent/10 border border-swu-accent rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-swu-muted mb-1">
                Naechste Aufgabe
              </p>
              <h2 className="text-base font-bold text-swu-accent">
                {objective.label}
              </h2>
              <p className="text-xs text-swu-muted mt-1">{objective.description}</p>
            </div>
            <Link
              to={objective.href}
              className="shrink-0 px-4 py-2 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm font-semibold rounded hover:bg-swu-accent/30 transition-colors"
            >
              {objective.key === 'CLAIM_HOMEWORLD'
                ? 'Planet waehlen'
                : objective.key.startsWith('RESEARCH')
                  ? 'Forschung oeffnen'
                  : objective.key === 'OPEN_SPACECRAFT'
                    ? 'Raumschiffe oeffnen'
                    : 'Aufgabe oeffnen'}
            </Link>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeResearch && <ResearchWidget research={activeResearch} />}
        <TickCompact tickState={tickState} />
      </div>

      {colonies.length > 0 && (
        <section className="bg-swu-surface border border-swu-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-swu-muted">
              Kolonien ({colonies.length})
            </h2>
            <div className="flex gap-4 text-xs text-swu-muted">
              <span>Bevölkerung: {totalPopulation}</span>
              <span>Energie: {totalEnergy}/{totalEnergyMax}</span>
            </div>
          </div>
          <div className="space-y-2">
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
                  <p className="text-[10px] text-swu-muted">
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

      <TickTimeline tickState={tickState} />
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

function TickCompact({ tickState }: { tickState: ReturnType<typeof getTickState> }) {
  return (
    <section className="bg-swu-surface border border-swu-border rounded-lg p-4">
      <h2 className="text-xs font-bold text-swu-muted uppercase tracking-wider">
        Naechster Tick
      </h2>
      <p className="font-mono text-2xl font-bold text-swu-accent mt-1">
        {formatDuration(tickState.msToNext)}
      </p>
      <p className="text-xs text-swu-muted mt-1">
        Tick {tickState.currentTickIndex + 1}/{TICK_HOURS.length} ·{' '}
        {tickState.nextTickDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </section>
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

function ResearchWidget({ research }: { research: ActiveResearch }) {
  const pct = research.pointsRequired > 0 ? (research.progress / research.pointsRequired) * 100 : 0;
  return (
    <section className="bg-swu-surface border border-swu-success/30 rounded-lg p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold text-swu-muted uppercase tracking-wider">
          Aktive Forschung
        </h2>
        <Link
          to="/research"
          className="text-[10px] text-swu-accent hover:underline"
        >
          Zur Forschung
        </Link>
      </div>
      <p className="mt-1 text-sm font-bold text-swu-primary">{research.name}</p>
      <div className="mt-2">
        <div className="flex justify-between text-xs text-swu-muted mb-1">
          <span>{research.progress} / {research.pointsRequired} Punkte</span>
          {research.ticksRemaining != null && (
            <span>{research.ticksRemaining} Tick(s) verbleibend</span>
          )}
        </div>
        <div className="h-2 bg-swu-bg rounded-full overflow-hidden border border-swu-border/50">
          <div
            className="h-full bg-swu-success transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {research.blockedReason && (
        <p className="mt-1 text-xs text-red-400 font-bold">Blockiert: Ressource fehlt</p>
      )}
    </section>
  );
}
