import { useEffect, useState } from 'react';
import { AllianceRole, type AllianceDepotDto } from '@swuniverse/shared';
import { api } from '../../services/api';

export function AllianceDepotsPanel({
  allianceId,
  role,
}: {
  allianceId: number;
  role: AllianceRole | null;
}) {
  const [depots, setDepots] = useState<AllianceDepotDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const allowed = role === AllianceRole.PRESIDENT || role === AllianceRole.VICE;
  useEffect(() => {
    let current = true;
    setDepots(null);
    setError(null);
    if (allowed)
      void api
        .get<AllianceDepotDto[]>(`/alliances/${allianceId}/depots`)
        .then((result) => {
          if (current) setDepots(result);
        })
        .catch((reason: unknown) => {
          if (current)
            setError(
              reason instanceof Error
                ? reason.message
                : 'Allianzdepots konnten nicht geladen werden',
            );
        });
    return () => {
      current = false;
    };
  }, [allianceId, allowed, refresh]);
  if (!allowed) return null;
  return (
    <section className="space-y-2 border border-swu-border bg-swu-surface p-3 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-swu-primary">Allianzdepots</h2>
        <button
          type="button"
          className="text-xs text-swu-primary"
          onClick={() => setRefresh((value) => value + 1)}
        >
          Depots aktualisieren
        </button>
      </div>
      {depots?.length === 0 && (
        <p className="text-swu-muted">Keine Depotstationen zugeordnet.</p>
      )}
      {depots?.map((depot) => (
        <article
          key={depot.stationId}
          className="border-t border-swu-border pt-2"
        >
          <h3 className="font-bold">{depot.name}</h3>
          <p>Besitzer: {depot.owner.name}</p>
          <p>Standort: {depot.locationLabel}</p>
          <p>
            Lager: {depot.cargoUsed} / {depot.cargoMax}
          </p>
          {depot.cargo.length ? (
            <ul className="text-xs">
              {depot.cargo.map((item) => (
                <li key={item.commodityId}>
                  {item.name}: {item.amount}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-swu-muted">Lager ist leer.</p>
          )}
        </article>
      ))}
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
