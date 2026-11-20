import { PlayerName } from '../PlayerName';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  SpacecraftBoardingResultDto,
  SpacecraftDockResultDto,
  SpacecraftNearbyDto,
  SpacecraftNearbyFleetDto,
  SpacecraftNearbyTargetDto,
  SpacecraftSalvagePodsResultDto,
  SpacecraftTargetScanDto,
  SpacecraftTakeoverDto,
} from '@swuniverse/shared';
import { shipImage } from '../../lib/assets';
import { api } from '../../services/api';
import { useSocket } from '../../hooks/use-socket';
import { WsEventType } from '@swuniverse/shared';
import { TransferDialog } from './TransferDialog';
import { EpsTransferDialog } from './EpsTransferDialog';
import { TargetScanDialog } from './TargetScanDialog';
import { QuickPmDialog } from '../messaging/QuickPmDialog';
import { CombatReportDialog } from './CombatReportDialog';
import { DockResult } from './DockResult';

export function NearbySensorPanel({
  shipId,
  locationKey,
  refreshKey,
  systems,
  onUpdate,
}: {
  shipId: number;
  locationKey: string;
  refreshKey?: number;
  systems?: Record<string, { active: boolean }>;
  onUpdate: () => void;
}) {
  const [nearby, setNearby] = useState<SpacecraftNearbyDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<SpacecraftTargetScanDto | null>(
    null,
  );
  const [combatReport, setCombatReport] = useState<any>(null);
  const [wreck, setWreck] = useState<{
    id: number;
    hull: number;
    cargo: Array<{ commodityId: number; amount: number }>;
    modules: Array<{ commodityId: number; amount: number }>;
  } | null>(null);
  const [messageTarget, setMessageTarget] =
    useState<SpacecraftNearbyTargetDto | null>(null);
  const [transfer, setTransfer] = useState<{
    target: SpacecraftNearbyTargetDto;
    direction: 'TO_TARGET' | 'FROM_TARGET';
  } | null>(null);
  const [epsTarget, setEpsTarget] = useState<SpacecraftNearbyTargetDto | null>(
    null,
  );
  const [salvageMessage, setSalvageMessage] = useState<string | null>(null);
  const [dockResult, setDockResult] = useState<SpacecraftDockResultDto | null>(
    null,
  );
  const [collapsedFleets, setCollapsedFleets] = useState<Set<number>>(
    () => new Set(),
  );
  const nbsActive = systems?.SHORT_RANGE_SENSORS?.active === true;
  const trackerAvailable = systems?.TRACKER?.active === false;

  const refreshNearby = useCallback(async () => {
    if (!nbsActive) return;
    try {
      setNearby(
        await api.get<SpacecraftNearbyDto>(`/spacecraft/${shipId}/nearby`),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nahbereichsdaten fehlen');
    }
  }, [nbsActive, shipId]);

  const salvagePod = async (podId: number) => {
    setSalvageMessage(null);
    setError(null);
    try {
      const result = await api.post<SpacecraftSalvagePodsResultDto>(
        `/spacecraft/${shipId}/nearby/escape-pods/${podId}/salvage`,
        {},
      );
      setSalvageMessage(result.message);
      onUpdate();
      await refreshNearby();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bergung fehlgeschlagen');
    }
  };

  useEffect(() => {
    setNearby(null);
    setError(null);
    void refreshNearby();
  }, [locationKey, refreshKey, refreshNearby]);

  useEffect(() => {
    const expiresAt = nearby?.tachyonScanExpiresAt;
    if (expiresAt == null) return;
    const timer = setTimeout(
      () => void refreshNearby(),
      Math.max(0, expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [nearby?.tachyonScanExpiresAt, refreshNearby]);

  useSocket(
    WsEventType.SPACECRAFT_VISIBILITY_CHANGED,
    () => void refreshNearby(),
  );

  useSocket(WsEventType.SPACECRAFT_EVENT, (payload) => {
    const event = payload as { shipId?: number; type?: string };
    if (event.type?.startsWith('HYPERSPACE_')) void refreshNearby();
  });

  async function toggleNbs() {
    await api.patch(`/spacecraft/${shipId}/systems/SHORT_RANGE_SENSORS`, {
      active: !nbsActive,
    });
    onUpdate();
  }

  async function dock(path: string) {
    setSalvageMessage(null);
    setDockResult(null);
    setError(null);
    try {
      setDockResult(
        await api.post<SpacecraftDockResultDto>(
          `/spacecraft/${shipId}/${path}`,
          {},
        ),
      );
      await refreshNearby();
      await onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Andocken fehlgeschlagen');
    }
  }

  async function attack(target: SpacecraftNearbyTargetDto) {
    try {
      setCombatReport(
        await api.post('/combat/attack', {
          attackerId: shipId,
          targetId: target.id,
        }),
      );
      await refreshNearby();
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Angriff fehlgeschlagen');
    }
  }

  async function track(target: SpacecraftNearbyTargetDto) {
    setError(null);
    try {
      await api.post(`/spacecraft/${shipId}/tracker/${target.id}`, {});
      onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Markierung fehlgeschlagen',
      );
    }
  }

  async function board(target: SpacecraftNearbyTargetDto) {
    setSalvageMessage(null);
    setError(null);
    try {
      const result = await api.post<SpacecraftBoardingResultDto>(
        `/spacecraft/${shipId}/nearby/${target.id}/board`,
        {},
      );
      setSalvageMessage(result.message);
      await refreshNearby();
      onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Enterversuch fehlgeschlagen',
      );
    }
  }

  async function startTakeover(target: SpacecraftNearbyTargetDto) {
    setError(null);
    try {
      await api.post<SpacecraftTakeoverDto>(
        `/spacecraft/${shipId}/nearby/${target.id}/takeover`,
        {},
      );
      await refreshNearby();
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Übernahme fehlgeschlagen');
    }
  }

  async function cancelTakeover() {
    setError(null);
    try {
      await api.delete(`/spacecraft/${shipId}/takeover`);
      await refreshNearby();
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Abbruch fehlgeschlagen');
    }
  }

  async function intercept(target: SpacecraftNearbyTargetDto) {
    try {
      await api.post(`/spacecraft/${shipId}/nearby/${target.id}/intercept`, {});
      await refreshNearby();
      await onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Hyperraumabfang fehlgeschlagen',
      );
    }
  }

  function toggleFleet(fleetId: number) {
    setCollapsedFleets((current) => {
      const next = new Set(current);
      if (!next.delete(fleetId)) next.add(fleetId);
      return next;
    });
  }

  async function joinFleet(fleetId: number) {
    try {
      await api.post(`/spacecraft/fleets/${fleetId}/join`, { shipId });
      await refreshNearby();
      onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Flottenbeitritt fehlgeschlagen',
      );
    }
  }

  async function activateTractor(target: SpacecraftNearbyTargetDto) {
    setError(null);
    try {
      await api.post(`/spacecraft/${shipId}/nearby/${target.id}/tractor`, {});
      await refreshNearby();
      onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Traktorstrahl fehlgeschlagen',
      );
    }
  }

  async function scan(target: SpacecraftNearbyTargetDto) {
    try {
      const result = await api.post<SpacecraftTargetScanDto>(
        `/spacecraft/${shipId}/nearby/${target.id}/scan`,
        {},
      );
      setScanResult(result);
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scan fehlgeschlagen');
    }
  }

  const ships = nearby?.ships ?? [];
  const fleetIds = new Set(nearby?.fleets?.map((fleet) => fleet.id));
  const stations = ships.filter((target) => target.kind === 'STATION');
  // STU FleetNfsItem: the leader heads the fleet rows.
  const shipsOf = ({ id, leadShipId }: SpacecraftNearbyFleetDto) =>
    ships
      .filter((target) => target.kind !== 'STATION' && target.fleetId === id)
      .sort(
        (a, b) => Number(b.id === leadShipId) - Number(a.id === leadShipId),
      );
  const singleShips = ships.filter(
    (target) =>
      target.kind !== 'STATION' &&
      (target.fleetId == null || !fleetIds.has(target.fleetId)),
  );
  const groupRow = (label: string) => (
    <tr>
      <td className="border border-swu-border p-1" />
      <td colSpan={4} className="border border-swu-border p-1 text-swu-muted">
        {label}
      </td>
    </tr>
  );
  const renderTarget = (target: SpacecraftNearbyTargetDto) => (
    <tr key={target.id}>
      <td className="border border-swu-border p-1">
        {target.actions.dock && (
          <button
            type="button"
            onClick={() => void dock(`dock/${target.id}`)}
            title={`An ${target.name} andocken`}
            className="mr-1"
          >
            <img
              src="/assets/buttons/dock1.png"
              alt={`An ${target.name} andocken`}
              className="inline size-4"
            />
          </button>
        )}
        {(target.actions.attack || target.actions.attackReason) && (
          <button
            type="button"
            onClick={() => void attack(target)}
            title={
              target.actions.attackReason ??
              (target.cloaked
                ? 'Getarntes Ziel angreifen'
                : `${target.name} angreifen`)
            }
            className="mr-1 disabled:opacity-40"
            disabled={!target.actions.attack}
          >
            <img
              src="/assets/buttons/act_phaser1.png"
              alt={target.cloaked ? 'Getarntes Ziel angreifen' : 'Angreifen'}
              className="inline size-4"
            />
          </button>
        )}
        {trackerAvailable &&
          !target.isOwn &&
          !target.inHyperspace &&
          !target.cloaked && (
            <button
              type="button"
              onClick={() => void track(target)}
              title={`${target.name} mit Peilsender markieren`}
              className="mr-1"
            >
              <img
                src="/assets/buttons/mark.png"
                alt="Peilsender"
                className="inline size-4"
              />
            </button>
          )}
        {target.takeover && target.takeover.attackerId === shipId && (
          <span
            className="mr-1 inline-flex items-center gap-1"
            aria-label={`Übernahmefortschritt ${target.takeover.totalTicks - target.takeover.ticksRemaining} von ${target.takeover.totalTicks}`}
          >
            Übernahme{' '}
            {target.takeover.totalTicks - target.takeover.ticksRemaining}/
            {target.takeover.totalTicks}
            <button
              type="button"
              onClick={() => void cancelTakeover()}
              title="Übernahme abbrechen"
            >
              ×
            </button>
          </span>
        )}
        {target.actions.takeover && !target.takeover && (
          <button
            type="button"
            onClick={() => void startTakeover(target)}
            title={`${target.name} übernehmen`}
            className="mr-1"
          >
            Übernehmen
          </button>
        )}
        {target.actions.boarding && (
          <button
            type="button"
            onClick={() => void board(target)}
            title={`${target.name} entern`}
            className="mr-1"
          >
            <img
              src="/assets/buttons/crew.png"
              alt="Entern"
              className="inline size-4"
            />
          </button>
        )}
        {target.actions.intercept && (
          <button
            type="button"
            onClick={() => void intercept(target)}
            title={`${target.name} aus dem Hyperraum zwingen`}
            className="mr-1"
          >
            <img
              src="/assets/buttons/inc1.png"
              alt="Hyperraumabfang"
              className="inline size-4"
            />
          </button>
        )}
        {target.actions.contact && (
          <button
            type="button"
            onClick={() => setMessageTarget(target)}
            title={`Nachricht an ${target.username ?? target.name} verfassen`}
            className="mr-1"
          >
            <img
              src="/assets/buttons/msg1.png"
              alt="Nachricht"
              className="inline size-4"
            />
          </button>
        )}
        {target.actions.scan && (
          <button
            type="button"
            onClick={() => void scan(target)}
            title={`${target.name} scannen`}
          >
            <img
              src="/assets/buttons/lupe1.png"
              alt="Scannen"
              className="inline size-4"
            />
          </button>
        )}
        {target.actions.tractor && (
          <button
            type="button"
            onClick={() => void activateTractor(target)}
            title={`${target.name} mit Traktorstrahl erfassen`}
            className="ml-1"
          >
            <img
              src="/assets/buttons/trak1.png"
              alt="Traktorstrahl"
              className="inline size-4"
            />
          </button>
        )}
        {target.actions.energyTransfer && (
          <button
            type="button"
            onClick={() => setEpsTarget(target)}
            title={`Energie zur ${target.name} transferieren`}
            className="ml-1"
          >
            <img
              src="/assets/buttons/e_trans2.png"
              alt={`Energie zur ${target.name} transferieren`}
              className="inline size-4"
            />
          </button>
        )}
        {target.actions.transfer && (
          <>
            <button
              type="button"
              onClick={() => setTransfer({ target, direction: 'TO_TARGET' })}
              title={`Fracht an ${target.name} übergeben`}
              className="ml-1"
            >
              <img
                src="/assets/buttons/b_down1.png"
                alt={`Fracht an ${target.name} übergeben`}
                className="inline size-4"
              />
            </button>
            <button
              type="button"
              onClick={() => setTransfer({ target, direction: 'FROM_TARGET' })}
              title={`Fracht von ${target.name} übernehmen`}
              className="ml-1"
            >
              <img
                src="/assets/buttons/b_up1.png"
                alt={`Fracht von ${target.name} übernehmen`}
                className="inline size-4"
              />
            </button>
          </>
        )}
        {target.inHyperspace && (
          <span className="ml-1 text-swu-muted">Im Hyperraum</span>
        )}
        {nearby?.actionsAvailable === false && !target.inHyperspace && (
          <span className="ml-1 text-swu-muted">Hyperantrieb aktiv</span>
        )}
      </td>
      <td className="border border-swu-border p-1">
        {target.isOwn ? (
          <Link to={`/spacecraft/${target.id}`}>
            <img
              src={shipImage(target.shipClassId)}
              alt=""
              className="h-6 w-12 object-contain"
            />
          </Link>
        ) : (
          <img
            src={shipImage(target.shipClassId)}
            alt=""
            className="h-6 w-12 object-contain"
          />
        )}
      </td>
      <td className="border border-swu-border p-1 text-swu-primary">
        {target.hasLogBook && (
          <img
            src="/assets/buttons/log.png"
            alt="Logbuch verfügbar"
            title="Logbuch verfügbar"
            className="mr-1 inline size-4"
          />
        )}
        {target.isOwn ? (
          <Link
            to={`/spacecraft/${target.id}`}
            className="hover:text-swu-accent"
          >
            {target.name}
          </Link>
        ) : (
          target.name
        )}
        {target.rpgActive && (
          <img
            src="/assets/buttons/rpg1.png"
            alt="RPG-Modul aktiv"
            title="RPG-Modul aktiv"
            className="ml-1 inline size-4"
          />
        )}
        {target.cloaked && (
          <span className="ml-1 text-swu-muted">Getarnt (aufgedeckt)</span>
        )}
      </td>
      <td className="border border-swu-border p-1 font-mono">
        {target.hull}/{target.hullMax}
        {target.tractored && (
          <span className="ml-1 text-swu-accent">Traktor</span>
        )}
        {target.shieldsActive && (
          <span className="text-cyan-300"> ({target.shields})</span>
        )}
      </td>
      <td className="border border-swu-border p-1">
        <PlayerName name={target.username ?? 'Niemand'} />
      </td>
    </tr>
  );

  return (
    <section
      className="mt-2 border border-swu-border bg-swu-surface text-xs"
      aria-labelledby="nearby-sensor-heading"
      data-tutorial="ship-nearby"
    >
      <h3
        id="nearby-sensor-heading"
        className="border-b border-swu-border text-center font-bold text-swu-primary"
      >
        <button
          type="button"
          onClick={() => void toggleNbs()}
          className="px-3 py-1 hover:text-swu-accent"
        >
          <img
            src={`/assets/buttons/${nbsActive ? 'kss1.png' : 'kss2.png'}`}
            alt=""
            className="mr-1 inline size-4"
          />
          Nahbereichssensoren {nbsActive ? 'deaktivieren' : 'aktivieren'}
        </button>
      </h3>
      {!nbsActive ? (
        <p className="p-2 text-swu-muted">
          Nahbereichssensoren sind nicht aktiv.
        </p>
      ) : (
        <>
          {nearby?.cloakedShipsHint && (
            <p role="status" className="p-2 text-amber-400">
              Es befinden sich getarnte Schiffe in diesem Sektor
            </p>
          )}
          <table className="w-full border-collapse">
            <thead className="text-left text-swu-muted">
              <tr>
                <th className="border border-swu-border p-1">Aktionen</th>
                <th className="border border-swu-border p-1" />
                <th className="border border-swu-border p-1">Name</th>
                <th className="border border-swu-border p-1">Zustand</th>
                <th className="border border-swu-border p-1">Siedler</th>
              </tr>
            </thead>
            <tbody>
              {stations.length > 0 && groupRow('Stationen')}
              {stations.map(renderTarget)}
              {nearby?.fleets?.map((fleet) => {
                const members = shipsOf(fleet);
                const lead = members.find(
                  (target) => target.id === fleet.leadShipId,
                );
                const collapsed = collapsedFleets.has(fleet.id);
                return (
                  <Fragment key={`fleet-${fleet.id}`}>
                    <tr data-testid={`nbs-fleet-${fleet.id}`}>
                      <td className="border border-swu-border p-1 text-swu-muted">
                        {fleet.visibleShips} Schiffe
                        {fleet.canJoin && (
                          <button
                            type="button"
                            onClick={() => void joinFleet(fleet.id)}
                            title="Flotte beitreten"
                            className="ml-1"
                          >
                            <img
                              src="/assets/buttons/fleet.png"
                              alt="Flotte beitreten"
                              className="inline size-4"
                            />
                          </button>
                        )}
                      </td>
                      <td colSpan={3} className="border border-swu-border p-1">
                        {fleet.defending && (
                          <img
                            src="/assets/buttons/defend1.png"
                            alt="verteidigt die Kolonie"
                            title="verteidigt die Kolonie"
                            className="mr-1 inline size-4"
                          />
                        )}
                        {fleet.blocking && (
                          <img
                            src="/assets/buttons/block1.png"
                            alt="blockiert die Kolonie"
                            title="blockiert die Kolonie"
                            className="mr-1 inline size-4"
                          />
                        )}
                        {fleet.isOwn ? (
                          <Link
                            to={`/spacecraft/${fleet.leadShipId}`}
                            className="text-swu-primary hover:text-swu-accent"
                          >
                            {fleet.name}
                          </Link>
                        ) : (
                          <span className="text-swu-primary">{fleet.name}</span>
                        )}{' '}
                        (
                        <button
                          type="button"
                          onClick={() => toggleFleet(fleet.id)}
                          className="text-swu-muted hover:text-swu-accent"
                        >
                          {collapsed ? 'aufklappen' : 'zuklappen'}
                        </button>
                        )
                        {fleet.canDockFleet && (
                          <>
                            {' '}
                            (
                            <button
                              type="button"
                              onClick={() =>
                                void dock(`dock-fleet/${fleet.id}`)
                              }
                              title={`Flotte ${fleet.name} andocken`}
                              className="text-swu-muted hover:text-swu-accent"
                            >
                              andocken
                            </button>
                            )
                          </>
                        )}
                      </td>
                      <td className="border border-swu-border p-1">
                        {collapsed && (
                          <>
                            {lead && !fleet.isOwn && lead.actions.contact && (
                              <button
                                type="button"
                                onClick={() => setMessageTarget(lead)}
                                title={`Nachricht an ${fleet.username ?? fleet.name} verfassen`}
                                className="mr-1"
                              >
                                <img
                                  src="/assets/buttons/msg1.png"
                                  alt="Nachricht"
                                  className="inline size-4"
                                />
                              </button>
                            )}
                            <PlayerName name={fleet.username ?? 'Niemand'} />
                          </>
                        )}
                      </td>
                    </tr>
                    {!collapsed && members.map(renderTarget)}
                  </Fragment>
                );
              })}
              {singleShips.length > 0 && groupRow('Einzelschiffe')}
              {singleShips.map(renderTarget)}
              {(nearby?.ships.length ?? 0) === 0 &&
                !nearby?.cloakedShipsHint && (
                  <tr>
                    <td
                      colSpan={5}
                      className="border border-swu-border p-2 text-swu-muted"
                    >
                      Es befinden sich keine Schiffe in diesem Sektor.
                    </td>
                  </tr>
                )}
              {nearby?.escapePods?.map((pod) => (
                <tr key={`pod-${pod.id}`} data-target-type={pod.targetType}>
                  <td className="border border-swu-border p-1">
                    {pod.canSalvage && nearby.actionsAvailable && (
                      <button
                        type="button"
                        title="Rettungskapseln bergen"
                        onClick={() => salvagePod(pod.id)}
                      >
                        <img
                          src="/assets/buttons/b_up1.png"
                          alt="Rettungskapseln bergen"
                          className="inline size-4"
                        />
                      </button>
                    )}
                  </td>
                  <td className="border border-swu-border p-1">
                    {pod.icon ? (
                      <img
                        src={`${import.meta.env.VITE_ASSET_BASE_URL || '/assets'}/${pod.icon}`}
                        alt={pod.displayName}
                        className="inline size-4"
                      />
                    ) : (
                      '◌'
                    )}
                  </td>
                  <td className="border border-swu-border p-1">
                    {pod.displayName} von {pod.originShipName}
                  </td>
                  <td className="border border-swu-border p-1">
                    {pod.occupantCount} Insassen
                  </td>
                  <td className="border border-swu-border p-1">Niemand</td>
                </tr>
              ))}
              {(nearby?.wrecks.length ?? 0) > 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="border border-swu-border p-1 text-swu-muted"
                  >
                    Trümmerfelder
                  </td>
                </tr>
              )}
              {nearby?.wrecks.map((wreck) => (
                <tr key={wreck.id}>
                  <td className="border border-swu-border p-1">
                    {nearby.actionsAvailable && (
                      <button
                        type="button"
                        onClick={() => setWreck(wreck)}
                        title="Bergung"
                      >
                        <img
                          src="/assets/buttons/b_up1.png"
                          alt="Bergung"
                          className="inline size-4"
                        />
                      </button>
                    )}
                  </td>
                  <td className="border border-swu-border p-1">✹</td>
                  <td className="border border-swu-border p-1">Trümmerfeld</td>
                  <td className="border border-swu-border p-1">{wreck.hull}</td>
                  <td className="border border-swu-border p-1" />
                </tr>
              ))}
            </tbody>
          </table>
          {dockResult && <DockResult result={dockResult} />}
          {salvageMessage && (
            <p role="status" className="p-2 text-swu-muted">
              {salvageMessage}
            </p>
          )}
          {error && (
            <p role="alert" className="p-2 text-red-300">
              {error}
            </p>
          )}
        </>
      )}
      {scanResult && (
        <TargetScanDialog
          result={scanResult}
          onClose={() => setScanResult(null)}
        />
      )}
      {wreck && (
        <WreckSalvageDialog
          shipId={shipId}
          wreck={wreck}
          onClose={() => setWreck(null)}
          onUpdate={onUpdate}
        />
      )}
      {combatReport && (
        <CombatReportDialog
          report={combatReport}
          onClose={() => setCombatReport(null)}
        />
      )}
      {messageTarget && (
        <QuickPmDialog
          recipient={{ name: messageTarget.username ?? messageTarget.name }}
          nearby={{
            shipId,
            targetId: messageTarget.id,
            targetName: messageTarget.name,
          }}
          onClose={() => setMessageTarget(null)}
        />
      )}
      {epsTarget && (
        <EpsTransferDialog
          shipId={shipId}
          target={epsTarget}
          onClose={() => setEpsTarget(null)}
          onTransfer={onUpdate}
        />
      )}
      {transfer && (
        <TransferDialog
          shipId={shipId}
          targetShipId={transfer.target.id}
          targetName={transfer.target.name}
          direction={transfer.direction}
          onClose={() => setTransfer(null)}
          onTransfer={onUpdate}
        />
      )}
    </section>
  );
}

function WreckSalvageDialog({
  shipId,
  wreck,
  onClose,
  onUpdate,
}: {
  shipId: number;
  wreck: {
    id: number;
    cargo: Array<{ commodityId: number; amount: number }>;
    modules: Array<{ commodityId: number; amount: number }>;
  };
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [amounts, setAmounts] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  async function salvage(commodityId: number, available: number) {
    const amount = Math.min(available, amounts[commodityId] ?? 1);
    try {
      await api.post(`/spacecraft/${shipId}/wrecks/${wreck.id}/recover-cargo`, {
        commodityId,
        amount,
      });
      onUpdate();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bergung fehlgeschlagen');
    }
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bergung"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
    >
      <section className="w-full max-w-md border border-swu-border bg-swu-bg p-3 text-xs">
        <header className="mb-2 flex justify-between border-b border-swu-border pb-2">
          <h3 className="font-bold text-swu-primary">Bergung</h3>
          <button type="button" onClick={onClose}>
            Schließen
          </button>
        </header>
        {wreck.cargo.length === 0 && wreck.modules.length === 0 ? (
          <p className="text-swu-muted">Keine bergbare Fracht.</p>
        ) : (
          [
            ...wreck.cargo.map((item) => ({ ...item, kind: 'Ware' })),
            ...wreck.modules.map((item) => ({ ...item, kind: 'Modul' })),
          ].map((item) => (
            <div
              key={`${item.kind}-${item.commodityId}`}
              className="flex items-center gap-2 border-b border-swu-border py-2"
            >
              <span className="flex-1">
                {item.kind} #{item.commodityId}: {item.amount}
              </span>
              <input
                aria-label={`Menge Ware ${item.commodityId}`}
                type="number"
                min={1}
                max={item.amount}
                value={amounts[item.commodityId] ?? 1}
                onChange={(event) =>
                  setAmounts((current) => ({
                    ...current,
                    [item.commodityId]: Math.max(
                      1,
                      Number(event.target.value) || 1,
                    ),
                  }))
                }
                className="w-16 border border-swu-border bg-black px-1"
              />
              <button
                type="button"
                onClick={() => void salvage(item.commodityId, item.amount)}
                className="border border-swu-accent px-2 py-0.5"
              >
                Bergen
              </button>
            </div>
          ))
        )}
        {error && (
          <p role="alert" className="mt-2 text-red-300">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
