import { ShuttleManagementPanel } from './ShuttleManagementPanel';
import { ResourceConversionPanel } from './ResourceConversionPanel';
import { ResourceCollectionPanel } from './ResourceCollectionPanel';
import { StationUplinkPanel } from './StationUplinkPanel';
import { useEffect, useRef, useState } from 'react';
import type { SpacecraftTrackerDto } from '@swuniverse/shared';
import { commodityImage } from '../../lib/assets';
import { api } from '../../services/api';
import { type RuntimeSystemState } from './ship-system-presentation';

interface ShipControlCenterProps {
  isShuttle?: boolean;
  onLanded?: () => void;
  shipId: number;
  systems: Record<string, RuntimeSystemState> | undefined;
  onUpdate: () => void;
  /** STU `isUnalerted` hides weapon toggles on green alert or without a computer. */
  alertState?: string;
}
type Torpedo = {
  torpedoTypeId: number;
  commodityId: number;
  amount: number;
  name: string;
  isActive: boolean;
};
type TorpedoStorage = {
  capacity: number;
  fireable: Torpedo[];
  transport: Torpedo[];
};
export const SYSTEM_ASSETS: Record<string, string> = {
  EPS: '1.png',
  SUBLIGHT_DRIVE: '2.png',
  REACTOR: '3.png',
  COMPUTER: '4.png',
  WEAPONS: '5.png',
  TORPEDO_BANK: '6.png',
  SPECIAL: '7.png',
  LONG_RANGE_SENSORS: '8.png',
  SHORT_RANGE_SENSORS: '9.png',
  WARPDRIVE: '10.png',
  SHIELDS: '11.png',
  LIFE_SUPPORT: '13.png',
  BEAM_BLOCKER: '22.png',
  SUBSPACE_SCANNER: '18.png',
  TACHYON_SCANNER: '12.png',
  // STU system icon numbers (SpacecraftSystemTypeEnum values).
  DEFLECTOR: '16.png',
  MATRIX_SCANNER: '19.png',
  UPLINK: '24.png',
  ASTROMETRY_LAB: '17.png',
  CLOAK: '7.png',
  TRACTOR_BEAM: '14.png',
  REACTOR_CHARGE_TRANSFER: '34.png',
  HYPERDRIVE_BOOSTER: '33.png',
  HYPERSPACE_COIL: '26.png',
  TRACKER: '27.png',
  RESOURCE_COLLECTOR: '31.png',
  RESOURCE_CONVERTER: '32.png',
  SHUTTLE_RAMP: '21.png',
};

export function ShipControlCenter({
  shipId,
  isShuttle,
  onLanded,
  systems,
  onUpdate,
  alertState,
}: ShipControlCenterProps) {
  const unalerted =
    alertState != null && (alertState === 'GREEN' || !systems?.COMPUTER);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toggleRequest = useRef<number | null>(null);
  const toggleSequence = useRef(0);
  const currentShipId = useRef(shipId);
  if (currentShipId.current !== shipId) {
    currentShipId.current = shipId;
    toggleSequence.current++;
    toggleRequest.current = null;
  }
  const [torpedoes, setTorpedoes] = useState<TorpedoStorage | null>(null);
  const [tracker, setTracker] = useState<SpacecraftTrackerDto | null>(null);
  const [combatReport, setCombatReport] = useState<unknown>(null);
  const loadTorpedoes = () =>
    api
      .get<TorpedoStorage>(`/spacecraft/${shipId}/torpedoes`)
      .then(setTorpedoes)
      .catch(() => setTorpedoes(null));
  const loadTracker = () =>
    api
      .get<SpacecraftTrackerDto | null>(`/spacecraft/${shipId}/tracker`)
      .then(setTracker)
      .catch(() => setTracker(null));
  useEffect(() => {
    setPending(null);
    setError(null);
  }, [shipId]);
  useEffect(() => {
    void loadTorpedoes();
    if (systems?.TRACKER) void loadTracker();
    else setTracker(null);
  }, [shipId, systems?.TRACKER?.active]);
  async function toggle(key: string, active: boolean) {
    if (toggleRequest.current !== null) return;
    const requestShipId = shipId;
    const requestId = ++toggleSequence.current;
    toggleRequest.current = requestId;
    setPending(key);
    setError(null);
    try {
      await api.patch(`/spacecraft/${requestShipId}/systems/${key}`, { active });
      if (currentShipId.current === requestShipId && toggleSequence.current === requestId) onUpdate();
    } catch (err: unknown) {
      if (currentShipId.current === requestShipId && toggleSequence.current === requestId) {
        setError(
          err instanceof Error
            ? err.message
            : 'System konnte nicht umgeschaltet werden',
        );
      }
    } finally {
      if (toggleRequest.current === requestId) {
        toggleRequest.current = null;
        setPending(null);
      }
    }
  }
  async function selectTorpedo(torpedoTypeId: number) {
    try {
      await api.patch(`/spacecraft/${shipId}/torpedoes/active`, {
        torpedoTypeId,
      });
      await loadTorpedoes();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Torpedo konnte nicht gewählt werden',
      );
    }
  }
  const systemRow = (key: 'SHIELDS' | 'WEAPONS') => {
    const state = systems?.[key];
    if (!state) return null;
    const label = key === 'SHIELDS' ? 'Schilde' : 'Strahlenwaffen';
    if (key === 'WEAPONS' && unalerted) return <UnalertedRow key={key} systemKey={key} label={label} />;
    return (
      <button
        key={key}
        type="button"
        disabled={pending !== null}
        onClick={() => void toggle(key, !state.active)}
        className="flex w-full items-center gap-2 border-b border-swu-border px-2 py-1.5 text-left text-swu-primary hover:bg-white/5 disabled:opacity-40"
      >
        <img
          src={`/assets/system/${SYSTEM_ASSETS[key]}`}
          alt=""
          className="size-5"
        />
        {label} {state.active ? 'deaktivieren' : 'aktivieren'}
      </button>
    );
  };
  const torpedoState = systems?.TORPEDO_BANK;
  const laboratory = systems?.ASTROMETRY_LAB;
  const cloak = systems?.CLOAK;
  const trackerSystem = systems?.TRACKER;
  const hyperdriveBooster = systems?.HYPERDRIVE_BOOSTER;
  const scanners = [
    { key: 'SUBSPACE_SCANNER', label: 'Hyperraumfeldscanner', activation: 30, tick: 15 },
    { key: 'TACHYON_SCANNER', label: 'Gravitationswellenscanner', activation: 1, tick: 3 },
  ] as const;
  async function deactivateTracker() {
    setPending('TRACKER');
    setError(null);
    try {
      await api.delete(`/spacecraft/${shipId}/tracker`);
      setTracker(null);
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Peilsender konnte nicht deaktiviert werden');
    } finally {
      setPending(null);
    }
  }
  async function attackTracked() {
    if (!tracker) return;
    setError(null);
    try {
      setCombatReport(
        await api.post('/combat/attack-tracked', {
          attackerId: shipId,
          targetId: tracker.targetId,
        }),
      );
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Angriff fehlgeschlagen');
    }
  }
  async function boostHyperdrive() {
    setPending('HYPERDRIVE_BOOSTER');
    setError(null);
    try {
      await api.post(`/spacecraft/${shipId}/hyperdrive-boost`, {});
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Notladung fehlgeschlagen');
    } finally {
      setPending(null);
    }
  }
  return (
    <section>
      <div className="overflow-hidden rounded-lg border border-swu-border bg-swu-surface text-xs" data-tutorial="ship-systems">
        <h3 className="border-b border-swu-border px-3 py-1 text-center font-bold text-swu-primary">
          Schiffskontrolle
        </h3>
        {(systems?.SHUTTLE_RAMP || isShuttle) && (
          <ShuttleManagementPanel
            shipId={shipId}
            refreshKey={JSON.stringify(systems)}
            onUpdate={onUpdate}
            onLanded={onLanded}
          />
        )}
        {systems?.RESOURCE_CONVERTER && <ResourceConversionPanel shipId={shipId} onUpdate={onUpdate} refreshKey={JSON.stringify(systems)} />}
        {systems?.RESOURCE_COLLECTOR && <ResourceCollectionPanel shipId={shipId} onUpdate={onUpdate} refreshKey={JSON.stringify(systems)} />}
        {systemRow('SHIELDS')}
        {systemRow('WEAPONS')}
        {scanners.map(({ key, label, activation, tick }) => {
          const state = systems?.[key];
          if (!state) return null;
          return (
            <button
              key={key}
              type="button"
              disabled={pending !== null || toggleRequest.current !== null}
              onClick={() => void toggle(key, !state.active)}
              className="flex w-full items-center gap-2 border-b border-swu-border px-2 py-1.5 text-left text-swu-primary hover:bg-white/5 disabled:opacity-40"
            >
              <img src={`/assets/system/${SYSTEM_ASSETS[key]}`} alt="" className="size-5" />
              <span>{label} {state.active ? 'deaktivieren' : 'aktivieren'}</span>
              <span className="ml-auto text-swu-muted">
                {state.active ? `${tick} EPS/Tick` : `${activation} EPS beim Aktivieren · ${tick} EPS/Tick`}
              </span>
            </button>
          );
        })}
        {systems?.UPLINK && <StationUplinkPanel shipId={shipId} refreshKey={JSON.stringify(systems)} onUpdate={onUpdate} />}
        {systems?.BEAM_BLOCKER && (
          <div className="flex items-center gap-2 border-b border-swu-border px-2 py-1.5 text-swu-primary">
            <img src="/assets/system/22.png" alt="" className="size-5" />
            Beamblocker · {systems.BEAM_BLOCKER.active ? 'aktiv' : 'inaktiv'} · {systems.BEAM_BLOCKER.integrity}% · 0 EPS
          </div>
        )}
        {hyperdriveBooster && (
          <button
            type="button"
            disabled={pending !== null || !hyperdriveBooster.active}
            onClick={() => void boostHyperdrive()}
            className="flex w-full items-center gap-2 border-b border-swu-border px-2 py-1.5 text-left text-swu-primary hover:bg-white/5 disabled:opacity-40"
          >
            Hyperantriebs-Notladung auslösen
          </button>
        )}
        {torpedoState && (
          <div className="grid grid-cols-2 border-b border-swu-border">
            {unalerted ? (
              <UnalertedRow systemKey="TORPEDO_BANK" label="Projektilwaffe" bordered />
            ) : (
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void toggle('TORPEDO_BANK', !torpedoState.active)}
              className="flex items-center gap-2 border-r border-swu-border px-2 py-1.5 text-left text-swu-primary hover:bg-white/5 disabled:opacity-40"
            >
              <img
                src={`/assets/system/${SYSTEM_ASSETS.TORPEDO_BANK}`}
                alt=""
                className="size-5"
              />
              Projektilwaffe{' '}
              {torpedoState.active ? 'deaktivieren' : 'aktivieren'}
            </button>
            )}
            <div className="p-1 text-swu-primary">
              {torpedoes?.fireable.length ? (
                torpedoes.fireable.map((torpedo) => (
                  <label
                    key={torpedo.torpedoTypeId}
                    className="flex items-center gap-1"
                  >
                    <input
                      type="radio"
                      checked={torpedo.isActive}
                      onChange={() => void selectTorpedo(torpedo.torpedoTypeId)}
                    />
                    <img
                      src={commodityImage(torpedo.commodityId, torpedo.name)}
                      alt=""
                      className="size-5"
                    />
                    {torpedo.name}: {torpedo.amount}
                  </label>
                ))
              ) : (
                <span className="flex items-center gap-1 text-swu-muted">
                  <img
                    src="/assets/buttons/torp.png"
                    alt=""
                    className="size-5"
                  />
                  keine Torpedos geladen
                </span>
              )}
              {torpedoes?.transport.length ? (
                <div className="mt-1 text-swu-muted">
                  Im Transport:{' '}
                  {torpedoes.transport
                    .map((torpedo) => `${torpedo.name}: ${torpedo.amount}`)
                    .join(', ')}
                </div>
              ) : null}
            </div>
          </div>
        )}
        {laboratory && (
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => void toggle('ASTROMETRY_LAB', !laboratory.active)}
            className="flex w-full items-center gap-2 border-b border-swu-border px-2 py-1.5 text-left text-swu-primary hover:bg-white/5 disabled:opacity-40"
          >
            <img
              src={`/assets/buttons/${laboratory.active ? 'map1.png' : 'map2.png'}`}
              alt=""
              className="size-5 shrink-0 self-center"
            />
            <span className="leading-5">
              Astrometrisches Labor{' '}
              {laboratory.active ? 'deaktivieren' : 'aktivieren'}
            </span>
          </button>
        )}
        {cloak && (
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => void toggle('CLOAK', !cloak.active)}
            className="flex w-full items-center gap-2 border-b border-swu-border px-2 py-1.5 text-left text-swu-primary hover:bg-white/5 disabled:opacity-40"
          >
            <img
              src={`/assets/buttons/${cloak.active ? 'tarn1.png' : 'tarn2.png'}`}
              alt=""
              className="size-5 shrink-0 self-center"
            />
            <span className="leading-5">
              Tarnung {cloak.active ? 'deaktivieren' : 'aktivieren'}
            </span>
          </button>
        )}
        {trackerSystem && (
          <div className="border-b border-swu-border p-2 text-swu-primary">
            <div className="font-bold">Peilsender</div>
            {tracker ? (
              <>
                <p>
                  {tracker.targetName} · {tracker.ticksRemaining} Ticks
                </p>
                <p className="text-swu-muted">
                  {tracker.location
                    ? `${tracker.location.x}|${tracker.location.y} · Feld #${tracker.location.fieldId}`
                    : 'Position unbekannt'}
                </p>
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() => void deactivateTracker()}
                    className="text-swu-accent disabled:opacity-40"
                  >
                    Peilsender deaktivieren
                  </button>
                  <button
                    type="button"
                    onClick={() => void attackTracked()}
                    className="text-swu-accent"
                  >
                    Getracktes Ziel angreifen
                  </button>
                </div>
              </>
            ) : (
              <p className="text-swu-muted">Kein Ziel markiert.</p>
            )}
          </div>
        )}
        {combatReport ? (
          <p className="p-2 text-swu-accent">Angriff abgeschlossen.</p>
        ) : null}
        {error && (
          <p role="alert" className="p-2 text-red-300">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

/** STU `PHASER.twig` / `torpedoAndStorage.twig`: no toggle while unalerted. */
function UnalertedRow({
  systemKey,
  label,
  bordered,
}: {
  systemKey: 'WEAPONS' | 'TORPEDO_BANK';
  label: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={`flex w-full items-center gap-2 px-2 py-1.5 text-swu-muted ${bordered ? 'border-r' : 'border-b'} border-swu-border`}
    >
      <img src={`/assets/system/${SYSTEM_ASSETS[systemKey]}`} alt="" className="size-5 opacity-50" />
      {label} bei Alarmstufe deaktiviert
    </div>
  );
}
