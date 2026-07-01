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

interface DashboardBuildJob extends ActiveBuildJob {
  colonyName: string;
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

interface HolonetPost {
  id: number;
  title: string;
  authorName: string;
  createdAt: string;
  category: string;
  commentCount: number;
}

interface ColonizationLimit {
  type: string;
  count: number;
  limit: number;
  max: number;
}

interface ColonizationStatus {
  limits: {
    planet: ColonizationLimit;
    moon: ColonizationLimit;
    asteroid: ColonizationLimit;
  };
}

interface CrewInfo {
  assigned: number;
  globalLimit: number;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [objective, setObjective] = useState<CurrentObjective | null>(null);
  const [activeResearch, setActiveResearch] = useState<ActiveResearch | null>(
    null,
  );
  const [buildJobs, setBuildJobs] = useState<DashboardBuildJob[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<
    Array<{ id: number; username: string; faction: string }>
  >([]);
  const [holonetPosts, setHolonetPosts] = useState<HolonetPost[]>([]);
  const [colonizationLimits, setColonizationLimits] =
    useState<ColonizationStatus | null>(null);
  const [crewInfo, setCrewInfo] = useState<CrewInfo | null>(null);
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
      api
        .get<{ data: HolonetPost[] }>('/holonet?page=1')
        .catch(() => ({ data: [] })),
      api.get<ColonizationStatus>('/colonization/status').catch(() => null),
      api
        .get<Array<{ id: number; username: string; faction: string }>>(
          '/database/online',
        )
        .catch(() => []),
    ]).then(
      async ([
        colonyData,
        objectiveData,
        researchData,
        holonetData,
        colonizationData,
        onlineData,
      ]) => {
        setObjective(objectiveData);
        const active = researchData.find((r) => r.status === 'IN_PROGRESS');
        setActiveResearch(active ?? null);
        setHolonetPosts((holonetData?.data ?? []).slice(0, 5));
        if (colonizationData) setColonizationLimits(colonizationData);
        setOnlinePlayers(onlineData);

        // Fetch all colony details for build jobs + crew info
        if (colonyData.length > 0) {
          const details = await Promise.all(
            colonyData.map((c) =>
              api
                .get<{
                  detailV2?: { activeBuildJobs: ActiveBuildJob[] };
                  crew?: {
                    globalLimit: number;
                    remainingGlobal: number;
                  };
                }>(`/colonies/${c.id}`)
                .catch(() => null),
            ),
          );

          const allJobs: DashboardBuildJob[] = [];
          let foundCrew: CrewInfo | null = null;

          for (let i = 0; i < details.length; i++) {
            const detail = details[i];
            if (!detail) continue;
            const jobs = detail.detailV2?.activeBuildJobs ?? [];
            allJobs.push(
              ...jobs.map((j) => ({ ...j, colonyName: colonyData[i].name })),
            );
            if (!foundCrew && detail.crew) {
              foundCrew = {
                assigned: detail.crew.globalLimit - detail.crew.remainingGlobal,
                globalLimit: detail.crew.globalLimit,
              };
            }
          }

          setBuildJobs(allJobs);
          if (foundCrew) setCrewInfo(foundCrew);
        }

        setLoading(false);
      },
    );
  }, []);

  if (loading)
    return <div className="p-4 text-swu-muted text-xs">Laden...</div>;

  return (
    <div className="space-y-3">
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

          {/* Holonet Posts */}
          <div className="bg-swu-surface border border-swu-border rounded">
            <div className="px-3 py-1.5 border-b border-swu-border/50 flex items-center justify-between">
              <span className="text-xs font-bold text-swu-muted">
                Neue HN-Beiträge
              </span>
              <Link
                to="/holonet"
                className="text-[10px] text-swu-accent hover:underline"
              >
                Alle anzeigen →
              </Link>
            </div>
            {holonetPosts.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-swu-muted">
                Keine Beiträge.
              </div>
            ) : (
              <div className="divide-y divide-swu-border/20">
                {holonetPosts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/holonet/${post.id}`}
                    className="px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-swu-accent/5 transition-colors"
                  >
                    <span className="text-[9px] text-swu-muted uppercase w-10 shrink-0">
                      {post.category?.slice(0, 4) ?? 'POST'}
                    </span>
                    <span className="text-swu-primary truncate flex-1">
                      {post.title}
                    </span>
                    <span className="text-[10px] text-swu-muted shrink-0">
                      {post.authorName}
                    </span>
                    {post.commentCount > 0 && (
                      <span className="text-[10px] text-swu-muted shrink-0">
                        💬{post.commentCount}
                      </span>
                    )}
                    <span className="text-[10px] text-swu-muted shrink-0">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

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
                    key={`${job.colonyName}-${job.fieldIndex}-${job.buildingId}`}
                    className="px-3 py-1.5 flex flex-wrap items-center gap-2 text-xs md:flex-nowrap"
                  >
                    <span className="text-yellow-400">▲</span>
                    <span className="text-swu-muted shrink-0">Bau:</span>
                    <span className="text-swu-primary font-bold truncate">
                      {job.buildingName}
                    </span>
                    <span className="text-[10px] text-swu-muted shrink-0">
                      ({job.colonyName}, Feld {job.fieldIndex})
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
        </div>

        {/* Right Sidebar (desktop only) */}
        <div className="hidden md:block w-48 space-y-3 shrink-0">
          {/* Colony Limits */}
          {colonizationLimits && (
            <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
              <div className="text-[10px] text-swu-muted uppercase mb-2">
                Kolonielimitierung
              </div>
              <div className="space-y-1">
                <LimitRow
                  label="Planeten"
                  count={colonizationLimits.limits.planet.count}
                  limit={colonizationLimits.limits.planet.limit}
                />
                <LimitRow
                  label="Monde"
                  count={colonizationLimits.limits.moon.count}
                  limit={colonizationLimits.limits.moon.limit}
                />
              </div>
            </div>
          )}

          {/* Crew Limits */}
          {crewInfo && (
            <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
              <div className="text-[10px] text-swu-muted uppercase mb-1">
                Crewlimitierung
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-swu-bg rounded-full overflow-hidden border border-swu-border/30">
                  <div
                    className="h-full bg-swu-accent"
                    style={{
                      width: `${crewInfo.globalLimit > 0 ? (crewInfo.assigned / crewInfo.globalLimit) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-swu-primary">
                  {crewInfo.assigned}
                  <span className="text-swu-muted">
                    /{crewInfo.globalLimit}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Online Players */}
          <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
            <div className="text-[10px] text-swu-muted uppercase mb-1">
              Zufällige Spieler ({onlinePlayers.length})
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

function LimitRow({
  label,
  count,
  limit,
}: {
  label: string;
  count: number;
  limit: number;
}) {
  const atLimit = count >= limit;
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-swu-muted">{label}</span>
      <span
        className={`font-mono ${atLimit ? 'text-yellow-400' : 'text-swu-primary'}`}
      >
        {count}/{limit}
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
