import type {
  StarmapSystemFieldDto,
  StarmapSystemGridDto,
} from '@swuniverse/shared';

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
  systemGrid: StarmapSystemGridDto | null;
  systemGridError: string | null;
  onOpenOrbitManagement: () => void;
  eventProps: PanelEventsProps;
};

const sectionClass = 'border border-swu-border bg-swu-surface px-3 py-2';
const headingClass =
  'mb-1.5 text-[11px] font-bold uppercase tracking-wide text-swu-muted';

export function PanelInfo({
  colony,
  detail,
  systemGrid,
  systemGridError,
  onOpenOrbitManagement,
  eventProps,
}: PanelInfoProps) {
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
        <h3 className={headingClass}>Schiffe im Orbit</h3>
        {detail?.orbitShips.length ? (
          <div className="divide-y divide-swu-border/40">
            {detail.orbitShips.map((ship) => (
              <div
                key={ship.id}
                className="flex flex-wrap items-center gap-2 py-1.5 text-xs"
              >
                <img
                  src={shipImage(ship.shipClassId, ship.shipClassKey)}
                  alt=""
                  className="h-8 w-14 object-contain"
                />
                <div className="min-w-28 flex-1">
                  <div className="font-bold text-swu-primary">{ship.name}</div>
                  <div className="text-[10px] text-swu-muted">
                    {ship.canManage ? 'Eigene Flotte' : 'Fremdes Schiff'} ·{' '}
                    {ship.status}
                  </div>
                </div>
                <ShipStatus
                  label="Hülle"
                  value={`${ship.hull}/${ship.hullMax}`}
                />
                <ShipStatus
                  label="Schilde"
                  value={`${ship.shields}/${ship.shieldsMax}`}
                />
                <ShipStatus
                  label="EPS"
                  value={`${ship.energy}/${ship.energyMax}`}
                />
                <ShipStatus
                  label="Crew"
                  value={`${ship.crew}/${ship.crewMax}`}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-swu-muted">Keine Schiffe im Orbit.</p>
        )}
      </section>

      <div className="grid gap-2 lg:grid-cols-[minmax(0,0.8fr)_minmax(240px,1.4fr)_minmax(0,0.8fr)]">
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
          <button
            type="button"
            onClick={onOpenOrbitManagement}
            className="mt-2 border border-swu-accent/60 px-2 py-1 text-xs text-swu-accent hover:border-swu-accent"
          >
            Orbitalmanagement
          </button>
        </section>

        <SystemScan
          colony={colony}
          systemGrid={systemGrid}
          error={systemGridError}
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

      {detail?.defense?.shields && (
        <section className={sectionClass}>
          <h3 className={headingClass}>Schilde</h3>
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-swu-accent">
              {detail.defense.shields.current}/{detail.defense.shields.max}
            </div>
            <div className="h-2 flex-1 overflow-hidden rounded border border-swu-border/60 bg-swu-bg">
              <div
                className="h-full bg-swu-accent"
                style={{
                  width: `${detail.defense.shields.max > 0 ? Math.min(100, Math.max(0, (detail.defense.shields.current / detail.defense.shields.max) * 100)) : 0}%`,
                }}
              />
            </div>
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
  colony,
  systemGrid,
  error,
}: {
  colony: Colony;
  systemGrid: StarmapSystemGridDto | null;
  error: string | null;
}) {
  const maxX = systemGrid?.system.maxX ?? colony.starSystem?.maxX;
  const maxY = systemGrid?.system.maxY ?? colony.starSystem?.maxY;
  const canRender =
    systemGrid &&
    colony.posX != null &&
    colony.posY != null &&
    maxX != null &&
    maxY != null;
  const xs = canRender
    ? range(Math.max(1, colony.posX! - 2), Math.min(maxX!, colony.posX! + 2))
    : [];
  const ys = canRender
    ? range(Math.max(1, colony.posY! - 2), Math.min(maxY!, colony.posY! + 2))
    : [];
  const fields = new Map(
    systemGrid?.fields.map((field) => [`${field.sx}|${field.sy}`, field]) ?? [],
  );

  return (
    <section className={sectionClass}>
      <h3 className={headingClass}>Umgebungsscan</h3>
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : canRender ? (
        <div
          className="mx-auto grid w-fit gap-px bg-swu-border"
          style={{ gridTemplateColumns: `repeat(${xs.length}, 2.5rem)` }}
        >
          {ys.flatMap((y) =>
            xs.map((x) => {
              const field = fields.get(`${x}|${y}`);
              return <ScanCell key={`${x}|${y}`} x={x} y={y} field={field} />;
            }),
          )}
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
}: {
  x: number;
  y: number;
  field?: StarmapSystemFieldDto;
}) {
  const object = field?.celestialObject;
  const image = object?.classId
    ? planetThumbnail(object.classId)
    : field
      ? starTileImage(field.fieldType.id)
      : null;
  const label = field
    ? `${x}|${y}: ${object?.name ?? field.fieldType.name}`
    : `${x}|${y}: Nicht verfügbar`;

  return (
    <div
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center bg-swu-bg text-[9px] text-swu-muted"
    >
      {image ? (
        <img src={image} alt="" className="h-full w-full object-contain" />
      ) : (
        '–'
      )}
    </div>
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
