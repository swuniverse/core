import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface DatabaseOverview {
  settlers: number;
  colonies: number;
  ships: number;
  completedResearch: number;
  sections: Array<{ key: string; title: string; description: string }>;
}

interface SettlerEntry {
  id: number;
  username: string;
  factionName: string;
  prestige: number;
  colonies: number;
  ships: number;
  completedResearch: number;
  onboardingCompleted: boolean;
  isAdmin: boolean;
  createdAt: string;
}

interface RankingEntry {
  userId: number;
  username: string;
  score: string | number;
}

interface Rankings {
  research: RankingEntry[];
  prestige: RankingEntry[];
  colonies: RankingEntry[];
}

type TabKey = 'overview' | 'settlers' | 'rankings';

export function DatabasePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [overview, setOverview] = useState<DatabaseOverview | null>(null);
  const [settlers, setSettlers] = useState<SettlerEntry[]>([]);
  const [rankings, setRankings] = useState<Rankings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DatabaseOverview>('/database/overview'),
      api.get<SettlerEntry[]>('/database/settlers'),
      api.get<Rankings>('/database/rankings'),
    ]).then(([overviewData, settlerData, rankingData]) => {
      setOverview(overviewData);
      setSettlers(settlerData);
      setRankings(rankingData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-6 text-swu-muted">Datenbank wird geladen...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-swu-muted mb-2">
          Galaktisches Archiv
        </p>
        <h1 className="text-2xl font-bold text-swu-accent">Datenbank</h1>
        <p className="text-sm text-swu-muted mt-2 max-w-3xl">
          Siedler und Ranglisten fuer die Closed Alpha. Das Archiv waechst
          spaeter um Waren, Entdeckungen, Sternensysteme, Planetentypen und
          Schiffsklassen.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['overview', 'Uebersicht'],
          ['settlers', 'Siedlerliste'],
          ['rankings', 'Ranglisten'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key as TabKey)}
            className={`rounded border px-3 py-2 text-xs font-bold transition-colors ${
              activeTab === key
                ? 'border-swu-accent bg-swu-accent/15 text-swu-accent'
                : 'border-swu-border text-swu-muted hover:border-swu-primary hover:text-swu-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && overview && <Overview overview={overview} />}
      {activeTab === 'settlers' && <SettlersTable settlers={settlers} />}
      {activeTab === 'rankings' && rankings && (
        <RankingGrid rankings={rankings} />
      )}
    </div>
  );
}

function Overview({ overview }: { overview: DatabaseOverview }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Siedler" value={overview.settlers} />
        <Metric label="Kolonien" value={overview.colonies} />
        <Metric label="Schiffe" value={overview.ships} />
        <Metric label="Forschungen" value={overview.completedResearch} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {overview.sections.map((section) => (
          <div
            key={section.key}
            className="rounded-lg border border-swu-border bg-swu-surface p-4"
          >
            <h2 className="text-sm font-bold text-swu-primary">
              {section.title}
            </h2>
            <p className="text-xs text-swu-muted mt-2">{section.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <p className="text-xs text-swu-muted">{label}</p>
      <p className="text-2xl font-bold text-swu-accent mt-1">{value}</p>
    </div>
  );
}

function SettlersTable({ settlers }: { settlers: SettlerEntry[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-swu-border bg-swu-surface">
      <table className="w-full text-sm">
        <thead className="bg-swu-bg/70 text-xs uppercase tracking-wider text-swu-muted">
          <tr>
            <th className="px-3 py-2 text-left">Siedler</th>
            <th className="px-3 py-2 text-left">Fraktion</th>
            <th className="px-3 py-2 text-right">Prestige</th>
            <th className="px-3 py-2 text-right">Kolonien</th>
            <th className="px-3 py-2 text-right">Schiffe</th>
            <th className="px-3 py-2 text-right">Forschung</th>
            <th className="px-3 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {settlers.map((settler) => (
            <tr key={settler.id} className="border-t border-swu-border/60">
              <td className="px-3 py-2 font-bold text-swu-primary">
                {settler.username}
                {settler.isAdmin && (
                  <span className="ml-2 text-[10px] text-swu-accent">
                    ADMIN
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-swu-muted">
                {settler.factionName}
              </td>
              <td className="px-3 py-2 text-right text-swu-text">
                {settler.prestige}
              </td>
              <td className="px-3 py-2 text-right text-swu-text">
                {settler.colonies}
              </td>
              <td className="px-3 py-2 text-right text-swu-text">
                {settler.ships}
              </td>
              <td className="px-3 py-2 text-right text-swu-text">
                {settler.completedResearch}
              </td>
              <td className="px-3 py-2 text-swu-muted">
                {settler.onboardingCompleted ? 'aktiv' : 'im Aufbau'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankingGrid({ rankings }: { rankings: Rankings }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Ranking
        title="Top Forscher"
        rows={rankings.research}
        suffix="Forschungen"
      />
      <Ranking
        title="Top Prestige"
        rows={rankings.prestige}
        suffix="Prestige"
      />
      <Ranking
        title="Top Kolonisten"
        rows={rankings.colonies}
        suffix="Kolonien"
      />
    </div>
  );
}

function Ranking({
  title,
  rows,
  suffix,
}: {
  title: string;
  rows: RankingEntry[];
  suffix: string;
}) {
  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <h2 className="text-sm font-bold text-swu-primary mb-3">{title}</h2>
      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-xs text-swu-muted">Noch keine Eintraege.</p>
        )}
        {rows.map((row, index) => (
          <div
            key={`${row.userId}-${index}`}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="text-swu-muted">
              {index + 1}. <span className="text-swu-text">{row.username}</span>
            </span>
            <span className="font-mono text-swu-accent">
              {row.score} {suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
