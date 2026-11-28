import { useState } from 'react';
import type {
  FleetSwitchableSystemKey,
  FleetSystemToggleResultDto,
  SpacecraftAlertState,
} from '@swuniverse/shared';
import { api } from '../../services/api';
import { stripShipNameBbCode } from '@swuniverse/shared';

const SYSTEMS: Array<[FleetSwitchableSystemKey, string, string, string]> = [
  ['SHORT_RANGE_SENSORS', 'kss1', 'kss2', 'Nahbereichssensoren'],
  ['SHIELDS', 'shldac1', 'shldac2', 'Schilde'],
  ['WEAPONS', 'act_phaser1', 'act_phaser2', 'Strahlenwaffen'],
  ['TORPEDO_BANK', 'act_torp1', 'act_torp2', 'Torpedobänke'],
  ['CLOAK', 'tarn1', 'tarn2', 'Tarnung'],
  ['WARPDRIVE', 'warp1', 'warp2', 'Hyperantrieb'],
];

const ALERTS: Array<[SpacecraftAlertState, string, string]> = [
  ['GREEN', 'alert1_1', 'Grün'],
  ['YELLOW', 'alert2_1', 'Gelb'],
  ['RED', 'alert3_1', 'Rot'],
];

/** STU `control_mid.twig` "Flottenkontrolle": fleet-wide switches for the leader. */
export function FleetControlPanel({
  shipId,
  fleetId,
  fleetLeaderId,
  hasWarpdrive,
  inSystem,
  onUpdate,
}: {
  shipId: number;
  fleetId: number | null;
  fleetLeaderId: number | null;
  hasWarpdrive: boolean;
  inSystem: boolean;
  onUpdate: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<string[]>([]);
  if (fleetId == null || fleetLeaderId !== shipId) return null;

  async function run(
    request: () => Promise<Pick<FleetSystemToggleResultDto, 'failed'>>,
  ) {
    setBusy(true);
    try {
      const { failed } = await request();
      setFailures(
        failed.map(({ shipName, reason }) => `${stripShipNameBbCode(shipName)}: ${reason}`),
      );
      onUpdate();
    } catch (err: unknown) {
      setFailures([
        err instanceof Error ? err.message : 'Flottenaktion fehlgeschlagen',
      ]);
    } finally {
      setBusy(false);
    }
  }
  const toggle = (key: FleetSwitchableSystemKey, active: boolean) =>
    run(() =>
      api.patch<FleetSystemToggleResultDto>(
        `/spacecraft/fleets/${fleetId}/systems/${key}`,
        {
          active,
        },
      ),
    );
  const icon = (file: string, title: string, onClick: () => void) => (
    <button
      key={file}
      type="button"
      title={title}
      aria-label={title}
      disabled={busy}
      onClick={onClick}
      className="disabled:opacity-40"
    >
      <img src={`/assets/buttons/${file}.png`} alt="" aria-hidden="true" />
    </button>
  );
  // STU isWarpPossible: hyperdrive present and outside a system.
  const warpPossible = hasWarpdrive && !inSystem;

  return (
    <section
      aria-labelledby="fleet-control-heading"
      className="rounded-lg border border-swu-border bg-swu-surface p-3 text-xs"
    >
      <h3
        id="fleet-control-heading"
        className="mb-2 border-b border-swu-border/60 pb-1 text-center font-bold text-swu-primary"
      >
        <img
          src="/assets/buttons/fleet.png"
          alt=""
          aria-hidden="true"
          className="mr-1 inline align-middle"
        />
        Flottenkontrolle
      </h3>
      <div className="grid grid-cols-[35fr_35fr_15fr] gap-2">
        <div>
          <div className="mb-1 text-swu-muted">Aktivieren</div>
          <div className="flex flex-wrap gap-1">
            {SYSTEMS.filter(([key]) => key !== 'WARPDRIVE' || warpPossible).map(
              ([key, on, , label]) =>
                icon(on, `${label} aktivieren`, () => void toggle(key, true)),
            )}
          </div>
        </div>
        <div>
          <div className="mb-1 text-swu-muted">Deaktivieren</div>
          <div className="flex flex-wrap gap-1">
            {SYSTEMS.map(([key, , off, label]) =>
              icon(off, `${label} deaktivieren`, () => void toggle(key, false)),
            )}
          </div>
        </div>
        <div>
          <div className="mb-1 text-swu-muted">Alarmstufe</div>
          <div className="flex flex-wrap gap-1">
            {ALERTS.map(([alertState, file, label]) =>
              icon(
                file,
                `Flotte: Alarmstufe ${label}`,
                () =>
                  void run(() =>
                    api.patch<Pick<FleetSystemToggleResultDto, 'failed'>>(
                      `/spacecraft/fleets/${fleetId}/alert-state`,
                      { alertState },
                    ),
                  ),
              ),
            )}
          </div>
        </div>
      </div>
      {failures.length > 0 && (
        <ul role="alert" className="mt-2 text-red-300">
          {failures.map((failure) => (
            <li key={failure}>{failure}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
