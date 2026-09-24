import { useEffect, useState } from 'react';
import type { ColonyEnvironmentScanDto } from '@swuniverse/shared';
import { Link } from 'react-router-dom';

import { BbCodeText } from '../../../components/BbCodeText';
import {
  planetImage,
  planetThumbnail,
  shipImage,
  starTileImage,
  systemTypeImage,
} from '../../../lib/assets';
import type { Colony, ColonyDetailV2 } from '../types';
import { formatSignedAmount } from '../utils';
import { PanelEvents } from './PanelEvents';

type PanelEventsProps = React.ComponentProps<typeof PanelEvents>;

type PanelInfoProps = {
  colony: Colony;
  detail?: ColonyDetailV2;
  environmentScan: ColonyEnvironmentScanDto | null;
  environmentScanError: string | null;
  onOpenOrbitManagement: () => void;
  eventProps: PanelEventsProps;
};

const sectionClass = 'border border-swu-border bg-swu-surface px-3 py-2';
const headingClass =
  'mb-1.5 text-[11px] font-bold uppercase tracking-wide text-swu-muted';

export function PanelInfo({
  colony,
  detail,
  environmentScan,
  environmentScanError,
  onOpenOrbitManagement,
  eventProps,
}: PanelInfoProps) {
  const [showAllOrbitShips, setShowAllOrbitShips] = useState(false);
  useEffect(() => setShowAllOrbitShips(false), [colony.id]);
  const storageIds = new Set(
    (colony.storage ?? []).map((item) => item.commodityId),
  );
  const effects =
    detail?.productionDeltas.filter(
      (delta) => !storageIds.has(delta.commodityId),
    ) ?? [];

  return (
    <div className="space-y-2">
      <section className={sectionClass}>
        <h3 className={headingClass}>Orbitalmanagement</h3>
        <button
          type="button"
          onClick={onOpenOrbitManagement}
          className="border border-swu-accent/60 px-2 py-1 text-xs text-swu-accent hover:border-swu-accent"
        >
          Orbitalmanagement
        </button>
      </section>

      <section className={sectionClass}>
        <h3 className={headingClass}>Planet</h3>
        {colony.celestialObject && (
          <>
            <div className="flex items-center gap-2">
              {colony.celestialObject.classId && (
                <img
                  src={planetImage(colony.celestialObject.classId)}
                  alt=""
                  className="h-10 w-10 object-contain"
                />
              )}
              <div className="text-sm">
                <div className="text-swu-primary">
                  {colony.celestialObject.name || colony.name}
                </div>
                {colony.posX != null && colony.posY != null && (
                  <div className="font-mono text-[10px] text-swu-muted">
                    {colony.posX}|{colony.posY}
                  </div>
                )}
              </div>
            </div>
            {colony.celestialObject.description && (
              <BbCodeText
                text={colony.celestialObject.description}
                className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-swu-muted"
              />
            )}
          </>
        )}
      </section>

      <section className={sectionClass}>
        <h3 className={headingClass}>Schiffe im Orbit</h3>
        {detail?.orbitShips.length ? (
          <div className="divide-y divide-swu-border/40">
            <OrbitShipRow ship={detail.orbitShips[0]} />
            {showAllOrbitShips &&
              detail.orbitShips
                .slice(1)
                .map((ship) => <OrbitShipRow key={ship.id} ship={ship} />)}
          </div>
        ) : (
          <p className="text-xs text-swu-muted">Keine Schiffe im Orbit.</p>
        )}
        {(detail?.orbitShips.length ?? 0) > 1 && (
          <button
            type="button"
            onClick={() => setShowAllOrbitShips((current) => !current)}
            className="mt-2 border border-swu-border/60 px-2 py-1 text-[10px] text-swu-muted hover:border-swu-accent/60 hover:text-swu-accent"
          >
            {showAllOrbitShips
              ? 'Schiffsliste einklappen'
              : 'Schiffsliste aufklappen'}
          </button>
        )}
      </section>

      <div className="grid gap-2 lg:grid-cols-[minmax(240px,1.4fr)_minmax(0,0.8fr)]">
        <SystemScan
          environmentScan={environmentScan}
          error={environmentScanError}
        />

        <section className={sectionClass}>
          <h3 className={headingClass}>Sternensystem</h3>
          {colony.starSystem ? (
            <div className="flex items-center gap-2">
              <img
                src={systemTypeImage(colony.starSystem.systemTypeId)}
                alt=""
                className="h-10 w-10 object-contain"
              />
              <div>
                <div className="text-sm text-swu-primary">
                  {colony.starSystem.name}
                </div>
                <div className="text-[10px] text-swu-muted">
                  {colony.starSystem.systemTypeName}
                </div>
                {colony.starSystem.cx != null &&
                  colony.starSystem.cy != null && (
                    <div className="font-mono text-[10px] text-swu-muted">
                      Sektor {colony.starSystem.cx}|{colony.starSystem.cy}
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-swu-muted">Nicht verfügbar.</p>
          )}
        </section>
      </div>

      {detail && (
        <section className={sectionClass}>
          <h3 className={headingClass}>Bevölkerung</h3>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 xl:grid-cols-5">
            <PopulationValue label="Gesamt" value={detail.population.current} />
            <PopulationValue
              label="Arbeiter"
              value={detail.population.workers}
            />
            <PopulationValue
              label="Verfügbar"
              value={detail.population.available}
            />
            <PopulationValue
              label="Wohnraum"
              value={`${detail.population.housingFree ?? detail.population.housing} (${detail.population.housingMax ?? detail.population.max})`}
            />
            <PopulationValue
              label="Entwicklung"
              value={formatSignedAmount(detail.population.growth)}
            />
          </div>
        </section>
      )}

      {detail?.planetaryDefense && detail.planetaryDefense.length > 0 && (
        <section className={sectionClass}>
          <h3 className={headingClass}>Planetare Verteidigung</h3>
          <div className="space-y-1 text-xs">
            {detail.planetaryDefense.map((defense) => (
              <div
                key={`${defense.fieldIndex}-${defense.functionId}`}
                className="flex justify-between"
              >
                <span className="text-swu-muted">
                  Feld {defense.fieldIndex}: {defense.buildingName}
                </span>
                <span className="text-swu-primary">{defense.functionName}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {detail?.asteroidExhausted && (
        <div className="border border-amber-500/40 bg-amber-950/20 px-4 py-3 text-xs text-amber-200">
          Dieser Asteroid ist für deinen Account vollständig erschöpft. Weitere
          Abbaugebäude bleiben deaktiviert; eine spätere Neubesiedlung liefert
          keine Rohstoffe.
        </div>
      )}

      {detail?.deposits && detail.deposits.length > 0 && (
        <section className={sectionClass}>
          <h3 className={headingClass}>
            {colony.celestialObject?.objectType === 3
              ? 'Asteroidenlagerstätten · accountgebunden'
              : 'Vorkommen'}
          </h3>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {detail.deposits.map((deposit) => (
              <div
                key={deposit.commodityId}
                className="flex justify-between gap-2"
              >
                <span
                  className={
                    deposit.depleted ? 'text-red-400' : 'text-swu-muted'
                  }
                >
                  {deposit.name}
                </span>
                {deposit.delta !== 0 && (
                  <span
                    className={
                      deposit.delta < 0 ? 'text-red-400' : 'text-green-400'
                    }
                  >
                    {formatSignedAmount(deposit.delta)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {effects.length > 0 && (
        <section className={sectionClass}>
          <h3 className={headingClass}>Effekte</h3>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {effects.map((effect) => (
              <div key={effect.commodityId} className="flex justify-between">
                <span className="text-swu-muted">{effect.name}</span>
                <span
                  className={
                    effect.amount >= 0 ? 'text-green-400' : 'text-red-400'
                  }
                >
                  {formatSignedAmount(effect.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={sectionClass}>
        <h3 className={headingClass}>Ereignisse</h3>
        <PanelEvents {...eventProps} />
      </section>
    </div>
  );
}

function SystemScan({
  environmentScan,
  error,
}: {
  environmentScan: ColonyEnvironmentScanDto | null;
  error: string | null;
}) {
  const xs = environmentScan
    ? range(environmentScan.bounds.minX, environmentScan.bounds.maxX)
    : [];
  const ys = environmentScan
    ? range(environmentScan.bounds.minY, environmentScan.bounds.maxY)
    : [];
  const fields = new Map(
    environmentScan?.fields.map((field) => [`${field.x}|${field.y}`, field]) ??
      [],
  );
  const signatures = new Map(
    environmentScan?.signatures.map((signature) => [
      `${signature.x}|${signature.y}`,
      signature.visibleCount,
    ]) ?? [],
  );
  const shields = new Set(
    environmentScan?.colonyShields
      .filter((shield) => shield.shielded)
      .map((shield) => `${shield.x}|${shield.y}`) ?? [],
  );

  return (
    <section className={sectionClass}>
      <h3 className={headingClass}>Umgebungsscan</h3>
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : environmentScan ? (
        <div
          className="mx-auto grid w-fit gap-px bg-swu-border"
          style={{
            gridTemplateColumns: `1.5rem repeat(${xs.length}, 2.5rem)`,
          }}
        >
          <div aria-hidden="true" className="bg-swu-surface" />
          {xs.map((x) => (
            <div
              key={`x-${x}`}
              className="flex h-5 items-center justify-center bg-swu-surface font-mono text-[9px] text-swu-muted"
            >
              X {x}
            </div>
          ))}
          {ys.flatMap((y) => [
            <div
              key={`y-${y}`}
              className="flex h-10 items-center justify-center bg-swu-surface font-mono text-[9px] text-swu-muted"
            >
              Y {y}
            </div>,
            ...xs.map((x) => {
              const coordinate = `${x}|${y}`;
              return (
                <ScanCell
                  key={coordinate}
                  x={x}
                  y={y}
                  field={fields.get(coordinate)}
                  signatureCount={signatures.get(coordinate) ?? 0}
                  shielded={shields.has(coordinate)}
                />
              );
            }),
          ])}
        </div>
      ) : (
        <p className="text-xs text-swu-muted">Umgebungsscan nicht verfügbar</p>
      )}
    </section>
  );
}

function ScanCell({
  x,
  y,
  field,
  signatureCount,
  shielded,
}: {
  x: number;
  y: number;
  field?: ColonyEnvironmentScanDto['fields'][number];
  signatureCount: number;
  shielded: boolean;
}) {
  const object = field?.celestialObject;
  const image = object?.classId
    ? planetThumbnail(object.classId)
    : field
      ? starTileImage(field.fieldTypeId)
      : null;
  const details = [
    field?.fieldTypeName ?? 'Nicht verfügbar',
    object?.name,
    signatureCount > 0
      ? `${signatureCount} ${signatureCount === 1 ? 'Signatur' : 'Signaturen'}`
      : null,
    shielded ? 'Kolonieschild' : null,
  ].filter(Boolean);
  const label = `${x}|${y}: ${details.join(', ')}`;

  return (
    <div
      aria-label={label}
      title={label}
      className="relative flex h-10 w-10 items-center justify-center bg-swu-bg text-[9px] text-swu-muted"
    >
      {image ? (
        <img src={image} alt="" className="h-full w-full object-contain" />
      ) : (
        '–'
      )}
      {shielded && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 border border-swu-accent/80"
        />
      )}
      {signatureCount > 0 && (
        <span className="absolute right-0 top-0 min-w-3 border border-swu-accent bg-swu-bg px-0.5 text-center font-mono text-[8px] leading-3 text-swu-accent">
          {signatureCount}
        </span>
      )}
    </div>
  );
}

function OrbitShipRow({
  ship,
}: {
  ship: ColonyDetailV2['orbitShips'][number];
}) {
  const content = (
    <div className="flex flex-wrap items-center gap-2 py-1.5 text-xs">
      <img
        src={shipImage(ship.shipClassId, ship.shipClassKey)}
        alt=""
        className="h-8 w-14 object-contain"
      />
      <div className="min-w-28 flex-1">
        <div className="font-bold text-swu-primary">{ship.name}</div>
        <div className="text-[10px] text-swu-muted">
          {ship.canManage ? 'Eigene Flotte' : 'Fremdes Schiff'} · {ship.status}
        </div>
      </div>
      <ShipStatus label="Hülle" value={`${ship.hull}/${ship.hullMax}`} />
      <ShipStatus
        label="Schilde"
        value={`${ship.shields}/${ship.shieldsMax}`}
      />
      <ShipStatus label="EPS" value={`${ship.energy}/${ship.energyMax}`} />
      <ShipStatus label="Crew" value={`${ship.crew}/${ship.crewMax}`} />
    </div>
  );

  return ship.canManage === true ? (
    <Link
      to={`/spacecraft/${ship.id}`}
      className="block hover:bg-swu-accent/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-swu-accent"
    >
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  );
}

function ShipStatus({ label, value }: { label: string; value: string }) {
  return (
    <span className="border border-swu-border bg-black/30 px-1.5 py-1">
      <span className="text-swu-muted">{label} </span>
      <span className="font-mono text-swu-primary">{value}</span>
    </span>
  );
}

function PopulationValue({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <div className="text-[10px] text-swu-muted">{label}</div>
      <div className="font-mono text-swu-primary">{value}</div>
    </div>
  );
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
