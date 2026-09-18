import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { planetThumbnail, systemTypeImage } from '../lib/assets';
import { api } from '../services/api';

type RankingKey =
  | 'discoveries'
  | 'research'
  | 'prestige'
  | 'crew-training'
  | 'colony-worth'
  | 'colony-production';

type View =
  | 'settlers'
  | 'rankings'
  | 'system-types'
  | 'ship-classes'
  | 'planet-types'
  | 'prestige-history';

type Settler = {
  id: number;
  username: string;
  displayName: string | null;
  factionName: string;
  prestige: number;
  colonies: number;
  ships: number;
  completedResearch: number;
};
type Ranking = { userId: number; username: string; score: string | number };
type RankingDetail = {
  title: string;
  metricLabel: string;
  entries: Array<Ranking & { rank: number; colonyName?: string }>;
  currentUser: (Ranking & { rank: number; colonyName?: string }) | null;
};
type SystemTypeEntry = {
  systemTypeId: number;
  discovered: boolean;
  name: string | null;
  rarity: string | null;
  discoveredAt: string | null;
};
type SystemTypes = {
  discovered: number;
  total: number;
  entries: SystemTypeEntry[];
};
type ShipClass = {
  key: string;
  discovered: boolean;
  name: string | null;
  discoveredAt: string | null;
};
type ShipClasses = { discovered: number; total: number; entries: ShipClass[] };
type PlanetTypes = {
  discovered: number;
  total: number;
  entries: Array<{
    classId: number;
    discovered: boolean;
    name: string | null;
    description: string | null;
    objectType: string | null;
    discoveredAt: string | null;
  }>;
};
type PrestigeHistory = {
  prestige: number;
  entries: Array<{
    id: number;
    amount: number;
    description: string;
    createdAt: string;
  }>;
};

const groups: Array<{
  title: string;
  entries: Array<{
    label: string;
    view?: View;
    ranking?: RankingKey;
    note?: string;
  }>;
}> = [
  {
    title: 'Schiffe & Technik',
    entries: [{ label: 'Schiffsrümpfe', view: 'ship-classes' }],
  },
  {
    title: 'Karte & Entdeckungen',
    entries: [
      { label: 'Sternensystemtypen', view: 'system-types' },
      { label: 'Sternensysteme', note: 'Erforschungsdaten werden aufgebaut' },
      { label: 'Planetentypen', view: 'planet-types' },
    ],
  },
  {
    title: 'Wichtige Orte',
    entries: [
      { label: 'Regionen', note: 'Kartierung wird aufgebaut' },
      { label: 'Handelsstationen', note: 'Stationsnetz wird aufgebaut' },
    ],
  },
  {
    title: 'Highscores',
    entries: [
      { label: 'Die 10 besten Entdecker', view: 'rankings', ranking: 'discoveries' },
      { label: 'Die 10 besten Forscher', view: 'rankings', ranking: 'research' },
      { label: 'Höchstes Prestige', view: 'rankings', ranking: 'prestige' },
      { label: 'Die 10 besten Ausbilder', view: 'rankings', ranking: 'crew-training' },
      { label: 'Die Top 10 der Architekten', view: 'rankings', ranking: 'colony-worth' },
      { label: 'Die Top 10 der Produzenten', view: 'rankings', ranking: 'colony-production' },
    ],
  },
  {
    title: 'Sonstiges',
    entries: [
      { label: 'Siedlerliste', view: 'settlers' },
      { label: 'Statistiken', note: 'Zeitreihen werden aufgebaut' },
      { label: 'Prestigehistorie', view: 'prestige-history' },
    ],
  },
];

export function DatabasePage() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') as View | null;
  const ranking = params.get('ranking') as RankingKey | null;
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!view) return void setData(null);
    setData(null);
    setError(null);
    api
      .get(`/database/${view}${view === 'rankings' && ranking ? `/${ranking}` : ''}`)
      .then(setData)
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Daten konnten nicht geladen werden',
        ),
      );
  }, [view, ranking]);

  const select = (next: View, nextRanking?: RankingKey) =>
    setParams(nextRanking ? { view: next, ranking: nextRanking } : { view: next });
  if (!view) return <Hub onSelect={select} />;
  return (
    <section className="space-y-3 p-4 sm:p-6">
      <button
        type="button"
        onClick={() => setParams({})}
        className="text-xs text-swu-muted hover:text-swu-accent"
      >
        ← Datenbank
      </button>
      <p className="font-mono text-xs text-swu-muted">
        / Datenbank / {titleFor(view)}
      </p>
      {error ? (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      ) : !data ? (
        <p className="text-swu-muted">Datenbank wird geladen...</p>
      ) : (
        <Detail view={view} data={data} />
      )}
    </section>
  );
}

function Hub({
  onSelect,
}: {
  onSelect: (view: View, ranking?: RankingKey) => void;
}) {
  return (
    <section className="p-4 sm:p-6">
      <h1 className="mb-4 border border-swu-border bg-black/40 px-2 py-1 text-lg font-bold text-swu-primary">
        / Datenbank
      </h1>
      <div className="grid max-w-5xl gap-4 md:grid-cols-3">
        {groups.map((group) => (
          <div
            key={group.title}
            className="border border-swu-border bg-black/30"
          >
            <h2 className="border-b border-swu-border px-2 py-1 text-center text-sm font-bold text-swu-primary">
              {group.title}
            </h2>
            <div className="p-1 text-sm">
              {group.entries.map((entry) =>
                entry.view ? (
                  <button
                    key={entry.label}
                    type="button"
                    onClick={() => onSelect(entry.view!, entry.ranking)}
                    className="block w-full px-1 py-0.5 text-left text-swu-text hover:bg-swu-primary/10 hover:text-swu-accent"
                  >
                    {entry.label}
                  </button>
                ) : (
                  <div key={entry.label} className="px-1 py-0.5 text-swu-muted">
                    <span>{entry.label}</span>
                    <small className="ml-2 text-[10px] opacity-70">
                      {entry.note}
                    </small>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Detail({ view, data }: { view: View; data: unknown }) {
  if (view === 'system-types')
    return <SystemTypes data={data as SystemTypes} />;
  if (view === 'settlers') return <Settlers data={data as Settler[]} />;
  if (view === 'rankings') return <RankingView data={data as RankingDetail} />;
  if (view === 'prestige-history')
    return <PrestigeHistory data={data as PrestigeHistory} />;
  if (view === 'planet-types') return <PlanetTypes data={data as PlanetTypes} />;
  return <ShipClasses data={data as ShipClasses} />;
}

function PlanetTypes({ data }: { data: PlanetTypes }) {
  return (
    <div className="max-w-3xl border border-swu-border bg-black/30">
      <h1 className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">
        Planetentypen
      </h1>
      <p className="border-b border-swu-border px-2 py-1 text-xs text-swu-muted">
        Katalogfortschritt: {data.discovered} / {data.total}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-swu-muted">
            <th className="p-2" />
            <th>Beschreibung</th>
            <th>Typ</th>
            <th className="p-2">Entdeckung</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.map((entry) => (
            <tr key={entry.classId} className="border-t border-swu-border/60">
              {entry.discovered ? (
                <>
                  <td className="p-1">
                    <img
                      src={planetThumbnail(entry.classId)}
                      alt=""
                      className="size-10 object-contain"
                    />
                  </td>
                  <td title={entry.description ?? undefined}>{entry.name}</td>
                  <td>{entry.objectType}</td>
                  <td className="p-2 font-mono text-xs text-swu-muted">
                    {new Date(entry.discoveredAt!).toLocaleString('de-DE')}
                  </td>
                </>
              ) : (
                <>
                  <td />
                  <td>???</td>
                  <td />
                  <td className="p-2 text-swu-muted">---</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PrestigeHistory({ data }: { data: PrestigeHistory }) {
  return (
    <div className="max-w-5xl border border-swu-border bg-black/30">
      <div className="flex items-center gap-4 border-b border-swu-border px-2 py-1">
        <h1 className="font-bold text-swu-primary">Prestigehistorie</h1>
        <span className="font-mono text-sm text-swu-text">
          Prestige: {data.prestige}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-swu-muted">
            <th className="p-2">Eintrag</th>
            <th className="w-44 p-2">Datum</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.length ? (
            data.entries.map((entry) => (
              <tr key={entry.id} className="border-t border-swu-border/60">
                <td className="p-2">
                  <span
                    className={
                      entry.amount > 0 ? 'text-emerald-300' : 'text-red-300'
                    }
                  >
                    {entry.amount > 0 ? '+' : ''}
                    {entry.amount} Prestige
                  </span>{' '}
                  {entry.description.replace(/^[-+]?\d+ Prestige(?: erhalten)?\s*/, '')}
                </td>
                <td className="p-2 font-mono text-xs text-swu-muted">
                  {new Date(entry.createdAt).toLocaleString('de-DE')}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={2} className="p-2 text-swu-muted">
                Keine Prestigeeinträge vorhanden
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SystemTypes({ data }: { data: SystemTypes }) {
  return (
    <div className="max-w-3xl border border-swu-border bg-black/30">
      <h1 className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">
        Sternensystemtypen
      </h1>
      <p className="border-b border-swu-border px-2 py-1 text-xs text-swu-muted">
        Katalogfortschritt: {data.discovered} / {data.total}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-swu-muted">
            <th className="p-2" />
            <th>Beschreibung</th>
            <th>Seltenheit</th>
            <th>Entdeckung</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.map((entry) => (
            <tr
              key={entry.systemTypeId}
              className="border-t border-swu-border/60"
            >
              {entry.discovered ? (
                <>
                  <td className="p-1">
                    <img
                      src={systemTypeImage(entry.systemTypeId)}
                      alt=""
                      className="size-7"
                    />
                  </td>
                  <td>{entry.name}</td>
                  <td>{rarity(entry.rarity!)}</td>
                  <td className="font-mono text-xs">
                    {new Date(entry.discoveredAt!).toLocaleString('de-DE')}
                  </td>
                </>
              ) : (
                <>
                  <td className="p-1">?</td>
                  <td>???</td>
                  <td>???</td>
                  <td>---</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Settlers({ data }: { data: Settler[] }) {
  return (
    <Table
      headers={[
        'Siedler',
        'Fraktion',
        'Prestige',
        'Kolonien',
        'Schiffe',
        'Forschung',
      ]}
      rows={data.map((row) => [
        <Link
          key={row.id}
          to={`/players/${row.id}`}
          className="text-swu-primary hover:text-swu-accent"
        >
          {row.displayName || row.username}
        </Link>,
        row.factionName,
        row.prestige,
        row.colonies,
        row.ships,
        row.completedResearch,
      ])}
    />
  );
}
function RankingView({ data }: { data: RankingDetail }) {
  return (
    <div className="max-w-3xl space-y-2">
      <h1 className="border border-swu-border bg-black/30 px-2 py-1 font-bold text-swu-primary">
        {data.title}
      </h1>
      <Table
        headers={['#', 'Commander', data.metricLabel]}
        rows={data.entries.map((entry) => [
          entry.rank,
          entry.username,
          entry.score,
        ])}
      />
      <p className="text-sm text-swu-muted">
        Dein Punktestand:{' '}
        {data.currentUser ? `${data.currentUser.score} (Platz ${data.currentUser.rank})` : '0'}
      </p>
    </div>
  );
}
function ShipClasses({ data }: { data: ShipClasses }) {
  return (
    <div className="max-w-2xl border border-swu-border bg-black/30">
      <h1 className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">
        Schiffsrümpfe
      </h1>
      <p className="border-b border-swu-border px-2 py-1 text-xs text-swu-muted">
        Katalogfortschritt: {data.discovered} / {data.total}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-swu-muted">
            <th className="px-2 py-1">Beschreibung</th>
            <th>Entdeckung</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.map((entry) => (
            <tr key={entry.key} className="border-t border-swu-border/60">
              <td className="px-2 py-1">
                {entry.discovered ? entry.name : '???'}
              </td>
              <td>
                {entry.discoveredAt
                  ? new Date(entry.discoveredAt).toLocaleString('de-DE')
                  : '---'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <div className="overflow-auto border border-swu-border bg-black/30">
      <table className="w-full text-sm">
        <thead className="bg-swu-bg/60 text-left text-xs text-swu-muted">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-2 py-1">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-swu-border/60">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-2 py-1">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function titleFor(view: View) {
  return (
    {
      settlers: 'Siedlerliste',
      rankings: 'Ranglisten',
      'system-types': 'Sternensystemtypen',
      'ship-classes': 'Schiffsrümpfe',
      'planet-types': 'Planetentypen',
      'prestige-history': 'Prestigehistorie',
    } as Record<View, string>
  )[view];
}
function rarity(value: string) {
  return (
    (
      {
        COMMON: 'Häufig',
        BINARY: 'Binär',
        UNCOMMON: 'Ungewöhnlich',
        RARE: 'Selten',
        VERY_RARE: 'Sehr selten',
      } as Record<string, string>
    )[value] ?? value
  );
}
