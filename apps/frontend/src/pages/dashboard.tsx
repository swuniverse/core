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

interface ActiveBuildJob {
  fieldIndex: number;
  buildingId: number;
  buildingName: string;
  finishesAt: string | null;
  progress: number;
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

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [colonies, setColonies] = useState<ColonySummary[]>([]);
  const [objective, setObjective] = useState<CurrentObjective | null>(null);
  const [activeResearch, setActiveResearch] = useState<ActiveResearch | null>(
    null,
  );
  const [buildJobs, setBuildJobs] = useState<ActiveBuildJob[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<
    Array<{ id: number; username: string; faction: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ColonySummary[]>('/colonies'),
      api.get<CurrentObjective>('/colonies/objectives/current'),
      api.get<
        Array<{
          status: string;
          name: string;
          progress: number;
          pointsRequired: number;
          ticksRemaining?: number | null;
          commodity?: { id: number; name: string } | null;
          blockedReason?: string | null;
        }>
      >('/research'),
    ]).then(async ([colonyData, objectiveData, researchData]) => {
      setColonies(colonyData);
      setObjective(objectiveData);
      const active = researchData.find((r) => r.status === 'IN_PROGRESS');
      setActiveResearch(active ?? null);

      // Fetch build jobs from first colony detail
      if (colonyData.length > 0) {
        try {
          const detail = await api.get<{
            detailV2?: { activeBuildJobs: ActiveBuildJob[] };
          }>(`/colonies/${colonyData[0].id}`);
          setBuildJobs(detail.detailV2?.activeBuildJobs ?? []);
        } catch {
          /* ignore */
        }
      }

      // Fetch online players
      api
        .get<Array<{ id: number; username: string; faction: string }>>(
          '/database/online',
        )
        .then(setOnlinePlayers)
        .catch(() => undefined);

      setLoading(false);
    });
  }, []);

  if (loading)
    return <div className="p-4 text-swu-muted text-xs">Laden...</div>;

  const totalPopulation = colonies.reduce((sum, c) => sum + c.population, 0);
  const totalEnergy = colonies.reduce((sum, c) => sum + c.energy, 0);
  const totalEnergyMax = colonies.reduce((sum, c) => sum + c.energyMax, 0);

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <div className="text-xs text-swu-muted">/ Maindesk</div>

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Objective */}
          {objective && (
            <Link
              to={objective.href}
              className="flex items-start justify-between gap-3 px-3 py-2 bg-swu-accent/10 border border-swu-accent/40 rounded hover:bg-swu-accent/15 transition-colors md:items-center"
            >
              <div className="min-w-0">
                <span className="text-[10px] text-swu-muted uppercase tracking-wider">
                  Nächste Aufgabe:{' '}
                </span>
                <span className="text-xs font-bold text-swu-accent">
                  {objective.label}
                </span>
                <span className="text-[10px] text-swu-muted ml-2">
                  {objective.description}
                </span>
              </div>
              <span className="text-xs text-swu-accent shrink-0">→</span>
            </Link>
          )}

          {/* Active Jobs */}
          {(activeResearch || buildJobs.length > 0) && (
            <div className="bg-swu-surface border border-swu-border rounded">
              <div className="px-3 py-1.5 border-b border-swu-border/50">
                <span className="text-xs font-bold text-swu-muted">
                  Laufende Aufträge
                </span>
              </div>
              <div className="divide-y divide-swu-border/20">
                {activeResearch && (
                  <div className="px-3 py-1.5 flex flex-wrap items-center gap-2 text-xs md:flex-nowrap">
                    <span className="text-swu-success">◆</span>
                    <span className="text-swu-muted shrink-0">Forschung:</span>
                    <span className="text-swu-primary font-bold truncate">
                      {activeResearch.name}
                    </span>
                    <div className="w-16 h-1 bg-swu-bg rounded-full overflow-hidden border border-swu-border/30 shrink-0">
                      <div
                        className="h-full bg-swu-success"
                        style={{
                          width: `${activeResearch.pointsRequired > 0 ? (activeResearch.progress / activeResearch.pointsRequired) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-swu-muted shrink-0">
                      {activeResearch.progress}/{activeResearch.pointsRequired}
                    </span>
                    {activeResearch.ticksRemaining != null && (
                      <span className="text-[10px] text-swu-muted shrink-0">
                        ~{activeResearch.ticksRemaining} Ticks
                      </span>
                    )}
                    {activeResearch.blockedReason && (
                      <span className="text-[10px] text-red-400 font-bold shrink-0">
                        Blockiert
                      </span>
                    )}
                  </div>
                )}
                {buildJobs.map((job) => (
                  <div
                    key={`${job.fieldIndex}-${job.buildingId}`}
                    className="px-3 py-1.5 flex flex-wrap items-center gap-2 text-xs md:flex-nowrap"
                  >
                    <span className="text-yellow-400">▲</span>
                    <span className="text-swu-muted shrink-0">Bau:</span>
                    <span className="text-swu-primary font-bold truncate">
                      {job.buildingName}
                    </span>
                    <span className="text-[10px] text-swu-muted shrink-0">
                      Feld {job.fieldIndex}
                    </span>
                    <span className="text-[10px] text-swu-muted ml-auto shrink-0">
                      {job.finishesAt
                        ? new Date(job.finishesAt).toLocaleString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })
                        : 'bald'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Colony Table */}
          {colonies.length > 0 && (
            <div className="bg-swu-surface border border-swu-border rounded overflow-x-auto">
              <div className="px-3 py-2 border-b border-swu-border/50 flex items-center justify-between">
                <span className="text-xs font-bold text-swu-muted">
                  Kolonien ({colonies.length})
                </span>
                <span className="text-[10px] text-swu-muted">
                  Bevölkerung: {totalPopulation} · Energie: {totalEnergy}/
                  {totalEnergyMax}
                </span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-swu-muted border-b border-swu-border/30">
                    <th className="text-left px-3 py-1.5 font-normal">Name</th>
                    <th className="text-left px-3 py-1.5 font-normal hidden md:table-cell">
                      Standort
                    </th>
                    <th className="text-right px-3 py-1.5 font-normal">
                      Energie
                    </th>
                    <th className="text-right px-3 py-1.5 font-normal">
                      Bevölkerung
                    </th>
                    <th className="text-right px-3 py-1.5 font-normal">
                      Lager
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {colonies.map((colony) => (
                    <tr
                      key={colony.id}
                      className="border-b border-swu-border/20 hover:bg-swu-accent/5 transition-colors"
                    >
                      <td className="px-3 py-1.5">
                        <Link
                          to={`/colonies?selected=${colony.id}`}
                          className="font-bold text-swu-primary hover:text-swu-accent"
                        >
                          {colony.name}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5 text-swu-muted hidden md:table-cell">
                        {colony.locationLabel || 'Unbekannt'}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <StatCell
                          value={colony.energy}
                          max={colony.energyMax}
                          color="text-yellow-400"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <StatCell
                          value={colony.population}
                          max={colony.populationMax}
                          color="text-swu-success"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <StatCell
                          value={colony.storageUsed}
                          max={colony.storageMax}
                          color="text-swu-primary"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Sidebar (desktop only) */}
        <div className="hidden md:block w-48 space-y-3 shrink-0">
          {/* Online Players */}
          <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
            <div className="text-[10px] text-swu-muted uppercase mb-1">
              Spieler online ({onlinePlayers.length})
            </div>
            {onlinePlayers.length === 0 ? (
              <div className="text-[10px] text-swu-muted">Niemand online.</div>
            ) : (
              <div className="space-y-1">
                {onlinePlayers.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-1.5 text-[10px]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    <span className="text-swu-primary truncate">
                      {p.username}
                    </span>
                    <span className="text-swu-muted text-[9px] ml-auto shrink-0">
                      {p.faction === 'REBEL_ALLIANCE' ? 'Reb' : 'Imp'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin Tick Trigger */}
          {user?.isAdmin && <AdminTickButton />}
        </div>
      </div>
    </div>
  );
}

function StatCell({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="w-12 h-1 bg-swu-bg rounded-full overflow-hidden border border-swu-border/30">
        <div
          className={`h-full ${color === 'text-yellow-400' ? 'bg-yellow-500' : color === 'text-swu-success' ? 'bg-swu-success' : 'bg-swu-primary'} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-mono ${color}`}>
        {value}
        <span className="text-swu-border">/{max}</span>
      </span>
    </div>
  );
}

function AdminTickButton() {
  const handleTick = async () => {
    await api.post('/admin/tick/trigger', {});
    window.location.reload();
  };
  return (
    <button
      onClick={handleTick}
      className="w-full px-3 py-1.5 bg-swu-primary/20 border border-swu-primary text-swu-primary text-xs font-bold rounded hover:bg-swu-primary/30 transition-colors"
    >
      Tick ausfuehren
    </button>
  );
}
