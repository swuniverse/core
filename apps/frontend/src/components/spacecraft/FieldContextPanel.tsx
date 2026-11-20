import { OpenSeasonalAnomalyButton } from './OpenSeasonalAnomalyButton';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type {
  CartographyPlanDto,
  SpacecraftBuoyDto,
  SpacecraftDetailDto,
  SpacecraftFieldContextDto,
  SpacecraftRuntimeSystemsDto,
  SpacecraftWormholePassageResultDto,
  SpacecraftOrbitOrderMode,
  SpacecraftOrbitOrderResultDto,
  SpacecraftOrbitOrderStopResultDto,
} from '@swuniverse/shared';
import { PlanetImg } from '../PlanetImg';
import { formatAnomaly } from '../starmap/AnomalyMarker';
import {
  planetThumbnail,
  starTileImage,
  systemTypeImage,
} from '../../lib/assets';
import { api } from '../../services/api';
import { ColonizationDialog } from './ColonizationDialog';
import { TransferDialog } from './TransferDialog';
import { ColonyScanDialog, type ColonyScan } from './ColonyScanDialog';
import { CombatReportDialog } from './CombatReportDialog';

type SectorScanResult = {
  field: {
    x: number;
    y: number;
    fieldType: { id: number; name: string };
    movementEnergyCost: number;
    damage: number;
    specialDamage: number;
    effects: string[];
    celestialObject: {
      name: string | null;
      classId: number | null;
      objectType?: number;
      shielded?: boolean;
    } | null;
  };
  discovery?: {
    discovered: boolean;
    prestigeAwarded: number;
    name: string;
  } | null;
  signatures: Array<{
    id: number;
    spacecraftId: number;
    shipClassId: number | null;
    shipClassName: string | null;
    spacecraftName: string | null;
    fromDirection: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST' | null;
    toDirection: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST' | null;
    isCloaked: boolean;
    createdAt: string;
  }>;
  fadedSignatures: { uncloaked: number; cloaked: number };
  buoys?: SpacecraftBuoyDto[];
};

type SubspaceAnalysisResult = {
  signatureId: number;
  spacecraftId: number;
  spacecraftName: string | null;
  energy: number;
};

export function FieldContextPanel({
  shipId,
  context,
  onUpdate,
  canColonize = false,
  onColonized,
  onLanded,
  runtimeSystems,
}: {
  shipId: number;
  context: SpacecraftFieldContextDto | null;
  onUpdate: () => Promise<void> | void;
  canColonize?: boolean;
  onColonized?: (colonyId: number) => void;
  onLanded?: (colonyId: number) => void;
  runtimeSystems?: SpacecraftRuntimeSystemsDto;
}) {
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState<'TO_SHIP' | 'TO_COLONY' | null>(
    null,
  );
  const [leaving, setLeaving] = useState(false);
  const [scan, setScan] = useState<{
    result: SectorScanResult;
    energyCost: number;
    contextIdentity: string;
  } | null>(null);
  const [scanPending, setScanPending] = useState(false);
  const scanPendingRef = useRef(false);
  const scanRequest = useRef(0);
  const [analysisPendingId, setAnalysisPendingId] = useState<number | null>(null);
  const analysisPendingRef = useRef(false);
  const analysisRequest = useRef(0);
  const [selectedSignatureId, setSelectedSignatureId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<SubspaceAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const contextIdentity = `${shipId}:${context?.starSystem?.id ?? ''}:${context?.region?.id ?? ''}:${context?.coordinates.x ?? ''}:${context?.coordinates.y ?? ''}`;
  const currentContextIdentity = useRef(contextIdentity);
  if (currentContextIdentity.current !== contextIdentity) {
    currentContextIdentity.current = contextIdentity;
    scanRequest.current++;
    analysisRequest.current++;
    scanPendingRef.current = false;
    analysisPendingRef.current = false;
  }
  const [message, setMessage] = useState<{
    colonyName: string;
    message: string | null;
  } | null>(null);
  const [colonyScan, setColonyScan] = useState<ColonyScan | null>(null);
  const [attackSelection, setAttackSelection] = useState(false);
  const [combatReport, setCombatReport] = useState<any | null>(null);
  const [colonizationOpen, setColonizationOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [landing, setLanding] = useState(false);
  const [constructionConfirm, setConstructionConfirm] = useState<'BUILD' | 'REMOVE' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cartography, setCartography] = useState<CartographyPlanDto | null>(
    null,
  );
  const [cartographyLoading, setCartographyLoading] = useState(false);
  const [cartographyDialog, setCartographyDialog] = useState<
    'PLAN' | 'FINALIZE' | null
  >(null);
  const [regionOpen, setRegionOpen] = useState(false);
  const [selectedWormholeId, setSelectedWormholeId] = useState<number | null>(
    null,
  );
  const [enteringWormhole, setEnteringWormhole] = useState(false);
  const [orbitBusy, setOrbitBusy] = useState(false);
  const [buoys, setBuoys] = useState<SpacecraftBuoyDto[]>(context?.buoys ?? []);
  const [buoyDropOpen, setBuoyDropOpen] = useState(false);
  const [buoyText, setBuoyText] = useState('');
  const [buoyError, setBuoyError] = useState<string | null>(null);
  const [buoyBusy, setBuoyBusy] = useState(false);
  const [analysedBuoy, setAnalysedBuoy] = useState<SpacecraftBuoyDto | null>(null);

  useEffect(() => {
    setBuoys(context?.buoys ?? []);
  }, [context]);

  useEffect(() => {
    setScan(null);
    setScanPending(false);
    setAnalysisPendingId(null);
    setSelectedSignatureId(null);
    setAnalysis(null);
    setAnalysisError(null);
  }, [contextIdentity]);

  useEffect(() => {
    setCartographyDialog(null);
    if (!context?.starSystem && !context?.region) {
      setCartography(null);
      setCartographyLoading(false);
      return;
    }
    let current = true;
    setCartography(null);
    setCartographyLoading(true);
    void api
      .get<CartographyPlanDto>(`/spacecraft/${shipId}/cartography`, {
        cache: 'no-store',
      })
      .then((plan) => {
        if (current) setCartography(plan);
      })
      .catch((err: unknown) => {
        if (current) {
          setCartography(null);
          setActionMessage({
            title: 'Kartographie',
            message:
              err instanceof Error
                ? err.message
                : 'Kartographiestatus konnte nicht geladen werden',
          });
        }
      })
      .finally(() => {
        if (current) setCartographyLoading(false);
      });
    return () => {
      current = false;
    };
    // Reload per field so reached measure points show without a manual reload.
  }, [shipId, context?.starSystem?.id, context?.region?.id, context?.coordinates.x, context?.coordinates.y]);

  useEffect(() => {
    const availableIds =
      context?.wormholePassages?.map((passage) => passage.id) ?? [];
    if (!availableIds.includes(selectedWormholeId ?? -1)) {
      setSelectedWormholeId(availableIds[0] ?? null);
    }
  }, [context?.wormholePassages, selectedWormholeId]);

  const localQualified =
    cartography?.status === 'MEASURED'
      ? cartography.actions?.finalize?.available === true
      : cartography?.status === 'PLANNABLE'
        ? cartography.actions?.plan?.available === true
        : false;

  async function confirmCartographyAction() {
    if (cartographyDialog !== 'PLAN' && cartographyDialog !== 'FINALIZE')
      return;
    const finalizing = cartographyDialog === 'FINALIZE';
    try {
      const plan = await api.post<CartographyPlanDto>(
        `/spacecraft/${shipId}/cartography${finalizing ? '/finalize' : ''}`,
        {},
      );
      setCartography(plan);
      setCartographyDialog(null);
      await onUpdate();
    } catch (err: unknown) {
      setCartographyDialog(null);
      setActionMessage({
        title: 'Kartographie',
        message:
          err instanceof Error
            ? err.message
            : 'Kartographieaktion fehlgeschlagen',
      });
    }
  }

  async function confirmConstruction() {
    if (!constructionConfirm) return;
    try {
      if (constructionConfirm === 'BUILD') {
        await api.post(`/spacecraft/${shipId}/construction`, {});
      } else if (context?.construction?.station) {
        await api.delete(`/spacecraft/${context.construction.station.id}/construction`);
      }
      setConstructionConfirm(null);
      await onUpdate();
    } catch (err: unknown) {
      setConstructionConfirm(null);
      setActionMessage({
        title: 'Stationsbau',
        message: err instanceof Error ? err.message : 'Stationsaktion fehlgeschlagen',
      });
    }
  }

  /** Starts or ends the fleet-wide orbit order; the server decides availability. */
  async function changeOrbitOrder(mode: SpacecraftOrbitOrderMode | null) {
    setOrbitBusy(true);
    try {
      const result = mode
        ? await api.post<SpacecraftOrbitOrderResultDto>(`/spacecraft/${shipId}/orbit-order`, { mode })
        : await api.delete<SpacecraftOrbitOrderStopResultDto>(`/spacecraft/${shipId}/orbit-order`);
      setActionMessage({ title: 'Orbitauftrag', message: result.message });
    } catch (err: unknown) {
      setActionMessage({
        title: 'Orbitauftrag',
        message: err instanceof Error ? err.message : 'Orbitauftrag fehlgeschlagen',
      });
    } finally {
      setOrbitBusy(false);
      await onUpdate();
    }
  }

  async function scanSector() {
    if (scanPendingRef.current) return;
    const requestShipId = shipId;
    const requestIdentity = contextIdentity;
    const requestId = ++scanRequest.current;
    analysisRequest.current++;
    analysisPendingRef.current = false;
    setAnalysisPendingId(null);
    scanPendingRef.current = true;
    setScanPending(true);
    setScan(null);
    setError(null);
    setAnalysis(null);
    setSelectedSignatureId(null);
    setAnalysisError(null);
    try {
      const result = await api.post<{
        result: SectorScanResult;
        energyCost: number;
      }>(`/spacecraft/${requestShipId}/sector-scan`, {});
      if (currentContextIdentity.current === requestIdentity && scanRequest.current === requestId) {
        setScan({ ...result, contextIdentity: requestIdentity });
        void onUpdate();
      }
    } catch (err: unknown) {
      if (currentContextIdentity.current === requestIdentity && scanRequest.current === requestId) {
        setActionMessage({
          title: 'Sektor-Scan',
          message:
            err instanceof Error ? err.message : 'Sektor-Scan fehlgeschlagen',
        });
      }
    } finally {
      if (scanRequest.current === requestId) {
        scanPendingRef.current = false;
        setScanPending(false);
      }
    }
  }

  async function analyzeSubspace(signatureId: number) {
    if (analysisPendingRef.current || !scan || !canAnalyzeSubspace(runtimeSystems)) return;
    const requestIdentity = contextIdentity;
    const requestShipId = shipId;
    const requestId = ++analysisRequest.current;
    analysisPendingRef.current = true;
    setAnalysisPendingId(signatureId);
    setSelectedSignatureId(signatureId);
    setAnalysis(null);
    setAnalysisError(null);
    try {
      const result = await api.post<SubspaceAnalysisResult>(
        `/spacecraft/${requestShipId}/subspace-analysis/${signatureId}`,
        {},
      );
      if (currentContextIdentity.current === requestIdentity && analysisRequest.current === requestId) {
        setAnalysis(result);
        void onUpdate();
      }
    } catch (err: unknown) {
      if (currentContextIdentity.current === requestIdentity && analysisRequest.current === requestId) {
        setAnalysisError(err instanceof Error ? err.message : 'Subraumanalyse fehlgeschlagen');
      }
    } finally {
      if (analysisRequest.current === requestId) {
        analysisPendingRef.current = false;
        setAnalysisPendingId(null);
      }
    }
  }

  // The page only reloads the field context on movement, so buoys are refreshed here.
  async function reloadBuoys() {
    const fresh = await api.get<SpacecraftFieldContextDto>(
      `/spacecraft/${shipId}/field-context`,
      { cache: 'no-store' },
    );
    const next = fresh?.buoys ?? [];
    setBuoys(next);
    setScan((current) =>
      current && { ...current, result: { ...current.result, buoys: next } },
    );
  }

  async function dropBuoy() {
    setBuoyBusy(true);
    setBuoyError(null);
    try {
      await api.post(`/spacecraft/${shipId}/buoys`, { text: buoyText.trim() });
      setBuoyDropOpen(false);
      setBuoyText('');
      await Promise.all([reloadBuoys(), onUpdate()]);
    } catch (err: unknown) {
      setBuoyError(err instanceof Error ? err.message : 'Boje konnte nicht gesetzt werden');
    } finally {
      setBuoyBusy(false);
    }
  }

  async function pickUpBuoy(buoyId: number) {
    setBuoyBusy(true);
    try {
      await api.post(`/spacecraft/${shipId}/buoys/${buoyId}/pick-up`, {});
      await Promise.all([reloadBuoys(), onUpdate()]);
    } catch (err: unknown) {
      setActionMessage({
        title: 'Boje aufbringen',
        message: err instanceof Error ? err.message : 'Boje konnte nicht aufgebracht werden',
      });
    } finally {
      setBuoyBusy(false);
    }
  }

  function closeSectorScan() {
    analysisRequest.current++;
    analysisPendingRef.current = false;
    setAnalysisPendingId(null);
    setScan(null);
  }
  async function scanColony() {
    if (!context?.colony) return;
    setError(null);
    try {
      setColonyScan(
        await api.post<ColonyScan>(`/spacecraft/${shipId}/colony-scan`, {
          colonyId: context.colony.id,
        }),
      );
      onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Kolonie-Scan fehlgeschlagen',
      );
    }
  }

  async function openColonyAttack() {
    if (!context?.colony?.canAttack) return;
    setError(null);
    try {
      setColonyScan(
        await api.post<ColonyScan>(`/spacecraft/${shipId}/colony-scan`, {
          colonyId: context.colony.id,
        }),
      );
      setAttackSelection(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kolonieoberfläche nicht verfügbar');
    }
  }

  async function attackColonyField(fieldIndex: number) {
    if (!context?.colony) return;
    setError(null);
    try {
      setCombatReport(
        await api.post('/combat/attack-colony', {
          attackerId: shipId,
          colonyId: context.colony.id,
          fieldIndex,
        }),
      );
      setColonyScan(null);
      setAttackSelection(false);
      await onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kolonieangriff fehlgeschlagen');
    }
  }

  async function showMessage() {
    if (!context?.colony) return;
    setError(null);
    try {
      setMessage(
        await api.get<{ colonyName: string; message: string | null }>(
          `/spacecraft/${shipId}/communications/colony-message?colonyId=${context.colony.id}`,
        ),
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Koloniebotschaft nicht verfügbar',
      );
    }
  }

  async function landShip() {
    if (!context?.colony?.canLand || landing) return;
    setLanding(true);
    setError(null);
    try {
      await api.post(`/colonies/${context.colony.id}/ships/${shipId}/land`, {});
      onLanded?.(context.colony.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Landen fehlgeschlagen');
      setLanding(false);
    }
  }
  async function enterWormhole() {
    if (selectedWormholeId == null || enteringWormhole) return;
    setEnteringWormhole(true);
    setError(null);
    let result: SpacecraftWormholePassageResultDto;
    try {
      result = await api.post<SpacecraftWormholePassageResultDto>(
        `/spacecraft/${shipId}/wormhole/enter`,
        { wormholeId: selectedWormholeId },
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Wurmlochpassage fehlgeschlagen',
      );
      setEnteringWormhole(false);
      return;
    }
    try {
      await onUpdate();
      const ship = await api.get<SpacecraftDetailDto>(`/spacecraft/${shipId}`, {
        cache: 'no-store',
      });
      const location = ship.location;
      const layerId = location.layerId;
      const x =
        location.scope === 'GALAXY' ? location.x : location.galaxyX;
      const y =
        location.scope === 'GALAXY' ? location.y : location.galaxyY;
      if (layerId != null && x != null && y != null) {
        navigate(`/starmap?layer=${layerId}&x=${x}&y=${y}`);
      } else {
        setError(
          `Passage abgeschlossen (Position ${result.locationId}), Kartenposition konnte nicht ermittelt werden.`,
        );
      }
    } catch (err: unknown) {
      setError(
        `Passage abgeschlossen, aber die bestätigte Schiffsposition konnte nicht geladen werden: ${err instanceof Error ? err.message : 'unbekannter Fehler'}`,
      );
    } finally {
      setEnteringWormhole(false);
    }
  }

  async function enterSystem() {
    setLeaving(true);
    setError(null);
    try {
      await api.post(`/spacecraft/${shipId}/enter-system`, {});
      await onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'System konnte nicht betreten werden',
      );
    } finally {
      setLeaving(false);
    }
  }

  async function leaveSystem() {
    setLeaving(true);
    setError(null);
    try {
      await api.post(`/spacecraft/${shipId}/leave-system`, {});
      await onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'System konnte nicht verlassen werden',
      );
    } finally {
      setLeaving(false);
    }
  }

  if (!context)
    return error ? (
      <section className="space-y-3 text-xs">
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      </section>
    ) : null;
  return (
    <section className="space-y-3 text-xs">
      <div className="border border-swu-border bg-swu-surface">
        <div className="grid grid-cols-2 border-b border-swu-border">
          <h3 className="px-3 py-1 text-center font-bold text-swu-primary">
            Informationen
          </h3>
          <h3 className="border-l border-swu-border px-3 py-1 text-center font-bold text-swu-primary">
            Sternensystem
          </h3>
        </div>
        <div className="grid grid-cols-2">
          <div className="space-y-2 p-2">
            <button
              type="button"
              disabled={scanPending}
              onClick={() => void scanSector()}
              className="inline-flex items-center gap-1 text-swu-primary hover:text-swu-accent disabled:opacity-40"
            >
              <img src="/assets/buttons/lupe1.png" alt="" className="size-5" />
              {scanPending ? 'Sektor-Scan läuft …' : `Sektor ${context.coordinates.x}|${context.coordinates.y} scannen`}
            </button>
            <button
              type="button"
              onClick={() => {
                setBuoyError(null);
                setBuoyDropOpen(true);
              }}
              className="block text-swu-primary hover:text-swu-accent"
            >
              Boje setzen
            </button>
            {context.wormholePassages?.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="wormhole-passage" className="text-swu-muted">
                  Wurmlochpassage
                </label>
                <select
                  id="wormhole-passage"
                  value={selectedWormholeId ?? ''}
                  disabled={enteringWormhole}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setSelectedWormholeId(Number(event.target.value))
                  }
                  className="max-w-full border border-swu-border bg-swu-bg px-1 py-0.5 text-swu-primary"
                >
                  {context.wormholePassages.map((passage) => (
                    <option key={passage.id} value={passage.id}>
                      {passage.name ?? `Wurmloch ${passage.id}`} — {passage.targetLayer.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={selectedWormholeId == null || enteringWormhole}
                  onClick={() => void enterWormhole()}
                  className="text-swu-primary hover:text-swu-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {enteringWormhole ? 'Wurmlochpassage läuft…' : 'Wurmloch betreten'}
                </button>
              </div>
            )}
            {context.region && (
              <button
                type="button"
                onClick={() => setRegionOpen(true)}
                className="block text-swu-primary hover:text-swu-accent hover:underline"
              >
                Region: {context.region.name}
              </button>
            )}
            {context.adminRegion && !context.region && (
              <span className="block text-swu-muted">
                Verwaltungsregion: {context.adminRegion.name}
              </span>
            )}
            {context.anomalies?.map((anomaly, index) => (
              <span
                key={`${anomaly.type}-${index}`}
                className="block text-fuchsia-300"
              >
                Anomalie: {formatAnomaly(anomaly)}
                <OpenSeasonalAnomalyButton shipId={shipId} anomaly={anomaly} onUpdate={onUpdate} />
              </span>
            ))}
            {(context.starSystem || context.region) && (
              <CartographyStatus
                plan={cartography}
                loading={cartographyLoading}
                qualified={localQualified}
                onPlan={() => setCartographyDialog('PLAN')}
                onFinalize={() => setCartographyDialog('FINALIZE')}
              />
            )}
          </div>
          <div className="border-l border-swu-border p-2">
            {context.starSystem ? (
              <div className="flex flex-col items-start gap-1">
                <Link
                  to={`/database/systems/${context.starSystem.id}`}
                  className="text-swu-primary hover:text-swu-accent hover:underline"
                >
                  ✦ {context.starSystem.name}
                </Link>
                <button
                  type="button"
                  disabled={leaving || !context.starSystem.canLeave}
                  title={context.starSystem.leaveReason ?? undefined}
                  onClick={() => void leaveSystem()}
                  className="inline-flex items-center gap-1 text-swu-muted hover:text-swu-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <img
                    src="/assets/buttons/sysleave1.png"
                    alt=""
                    className="size-5"
                  />
                  System verlassen
                </button>
              </div>
            ) : context.information.entrySystem ? (
              <>
                <div className="flex items-center gap-1 text-swu-primary">
                  {context.information.entrySystem.systemTypeId != null && (
                    <img
                      src={systemTypeImage(
                        context.information.entrySystem.systemTypeId,
                      )}
                      alt=""
                      className="size-5 object-contain"
                    />
                  )}
                  {context.information.entrySystem.name}
                </div>
                <button
                  type="button"
                  disabled={leaving}
                  onClick={() => void enterSystem()}
                  className="inline-flex items-center gap-1 text-swu-muted hover:text-swu-accent disabled:opacity-40"
                >
                  <img
                    src="/assets/buttons/sysenter1.png"
                    alt=""
                    className="size-5"
                  />
                  einfliegen
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {buoys.length > 0 && (
        <BuoyTable
          buoys={buoys}
          busy={buoyBusy}
          onPickUp={(buoyId) => void pickUpBuoy(buoyId)}
          onAnalyse={setAnalysedBuoy}
        />
      )}
      {context.information.colonizationTarget && (
        <div className="border border-swu-border bg-swu-surface">
          <h3 className="border-b border-swu-border px-3 py-1 text-center font-bold text-swu-primary">
            {context.information.colonizationTarget.name ??
              'Unbekannter Himmelskörper'}
          </h3>
          <div className="grid grid-cols-2">
            <span className="inline-flex items-center gap-1 p-2 text-swu-primary">
              {context.information.colonizationTarget.classId != null && (
                <img
                  src={planetThumbnail(
                    context.information.colonizationTarget.classId,
                  )}
                  alt=""
                  className="size-4 object-contain"
                />
              )}
              {context.information.colonizationTarget.className ??
                'Unbekannter Himmelskörper'}
            </span>
            {canColonize &&
            context.information.colonizationTarget.isColonizable ? (
              <button
                type="button"
                onClick={() => setColonizationOpen(true)}
                className="inline-flex items-center gap-1 border-l border-swu-border p-2 text-left text-swu-muted hover:text-swu-accent"
              >
                {context.information.colonizationTarget.classId != null && (
                  <img
                    src={planetThumbnail(
                      context.information.colonizationTarget.classId,
                    )}
                    alt=""
                    className="size-4 object-contain"
                  />
                )}
                {context.information.colonizationTarget.isAbandoned
                  ? 'Ruinen übernehmen'
                  : 'Kolonie gründen'}
              </button>
            ) : (
              <span className="border-l border-swu-border p-2" />
            )}
          </div>
        </div>
      )}
      {context.construction && (
        <div className="border border-swu-border bg-swu-surface p-2 text-sm">
          {context.construction.station ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-swu-primary">Station: {context.construction.station.name}</span>
              {context.construction.station.isOwn && (
                <button type="button" onClick={() => setConstructionConfirm('REMOVE')} className="text-red-300 hover:text-red-200">
                  Konstrukt entfernen
                </button>
              )}
            </div>
          ) : context.construction.canBuild ? (
            <button type="button" onClick={() => setConstructionConfirm('BUILD')} className="text-swu-primary hover:text-swu-accent">
              Konstrukt errichten
            </button>
          ) : null}
        </div>
      )}
      {context.orbitOrder && (
        <div className="border border-swu-border bg-swu-surface p-2 text-sm" aria-label="Orbitauftrag">
          <h3 className="mb-1 font-bold text-swu-primary">Orbitauftrag</h3>
          <p className="mb-2 text-xs text-swu-muted">
            {context.orbitOrder.order
              ? `Die Flotte ${context.orbitOrder.order.mode === 'DEFEND' ? 'verteidigt' : 'blockiert'} ${context.orbitOrder.order.colonyName}.`
              : 'Die Flotte hat keinen Orbitauftrag.'}
          </p>
          <div className="flex flex-wrap gap-3">
            {(context.orbitOrder.order
              ? [
                  {
                    label: context.orbitOrder.order.mode === 'DEFEND' ? 'Verteidigung beenden' : 'Blockade beenden',
                    action: context.orbitOrder.stop,
                    mode: null,
                  },
                ]
              : [
                  { label: 'Kolonie verteidigen', action: context.orbitOrder.defend, mode: 'DEFEND' as const },
                  { label: 'Kolonie blockieren', action: context.orbitOrder.blockade, mode: 'BLOCKADE' as const },
                ]
            ).map(({ label, action, mode }) => (
              <div key={label} className="flex flex-col">
                <button
                  type="button"
                  disabled={!action.available || orbitBusy}
                  title={action.reason ?? undefined}
                  onClick={() => void changeOrbitOrder(mode)}
                  className="text-left text-swu-primary hover:text-swu-accent disabled:cursor-not-allowed disabled:text-swu-muted"
                >
                  {label}
                </button>
                {!action.available && action.reason && (
                  <span className="text-[11px] text-swu-muted">{action.reason}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {context.colony && (
        <div className="border border-swu-border bg-swu-surface">
          <h3 className="border-b border-swu-border px-3 py-1 text-center font-bold text-swu-primary">
            {context.colony.planetName}
          </h3>
          <div className="grid grid-cols-2">
            <div className="space-y-1 p-2">
              <div className="flex items-center gap-1">
                {context.colony.classId != null && (
                  <img
                    src={planetThumbnail(context.colony.classId)}
                    alt=""
                    className="size-4 object-contain"
                  />
                )}
                {context.colony.isOwn ? (
                  <Link
                    to={`/colonies?selected=${context.colony.id}`}
                    className="text-swu-primary hover:text-swu-accent"
                  >
                    {context.colony.name}
                  </Link>
                ) : (
                  <span className="text-swu-primary">
                    {context.colony.name}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void showMessage()}
                title="Koloniebotschaft anzeigen"
                className="border border-swu-border px-1 text-swu-primary"
              >
                ?
              </button>
            </div>
            <div className="flex items-start gap-2 border-l border-swu-border p-2">
              {context.colony.canSurfaceScan && (
                <button
                  type="button"
                  onClick={() => void scanColony()}
                  title="Kolonieoberfläche scannen"
                  className="inline-flex items-center gap-1 text-swu-muted hover:text-swu-accent"
                >
                  <img
                    src="/assets/buttons/lupe1.png"
                    alt=""
                    className="size-5"
                  />
                  Scannen
                </button>
              )}
              <button
                type="button"
                onClick={() => setTransfer('TO_COLONY')}
                title="Zur Kolonie beamen"
              >
                <img
                  src="/assets/buttons/b_down1.png"
                  alt="Entladen"
                  className="size-5"
                />
              </button>
              <button
                type="button"
                onClick={() => setTransfer('TO_SHIP')}
                title="Von der Kolonie beamen"
              >
                <img
                  src="/assets/buttons/b_up1.png"
                  alt="Verladen"
                  className="size-5"
                />
              </button>
              {!context.colony.isOwn && (
                <button
                  type="button"
                  disabled={!context.colony.canAttack}
                  title={context.colony.attackReason ?? undefined}
                  onClick={() => void openColonyAttack()}
                  className="px-1 text-red-300 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Kolonie angreifen
                </button>
              )}
              {context.colony.canLand && (
                <button
                  type="button"
                  disabled={landing}
                  onClick={() => void landShip()}
                  title="Schiff auf der Kolonie landen"
                  className="px-1 text-swu-muted hover:text-swu-accent disabled:opacity-40"
                >
                  Landen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {colonizationOpen && context.information.colonizationTarget && (
        <ColonizationDialog
          shipId={shipId}
          celestialObjectId={
            context.information.colonizationTarget.celestialObjectId
          }
          planetName={context.information.colonizationTarget.name}
          isRuins={context.information.colonizationTarget.isAbandoned}
          onClose={() => setColonizationOpen(false)}
          onColonized={(colonyId) => onColonized?.(colonyId)}
        />
      )}
      {constructionConfirm && (
        <Dialog title="Stationsbau" label="Stationsbau bestätigen" onClose={() => setConstructionConfirm(null)}>
          <p>
            {constructionConfirm === 'BUILD'
              ? 'Konstrukt für 5 Workbees, 100 Doonium und 50 Durastahl-Legierung errichten?'
              : 'Konstrukt entfernen und angedockte Workbees freigeben?'}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setConstructionConfirm(null)}>Abbrechen</button>
            <button type="button" onClick={() => void confirmConstruction()} className="text-swu-primary">Bestätigen</button>
          </div>
        </Dialog>
      )}
      {cartographyDialog && (
        <CartographyDialog
          mode={cartographyDialog}
          region={cartography?.targetType === 'REGION'}
          onClose={() => setCartographyDialog(null)}
          onConfirm={() => void confirmCartographyAction()}
        />
      )}
      {scan?.contextIdentity === contextIdentity && (
        <SectorScanDialog
          scan={scan}
          runtimeSystems={runtimeSystems}
          analysis={analysis}
          analysisError={analysisError}
          analysisPendingId={analysisPendingId}
          selectedSignatureId={selectedSignatureId}
          onAnalyze={(signatureId) => void analyzeSubspace(signatureId)}
          onClose={closeSectorScan}
          buoyBusy={buoyBusy}
          onPickUpBuoy={(buoyId) => void pickUpBuoy(buoyId)}
          onAnalyseBuoy={setAnalysedBuoy}
        />
      )}
      {buoyDropOpen && (
        <Dialog title="Boje setzen" label="Boje setzen" onClose={() => setBuoyDropOpen(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void dropBuoy();
            }}
            className="space-y-2"
          >
            <label className="grid gap-1">
              Botschaft (1–60 Zeichen)
              <input
                value={buoyText}
                maxLength={60}
                onChange={(event) => setBuoyText(event.target.value)}
                className="border border-swu-border bg-swu-bg px-1 py-0.5 text-swu-primary"
              />
            </label>
            <p className="text-swu-muted">Verbraucht eine Sondenboje und 1 EPS.</p>
            {buoyError && (
              <p role="alert" className="text-red-300">
                {buoyError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setBuoyDropOpen(false)}>
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={buoyBusy || buoyText.trim().length === 0}
                className="text-swu-primary disabled:opacity-40"
              >
                Setzen
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {regionOpen && context.region && (
        <Dialog
          title={context.region.name}
          label="Regionsinfo"
          onClose={() => setRegionOpen(false)}
        >
          <p className="whitespace-pre-wrap text-swu-muted">
            {context.region.description ?? 'Keine Beschreibung vorhanden.'}
          </p>
          {context.adminRegion && (
            <p className="mt-2">
              Verwaltungsregion: {context.adminRegion.name}
            </p>
          )}
          <Link
            to="/database?view=regions"
            className="mt-3 inline-block text-swu-primary hover:text-swu-accent hover:underline"
          >
            Datenbankeintrag öffnen
          </Link>
        </Dialog>
      )}
      {actionMessage && (
        <Dialog
          title={actionMessage.title}
          label={actionMessage.title}
          onClose={() => setActionMessage(null)}
        >
          <p>{actionMessage.message}</p>
        </Dialog>
      )}
      {analysedBuoy && (
        <Dialog title="Bojenanalyse" label="Bojenanalyse" onClose={() => setAnalysedBuoy(null)}>
          <p className="whitespace-pre-wrap">{analysedBuoy.text}</p>
          <p className="mt-2">
            Besitzer: <span className="text-swu-primary">{analysedBuoy.ownerName}</span>
          </p>
        </Dialog>
      )}
      {colonyScan && (
        <ColonyScanDialog
          scan={colonyScan}
          onClose={() => {
            setColonyScan(null);
            setAttackSelection(false);
          }}
          onAttack={attackSelection ? (fieldIndex) => void attackColonyField(fieldIndex) : undefined}
        />
      )}
      {combatReport && (
        <CombatReportDialog
          report={combatReport}
          onClose={() => setCombatReport(null)}
        />
      )}
      {message && (
        <Dialog
          title={message.colonyName}
          label="Koloniebotschaft"
          onClose={() => setMessage(null)}
        >
          <p className="whitespace-pre-wrap">
            {message.message ?? 'Keine Koloniebotschaft hinterlegt.'}
          </p>
        </Dialog>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
      {transfer && context.colony && (
        <TransferDialog
          shipId={shipId}
          colonyId={context.colony.id}
          colonyName={context.colony.name}
          direction={transfer}
          onClose={() => setTransfer(null)}
          onTransfer={onUpdate}
        />
      )}
    </section>
  );
}

function CartographyStatus({
  plan,
  loading,
  qualified,
  onPlan,
  onFinalize,
}: {
  plan: CartographyPlanDto | null;
  loading: boolean;
  qualified: boolean;
  onPlan: () => void;
  onFinalize: () => void;
}) {
  if (loading)
    return <span className="text-swu-muted">Kartographie wird geladen…</span>;
  if (!plan) return null;
  if (plan.status === 'NONE') return null;
  const region = plan.targetType === 'REGION';
  if (plan.status === 'PLANNABLE') {
    if (qualified)
      return (
        <button
          type="button"
          onClick={onPlan}
          className="text-swu-primary hover:text-swu-accent"
        >
          {region ? 'Region kartographieren' : 'Kartographie planen'}
        </button>
      );
    return region ? (
      <span className="text-swu-muted">
        Region nicht kartographiert
        {plan.actions.plan.reason ? `: ${plan.actions.plan.reason}` : ''}
      </span>
    ) : (
      <span className="text-swu-muted">System nicht kartographiert</span>
    );
  }
  if (plan.status === 'PLANNED')
    return (
      <div className="flex min-h-5 items-center gap-1 text-swu-muted">
        <img
          src="/assets/buttons/map2.png"
          alt=""
          className="size-5 shrink-0"
        />
        {region ? 'Regionskartographie – verbleibende Messpunkte' : 'Verbleibende Messpunkte'}:{' '}
        {plan.remainingFieldIds.length}
      </div>
    );
  if (plan.status === 'MEASURED')
    return (
      <div className="flex flex-wrap gap-x-2">
        <span className="text-swu-muted">Messpunkte abgeschlossen</span>
        {qualified && (
          <button
            type="button"
            onClick={onFinalize}
            className="text-swu-primary hover:text-swu-accent"
          >
            {region ? 'Regionskartographie finalisieren' : 'Kartographie finalisieren'}
          </button>
        )}
      </div>
    );
  if (plan.status === 'FINISHING')
    return (
      <div className="flex min-h-5 items-center gap-1 whitespace-nowrap text-swu-muted">
        <img
          src="/assets/buttons/map2.png"
          alt=""
          className="size-5 shrink-0"
        />
        {region ? 'Regionskartographie' : 'Kartographie'}: {plan.finalizationTick ?? 0}/3
      </div>
    );
  if (plan.status === 'DONE' && plan.completionOutcome === 'INVALIDATED')
    return (
      <span className="text-swu-muted">
        Kartographie ohne Belohnung beendet
      </span>
    );
  if (plan.status === 'DONE')
    return (
      <div className="flex min-h-5 items-center gap-1 whitespace-nowrap text-swu-primary">
        <img
          src="/assets/buttons/map2.png"
          alt=""
          className="size-5 shrink-0"
        />
        {region ? 'Region ist kartographiert' : 'System ist kartographiert'}
      </div>
    );
  return <span className="text-swu-muted">Kartographiestatus unbekannt</span>;
}

function CartographyDialog({
  mode,
  region = false,
  onClose,
  onConfirm,
}: {
  mode: 'PLAN' | 'FINALIZE';
  region?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const title =
    mode === 'PLAN'
      ? region
        ? 'Region kartographieren'
        : 'Kartographie planen'
      : 'Kartographie finalisieren';
  return (
    <Dialog title={title} label={title} onClose={onClose}>
      <p>
        {mode === 'PLAN'
          ? region
            ? 'Kartographie für diese Region planen?'
            : 'Kartographie für dieses System planen?'
          : 'Kartographie jetzt für 15 EPS finalisieren?'}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose}>
          Abbrechen
        </button>
        <button type="button" onClick={onConfirm} className="text-swu-primary">
          Bestätigen
        </button>
      </div>
    </Dialog>
  );
}

function SectorScanDialog({
  scan,
  runtimeSystems,
  analysis,
  analysisError,
  analysisPendingId,
  selectedSignatureId,
  onAnalyze,
  onClose,
  buoyBusy,
  onPickUpBuoy,
  onAnalyseBuoy,
}: {
  scan: { result: SectorScanResult; energyCost: number };
  runtimeSystems?: SpacecraftRuntimeSystemsDto;
  analysis: SubspaceAnalysisResult | null;
  analysisError: string | null;
  analysisPendingId: number | null;
  selectedSignatureId: number | null;
  onAnalyze: (signatureId: number) => void;
  onClose: () => void;
  buoyBusy: boolean;
  onPickUpBuoy: (buoyId: number) => void;
  onAnalyseBuoy: (buoy: SpacecraftBuoyDto) => void;
}) {
  const field = scan.result.field;
  const object = field.celestialObject;
  const signatures = scan.result.signatures ?? [];
  const fadedSignatures = scan.result.fadedSignatures ?? {
    uncloaked: 0,
    cloaked: 0,
  };
  const scannerState = runtimeSystems?.SUBSPACE_SCANNER;
  const matrixState = runtimeSystems?.MATRIX_SCANNER;
  const canAnalyze = canAnalyzeSubspace(runtimeSystems);
  const analysisBlockedReason = !scannerState || scannerState.integrity <= 0
    ? 'Hyperraumfeldscanner nicht verfügbar oder beschädigt'
    : scannerState.active !== true
      ? 'Hyperraumfeldscanner ist ausgeschaltet'
      : !matrixState || matrixState.integrity <= 0
        ? 'Intakte Matrixsensoren werden benötigt'
        : null;
  return (
    <Dialog title="Sektor-Scan" label="Sektor-Scan" onClose={onClose}>
      {scan.result.discovery?.discovered && (
        <p className="mb-2 border border-emerald-400/50 bg-emerald-400/10 p-2 text-emerald-200">
          Neuer Datenbankeintrag: {scan.result.discovery.name} (+
          {scan.result.discovery.prestigeAwarded} Prestige)
        </p>
      )}
      <div className="grid grid-cols-[64px_1fr] gap-3">
        {object?.classId != null ? (
          <PlanetImg
            classId={object.classId}
            name={object.name}
            objectType={object.objectType}
            shielded={object.shielded}
            thumbnail
            className="h-14 w-14 object-contain"
            emojiClassName="text-4xl"
          />
        ) : (
          <img
            src={starTileImage(field.fieldType.id)}
            alt=""
            className="h-14 w-14 object-contain"
          />
        )}
        <div>
          <h4 className="border-b border-swu-border pb-1 font-bold text-swu-primary">
            {object?.name ?? field.fieldType.name}
          </h4>
          <div className="mt-2 grid grid-cols-2 gap-y-1">
            <span className="text-swu-muted">Energiekosten</span>
            <span>{field.movementEnergyCost}</span>
            <span className="text-swu-muted">Schaden</span>
            <span className="inline-flex items-center gap-1">
              {field.specialDamage} ({field.damage})
              <img
                src="/assets/buttons/info2.png"
                alt="Direkter Einflugschaden bei Deflektorausfall"
                title="Direkter Einflugschaden (Schaden bei Deflektorausfall)"
                className="size-4"
              />
            </span>
          </div>
          {field.effects.length > 0 && (
            <div className="mt-2 border-t border-swu-border pt-2 text-swu-muted">
              Effekte: {field.effects.join(', ')}
            </div>
          )}
        </div>
      </div>
      {signatures.length > 0 && (
        <table className="mt-3 w-full border-collapse text-left text-sm">
          <caption className="border border-swu-border bg-black/30 px-2 py-1 text-left font-bold text-swu-primary">
            Signaturen
          </caption>
          <thead>
            <tr className="border border-swu-border text-swu-muted">
              <th className="px-2 py-1">Klasse</th>
              <th className="px-2 py-1">Name</th>
              <th className="px-2 py-1">Richtung</th>
              <th className="px-2 py-1">Alter</th>
              <th className="px-2 py-1">Analyse</th>
            </tr>
          </thead>
          <tbody>
            {signatures.map((signature) => (
              <tr
                key={signature.id}
                className="border border-swu-border"
              >
                <td className="px-2 py-1">{signature.shipClassName ?? '?'}</td>
                <td className="px-2 py-1">{signature.spacecraftName ?? '?'}</td>
                <td className="px-2 py-1">
                  {formatSignatureDirection(signature)}
                </td>
                <td className="px-2 py-1">
                  {formatSignatureAge(signature.createdAt)}
                </td>
                <td className="px-2 py-1">
                  <button
                    type="button"
                    disabled={
                      !canAnalyze ||
                      analysisPendingId !== null ||
                      analysis?.signatureId === signature.id
                    }
                    title={analysisBlockedReason ?? undefined}
                    onClick={() => onAnalyze(signature.id)}
                    className="text-swu-primary hover:text-swu-accent disabled:opacity-40"
                  >
                    {analysisPendingId === signature.id
                      ? 'Analysiere …'
                      : analysis?.signatureId === signature.id
                        ? 'Analysiert'
                        : 'Analysieren · 100 EPS'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-3 border border-swu-border bg-black/20 p-2 text-sm" aria-live="polite">
        <div className="font-bold text-swu-primary">Subraumanalyse</div>
        {selectedSignatureId === null ? (
          <p className="text-swu-muted">Keine Signatur ausgewählt.</p>
        ) : analysisPendingId === selectedSignatureId ? (
          <p>Signatur {selectedSignatureId} wird analysiert (100 EPS) …</p>
        ) : analysis?.signatureId === selectedSignatureId ? (
          <p>
            Signatur {analysis.signatureId} analysiert: {analysis.spacecraftName ?? '?'} · {analysis.energy} EPS verbleibend.
          </p>
        ) : analysisError ? (
          <p role="alert" className="text-red-300">{analysisError}</p>
        ) : (
          <p className="text-swu-muted">Signatur {selectedSignatureId} ausgewählt.</p>
        )}
        {!canAnalyze && <p className="mt-1 text-swu-muted">{analysisBlockedReason}</p>}
      </div>
      {(fadedSignatures.uncloaked > 0 || fadedSignatures.cloaked > 0) && (
        <div className="mt-3 border border-swu-border bg-black/20 p-2 text-sm">
          <div className="font-bold text-swu-primary">
            Verblasste Signaturen
          </div>
          <div>Ungetarnt: {fadedSignatures.uncloaked}</div>
          <div>Getarnt: {fadedSignatures.cloaked}</div>
        </div>
      )}
      {(scan.result.buoys?.length ?? 0) > 0 && (
        <div className="mt-3">
          <BuoyTable
            buoys={scan.result.buoys ?? []}
            busy={buoyBusy}
            onPickUp={onPickUpBuoy}
            onAnalyse={onAnalyseBuoy}
          />
        </div>
      )}
    </Dialog>
  );
}

function BuoyTable({
  buoys,
  busy,
  onPickUp,
  onAnalyse,
}: {
  buoys: SpacecraftBuoyDto[];
  busy: boolean;
  onPickUp: (buoyId: number) => void;
  onAnalyse: (buoy: SpacecraftBuoyDto) => void;
}) {
  return (
    <table className="w-full border-collapse border border-swu-border bg-swu-surface text-left">
      <caption className="border border-swu-border bg-black/30 px-2 py-1 text-left font-bold text-swu-primary">
        Bojen
      </caption>
      <thead>
        <tr className="border border-swu-border text-swu-muted">
          <th className="px-2 py-1">Eigner</th>
          <th className="px-2 py-1">Botschaft</th>
          <th className="px-2 py-1">Datum</th>
          <th className="px-2 py-1" />
        </tr>
      </thead>
      <tbody>
        {buoys.map((buoy) => (
          <tr key={buoy.id} className="border border-swu-border">
            <td className="px-2 py-1">{buoy.ownerName}</td>
            <td className="px-2 py-1 break-words">{buoy.text}</td>
            <td className="px-2 py-1 whitespace-nowrap">
              {new Date(buoy.createdAt).toLocaleString('de-DE')}
            </td>
            <td className="px-2 py-1 whitespace-nowrap">
              <button
                type="button"
                disabled={busy}
                onClick={() => onPickUp(buoy.id)}
                className="text-swu-primary hover:text-swu-accent disabled:opacity-40"
              >
                Boje aufbringen · 1 EPS
              </button>{' '}
              <button
                type="button"
                onClick={() => onAnalyse(buoy)}
                className="text-swu-primary hover:text-swu-accent"
              >
                Analysieren
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function canAnalyzeSubspace(
  systems?: SpacecraftRuntimeSystemsDto,
): boolean {
  const scanner = systems?.SUBSPACE_SCANNER;
  const matrix = systems?.MATRIX_SCANNER;
  return scanner?.active === true && scanner.integrity > 0 && !!matrix && matrix.integrity > 0;
}

function formatSignatureDirection(
  signature: SectorScanResult['signatures'][number],
): string {
  const labels = {
    NORTH: 'Nord',
    EAST: 'Ost',
    SOUTH: 'Süd',
    WEST: 'West',
  } as const;
  if (signature.toDirection) return `nach ${labels[signature.toDirection]}`;
  if (signature.fromDirection) return `aus ${labels[signature.fromDirection]}`;
  return '?';
}

function formatSignatureAge(createdAt: string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000),
  );
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h`;
}

function Dialog({
  title,
  label,
  onClose,
  children,
}: {
  title: string;
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
    >
      <section className="w-full max-w-md border border-swu-border bg-swu-bg p-3 text-xs">
        <header className="mb-2 flex justify-between border-b border-swu-border pb-2">
          <h3 className="font-bold text-swu-primary">{title}</h3>
          <button type="button" onClick={onClose}>
            Schließen
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
