import { useState } from 'react';
import type { SpacecraftDetailDto } from '@swuniverse/shared';
import { OrbitalManagementPanel } from '../../pages/colonies/components/OrbitalManagementPanel';
import { api } from '../../services/api';

const MANAGING_ROLES = ['OUTPOST', 'BASE'];

/** Station ship management: supply of docked ships plus the battery reload switch. */
export function StationShipManagementPanel({ ship }: { ship: SpacecraftDetailDto }) {
  const [reload, setReload] = useState(ship.reloadBattery ?? false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (ship.kind !== 'STATION' || !MANAGING_ROLES.includes(ship.stationRole ?? '')) {
    return null;
  }

  async function toggle(enabled: boolean) {
    setError(null);
    try {
      const result = await api.post<{ reloadBattery: boolean; message: string }>(
        `/spacecraft/${ship.id}/battery-reload`,
        { enabled },
      );
      setReload(result.reloadBattery);
      setMessage(result.message);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Umschalten fehlgeschlagen');
    }
  }

  return (
    <div className="mt-2">
      <label className="flex items-center gap-2 border border-swu-border bg-swu-surface px-3 py-1 text-xs">
        <input
          type="checkbox"
          checked={reload}
          onChange={(event) => void toggle(event.target.checked)}
        />
        Batterie automatisch nachladen
        <span className="text-swu-muted" title="Ersatzbatterie wird aus dem Energieüberschuss geladen">
          (reload)
        </span>
      </label>
      {message && (
        <p role="status" className="px-3 py-1 text-xs text-swu-muted">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="px-3 py-1 text-xs text-red-300">
          {error}
        </p>
      )}
      <OrbitalManagementPanel
        endpoint={`/spacecraft/${ship.id}/ship-management`}
        title="Schiffsmanagement"
        sourceLabel="Stations-EPS"
      />
    </div>
  );
}
