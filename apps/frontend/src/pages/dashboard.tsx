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

interface StarterShipSummary {
  id: number;
  name: string;
  shipClassName?: string;
  locationLabel?: string;
  fleetName?: string | null;
  moduleCount?: number;
  hull: number;
  hullMax: number;
  shields: number;
  shieldsMax: number;
  energy: number;
  energyMax: number;
}

interface StarterObjective {
  title: string;
  description: string;
  to: string;
  cta: string;
  done: boolean;
  hint: string;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [colonies, setColonies] = useState<ColonySummary[]>([]);
  const [starterColony, setStarterColony] = useState<ColonySummary | null>(
    null,
  );
  const [starterShip, setStarterShip] = useState<StarterShipSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadDashboard();
  }, [user?.starterColonyId, user?.starterShipId]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const colonyList = await api.get<ColonySummary[]>('/colonies');
      setColonies(colonyList);

      const requests: Promise<unknown>[] = [];
      if (user?.starterColonyId) {
        requests.push(
          api
            .get<ColonySummary>(`/colonies/${user.starterColonyId}`)
            .then(setStarterColony),
        );
      } else {
        setStarterColony(null);
      }

      if (user?.starterShipId) {
        requests.push(
          api
            .get<StarterShipSummary>(`/spacecraft/${user.starterShipId}`)
            .then(setStarterShip),
        );
      } else {
        setStarterShip(null);
      }

      await Promise.all(requests);
    } finally {
      setLoading(false);
    }
  }

  const objectives: StarterObjective[] = [
    {
      title: 'Homeworld secured',
      description: 'Starter colony exists and can be opened directly.',
      to: user?.starterColonyId
        ? `/colonies?selected=${user.starterColonyId}`
        : '/colonies',
      cta: 'Open colony',
      done: !!starterColony,
      hint: starterColony ? starterColony.name : 'Claim colony in onboarding',
    },
    {
      title: 'Starter ship ready',
      description: 'Starter ship exists with fleet link and starter equipment.',
      to: user?.starterShipId
        ? `/spacecraft?selected=${user.starterShipId}`
        : '/spacecraft',
      cta: 'Open ship',
      done: !!starterShip && (starterShip.moduleCount ?? 0) > 0,
      hint: starterShip
        ? `${starterShip.moduleCount ?? 0} modules · ${starterShip.fleetName || 'no fleet'}`
        : 'Starter ship missing',
    },
    {
      title: 'Colony stable',
      description:
        'Check whether energy and population are in a safe starting state.',
      to: user?.starterColonyId
        ? `/colonies?selected=${user.starterColonyId}`
        : '/colonies',
      cta: 'Review colony',
      done:
        !!starterColony &&
        starterColony.energy > 0 &&
        starterColony.population > 0,
      hint: starterColony
        ? `Energy ${starterColony.energy}/${starterColony.energyMax} · Pop ${starterColony.population}/${starterColony.populationMax}`
        : 'No colony data',
    },
    {
      title: 'Plan first movement',
      description: 'Open map and inspect surrounding space for first route.',
      to: '/starmap',
      cta: 'Open starmap',
      done: false,
      hint: 'Manual exploration step',
    },
  ];

  const completedObjectives = objectives.filter(
    (objective) => objective.done,
  ).length;

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

      {(starterColony || starterShip) && (
        <section className="grid lg:grid-cols-2 gap-6">
          {starterColony && (
            <div className="bg-swu-surface border border-swu-border rounded-lg p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-swu-muted mb-2">
                    Quickstart Colony
                  </p>
                  <h2 className="text-xl font-bold text-swu-primary">
                    {starterColony.name}
                  </h2>
                  <p className="text-sm text-swu-muted mt-1">
                    {starterColony.locationLabel || 'Unknown location'}
                  </p>
                </div>
                <Link
                  to={`/colonies?selected=${starterColony.id}`}
                  className="border border-swu-border hover:border-swu-primary text-swu-text px-3 py-2 rounded text-sm transition-colors"
                >
                  Open colony
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MiniPanel
                  title="Population"
                  value={`${starterColony.population}/${starterColony.populationMax}`}
                />
                <MiniPanel
                  title="Energy"
                  value={`${starterColony.energy}/${starterColony.energyMax}`}
                />
                <MiniPanel
                  title="Storage"
                  value={`${starterColony.storageUsed}/${starterColony.storageMax}`}
                />
              </div>
            </div>
          )}

          {starterShip && (
            <div className="bg-swu-surface border border-swu-border rounded-lg p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-swu-muted mb-2">
                    Quickstart Ship
                  </p>
                  <h2 className="text-xl font-bold text-swu-primary">
                    {starterShip.name}
                  </h2>
                  <p className="text-sm text-swu-muted mt-1">
                    {starterShip.shipClassName || 'Unknown class'} ·{' '}
                    {starterShip.locationLabel || 'Unknown location'}
                  </p>
                </div>
                <Link
                  to={`/spacecraft?selected=${starterShip.id}`}
                  className="border border-swu-border hover:border-swu-primary text-swu-text px-3 py-2 rounded text-sm transition-colors"
                >
                  Open ship
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MiniPanel
                  title="Hull"
                  value={`${starterShip.hull}/${starterShip.hullMax}`}
                />
                <MiniPanel
                  title="Shields"
                  value={`${starterShip.shields}/${starterShip.shieldsMax}`}
                />
                <MiniPanel
                  title="Energy"
                  value={`${starterShip.energy}/${starterShip.energyMax}`}
                />
              </div>
              <div className="flex items-center justify-between text-sm text-swu-muted">
                <span>
                  Fleet:{' '}
                  <span className="text-swu-primary">
                    {starterShip.fleetName || 'No fleet'}
                  </span>
                </span>
                <span>
                  Modules:{' '}
                  <span className="text-swu-primary">
                    {starterShip.moduleCount ?? 0}
                  </span>
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="bg-swu-surface border border-swu-border rounded-lg p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-swu-primary">
              Starter Objectives
            </h2>
            <p className="text-sm text-swu-muted mt-1">
              Small checklist for first session after onboarding.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-swu-muted">Progress</p>
            <p className="text-lg font-bold text-swu-accent">
              {completedObjectives}/{objectives.length}
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {objectives.map((objective) => (
            <StarterObjectiveCard key={objective.title} objective={objective} />
          ))}
        </div>
      </section>

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

function MiniPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded border border-swu-border bg-swu-bg/40 p-3">
      <p className="text-xs text-swu-muted mb-1">{title}</p>
      <p className="font-bold text-swu-accent">{value}</p>
    </div>
  );
}

function StarterObjectiveCard({ objective }: { objective: StarterObjective }) {
  return (
    <Link
      to={objective.to}
      className={`rounded-lg border p-4 transition-colors block ${
        objective.done
          ? 'border-swu-success/40 bg-swu-success/10 hover:border-swu-success'
          : 'border-swu-border bg-swu-bg/40 hover:border-swu-primary'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-swu-primary">{objective.title}</h3>
        <span
          className={`text-[10px] uppercase tracking-[0.2em] ${
            objective.done ? 'text-swu-success' : 'text-swu-muted'
          }`}
        >
          {objective.done ? 'Done' : 'Todo'}
        </span>
      </div>
      <p className="text-sm text-swu-muted mt-2 min-h-16">
        {objective.description}
      </p>
      <p className="text-xs text-swu-accent mt-3">{objective.hint}</p>
      <span className="inline-flex mt-4 text-sm text-swu-accent">
        {objective.cta} →
      </span>
    </Link>
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
