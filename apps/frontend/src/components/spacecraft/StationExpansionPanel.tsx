import { useEffect, useState } from 'react';
import type { StationExpansionOptionDto } from '@swuniverse/shared';
import { api } from '../../services/api';

type StationExpansionPanelProps = {
  stationId: number;
  onExpanded: () => Promise<void> | void;
};

export function StationExpansionPanel({
  stationId,
  onExpanded,
}: StationExpansionPanelProps) {
  const [options, setOptions] = useState<StationExpansionOptionDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    api
      .get<StationExpansionOptionDto[]>(
        `/spacecraft/${stationId}/construction/expansion-options`,
      )
      .then((data) => {
        if (current) setOptions(data);
      })
      .catch((reason: unknown) => {
        if (current)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Stationskosten konnten nicht geladen werden',
          );
      });
    return () => {
      current = false;
    };
  }, [stationId]);

  async function expand(classKey: string) {
    setBuilding(classKey);
    setError(null);
    try {
      await api.post(`/spacecraft/${stationId}/construction/expand`, {
        classKey,
      });
      await onExpanded();
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Station konnte nicht ausgebaut werden',
      );
    } finally {
      setBuilding(null);
    }
  }

  return (
    <section className="border border-swu-border bg-swu-surface p-2">
      <h2 className="mb-2 text-sm font-bold text-swu-primary">
        Station ausbauen
      </h2>
      {error && (
        <p role="alert" className="mb-2 text-xs text-red-300">
          {error}
        </p>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <article
            key={option.classKey}
            className="border border-swu-border/70 bg-black/20 p-2 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-swu-accent">{option.name}</h3>
                <p className="text-swu-muted">Bauzeit: {option.buildTimeTicks} Ticks</p>
              </div>
              <button
                type="button"
                disabled={!option.canStart || building !== null}
                onClick={() => void expand(option.classKey)}
                className="border border-swu-border px-2 py-1 text-swu-primary disabled:opacity-40"
              >
                Station ausbauen
              </button>
            </div>
            <p className={option.workbees.sufficient ? 'text-emerald-300' : 'text-red-300'}>
              {option.workbees.docked} / {option.workbees.required} Workbees
            </p>
            {!option.location.allowed && (
              <p className="text-red-300">Standort nicht geeignet</p>
            )}
            {option.limit.reached && (
              <p className="text-red-300">Stationslimit erreicht</p>
            )}
            <ul className="mt-1">
              {option.modules.map((module) => (
                <li
                  key={module.commodityId}
                  className={module.sufficient ? 'text-emerald-300' : 'text-red-300'}
                >
                  <span>{module.name}</span>: {module.stored} / {module.required}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
