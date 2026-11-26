import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import type { DatabaseHullDetailDto } from '@swuniverse/shared';
import { PageHeader } from '../components/PageHeader';
import { commodityImage, shipImage } from '../lib/assets';
import { formatNumber } from '../lib/format';
import { api } from '../services/api';

const MODULE_TYPE_LABELS: Record<string, string> = {
  HULL: 'Hülle',
  SHIELDS: 'Schilde',
  COMPUTER: 'Computer',
  SUBLIGHT_DRIVE: 'Sublichtantrieb',
  SENSORS: 'Sensoren',
  HYPERDRIVE: 'Hyperantrieb',
  REACTOR: 'Reaktor',
  EPS: 'EPS',
  ENERGY_WEAPON: 'Energiewaffe',
  TORPEDO_BANK: 'Torpedobank',
  SPECIAL: 'Spezial',
};

const KIND = {
  SHIP: { path: 'ship-classes', catalog: 'Schiffsrümpfe' },
  STATION: { path: 'station-classes', catalog: 'Stationsrümpfe' },
} as const;

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours} h ${minutes} min` : `${minutes} min`;
}

/** STU `shiprump.twig`: hull image and value table of a discovered hull. */
export function DatabaseHullDetailPage({ kind }: { kind: DatabaseHullDetailDto['kind'] }) {
  const { key } = useParams<{ key: string }>();
  const [detail, setDetail] = useState<DatabaseHullDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { path, catalog } = KIND[kind];

  useEffect(() => {
    if (!key) return;
    setDetail(null);
    setError(null);
    api
      .get<DatabaseHullDetailDto>(`/database/${path}/${encodeURIComponent(key)}`)
      .then(setDetail)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Rumpf konnte nicht geladen werden'),
      );
  }, [key, path]);

  const segments = [
    { label: 'Datenbank', to: '/database' },
    { label: catalog, to: `/database?view=${path}` },
    { label: detail?.name ?? '…' },
  ];
  if (error) {
    return (
      <div className="space-y-3 p-4 sm:p-6">
        <PageHeader segments={segments} />
        <p role="alert" className="text-red-300">{error}</p>
      </div>
    );
  }
  if (!detail) return <p className="p-4 text-swu-muted sm:p-6">Rumpf wird geladen...</p>;

  const rows: Array<[string, ReactNode]> = [
    ['Fraktion', detail.factionName ?? '—'],
    ['Kategorie', `${detail.category} · ${detail.role}`],
    ...(detail.moduleLevel != null ? [['Modullevel', detail.moduleLevel] as [string, ReactNode]] : []),
    ['Flugkosten', detail.flightEnergyCost],
    ['Lagerraum', formatNumber(detail.cargoCapacity)],
    ['Hülle', formatNumber(detail.hull)],
    ['Schilde', formatNumber(detail.shield)],
    ['Torpedokapazität', detail.torpedoCapacity],
    ['Sensorreichweite', detail.sensorRange],
    ['min. Crew', detail.crewMin],
    ['max. Crew', detail.crewMax],
    ['EPS-Kapazität', formatNumber(detail.epsCapacity)],
    ...(detail.requiredWorkbees != null
      ? [['Benötigte Workbees', detail.requiredWorkbees] as [string, ReactNode]]
      : []),
    [
      'Baukosten',
      <div key="costs" className="space-y-0.5">
        {detail.buildEnergyCost != null && <div>Energie {formatNumber(detail.buildEnergyCost)}</div>}
        {detail.buildCosts.map((cost) => (
          <div key={cost.commodityId} className="flex items-center gap-1">
            <img src={commodityImage(cost.commodityId)} alt="" className="h-4 w-4" />
            {formatNumber(cost.amount)} {cost.commodityName}
          </div>
        ))}
        {detail.buildEnergyCost == null && detail.buildCosts.length === 0 && '—'}
      </div>,
    ],
    ['Bauzeit', formatDuration(detail.buildTimeSeconds)],
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader segments={segments} />
      <div className="max-w-2xl border border-swu-border bg-black/30">
        <h1 className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">Rumpfdetails</h1>
        <div className="flex justify-center border-b border-swu-border p-3">
          <img src={shipImage(detail.id, detail.key)} alt={detail.name} className="max-h-40 object-contain" />
        </div>
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-t border-swu-border/60">
                <th scope="row" className="w-48 px-2 py-1 text-left font-normal text-swu-muted">{label}</th>
                <td className="px-2 py-1 text-swu-primary">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {detail.modules.length > 0 && (
          <table className="w-full border-t border-swu-border text-sm">
            <thead>
              <tr className="text-left text-xs text-swu-muted">
                <th className="px-2 py-1">Modul</th>
                <th>Level</th>
                <th>Pflicht</th>
              </tr>
            </thead>
            <tbody>
              {detail.modules.map((module) => (
                <tr key={module.type} className="border-t border-swu-border/60">
                  <td className="px-2 py-1">{MODULE_TYPE_LABELS[module.type] ?? module.type}</td>
                  <td>{module.minLevel === module.maxLevel ? module.minLevel : `${module.minLevel}–${module.maxLevel}`}</td>
                  <td>{module.mandatory ? 'ja' : 'nein'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
