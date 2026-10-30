import { useState } from 'react';
import type { LostCrewPodDto } from '@swuniverse/shared';
import { api } from '../../../services/api';

/** "Verschollene Crew": escape pods that hold crew of the player. */
export function LostCrewSection() {
  const [pods, setPods] = useState<LostCrewPodDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    if (pods) {
      setPods(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setPods(await api.get<LostCrewPodDto[]>('/spacecraft/lost-crew'));
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Verschollene Crew nicht verfügbar',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-swu-border bg-swu-surface px-2 py-1.5 text-xs space-y-1">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="text-[10px] font-bold text-swu-accent uppercase hover:underline"
      >
        Verschollene Crew
      </button>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      {pods && pods.length === 0 && (
        <p className="text-[10px] text-swu-muted">
          Keine deiner Crewmitglieder treibt in Rettungskapseln.
        </p>
      )}
      {pods && pods.length > 0 && (
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-left text-swu-muted">
              <th>Kapsel</th>
              <th>Herkunft</th>
              <th>Crew</th>
              <th>Position</th>
            </tr>
          </thead>
          <tbody>
            {pods.map((pod) => (
              <tr key={pod.podId}>
                <td>{pod.displayName}</td>
                <td>{pod.originShipName}</td>
                <td className="font-mono">{pod.crewCount}</td>
                <td className="font-mono">
                  {pod.location
                    ? pod.location.scope === 'SYSTEM'
                      ? `System ${pod.location.systemId} (${pod.location.x}|${pod.location.y})`
                      : `${pod.location.x}|${pod.location.y}`
                    : '?'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
