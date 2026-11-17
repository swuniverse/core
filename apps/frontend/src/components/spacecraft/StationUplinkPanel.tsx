import { useEffect, useState } from 'react';
import type { StationUplinkDto } from '@swuniverse/shared';
import { api } from '../../services/api';

export function StationUplinkPanel({
  shipId,
  refreshKey,
  onUpdate,
}: {
  shipId: number;
  refreshKey: string;
  onUpdate: () => void;
}) {
  const [uplink, setUplink] = useState<StationUplinkDto | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = () =>
    api.get<StationUplinkDto>(`/spacecraft/${shipId}/uplink`).then(setUplink);
  useEffect(() => {
    let cancelled = false;
    void api
      .get<StationUplinkDto>(`/spacecraft/${shipId}/uplink`)
      .then((data) => {
        if (!cancelled) setUplink(data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Uplink-Daten fehlen');
      });
    return () => {
      cancelled = true;
    };
  }, [shipId, refreshKey]);
  async function toggle() {
    if (!uplink) return;
    setPending(true);
    setError(null);
    try {
      await api.patch(`/spacecraft/${shipId}/systems/UPLINK`, {
        active: !uplink.system.active,
      });
      await refresh();
      onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Uplink konnte nicht geschaltet werden',
      );
    } finally {
      setPending(false);
    }
  }
  if (!uplink) return error ? <p role="alert">{error}</p> : null;
  return (
    <section
      aria-label="Kooperationsuplink"
      className="border-b border-swu-border p-2 text-xs text-swu-primary"
    >
      <div>
        Kooperationsuplink · {uplink.system.active ? 'aktiv' : 'inaktiv'} ·{' '}
        {uplink.system.integrity}% · 5 EPS/Tick
      </div>
      <div>
        Eigene Crew: {uplink.ownCrew}/{uplink.crewRequired} ·
        Fremdspielerplätze: {uplink.guests.length}/{uplink.capacity}
      </div>
      <button
        type="button"
        disabled={
          pending ||
          (!uplink.system.active &&
            (uplink.system.integrity <= 0 || !!uplink.activationReason))
        }
        onClick={() => void toggle()}
        className="text-swu-accent disabled:opacity-40"
      >
        Kooperationsuplink{' '}
        {uplink.system.active ? 'deaktivieren' : 'aktivieren'}
      </button>
      {!uplink.system.active && uplink.activationReason && (
        <p>{uplink.activationReason}</p>
      )}
      {uplink.guests.map((guest) => (
        <div key={guest.id}>
          {guest.name} · {guest.ownerName}
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
