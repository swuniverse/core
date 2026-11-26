import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import type {
  DatabasePlanetTypeDetailDto,
  DatabaseRegionDetailDto,
  DatabaseSystemTypeDetailDto,
} from '@swuniverse/shared';
import { PageHeader } from '../components/PageHeader';
import { PlanetImg } from '../components/PlanetImg';
import { colonyFieldTileImage, starTileImage, systemTypeImage } from '../lib/assets';
import { api } from '../services/api';
import { rarity } from './database';

/** Loads one database entry and renders header, error and loading states around it. */
function EntryPage<T>({
  url,
  catalog,
  catalogView,
  title,
  children,
}: {
  url: string;
  catalog: string;
  catalogView: string;
  title: (entry: T) => string;
  children: (entry: T) => ReactNode;
}) {
  const [entry, setEntry] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setEntry(null);
    setError(null);
    api
      .get<T>(url)
      .then(setEntry)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Eintrag konnte nicht geladen werden'),
      );
  }, [url]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        segments={[
          { label: 'Datenbank', to: '/database' },
          { label: catalog, to: `/database?view=${catalogView}` },
          { label: entry ? title(entry) : '…' },
        ]}
      />
      {error ? (
        <p role="alert" className="text-red-300">{error}</p>
      ) : entry ? (
        <div className="max-w-3xl space-y-3 border border-swu-border bg-black/30 p-3">{children(entry)}</div>
      ) : (
        <p className="text-swu-muted">Eintrag wird geladen...</p>
      )}
    </div>
  );
}

function ValueTable({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
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
  );
}

const span = (range: { min: number; max: number }) =>
  range.min === range.max ? String(range.min) : `${range.min}–${range.max}`;

/** STU `planettype.twig`: image, description and an example surface per landing zone. */
export function DatabasePlanetTypePage() {
  const { key = '' } = useParams<{ key: string }>();
  return (
    <EntryPage<DatabasePlanetTypeDetailDto>
      url={`/database/planet-types/${encodeURIComponent(key)}`}
      catalog="Planetentypen"
      catalogView="planet-types"
      title={(type) => type.name}
    >
      {(type) => (
        <>
          <div className="flex items-center gap-3">
            <PlanetImg classId={type.classId} name={type.imageName} objectType={type.objectTypeId} className="size-20 object-contain" />
            <div>
              <h1 className="font-bold text-swu-primary">{type.name}</h1>
              <p className="text-xs text-swu-muted">{type.objectType}</p>
            </div>
          </div>
          {type.description && <p className="text-sm text-swu-muted">{type.description}</p>}
          {type.zones.map((zone) => (
            <section key={zone.label} aria-label={`Oberfläche ${zone.label}`}>
              <h2 className="mb-1 text-xs font-bold uppercase text-swu-muted">Oberfläche · {zone.label}</h2>
              <div
                className="grid w-fit gap-px"
                style={{ gridTemplateColumns: `repeat(${zone.surface[0]?.length ?? 1}, 2.25rem)` }}
              >
                {zone.surface.flatMap((row, y) =>
                  row.map((code, x) => (
                    <img key={`${x}:${y}`} src={colonyFieldTileImage(code)} alt="" title={code} className="size-9" />
                  )),
                )}
              </div>
            </section>
          ))}
        </>
      )}
    </EntryPage>
  );
}

/** STU `databaseEntry.twig` for star system types; SWU shows its catalogue values. */
export function DatabaseSystemTypePage() {
  const { id = '' } = useParams<{ id: string }>();
  return (
    <EntryPage<DatabaseSystemTypeDetailDto>
      url={`/database/system-types/${id}`}
      catalog="Sternensystemtypen"
      catalogView="system-types"
      title={(type) => type.name}
    >
      {(type) => (
        <>
          <div className="flex items-center gap-3">
            <img src={systemTypeImage(type.systemTypeId)} alt={type.name} className="size-20 object-contain" />
            <h1 className="font-bold text-swu-primary">{type.name}</h1>
          </div>
          <ValueTable
            rows={[
              ['Seltenheit', rarity(type.rarity)],
              ['Doppelstern', type.isBinary ? 'ja' : 'nein'],
              ['Systemgröße', span(type.gridSize)],
              ['Planeten', span(type.planets)],
              ['Asteroidenfelder', span(type.asteroids)],
              ['Mondchance', `${Math.round(type.moonChance * 100)} %`],
            ]}
          />
        </>
      )}
    </EntryPage>
  );
}

/** STU `regioninfo.twig`: region map with field types, effects and systems as tooltips. */
export function DatabaseRegionPage() {
  const { id = '' } = useParams<{ id: string }>();
  return (
    <EntryPage<DatabaseRegionDetailDto>
      url={`/database/regions/${id}`}
      catalog="Regionen"
      catalogView="regions"
      title={(region) => region.name}
    >
      {(region) => {
        const byCell = new Map(region.fields.map((field) => [`${field.cx}:${field.cy}`, field]));
        const columns = region.bounds.maxX - region.bounds.minX + 1;
        const cells = [];
        for (let cy = region.bounds.minY; cy <= region.bounds.maxY && region.fields.length; cy++) {
          for (let cx = region.bounds.minX; cx <= region.bounds.maxX; cx++) {
            const field = byCell.get(`${cx}:${cy}`);
            const tooltip = field
              ? [`${cx}|${cy} ${field.fieldTypeName}`, field.starSystemName && `${field.starSystemName}-System`, ...field.effectTexts]
                  .filter(Boolean)
                  .join('\n')
              : `${cx}|${cy} unbekannt`;
            cells.push(
              <div
                key={`${cx}:${cy}`}
                title={tooltip}
                data-testid={`region-cell-${cx}-${cy}`}
                className={`relative size-7 ${field ? '' : 'bg-black'} ${field?.inRegion ? 'outline outline-1 outline-swu-accent/70' : 'opacity-60'}`}
                style={field ? { backgroundImage: `url(${starTileImage(field.fieldTypeId)})`, backgroundSize: 'cover' } : undefined}
              >
                {field?.starSystemName && <span className="absolute inset-0 m-auto size-1.5 rounded-full bg-white" />}
                {field && field.effectTexts.length > 0 && <span className="absolute right-0 top-0 size-1.5 rounded-full bg-purple-400" />}
              </div>,
            );
          }
        }
        return (
          <>
            <h1 className="font-bold text-swu-primary">{region.name}</h1>
            {region.layerName && <p className="text-xs text-swu-muted">{region.layerName}</p>}
            {region.description && <p className="text-sm text-swu-muted">{region.description}</p>}
            <div className="overflow-auto">
              <div className="grid w-fit gap-px" style={{ gridTemplateColumns: `repeat(${columns}, 1.75rem)` }}>
                {cells}
              </div>
            </div>
          </>
        );
      }}
    </EntryPage>
  );
}
