import { PlayerName } from '../components/PlayerName';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PlanetImg } from '../components/PlanetImg';
import {
  ColonyScans,
  ColonySurfaceDialog,
  type ColonyScanProjection,
} from '../components/database/ColonyScans';
import {
  celestialObjectTypeLabel,
  SystemRasterMap,
  type SystemRasterDetail,
} from '../components/database/SystemRasterMap';
import { StatisticsView } from '../components/database/StatisticsView';
import { DatabaseProgress } from '../components/database/DatabaseProgress';
import { PageHeader } from '../components/PageHeader';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { PmLink } from '../components/PmLink';
import { commodityImage, systemTypeImage } from '../lib/assets';
import { formatNumber } from '../lib/format';
import { api } from '../services/api';
import type {
  CommodityLocationsOverviewDto,
  CommodityOverviewEntryDto,
  DatabaseLayerChoiceDto,
  DatabaseSystemTypesDto,
  DatabasePlanetTypesDto,
  DatabaseRegionsDto,
  Faction,
} from '@swuniverse/shared';

type TradePostEntry = {
  id: number;
  name: string;
  description: string;
  networkId: number;
  networkName: string;
  ownerName: string;
  location: {
    layerId: number;
    layerName: string | null;
    x: number;
    y: number;
    systemName: string | null;
  } | null;
};

type RankingKey =
  | 'discoveries'
  | 'research'
  | 'prestige'
  | 'crew-training'
  | 'flights'
  | 'rpg'
  | 'aurodium'
  | 'trade-posts'
  | 'colony-worth'
  | 'colony-production'
  | 'satisfied-workers';

type View =
  | 'settlers'
  | 'rankings'
  | 'system-types'
  | 'regions'
  | 'systems'
  | 'ship-classes'
  | 'station-classes'
  | 'planet-types'
  | 'prestige-history'
  | 'commodity-overview'
  | 'trade-posts'
  | 'npcs'
  | 'statistics';

type Settler = {
  id: number;
  username: string;
  displayName: string | null;
  factionName: string;
  prestige: number;
  colonies: number;
  ships: number;
  completedResearch: number;
  onVacation: boolean;
};
type NpcAdminEntry = {
  id: number;
  username: string;
  displayName: string | null;
  avatar: string | null;
  faction: Faction | null;
  factionName: string | null;
};
type NpcsAndAdmins = {
  npcs: NpcAdminEntry[];
  administrators: NpcAdminEntry[];
};
type Ranking = {
  userId?: number;
  username?: string;
  faction?: string | null;
  score: string | number;
  shipCount?: number;
  postName?: string;
  networkName?: string;
};
type RankingDetail = {
  title: string;
  metricLabel: string;
  anonymous?: boolean;
  /** Ranks trade posts instead of players. */
  kind?: 'trade-posts';
  entries: Array<Ranking & { rank: number; colonyName?: string }>;
  currentUser: (Ranking & { rank: number; colonyName?: string }) | null;
};
type SystemTypes = DatabaseSystemTypesDto;
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
type AvailableSystemDetail = SystemRasterDetail & {
  availability: 'AVAILABLE';
  id: number;
  name: string;
  layerId: number;
  cx: number;
  cy: number;
  systemTypeName: string;
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
  scans: ColonyScanProjection[];
};

type SystemDetail =
  | AvailableSystemDetail
  | { availability: 'ASTROMETRY_REQUIRED' };

type ShipClass = {
  key: string;
  discovered: boolean;
  name: string | null;
  discoveredAt: string | null;
};
type ShipClasses = { discovered: number; total: number; entries: ShipClass[] };
type PlanetTypes = DatabasePlanetTypesDto;
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
    title: 'Schiffe & Stationen',
    entries: [
      { label: 'Schiffsrümpfe', view: 'ship-classes' },
      { label: 'Stationsrümpfe', view: 'station-classes' },
    ],
  },
  {
    title: 'Karte',
    entries: [
      { label: 'Sternensysteme', view: 'systems' },
      { label: 'Planetentypen', view: 'planet-types' },
      { label: 'Sternensystemtypen', view: 'system-types' },
    ],
  },
  {
    title: 'Wichtige Orte',
    entries: [
      { label: 'Regionen', view: 'regions' },
      { label: 'Handelsstationen', view: 'trade-posts' },
    ],
  },
  {
    title: 'Siedler',
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
      {
        label: 'Die 10 bestbewerteten RPG-Schreiber',
        view: 'rankings',
        ranking: 'rpg',
      },
      { label: 'Höchstes Prestige', view: 'rankings', ranking: 'prestige' },
    ],
  },
  {
    title: 'Schiffe (anonym)',
    entries: [
      {
        label: 'Die Top 10 der Vielflieger',
        view: 'rankings',
        ranking: 'flights',
      },
      {
        label: 'Die 10 besten Ausbilder',
        view: 'rankings',
        ranking: 'crew-training',
      },
    ],
  },
  {
    title: 'Handel',
    entries: [
      {
        label: 'Die 10 Günstlinge der Hutten',
        view: 'rankings',
        ranking: 'aurodium',
      },
      {
        label: 'Die 10 aktivsten Handelsposten',
        view: 'rankings',
        ranking: 'trade-posts',
      },
    ],
  },
  {
    title: 'Kolonien',
    entries: [
      {
        label: 'Die Top 10 der besten Arbeitgeber',
        view: 'rankings',
        ranking: 'satisfied-workers',
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
      { label: 'NPCs & Administratoren', view: 'npcs' },
      { label: 'Warenübersicht', view: 'commodity-overview' },
      { label: 'Statistiken', view: 'statistics' },
      { label: 'Prestigehistorie', view: 'prestige-history' },
    ],
  },
];

export function DatabasePage() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') as View | null;
  const ranking = params.get('ranking') as RankingKey | null;
  const layerId = params.get('layerId');
  const isLayerCatalog = view === 'system-types' || view === 'planet-types' || view === 'regions';
  const [data, setData] = useState<unknown>(null);
  const [layerChoices, setLayerChoices] = useState<DatabaseLayerChoiceDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!view || view === 'statistics') return void setData(null);
    setData(null);
    setLayerChoices([]);
    setError(null);
    const path = view === 'commodity-overview'
      ? '/database/commodities/overview'
      : `/database/${view}${view === 'rankings' && ranking ? `/${ranking}` : ''}${isLayerCatalog && layerId ? `?layerId=${encodeURIComponent(layerId)}` : ''}`;
    const response = isLayerCatalog
      ? api.get<DatabaseSystemTypesDto | DatabasePlanetTypesDto | DatabaseRegionsDto>(path).then((catalog) => {
          setLayerChoices(catalog.layers);
          return catalog;
        })
      : api.get<unknown>(path);
    response
      .then(setData)
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Daten konnten nicht geladen werden',
        ),
      );
  }, [view, ranking, isLayerCatalog, layerId]);

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
      <PageHeader
        segments={[
          { label: 'Datenbank', to: '/database' },
          { label: titleFor(view) },
        ]}
      />
      {error ? (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      ) : view === 'statistics' ? (
        <StatisticsView />
      ) : !data ? (
        <p className="text-swu-muted">Datenbank wird geladen...</p>
      ) : (
        <>
          {isLayerCatalog && (
            <label className="block text-xs text-swu-muted">
              Kartenebene
              <select
                aria-label="Kartenebene"
                value={layerId ?? ''}
                onChange={(event) => setParams({ view, ...(event.target.value ? { layerId: event.target.value } : {}) })}
                className="ml-2 border border-swu-border bg-swu-bg px-2 py-1 text-swu-text"
              >
                <option value="">Alle bekannten Ebenen</option>
                {layerChoices.map((layer) => (
                  <option key={layer.id} value={layer.id}>{layer.name}</option>
                ))}
              </select>
            </label>
          )}
          <Detail view={view} data={data} />
        </>
      )}
    </section>
  );
}

export function DatabaseSystemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<SystemDetail | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [openScan, setOpenScan] = useState<ColonyScanProjection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setDetail(null);
    setSelectedFieldId(null);
    setOpenScan(null);
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
    return <SystemEntryError message={error} />;
  }
  if (!detail) {
    return (
      <p className="p-4 text-swu-muted sm:p-6">Systemeintrag wird geladen...</p>
    );
  }
  if (detail.availability === 'ASTROMETRY_REQUIRED') {
    return (
      <section className="space-y-3 p-4 sm:p-6">
        <SystemCatalogLink />
        <p className="border border-swu-border bg-black/30 p-3 text-sm text-swu-muted">
          Dieses Sternensystem wurde noch nicht erfolgreich vollständig
          kartographiert.
        </p>
      </section>
    );
  }

  const selectedField =
    detail.fields.find((field) => field.id === selectedFieldId) ?? null;
  const reload = async () => {
    const next = await api.get<SystemDetail>(`/database/systems/${id}`);
    setDetail(next);
  };
  const deleteScan = async (scanId: number) => {
    try {
      await api.delete(`/spacecraft/colony-scans/${scanId}`);
      setOpenScan(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scan konnte nicht gelöscht werden');
    }
  };
  return (
    <section className="space-y-3 p-4 sm:p-6">
      <SystemCatalogLink />
      <header className="border border-swu-border bg-black/30 px-3 py-2">
        <h1 className="font-bold text-swu-primary">{detail.name}</h1>
        <p className="text-sm text-swu-muted">
          {detail.systemTypeName} · Koordinaten: {detail.cx}:{detail.cy}
        </p>
        <Link
          className="mt-2 inline-block text-xs text-swu-accent hover:underline"
          to={`/starmap?layer=${detail.layerId}&x=${detail.cx}&y=${detail.cy}`}
        >
          Sternenkarte öffnen
        </Link>
      </header>
      <p className="text-xs text-swu-muted">
        Kartographischer Systemeintrag: statische Informationen, keine
        taktischen Aktionen verfügbar.
      </p>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <SystemRasterMap
          detail={detail}
          selectedFieldId={selectedFieldId}
          onSelectField={setSelectedFieldId}
        />
        <SystemContextPanel detail={detail} field={selectedField} />
      </div>
      <section className="border border-swu-border bg-black/30">
        <h2 className="border-b border-swu-border px-3 py-2 font-bold text-swu-primary">
          Kolonien
        </h2>
        {detail.colonies.length === 0 ? (
          <p className="p-3 text-sm text-swu-muted">Keine aktuellen Kolonien.</p>
        ) : (
          <ul className="divide-y divide-swu-border/60">
            {detail.colonies.map((colony) => (
              <li key={colony.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span>{colony.name}</span>
                <span className="font-mono text-xs text-swu-muted">
                  {colony.posX}:{colony.posY}
                </span>
                {colony.isOwn && <span className="text-xs text-swu-primary">eigene Kolonie</span>}
                {colony.isAbandoned && <span className="text-xs text-swu-muted">aufgegeben</span>}
                {colony.canMessageOwner && colony.owner && (
                  <PmLink
                    className="ml-auto text-xs text-swu-accent hover:underline"
                    playerId={colony.owner.id}
                    playerName={colony.owner.username}
                  >
                    Nachricht an <PlayerName name={colony.owner.username} />
                  </PmLink>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <ColonyScans scans={detail.scans} onOpen={setOpenScan} onDelete={deleteScan} />
      {openScan && <ColonySurfaceDialog scan={openScan} onClose={() => setOpenScan(null)} />}
    </section>
  );
}

function SystemCatalogLink() {
  return (
    <Link
      to="/database?view=systems"
      className="text-xs text-swu-muted hover:text-swu-accent"
    >
      ← Sternensysteme
    </Link>
  );
}

function SystemEntryError({ message }: { message: string }) {
  return (
    <section className="space-y-3 p-4 sm:p-6">
      <SystemCatalogLink />
      <p role="alert" className="text-red-300">
        {message}
      </p>
    </section>
  );
}

function SystemContextPanel({
  detail,
  field,
}: {
  detail: AvailableSystemDetail;
  field: SystemRasterDetail['fields'][number] | null;
}) {
  return (
    <aside className="border border-swu-border bg-black/30 p-3 text-sm lg:sticky lg:top-3">
      {field ? (
        <>
          <h2 className="font-bold text-swu-primary">
            Feld {field.sx}:{field.sy}
          </h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-swu-muted">Feldtyp</dt>
            <dd>{field.fieldType.name}</dd>
            {field.celestialObject && (
              <>
                <dt className="text-swu-muted">Objekt</dt>
                <dd>{field.celestialObject.name ?? 'Unbenannt'}</dd>
                <dt className="text-swu-muted">Typ</dt>
                <dd>{celestialObjectTypeLabel(field.celestialObject.objectType)}</dd>
                {field.celestialObject.description && (
                  <>
                    <dt className="text-swu-muted">Beschreibung</dt>
                    <dd>{field.celestialObject.description}</dd>
                  </>
                )}
              </>
            )}
          </dl>
          {!field.celestialObject && (
            <p className="mt-2 text-swu-muted">Kein Himmelskörper auf diesem Feld.</p>
          )}
        </>
      ) : (
        <>
          <h2 className="font-bold text-swu-primary">{detail.name}</h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-swu-muted">Systemtyp</dt>
            <dd>{detail.systemTypeName}</dd>
            <dt className="text-swu-muted">Koordinaten:</dt>
            <dd className="font-mono">
              {detail.cx}:{detail.cy}
            </dd>
            <dt className="text-swu-muted">Rastergröße:</dt>
            <dd>
              {detail.maxX} × {detail.maxY}
            </dd>
          </dl>
        </>
      )}
    </aside>
  );
}


function Hub({
  onSelect,
}: {
  onSelect: (view: View, ranking?: RankingKey) => void;
}) {
  return (
    <section className="space-y-4 p-4 sm:p-6">
      <PageHeader segments={[{ label: 'Datenbank' }]} />
      <DatabaseProgress />
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
  if (view === 'regions') return <Regions data={data as DatabaseRegionsDto} />;
  if (view === 'systems') return <Systems data={data as SystemCatalog} />;
  if (view === 'settlers') return <Settlers data={data as Settler[]} />;
  if (view === 'npcs') return <NpcsAndAdmins data={data as NpcsAndAdmins} />;
  if (view === 'rankings') return <RankingView data={data as RankingDetail} />;
  if (view === 'prestige-history')
    return <PrestigeHistory data={data as PrestigeHistory} />;
  if (view === 'planet-types')
    return <PlanetTypes data={data as PlanetTypes} />;
  if (view === 'commodity-overview')
    return <CommodityOverview data={data as CommodityOverviewEntryDto[]} />;
  if (view === 'trade-posts')
    return <TradePosts data={data as TradePostEntry[]} />;
  if (view === 'station-classes')
    return <ShipClasses data={data as ShipClasses} station />;
  return <ShipClasses data={data as ShipClasses} />;
}

function TradePosts({ data }: { data: TradePostEntry[] }) {
  return (
    <Table
      headers={['Name', 'Beschreibung', 'Handelsnetz', 'Ort', 'Betreiber']}
      rows={data.map((post) => [
        post.name,
        post.description || '—',
        post.networkName,
        post.location ? (
          <Link
            to={`/starmap?layer=${post.location.layerId}&x=${post.location.x}&y=${post.location.y}`}
            className="text-swu-accent hover:underline"
          >
            {[
              post.location.systemName,
              `${post.location.layerName ? `${post.location.layerName} ` : `Ebene ${post.location.layerId} `}${post.location.x}:${post.location.y}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Link>
        ) : (
          <span className="text-swu-muted">Unbekannt</span>
        ),
        <PlayerName name={post.ownerName} />,
      ])}
    />
  );
}

function CommodityOverview({ data }: { data: CommodityOverviewEntryDto[] }) {
  const [locations, setLocations] = useState<CommodityLocationsOverviewDto | null>(
    null,
  );
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showLocations = (commodityId: number) => {
    setLoadingId(commodityId);
    setLocations(null);
    setError(null);
    api
      .get<CommodityLocationsOverviewDto>(
        `/database/commodities/${commodityId}/locations`,
      )
      .then(setLocations)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Lagerorte konnten nicht geladen werden'),
      )
      .finally(() => setLoadingId(null));
  };

  return (
    <div className="grid max-w-4xl gap-3 lg:grid-cols-2 lg:items-start">
      <div className="overflow-hidden border border-swu-border bg-black/30 text-xs">
        <table className="w-full">
          <thead className="bg-swu-bg/60 text-left text-swu-muted">
            <tr>
              <th className="px-2 py-1">Ware</th>
              <th className="px-2 py-1 text-right">Anzahl</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr key={entry.commodityId} className="border-t border-swu-border/60">
                <td className="px-2 py-1">
                  <button
                    type="button"
                    onClick={() => showLocations(entry.commodityId)}
                    className="flex items-center gap-2 text-swu-accent hover:underline"
                  >
                    <img
                      src={commodityImage(entry.commodityId, entry.commodityName)}
                      alt=""
                      className="h-6 w-6 object-contain"
                    />
                    {entry.commodityName}
                  </button>
                </td>
                <td className="px-2 py-1 text-right font-mono">
                  {formatNumber(entry.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border border-swu-border bg-black/30 text-xs">
        <h2 className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">
          Lagerorte
        </h2>
        {loadingId ? (
          <p className="p-2 text-swu-muted">Lagerorte werden geladen...</p>
        ) : error ? (
          <p role="alert" className="p-2 text-red-300">{error}</p>
        ) : locations ? (
          <table className="w-full">
            <thead className="text-left text-swu-muted">
              <tr>
                <th className="px-2 py-1">Typ</th>
                <th className="px-2 py-1">Lagerort</th>
                <th className="px-2 py-1 text-right">Anzahl</th>
              </tr>
            </thead>
            <tbody>
              {locations.locations.map((location, index) => (
                <tr
                  key={`${location.type}-${location.id}-${index}`}
                  className="border-t border-swu-border/60"
                >
                  <td className="px-2 py-1 text-swu-muted">
                    {locationTypeLabel(location.type)}
                  </td>
                  <td className="px-2 py-1">
                    <Link
                      to={
                        location.type === 'COLONY'
                          ? `/colonies?colony=${location.id}`
                          : location.type === 'TRADE_ACCOUNT'
                            ? `/trade?post=${location.id}`
                            : location.type === 'TRADE_OFFER'
                              ? '/trade?tab=offers'
                              : `/spacecraft/${location.id}`
                      }
                      className="text-swu-accent hover:underline"
                    >
                      {location.name}
                    </Link>
                    {location.location && (
                      <span className="ml-2 text-[10px] text-swu-muted">
                        {location.location}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right font-mono">
                    {formatNumber(location.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-swu-border font-bold">
              <tr>
                <td className="px-2 py-1" colSpan={2}>Summe</td>
                <td className="px-2 py-1 text-right font-mono">
                  {formatNumber(locations.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="p-2 text-swu-muted">Ware auswählen.</p>
        )}
      </div>
    </div>
  );
}

function locationTypeLabel(type: CommodityLocationsOverviewDto['locations'][number]['type']) {
  if (type === 'COLONY') return 'Kolonie';
  if (type === 'TORPEDO_STORAGE') return 'Torpedolager';
  if (type === 'TRADE_ACCOUNT') return 'Warenkonto';
  if (type === 'TRADE_OFFER') return 'Angebotsreserve';
  return 'Schiff';
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
/** STU `regioninfo`: only a completed region cartography reveals a region. */
function Regions({ data }: { data: DatabaseRegionsDto }) {
  return (
    <div className="max-w-3xl border border-swu-border bg-black/30">
      <h1 className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">
        Regionen
      </h1>
      <p className="border-b border-swu-border px-2 py-1 text-xs text-swu-muted">
        Katalogfortschritt: {data.discovered} / {data.total}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-swu-muted">
            <th className="p-2">Name</th>
            <th>Beschreibung</th>
            <th>Ebene</th>
            <th>Entdeckung</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.map((entry) => (
            <tr key={entry.regionId} className="border-t border-swu-border/60">
              {entry.discovered ? (
                <>
                  <td className="p-2">{entry.name}</td>
                  <td>{entry.description || '—'}</td>
                  <td>{entry.layerName ?? `Ebene ${entry.layerId}`}</td>
                  <td className="font-mono text-xs">
                    {entry.discoveredAt ? new Date(entry.discoveredAt).toLocaleString('de-DE') : '—'}
                  </td>
                </>
              ) : (
                <>
                  <td className="p-2">???</td>
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

function NpcsAndAdmins({ data }: { data: NpcsAndAdmins }) {
  const section = (title: string, entries: NpcAdminEntry[]) => (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-swu-primary">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-swu-muted">Keine Einträge.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => {
            const name = entry.displayName || entry.username;
            return (
              <div
                key={entry.id}
                className="flex items-center gap-2 border border-swu-border bg-black/30 p-2"
              >
                <PlayerAvatar
                  name={name}
                  avatar={entry.avatar}
                  faction={entry.faction}
                  decorative
                  className="size-10 text-sm"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/players/${entry.id}`}
                    className="block truncate text-swu-primary hover:text-swu-accent"
                  >
                    <PlayerName name={name} playerId={entry.id} />
                  </Link>
                  <span className="text-xs text-swu-muted">
                    {entry.factionName ?? 'Keine Fraktion'}
                  </span>
                </div>
                <PmLink playerId={entry.id} playerName={name} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div className="max-w-4xl space-y-4">
      {section('NPCs', data.npcs)}
      {section('Administratoren', data.administrators)}
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
          <PlayerName name={row.displayName || row.username} />
          {row.onVacation && (
            <span className="ml-1 text-swu-warning">(Urlaub)</span>
          )}
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
  if (data.kind === 'trade-posts') {
    return (
      <div className="max-w-3xl space-y-2">
        <h1 className="border border-swu-border bg-black/30 px-2 py-1 font-bold text-swu-primary">
          {data.title}
        </h1>
        <Table
          headers={['#', 'Handelsposten', 'Handelsnetz', data.metricLabel]}
          rows={data.entries.map((entry) => [entry.rank, entry.postName, entry.networkName, entry.score])}
        />
      </div>
    );
  }
  return (
    <div className="max-w-3xl space-y-2">
      <h1 className="border border-swu-border bg-black/30 px-2 py-1 font-bold text-swu-primary">
        {data.title}
      </h1>
      <Table
        headers={
          data.anonymous
            ? ['#', 'Fraktion', data.metricLabel, 'Schiffe']
            : ['#', 'Commander', data.metricLabel]
        }
        rows={data.entries.map((entry) =>
          data.anonymous
            ? [entry.rank, entry.faction ?? 'Unbekannt', entry.score, entry.shipCount ?? 0]
            : [entry.rank, <PlayerName name={entry.username} />, entry.score],
        )}
      />
      {!data.anonymous && (
        <p className="text-sm text-swu-muted">
          Dein Punktestand:{' '}
          {data.currentUser
            ? `${data.currentUser.score} (Platz ${data.currentUser.rank})`
            : '0'}
        </p>
      )}
    </div>
  );
}
function ShipClasses({
  data,
  station = false,
}: {
  data: ShipClasses;
  station?: boolean;
}) {
  return (
    <div className="max-w-2xl border border-swu-border bg-black/30">
      <h1 className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">
        {station ? 'Stationsrümpfe' : 'Schiffsrümpfe'}
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
      regions: 'Regionen',
      systems: 'Sternensysteme',
      'ship-classes': 'Schiffsrümpfe',
      'station-classes': 'Stationsrümpfe',
      'planet-types': 'Planetentypen',
      'prestige-history': 'Prestigehistorie',
      'commodity-overview': 'Warenübersicht',
      'trade-posts': 'Handelsstationen',
      npcs: 'NPCs & Administratoren',
      statistics: 'Statistiken',
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
