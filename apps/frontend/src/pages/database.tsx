import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PlanetImg } from '../components/PlanetImg';
import { systemTypeImage } from '../lib/assets';
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
  | 'systems'
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
type SystemCatalog = {
  layers: Array<{
    id: number;
    name: string;
    entries: Array<
      | { discovered: false; name: '???' }
      | {
          discovered: true;
          systemId: number;
          name: string;
          cx: number;
          cy: number;
          systemTypeName: string;
          discoveredAt: string;
        }
    >;
  }>;
};
type SystemDetail = {
  id: number;
  name: string;
  layerId: number;
  cx: number;
  cy: number;
  systemTypeName: string;
  maxX: number;
  maxY: number;
  fields: Array<{
    id: number;
    sx: number;
    sy: number;
    fieldTypeId: number;
    isPassable: boolean;
    energyCost: number;
    damage: number;
    effects: string[];
    celestialObject: {
      id: number;
      objectType: number;
      name: string | null;
      description: string | null;
      posX: number;
      posY: number;
      classId: number | null;
      isColonizable: boolean;
    } | null;
  }>;
  colonies: Array<{
    id: number;
    name: string;
    owner: { id: number; username: string } | null;
    isOwn: boolean;
    isAbandoned: boolean;
    posX: number;
    posY: number;
    celestialObjectId: number | null;
    canMessageOwner: boolean;
  }>;
  colonyScans: ColonyScanProjection[];
};

export type ColonyScanProjection = {
  id: number;
  colonyId: number;
  scanner: { id: number; username: string | null };
  provenance: 'OWN' | 'ALLIANCE';
  canDelete: boolean;
  snapshot: {
    colonyName: string | null;
    owner: { id: number | null; username: string | null };
    scannedAt: string;
    surface: {
      width: number | null;
      height: number | null;
      deposits: Array<{
        commodityId: number;
        commodityName: string;
        minAmount: number;
        maxAmount: number;
      }>;
      fields: Array<{
        fieldIndex: number;
        fieldType: number;
        terrainTileId: string | null;
        buildingId: number | null;
        buildingName: string | null;
        hasBuilding: boolean;
        isConstruction: boolean;
        isActive: boolean;
        integrityPercent: number | null;
      }>;
    };
  };
  system?: { id: number | null; discovered: boolean; name: string | null };
  current: {
    colony: {
      id: number;
      name: string;
      owner: { id: number; username: string | null } | null;
      isAbandoned: boolean;
      posX: number;
      posY: number;
      celestialObjectId: number | null;
    } | null;
  };
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
    key: string;
    classId: number;
    objectTypeId: number;
    imageName: string;
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
      { label: 'Sternensysteme', view: 'systems' },
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
      {
        label: 'Die 10 besten Entdecker',
        view: 'rankings',
        ranking: 'discoveries',
      },
      {
        label: 'Die 10 besten Forscher',
        view: 'rankings',
        ranking: 'research',
      },
      { label: 'Höchstes Prestige', view: 'rankings', ranking: 'prestige' },
      {
        label: 'Die 10 besten Ausbilder',
        view: 'rankings',
        ranking: 'crew-training',
      },
      {
        label: 'Die Top 10 der Architekten',
        view: 'rankings',
        ranking: 'colony-worth',
      },
      {
        label: 'Die Top 10 der Produzenten',
        view: 'rankings',
        ranking: 'colony-production',
      },
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
      .get(
        `/database/${view}${view === 'rankings' && ranking ? `/${ranking}` : ''}`,
      )
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
    setParams(
      nextRanking ? { view: next, ranking: nextRanking } : { view: next },
    );
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

export function DatabaseSystemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<SystemDetail | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [selectedScan, setSelectedScan] = useState<ColonyScanProjection | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setDetail(null);
    setSelectedFieldId(null);
    setError(null);
    api
      .get<SystemDetail>(`/database/systems/${id}`)
      .then(setDetail)
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Systemeintrag konnte nicht geladen werden',
        ),
      );
  }, [id]);

  if (error) {
    return (
      <section className="space-y-3 p-4 sm:p-6">
        <Link
          to="/database?view=systems"
          className="text-xs text-swu-muted hover:text-swu-accent"
        >
          ← Sternensysteme
        </Link>
        <p role="alert" className="text-red-300">
          {error}
        </p>
      </section>
    );
  }
  if (!detail) {
    return (
      <p className="p-4 text-swu-muted sm:p-6">Systemeintrag wird geladen...</p>
    );
  }

  const selectedField =
    detail.fields.find((field) => field.id === selectedFieldId) ?? null;
  async function deleteScan(scanId: number) {
    try {
      await api.delete(`/spacecraft/colony-scans/${scanId}`);
      if (id) setDetail(await api.get<SystemDetail>(`/database/systems/${id}`));
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Scan konnte nicht gelöscht werden',
      );
    }
  }
  return (
    <section className="space-y-3 p-4 sm:p-6">
      <Link
        to="/database?view=systems"
        className="text-xs text-swu-muted hover:text-swu-accent"
      >
        ← Sternensysteme
      </Link>
      <header className="border border-swu-border bg-black/30 px-3 py-2">
        <h1 className="font-bold text-swu-primary">{detail.name}</h1>
        <p className="text-sm text-swu-muted">
          {detail.systemTypeName} · Außenkoordinaten {detail.cx}:{detail.cy}
        </p>
        <Link
          className="mt-2 inline-block text-xs text-swu-accent hover:underline"
          to={`/starmap?layer=${detail.layerId}&x=${detail.cx}&y=${detail.cy}`}
        >
          Sternenkarte öffnen
        </Link>
      </header>
      <p className="text-xs text-swu-muted">
        Informationsansicht: Felder und Objekte können untersucht werden; keine
        taktischen Aktionen verfügbar.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {detail.fields.map((field) => (
          <button
            key={field.id}
            type="button"
            aria-label={`Feld ${field.sx}:${field.sy} untersuchen`}
            onClick={() => setSelectedFieldId(field.id)}
            className="border border-swu-border bg-black/30 p-2 text-left text-xs hover:border-swu-accent"
          >
            <span className="font-mono text-swu-primary">
              {field.sx}:{field.sy}
            </span>
            <span className="ml-2 text-swu-muted">
              {field.celestialObject?.name ?? `Feldtyp ${field.fieldTypeId}`}
            </span>
          </button>
        ))}
      </div>
      {selectedField && (
        <aside className="border border-swu-accent/60 bg-black/30 p-3 text-sm">
          <h2 className="font-bold text-swu-primary">
            Feld {selectedField.sx}:{selectedField.sy}
          </h2>
          {selectedField.celestialObject ? (
            <p>
              {selectedField.celestialObject.description ??
                selectedField.celestialObject.name}
            </p>
          ) : (
            <p className="text-swu-muted">
              Kein Himmelskörper auf diesem Feld.
            </p>
          )}
        </aside>
      )}
      <section className="border border-swu-border bg-black/30">
        <h2 className="border-b border-swu-border px-3 py-2 font-bold text-swu-primary">
          Kolonien
        </h2>
        {detail.colonies.length === 0 ? (
          <p className="p-3 text-sm text-swu-muted">
            Keine aktuellen Kolonien.
          </p>
        ) : (
          <ul className="divide-y divide-swu-border/60">
            {detail.colonies.map((colony) => (
              <li
                key={colony.id}
                className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm"
              >
                <span>{colony.name}</span>
                <span className="font-mono text-xs text-swu-muted">
                  {colony.posX}:{colony.posY}
                </span>
                {colony.isOwn && (
                  <span className="text-xs text-swu-primary">
                    eigene Kolonie
                  </span>
                )}
                {colony.isAbandoned && (
                  <span className="text-xs text-swu-muted">aufgegeben</span>
                )}
                {colony.canMessageOwner && colony.owner && (
                  <Link
                    className="ml-auto text-xs text-swu-accent hover:underline"
                    to={`/messages?tab=compose&to=${colony.owner.id}&name=${encodeURIComponent(colony.owner.username)}`}
                  >
                    Nachricht an {colony.owner.username}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <ColonyScans
        scans={detail.colonyScans ?? []}
        onOpen={setSelectedScan}
        onDelete={deleteScan}
      />
      {selectedScan && (
        <ColonySurfaceDialog
          scan={selectedScan}
          onClose={() => setSelectedScan(null)}
        />
      )}
    </section>
  );
}

export function ColonyScans({
  scans,
  onOpen,
  onDelete,
}: {
  scans: ColonyScanProjection[];
  onOpen: (scan: ColonyScanProjection) => void;
  onDelete: (scanId: number) => void;
}) {
  return (
    <section className="border border-swu-border bg-black/30">
      <h2 className="border-b border-swu-border px-3 py-2 font-bold text-swu-primary">
        Neueste zugängliche Kolonie-Scans
      </h2>
      {scans.length === 0 ? (
        <p className="p-3 text-sm text-swu-muted">
          Keine zugänglichen Kolonie-Scans.
        </p>
      ) : (
        <ul className="divide-y divide-swu-border/60">
          {scans.map((scan) => {
            const current = scan.current.colony;
            const ownerChanged =
              current?.owner != null &&
              (current.owner.id !== scan.snapshot.owner.id ||
                current.owner.username !== scan.snapshot.owner.username);
            return (
              <li key={scan.id} className="space-y-1 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {scan.snapshot.colonyName ?? 'Unbenannte Kolonie'}
                  </span>
                  <span className="text-xs text-swu-muted">
                    <span>
                      {scan.provenance === 'OWN'
                        ? 'eigener Scan'
                        : 'Allianz-Scan'}
                    </span>{' '}
                    · Scanner: {scan.scanner.username ?? `#${scan.scanner.id}`}
                  </span>
                  {scan.canDelete && (
                    <button
                      type="button"
                      aria-label={`Scan ${scan.id} löschen`}
                      onClick={() => onDelete(scan.id)}
                      className="ml-auto text-xs text-red-300 hover:text-red-200"
                    >
                      Löschen
                    </button>
                  )}
                </div>
                <p className="text-xs text-swu-muted">
                  Snapshot vom{' '}
                  {new Date(scan.snapshot.scannedAt).toLocaleString('de-DE')} ·
                  damaliger Besitzer:{' '}
                  {scan.snapshot.owner.username ?? 'unbekannt'}
                </p>
                {scan.system?.discovered && scan.system.id != null && (
                  <p className="text-xs text-swu-muted">
                    System:{' '}
                    <Link
                      to={`/database/systems/${scan.system.id}`}
                      className="text-swu-accent hover:underline"
                    >
                      {scan.system.name}
                    </Link>
                  </p>
                )}
                {current ? (
                  <p className="text-xs">
                    Aktuell: <span>{current.name}</span> auf Feld {current.posX}
                    :{current.posY}
                    {current.owner
                      ? ` · Besitzer: ${current.owner.username ?? 'unbekannt'}`
                      : ' · aufgegeben'}
                    {ownerChanged && (
                      <span className="ml-2 text-amber-200">
                        Besitzerwechsel seit dem Scan
                      </span>
                    )}
                    {current.isAbandoned && (
                      <span className="ml-2 text-amber-200">
                        Kolonie aufgegeben
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-amber-200">
                    Kolonie existiert heute nicht mehr.
                  </p>
                )}
                <button
                  type="button"
                  aria-label={`Gespeicherte Oberfläche von ${scan.snapshot.colonyName ?? 'dieser Kolonie'} öffnen`}
                  onClick={() => onOpen(scan)}
                  className="text-xs text-swu-accent hover:underline"
                >
                  Gespeicherte Oberfläche untersuchen
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function ColonySurfaceDialog({
  scan,
  onClose,
}: {
  scan: ColonyScanProjection;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gespeicherte Oberfläche"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="max-h-[90vh] w-full max-w-2xl overflow-auto border border-swu-border bg-swu-bg p-3">
        <header className="mb-3 flex items-center justify-between border-b border-swu-border pb-2">
          <h2 className="font-bold text-swu-primary">
            Gespeicherte Oberfläche:{' '}
            {scan.snapshot.colonyName ?? 'Unbenannte Kolonie'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-swu-muted"
          >
            Schließen
          </button>
        </header>
        <p className="mb-3 text-xs text-swu-muted">
          Informationsansicht der beim Scan gespeicherten Oberfläche; keine
          taktischen Aktionen verfügbar.
        </p>
        <p className="mb-2 text-xs text-swu-muted">
          Größe: {scan.snapshot.surface.width ?? '?'} ×{' '}
          {scan.snapshot.surface.height ?? '?'} ·{' '}
          {scan.snapshot.surface.fields.length} gespeicherte Felder
        </p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {scan.snapshot.surface.fields.map((field) => (
            <li
              key={field.fieldIndex}
              className="border border-swu-border/60 p-2 text-xs"
            >
              Feld {field.fieldIndex} · Typ {field.fieldType}
              {field.buildingName ? ` · ${field.buildingName}` : ''}
            </li>
          ))}
        </ul>
      </section>
    </div>
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
  if (view === 'systems') return <Systems data={data as SystemCatalog} />;
  if (view === 'settlers') return <Settlers data={data as Settler[]} />;
  if (view === 'rankings') return <RankingView data={data as RankingDetail} />;
  if (view === 'prestige-history')
    return <PrestigeHistory data={data as PrestigeHistory} />;
  if (view === 'planet-types')
    return <PlanetTypes data={data as PlanetTypes} />;
  return <ShipClasses data={data as ShipClasses} />;
}

function Systems({ data }: { data: SystemCatalog }) {
  const [layerId, setLayerId] = useState(data.layers[0]?.id ?? null);
  const layer =
    data.layers.find((entry) => entry.id === layerId) ?? data.layers[0];

  return (
    <div className="max-w-3xl space-y-2">
      <h1 className="border border-swu-border bg-black/30 px-2 py-1 font-bold text-swu-primary">
        Sternensysteme
      </h1>
      <label className="block text-sm text-swu-muted">
        Kartenebene
        <select
          aria-label="Kartenebene"
          value={layer?.id ?? ''}
          onChange={(event) => setLayerId(Number(event.target.value))}
          className="ml-2 border border-swu-border bg-swu-bg px-2 py-1 text-swu-text"
        >
          {data.layers.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
      <div className="overflow-auto border border-swu-border bg-black/30">
        <table className="w-full text-sm">
          <thead className="bg-swu-bg/60 text-left text-xs text-swu-muted">
            <tr>
              <th className="px-2 py-1">System</th>
              <th className="px-2 py-1">Koordinaten</th>
              <th className="px-2 py-1">Typ</th>
              <th className="px-2 py-1">Entdeckung</th>
            </tr>
          </thead>
          <tbody>
            {layer?.entries.map((entry, index) => (
              <tr
                key={entry.discovered ? entry.systemId : index}
                className="border-t border-swu-border/60"
              >
                {entry.discovered ? (
                  <>
                    <td className="px-2 py-1">
                      <Link
                        className="text-swu-accent hover:underline"
                        to={`/database/systems/${entry.systemId}`}
                      >
                        {entry.name}
                      </Link>
                    </td>
                    <td className="px-2 py-1 font-mono">
                      {entry.cx}:{entry.cy}
                    </td>
                    <td className="px-2 py-1">{entry.systemTypeName}</td>
                    <td className="px-2 py-1 font-mono text-xs text-swu-muted">
                      {new Date(entry.discoveredAt).toLocaleString('de-DE')}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-2 py-1">???</td>
                    <td className="px-2 py-1">???</td>
                    <td className="px-2 py-1">???</td>
                    <td className="px-2 py-1 text-swu-muted">---</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
            <tr key={entry.key} className="border-t border-swu-border/60">
              {entry.discovered ? (
                <>
                  <td className="p-1">
                    <PlanetImg
                      classId={entry.classId}
                      name={entry.imageName}
                      objectType={entry.objectTypeId}
                      thumbnail
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
                  {entry.description.replace(
                    /^[-+]?\d+ Prestige(?: erhalten)?\s*/,
                    '',
                  )}
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
        {data.currentUser
          ? `${data.currentUser.score} (Platz ${data.currentUser.rank})`
          : '0'}
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
      systems: 'Sternensysteme',
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
