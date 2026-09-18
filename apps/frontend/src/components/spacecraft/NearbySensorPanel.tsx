import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  SpacecraftNearbyDto,
  SpacecraftNearbyTargetDto,
  SpacecraftTargetScanDto,
} from '@swuniverse/shared';
import { shipImage } from '../../lib/assets';
import { api } from '../../services/api';
import { useSocket } from '../../hooks/use-socket';
import { WsEventType } from '@swuniverse/shared';
import { TransferDialog } from './TransferDialog';
import { TargetScanDialog } from './TargetScanDialog';
import { NearbyMessageDialog } from './NearbyMessageDialog';
import { CombatReportDialog } from './CombatReportDialog';

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
  } | null>(null);
  const [messageTarget, setMessageTarget] =
    useState<SpacecraftNearbyTargetDto | null>(null);
  const [transfer, setTransfer] = useState<{
    target: SpacecraftNearbyTargetDto;
    direction: 'TO_TARGET' | 'FROM_TARGET';
  } | null>(null);
  const nbsActive = systems?.SHORT_RANGE_SENSORS?.active === true;

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

  useEffect(() => {
    setNearby(null);
    setError(null);
    void refreshNearby();
  }, [locationKey, refreshKey, refreshNearby]);

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

  return (
    <section
      className="mt-2 border border-swu-border bg-swu-surface text-xs"
      aria-labelledby="nearby-sensor-heading"
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
              <tr>
                <td className="border border-swu-border p-1" />
                <td
                  colSpan={4}
                  className="border border-swu-border p-1 text-swu-muted"
                >
                  Einzelschiffe
                </td>
              </tr>
              {nearby?.ships.map((target) => (
                <tr key={target.id}>
                  <td className="border border-swu-border p-1">
                    {target.actions.attack && (
                      <button
                        type="button"
                        onClick={() => void attack(target)}
                        title={`${target.name} angreifen`}
                        className="mr-1"
                      >
                        <img
                          src="/assets/buttons/act_phaser1.png"
                          alt="Angreifen"
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
                    {target.actions.transfer && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setTransfer({ target, direction: 'TO_TARGET' })
                          }
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
                          onClick={() =>
                            setTransfer({ target, direction: 'FROM_TARGET' })
                          }
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
                    {!nearby.actionsAvailable && !target.inHyperspace && (
                      <span className="ml-1 text-swu-muted">
                        Hyperantrieb aktiv
                      </span>
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
                  </td>
                  <td className="border border-swu-border p-1 font-mono">
                    {target.hull}/{target.hullMax}
                    {target.shieldsActive && (
                      <span className="text-cyan-300"> ({target.shields})</span>
                    )}
                  </td>
                  <td className="border border-swu-border p-1">
                    {target.username ?? 'Niemand'}
                  </td>
                </tr>
              ))}
              {(nearby?.ships.length ?? 0) === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="border border-swu-border p-2 text-swu-muted"
                  >
                    Es befinden sich keine Schiffe in diesem Sektor.
                  </td>
                </tr>
              )}
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
        <NearbyMessageDialog
          shipId={shipId}
          target={messageTarget}
          onClose={() => setMessageTarget(null)}
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
  wreck: { id: number; cargo: Array<{ commodityId: number; amount: number }> };
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
        {wreck.cargo.length === 0 ? (
          <p className="text-swu-muted">Keine bergbare Fracht.</p>
        ) : (
          wreck.cargo.map((item) => (
            <div
              key={item.commodityId}
              className="flex items-center gap-2 border-b border-swu-border py-2"
            >
              <span className="flex-1">
                Ware #{item.commodityId}: {item.amount}
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
