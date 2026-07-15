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

interface Spacecraft {
  id: number;
  name: string;
  status: string;
  arrivalAt: string | null;
}

interface ColonyWarning {
  colonyId: number;
  colonyName: string;
  type: 'energy' | 'storage';
  message: string;
}

interface DashboardData {
  activeResearch: ActiveResearch | null;
  queuedResearch: ActiveResearch | null;
  buildJobs: DashboardBuildJob[];
  holonetPosts: HolonetPost[];
  colonizationLimits: ColonizationStatus | null;
  crewInfo: CrewInfo | null;
  onlinePlayers: Array<{ id: number; username: string; faction: string }>;
  colonyCount: number;
  fleetTotal: number;
  fleetInFlight: number;
  shipsInFlight: Spacecraft[];
  researchCompleted: number;
  unreadMessages: number;
  warnings: ColonyWarning[];
}

const TICK_DURATION_MINUTES = 15;

function ticksToHuman(ticks: number): string {
  const totalMinutes = ticks * TICK_DURATION_MINUTES;
  if (totalMinutes < 60) return `~${totalMinutes}min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `~${h}h ${m}min` : `~${h}h`;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const [
      colonies,
      researchData,
      holonetData,
      colonizationData,
      onlineData,
      spacecraftData,
      unreadData,
    ] = await Promise.all([
      api.get<ColonySummary[]>('/colonies'),
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
      api.get<Spacecraft[]>('/spacecraft').catch(() => []),
      api.get<number>('/messages/unread').catch(() => 0),
    ]);

    const activeResearch =
      researchData.find((r) => r.status === 'IN_PROGRESS') ?? null;
    const queuedResearch =
      researchData.find((r) => r.status === 'QUEUED') ?? null;
    const researchCompleted = researchData.filter(
      (r) => r.status === 'COMPLETED',
    ).length;

    const shipsInFlight = spacecraftData.filter(
      (s) => s.status === 'IN_FLIGHT',
    );

    // Fetch colony details for build jobs, crew, warnings
    const buildJobs: DashboardBuildJob[] = [];
    let crewInfo: CrewInfo | null = null;
    const warnings: ColonyWarning[] = [];

    if (colonies.length > 0) {
      const details = await Promise.all(
        colonies.map((c) =>
          api
            .get<{
              detailV2?: {
                activeBuildJobs: ActiveBuildJob[];
                energy: { current: number; max: number; delta: number | null };
              };
              crew?: { globalLimit: number; remainingGlobal: number };
              deactivatedBuildings?: number;
              storageFull?: boolean;
            }>(`/colonies/${c.id}`)
            .catch(() => null),
        ),
      );

      for (let i = 0; i < details.length; i++) {
        const detail = details[i];
        if (!detail) continue;
        const jobs = detail.detailV2?.activeBuildJobs ?? [];
        buildJobs.push(
          ...jobs.map((j) => ({ ...j, colonyName: colonies[i].name })),
        );
        if (!crewInfo && detail.crew) {
          crewInfo = {
            assigned: detail.crew.globalLimit - detail.crew.remainingGlobal,
            globalLimit: detail.crew.globalLimit,
          };
        }
        // Warnings
        if (
          detail.detailV2?.energy.delta != null &&
          detail.detailV2.energy.delta < 0 &&
          detail.detailV2.energy.current < 10
        ) {
          warnings.push({
            colonyId: colonies[i].id,
            colonyName: colonies[i].name,
            type: 'energy',
            message: `Energiedefizit (${detail.detailV2.energy.delta}/Tick)`,
          });
        }
        if (colonies[i].storageUsed >= colonies[i].storageMax) {
          warnings.push({
            colonyId: colonies[i].id,
            colonyName: colonies[i].name,
            type: 'storage',
            message: 'Lager voll',
          });
        }
      }
    }

    setData({
      activeResearch,
      queuedResearch,
      buildJobs,
      holonetPosts: (holonetData?.data ?? []).slice(0, 5),
      colonizationLimits: colonizationData,
      crewInfo,
      onlinePlayers: onlineData,
      colonyCount: colonies.length,
      fleetTotal: spacecraftData.length,
      fleetInFlight: shipsInFlight.length,
      shipsInFlight,
      researchCompleted,
      unreadMessages: unreadData,
      warnings,
    });
    setLoading(false);
  };

  if (loading)
    return <div className="p-4 text-swu-muted text-xs">Laden...</div>;
  if (!data) return null;

  return (
    <div className="space-y-3">
      {/* Commander Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-base font-bold text-swu-primary"
            style={{ fontFamily: 'var(--font-swu-display)' }}
          >
            Commander {user?.username}
          </h1>
          <div className="text-[10px] text-swu-muted font-mono">
            {user?.faction === 'REBEL_ALLIANCE'
              ? 'Rebellenallianz'
              : 'Galaktisches Imperium'}
            {user?.prestige != null && <> · Prestige {user.prestige}</>}
          </div>
        </div>
        {data.unreadMessages > 0 && (
          <Link
            to="/messages"
            className="text-[10px] px-2 py-1 bg-swu-accent/15 border border-swu-accent/40 rounded text-swu-accent hover:bg-swu-accent/25 transition-colors"
          >
            ✉ {data.unreadMessages} ungelesen
          </Link>
        )}
      </div>

      {/* Stat Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatTile label="Kolonien" value={data.colonyCount} href="/colonies" />
        <StatTile
          label="Flotte"
          value={data.fleetTotal}
          sub={
            data.fleetInFlight > 0 ? `${data.fleetInFlight} im Flug` : undefined
          }
          href="/spacecraft"
        />
        <StatTile
          label="Forschung"
          value={data.researchCompleted}
          sub="abgeschl."
          href="/research"
        />
        <StatTile label="Prestige" value={user?.prestige ?? 0} />
      </div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="bg-swu-warning/5 border border-swu-warning/40 rounded px-3 py-2 space-y-1">
          <div className="text-[10px] text-swu-warning font-bold uppercase tracking-wider">
            Warnungen
          </div>
          {data.warnings.map((w, i) => (
            <Link
              key={i}
              to={`/colonies?selected=${w.colonyId}`}
              className="flex items-center gap-2 text-xs text-swu-warning/90 hover:text-swu-warning transition-colors"
            >
              <span aria-hidden="true">
                {w.type === 'energy' ? '⚡' : '📦'}
              </span>
              <span>
                {w.colonyName}: {w.message}
              </span>
              <span className="ml-auto text-[10px]">→</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Jobs + HoloNet side by side on desktop */}
          <div className="flex flex-col gap-3 lg:flex-row">
            {/* Active Jobs */}
            {(data.activeResearch ||
              data.queuedResearch ||
              data.buildJobs.length > 0 ||
              data.shipsInFlight.length > 0) && (
              <div className="flex-1 min-w-0 bg-swu-surface border border-swu-border rounded">
                <div className="px-3 py-1.5 border-b border-swu-border/50">
                  <span
                    className="text-xs font-bold text-swu-muted"
                    style={{ fontFamily: 'var(--font-swu-display)' }}
                  >
                    Laufende Aufträge
                  </span>
                </div>
                <div className="divide-y divide-swu-border/20">
                  {data.activeResearch && (
                    <div className="px-3 py-1.5 flex flex-wrap items-center gap-2 text-xs md:flex-nowrap">
                      <span className="text-swu-success">◆</span>
                      <span className="text-swu-muted shrink-0">
                        Forschung:
                      </span>
                      <span className="text-swu-primary font-bold truncate">
                        {data.activeResearch.name}
                      </span>
                      <SegmentedBar
                        value={data.activeResearch.progress}
                        max={data.activeResearch.pointsRequired}
                        color="bg-swu-success"
                        label={`Forschung ${data.activeResearch.name}`}
                      />
                      <span className="text-[10px] font-mono text-swu-muted shrink-0">
                        {data.activeResearch.progress}/
                        {data.activeResearch.pointsRequired}
                      </span>
                      {data.activeResearch.ticksRemaining != null && (
                        <span className="text-[10px] text-swu-muted shrink-0">
                          {ticksToHuman(data.activeResearch.ticksRemaining)}
                        </span>
                      )}
                      {data.activeResearch.blockedReason && (
                        <span className="text-[10px] text-red-400 font-bold shrink-0">
                          Blockiert
                        </span>
                      )}
                    </div>
                  )}
                  {data.queuedResearch && (
                    <div className="pl-7 pr-3 py-1 flex flex-wrap items-center gap-2 text-xs md:flex-nowrap">
                      <span className="text-swu-accent">◇</span>
                      <span className="text-swu-muted shrink-0 text-[10px]">
                        Warteschlange:
                      </span>
                      <span className="text-swu-primary truncate">
                        {data.queuedResearch.name}
                      </span>
                      <span className="text-[10px] font-mono text-swu-muted shrink-0">
                        {data.queuedResearch.pointsRequired}{' '}
                        {data.queuedResearch.commodity?.name ?? 'FP'}
                      </span>
                    </div>
                  )}
                  {data.buildJobs.map((job) => (
                    <div
                      key={`${job.colonyName}-${job.fieldIndex}-${job.buildingId}`}
                      className="px-3 py-1.5 flex flex-wrap items-center gap-2 text-xs md:flex-nowrap"
                    >
                      <span className="text-swu-warning">▲</span>
                      <span className="text-swu-muted shrink-0">Bau:</span>
                      <span className="text-swu-primary font-bold truncate">
                        {job.buildingName}
                      </span>
                      <span className="text-[10px] text-swu-muted shrink-0">
                        ({job.colonyName}, Feld {job.fieldIndex})
                      </span>
                      <span className="text-[10px] text-swu-muted ml-auto shrink-0">
                        {job.finishesAt
                          ? new Date(job.finishesAt).toLocaleString('de-DE', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                            })
                          : 'bald'}
                      </span>
                    </div>
                  ))}
                  {data.shipsInFlight.map((ship) => (
                    <Link
                      key={ship.id}
                      to={`/spacecraft/${ship.id}`}
                      className="px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-swu-accent/5 transition-colors"
                    >
                      <span className="text-swu-primary">🚀</span>
                      <span className="text-swu-muted shrink-0">Flug:</span>
                      <span className="text-swu-primary font-bold truncate">
                        {ship.name}
                      </span>
                      <span className="text-[10px] text-swu-muted ml-auto shrink-0">
                        {ship.arrivalAt
                          ? `Ankunft ${new Date(ship.arrivalAt).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}`
                          : 'unterwegs'}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Holonet Posts */}
            <div className="flex-1 min-w-0 bg-swu-surface border border-swu-border rounded">
              <div className="px-3 py-1.5 border-b border-swu-border/50 flex items-center justify-between">
                <span
                  className="text-xs font-bold text-swu-muted"
                  style={{ fontFamily: 'var(--font-swu-display)' }}
                >
                  HoloNet
                </span>
                <Link
                  to="/holonet"
                  className="text-[10px] text-swu-accent hover:underline"
                >
                  Alle →
                </Link>
              </div>
              {data.holonetPosts.length === 0 ? (
                <div className="px-3 py-2 text-[10px] text-swu-muted">
                  Keine Beiträge.
                </div>
              ) : (
                <div className="divide-y divide-swu-border/20">
                  {data.holonetPosts.map((post) => (
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
                        {new Date(post.createdAt).toLocaleDateString('de-DE')}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar (desktop only) */}
        <div className="hidden md:block w-52 space-y-3 shrink-0">
          {data.colonizationLimits && (
            <InfoCard title="Kolonielimitierung">
              <div className="space-y-1">
                <LimitRow
                  label="Planeten"
                  count={data.colonizationLimits.limits.planet.count}
                  limit={data.colonizationLimits.limits.planet.limit}
                />
                <LimitRow
                  label="Monde"
                  count={data.colonizationLimits.limits.moon.count}
                  limit={data.colonizationLimits.limits.moon.limit}
                />
              </div>
            </InfoCard>
          )}

          {data.crewInfo && (
            <InfoCard title="Crewlimitierung">
              <CrewBar crewInfo={data.crewInfo} />
            </InfoCard>
          )}

          <InfoCard title={`Spieler (${data.onlinePlayers.length})`}>
            <PlayerList players={data.onlinePlayers} />
          </InfoCard>

          {user?.isAdmin && <AdminTickButton />}
        </div>
      </div>

      {/* Mobile Info Panel */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileInfoOpen(!mobileInfoOpen)}
          className="w-full px-3 py-2 bg-swu-surface border border-swu-border rounded flex items-center justify-between text-xs text-swu-muted"
        >
          <span>Statistiken & Spieler</span>
          <span
            className={`transition-transform ${mobileInfoOpen ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </button>
        {mobileInfoOpen && (
          <div className="mt-2 space-y-3">
            {data.colonizationLimits && (
              <InfoCard title="Kolonielimitierung">
                <div className="space-y-1">
                  <LimitRow
                    label="Planeten"
                    count={data.colonizationLimits.limits.planet.count}
                    limit={data.colonizationLimits.limits.planet.limit}
                  />
                  <LimitRow
                    label="Monde"
                    count={data.colonizationLimits.limits.moon.count}
                    limit={data.colonizationLimits.limits.moon.limit}
                  />
                </div>
              </InfoCard>
            )}
            {data.crewInfo && (
              <InfoCard title="Crewlimitierung">
                <CrewBar crewInfo={data.crewInfo} />
              </InfoCard>
            )}
            <InfoCard title={`Spieler (${data.onlinePlayers.length})`}>
              <PlayerList players={data.onlinePlayers} />
            </InfoCard>
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: number;
  sub?: string;
  href?: string;
}) {
  const content = (
    <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 hover:border-swu-accent/40 transition-colors">
      <div className="text-[10px] text-swu-muted uppercase tracking-wider">
        {label}
      </div>
      <div className="text-lg font-bold text-swu-accent font-mono">{value}</div>
      {sub && <div className="text-[10px] text-swu-muted">{sub}</div>}
    </div>
  );
  if (href) return <Link to={href}>{content}</Link>;
  return content;
}

function SegmentedBar({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const segments = 10;
  const filled = Math.round((pct / 100) * segments);
  return (
    <div
      className="flex gap-px w-16 shrink-0"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 ${i < filled ? color : 'bg-swu-bg'} ${i === 0 ? 'rounded-l-sm' : ''} ${i === segments - 1 ? 'rounded-r-sm' : ''} border border-swu-border/30`}
        />
      ))}
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
      <div className="text-[10px] text-swu-muted uppercase mb-2 tracking-wider">
        {title}
      </div>
      {children}
    </div>
  );
}

function CrewBar({ crewInfo }: { crewInfo: CrewInfo }) {
  return (
    <div className="flex items-center gap-2">
      <SegmentedBar
        value={crewInfo.assigned}
        max={crewInfo.globalLimit}
        color="bg-swu-accent"
        label="Crew-Auslastung"
      />
      <span className="text-xs font-mono text-swu-primary">
        {crewInfo.assigned}
        <span className="text-swu-muted">/{crewInfo.globalLimit}</span>
      </span>
    </div>
  );
}

function PlayerList({
  players,
}: {
  players: Array<{ id: number; username: string; faction: string }>;
}) {
  if (players.length === 0)
    return <div className="text-[10px] text-swu-muted">Niemand online.</div>;
  return (
    <div className="space-y-1">
      {players.map((p) => (
        <div key={p.id} className="flex items-center gap-1.5 text-[10px]">
          <span
            className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0"
            aria-hidden="true"
          />
          <span className="text-swu-primary truncate">{p.username}</span>
          <span className="text-swu-muted text-[9px] ml-auto shrink-0">
            {p.faction === 'REBEL_ALLIANCE' ? 'Reb' : 'Imp'} · Online
          </span>
        </div>
      ))}
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
        className={`font-mono ${atLimit ? 'text-swu-warning' : 'text-swu-primary'}`}
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
