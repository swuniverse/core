import { useEffect, useState } from 'react';
import type {
  SpacecraftDetailDto,
  SpacecraftEnergyFlowDto,
} from '@swuniverse/shared';
import { api } from '../../services/api';
import { SYSTEM_ASSETS } from './ShipControlCenter';
import { SHIP_SYSTEM_PRESENTATION } from './ship-system-presentation';

interface Props {
  shipId: number;
  showDetails: boolean;
  onCloseDetails: () => void;
  showEnergy: boolean;
  onCloseEnergy: () => void;
}

export function ShipOperationsPanel({
  shipId,
  showDetails,
  onCloseDetails,
  showEnergy,
  onCloseEnergy,
}: Props) {
  const [details, setDetails] = useState<SpacecraftDetailDto | null>(null);
  const [flow, setFlow] = useState<SpacecraftEnergyFlowDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDetails(null);
    setFlow(null);
  }, [shipId]);

  useEffect(() => {
    if (!showDetails || details) return;
    api
      .get<SpacecraftDetailDto>(`/spacecraft/${shipId}/details`)
      .then(setDetails)
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Details konnten nicht geladen werden',
        ),
      );
  }, [details, shipId, showDetails]);

  useEffect(() => {
    if (!showEnergy || flow) return;
    api
      .get<SpacecraftEnergyFlowDto>(`/spacecraft/${shipId}/energy-flow`)
      .then(setFlow)
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Energiefluss konnte nicht geladen werden',
        ),
      );
  }, [flow, shipId, showEnergy]);

  return (
    <>
      {showDetails && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Schiffsinformationen"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onCloseDetails();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded border border-swu-border bg-swu-bg p-4 shadow-xl">
            <div className="flex justify-between gap-2">
              <h3 className="text-sm font-bold text-swu-primary">
                Schiffsinformationen
              </h3>
              <button
                type="button"
                onClick={onCloseDetails}
                aria-label="Dialog schließen"
                className="text-xs text-swu-muted"
              >
                Schließen
              </button>
            </div>
            {details && (
              <div className="mt-2 grid gap-4 text-xs md:grid-cols-2">
                <InfoSection
                  title="Zustand"
                  rows={[
                    ['Hülle', `${details.hull}/${details.hullMax}`],
                    ['Schilde', `${details.shields}/${details.shieldsMax}`],
                    ['Energie', `${details.energy}/${details.energyMax}`],
                    ['Batterie', `${details.battery}/${details.batteryMax}`],
                  ]}
                />
                <InfoSection
                  title="Crew"
                  rows={
                    details.crewRoster?.length
                      ? details.crewRoster.map((member) => [
                          member.name,
                          `${member.position} · ${member.rank}`,
                        ])
                      : [
                          [
                            'Besatzung',
                            `${details.crew} (${details.crewRequired ?? 0},${details.crewMax || 'kA'})`,
                          ],
                        ]
                  }
                />
                <InfoSection
                  title="Informationen"
                  rows={[
                    [
                      'Reaktorleistung',
                      `${details.effectiveStats?.reactorOutput ?? details.reactorOutput}`,
                    ],
                    [
                      'Sensorreichweite',
                      `${details.effectiveStats?.sensorRange ?? '—'}`,
                    ],
                    [
                      'Frachtkapazität',
                      `${details.effectiveStats?.cargoMax ?? details.cargoMax ?? 0}`,
                    ],
                  ]}
                />
                <section>
                  <h4 className="font-bold text-swu-primary">Systemstatus</h4>
                  <ul>
                    {Object.entries(details.runtimeSystems).map(
                      ([key, value]) => {
                        const system = SHIP_SYSTEM_PRESENTATION.get(
                          key as never,
                        );
                        return (
                          <li key={key} className="flex items-center gap-1">
                            <img
                              src={`/assets/system/${SYSTEM_ASSETS[key] ?? '1.png'}`}
                              alt=""
                              className="size-4 border border-emerald-400 object-contain"
                            />
                            {system?.label ?? key}: {value?.integrity ?? 0}%
                          </li>
                        );
                      },
                    )}
                  </ul>
                </section>
              </div>
            )}
          </div>
        </div>
      )}

      {showEnergy && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="EPS Verbrauch"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onCloseEnergy();
          }}
        >
          <section className="w-full max-w-sm border border-swu-border bg-swu-bg shadow-xl">
            <header className="flex items-center justify-between border-b border-swu-border px-3 py-2">
              <h3 className="text-sm font-bold text-swu-primary">
                EPS Verbrauch
              </h3>
              <button
                type="button"
                onClick={onCloseEnergy}
                aria-label="Dialog schließen"
                className="text-swu-muted"
              >
                Schließen
              </button>
            </header>
            {flow && (
              <div className="p-3 text-xs">
                <InfoSection
                  title="Energie"
                  rows={[
                    ['EPS', `${flow.energy.current}/${flow.energy.max}`],
                    ['Reaktor', `${flow.reactorOutput}`],
                    ['Produktion', `${flow.epsProduction}`],
                    ['Verbrauch', `${flow.totalSystemConsumption}`],
                    ['Netto', `${flow.netEps}`],
                  ]}
                />
                <h4 className="mt-3 font-bold text-swu-primary">
                  Systemverbrauch
                </h4>
                <ul>
                  {flow.systems.map((row) => (
                    <li key={row.systemKey} className="flex justify-between">
                      <span>{row.label}</span>
                      <span>{row.epsPerTick} EPS</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}
      {error && (showDetails || showEnergy) && (
        <p role="alert" className="sr-only">
          {error}
        </p>
      )}
    </>
  );
}

function InfoSection({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section>
      <h4 className="font-bold text-swu-primary">{title}</h4>
      <dl>
        {rows.map(([label, value]) => (
          <div key={`${label}-${value}`} className="flex justify-between gap-3">
            <dt className="text-swu-muted">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
