import { useEffect, useState } from 'react';
import type { StationAllianceDepotDto } from '@swuniverse/shared';
import { api } from '../../services/api';

export function AllianceDepotPanel({
  stationId,
  refreshKey,
  onChanged,
}: {
  stationId: number;
  refreshKey: number;
  onChanged: () => void;
}) {
  const [data, setData] = useState<StationAllianceDepotDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let current = true;
    setData(null);
    setError(null);
    void api
      .get<StationAllianceDepotDto>(`/spacecraft/${stationId}/alliance-depot`)
      .then((result) => {
        if (current) setData(result);
      })
      .catch((reason: unknown) => {
        if (current)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Depotzuordnung konnte nicht geladen werden',
          );
      });
    return () => {
      current = false;
    };
  }, [stationId, refreshKey]);
  async function change(remove: boolean) {
    setPending(true);
    setError(null);
    try {
      const path = `/spacecraft/${stationId}/alliance-depot`;
      if (remove) await api.delete(path);
      else await api.put(path, {});
      setData(await api.get<StationAllianceDepotDto>(path));
      onChanged();
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Depotzuordnung konnte nicht geändert werden',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="mb-2 border border-swu-border bg-swu-surface p-2 text-xs">
      <h2 className="font-bold text-swu-primary">Allianzdepot</h2>
      <p>
        Präsident und Vize der Allianz sehen Besitzer, Standort und Bestand.
        Eigentum und Lade- oder Steuerungsrechte bleiben bestehen.
      </p>
      {data && (
        <>
          {data.alliance ? (
            <>
              <p>Zugeordnet: {data.alliance.name}</p>
              <button
                type="button"
                disabled={pending}
                className="mt-1 rounded border border-swu-primary px-2 py-1 disabled:opacity-40"
                onClick={() => void change(true)}
              >
                Zuordnung lösen
              </button>
            </>
          ) : (
            <>
              <p>Keiner Allianz zugeordnet.</p>
              {data.blockReason && (
                <p className="text-swu-muted">{data.blockReason}</p>
              )}
              {data.ownAlliance && (
                <button
                  type="button"
                  disabled={pending || !!data.blockReason}
                  className="mt-1 rounded border border-swu-primary px-2 py-1 disabled:opacity-40"
                  onClick={() => void change(false)}
                >
                  Der Allianz {data.ownAlliance.name} zuordnen
                </button>
              )}
            </>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
