import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SpacecraftListDto } from '@swuniverse/shared';
import { shipImage } from '../../lib/assets';
import { api } from '../../services/api';

/** STU `control_right.twig` macro `fleetInfo`. */
export function FleetStatusPanel({
  shipId,
  fleetId,
  fleetLeaderId,
  fleetIsFixed,
  refreshKey,
  onUpdate,
}: {
  shipId: number;
  fleetId: number | null;
  fleetLeaderId: number | null;
  fleetIsFixed: boolean;
  refreshKey: number;
  onUpdate: () => void;
}) {
  const isLeader = fleetId != null && fleetLeaderId === shipId;
  const [members, setMembers] = useState<SpacecraftListDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLeader) return;
    let alive = true;
    void api
      .get<SpacecraftListDto[]>('/spacecraft')
      .then((ships) => {
        if (alive)
          setMembers(
            ships.filter(
              (ship) => ship.fleetId === fleetId && ship.id !== shipId,
            ),
          );
      })
      .catch(() => alive && setMembers([]));
    return () => {
      alive = false;
    };
  }, [isLeader, fleetId, shipId, refreshKey]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Flottenaktion fehlgeschlagen',
      );
    }
  }

  if (fleetId == null) return null;
  const heading =
    'flex items-center gap-1 border-b border-swu-border/60 pb-1 font-bold text-swu-primary';
  if (!isLeader) {
    return (
      <section className="rounded-lg border border-swu-border bg-swu-surface p-3 text-xs">
        {fleetLeaderId != null && (
          <Link
            to={`/spacecraft/${fleetLeaderId}`}
            className={`${heading} border-b-0 pb-0 hover:text-swu-accent`}
          >
            <img src="/assets/buttons/fleet.png" alt="" aria-hidden="true" />
            zum Führungsschiff wechseln
          </Link>
        )}
      </section>
    );
  }
  // STU: the status block needs more ships than the leader.
  if (members.length === 0) return null;
  return (
    <section
      aria-labelledby="fleet-status-heading"
      className="rounded-lg border border-swu-border bg-swu-surface p-3 text-xs"
    >
      <h3 id="fleet-status-heading" className={heading}>
        <img src="/assets/buttons/fleet.png" alt="" aria-hidden="true" />
        <span className="flex-1">Flottenstatus</span>
        <label
          className="flex items-center gap-1 font-normal"
          title="Schiffe gehen nicht verloren"
        >
          <input
            type="checkbox"
            checked={fleetIsFixed}
            onChange={() =>
              void run(() =>
                api.patch(`/spacecraft/fleets/${fleetId}/fixation`, {}),
              )
            }
          />
          fixiert
        </label>
      </h3>
      <ul className="divide-y divide-swu-border/60">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-2 py-1">
            <Link
              to={`/spacecraft/${member.id}`}
              className="w-28 shrink-0 hover:text-swu-accent"
            >
              <img
                src={shipImage(member.shipClassId, member.shipClassKey)}
                alt=""
                aria-hidden="true"
                className="max-h-8"
              />
              <span className="block truncate">{member.name}</span>
            </Link>
            <div className="grid flex-1 grid-cols-2 gap-1">
              <Bar
                icon="modul_1.png"
                label="Hülle"
                current={member.hull}
                max={member.hullMax}
              />
              {member.shieldsMax > 0 && (
                <Bar
                  icon="modul_2.png"
                  label="Schilde"
                  current={member.shields}
                  max={member.shieldsMax}
                />
              )}
              <Bar
                icon="modul_8.png"
                label="Energie"
                current={member.energy}
                max={member.energyMax}
              />
              {member.warpdriveMax > 0 && (
                <Bar
                  icon="modul_11.png"
                  label="Hyperantrieb"
                  current={member.warpdrive}
                  max={member.warpdriveMax}
                />
              )}
            </div>
            <button
              type="button"
              aria-label={`Flottenführung an ${member.name} übergeben`}
              title="Flottenführung wechseln"
              onClick={() =>
                void run(() =>
                  api.patch(`/spacecraft/fleets/${fleetId}/leader`, {
                    leaderId: member.id,
                  }),
                )
              }
            >
              <img
                src="/assets/buttons/fl_flag1.png"
                alt=""
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-1 text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}

function Bar({
  icon,
  label,
  current,
  max,
}: {
  icon: string;
  label: string;
  current: number;
  max: number;
}) {
  const percent = max > 0 ? Math.round((current / max) * 100) : 0;
  return (
    <span
      className="flex items-center gap-1"
      title={`${label}: ${current}/${max}`}
    >
      <img src={`/assets/buttons/${icon}`} alt={label} className="size-4" />
      <span
        className="h-1.5 flex-1 bg-black/50"
        role="meter"
        aria-label={label}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <span
          className={`block h-full ${percent <= 25 ? 'bg-red-500' : percent <= 50 ? 'bg-yellow-400' : 'bg-green-500'}`}
          style={{ width: `${percent}%` }}
        />
      </span>
    </span>
  );
}
