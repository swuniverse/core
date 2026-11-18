import { useEffect, useRef, useState } from 'react';
import { Tooltip } from '../../../components/Tooltip';
import {
  BuildingMassActionMode,
  type BuildingMassActionResult,
  type BuildingRepairPreview,
  type BuildingRepairResult,
  type ColonyDetailV2,
  type CommodityDef,
} from '../types';
import {
  hasRepairCostShortage,
  repairErrorMessage,
  RepairCostList,
} from './RepairCostList';

export function PanelBuildingManagement({
  management,
  colonyId,
  commodityMap,
  energyAvailable,
  storageAmounts,
  onActivate,
  onDeactivate,
  onFetchRepairPreview,
  onRepairDamaged,
}: {
  management: NonNullable<ColonyDetailV2['buildingManagement']>;
  colonyId: number;
  commodityMap: Record<number, CommodityDef>;
  energyAvailable: number;
  storageAmounts: Record<number, number>;
  onActivate: (
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number },
  ) => Promise<BuildingMassActionResult>;
  onDeactivate: (
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number },
  ) => Promise<BuildingMassActionResult>;
  onFetchRepairPreview?: () => Promise<BuildingRepairPreview>;
  onRepairDamaged?: () => Promise<BuildingRepairResult>;
}) {
  const [selection, setSelection] = useState<number[]>([]);
  const [busy, setBusy] = useState<'activate' | 'deactivate' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildingMassActionResult | null>(null);
  const [commodityId, setCommodityId] = useState(
    management.usableCommodities[0]?.id ?? 0,
  );
  const [repairPreview, setRepairPreview] = useState<{
    colonyId: number;
    snapshotKey: string;
    preview: BuildingRepairPreview;
  } | null>(null);
  const [repairPreviewBusy, setRepairPreviewBusy] = useState(false);
  const [repairPreviewError, setRepairPreviewError] = useState<string | null>(
    null,
  );
  const [repairBusy, setRepairBusy] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);
  const [repairResult, setRepairResult] = useState<{
    colonyId: number;
    result: BuildingRepairResult;
  } | null>(null);
  const repairPreviewSequenceRef = useRef(0);
  const repairPendingRef = useRef(false);
  const colonyIdRef = useRef(colonyId);
  colonyIdRef.current = colonyId;
  const selectedSet = new Set(selection);
  const repairSnapshotKey = JSON.stringify([
    colonyId,
    energyAvailable,
    Object.entries(storageAmounts).sort(
      ([a], [b]) => Number(a) - Number(b),
    ),
    management.fields.map((field) => [
      field.fieldIndex,
      field.buildingId,
      field.isBuilding,
      field.integrity,
      field.maxIntegrity,
    ]),
  ]);

  useEffect(() => {
    repairPreviewSequenceRef.current += 1;
    setRepairPreview(null);
    setRepairPreviewBusy(false);
    setRepairPreviewError(null);
    return () => {
      repairPreviewSequenceRef.current += 1;
    };
  }, [repairSnapshotKey]);

  useEffect(() => {
    setRepairResult(null);
    setRepairError(null);
  }, [colonyId]);

  const loadRepairPreview = async () => {
    const sequence = ++repairPreviewSequenceRef.current;
    const snapshotKey = repairSnapshotKey;
    setRepairPreview(null);
    setRepairPreviewError(null);
    setRepairResult(null);
    setRepairPreviewBusy(true);
    try {
      if (!onFetchRepairPreview) {
        throw new Error('Reparaturvorschau nicht verfügbar');
      }
      const preview = await onFetchRepairPreview();
      if (sequence === repairPreviewSequenceRef.current) {
        setRepairPreview({ colonyId, snapshotKey, preview });
      }
    } catch (e: unknown) {
      if (sequence === repairPreviewSequenceRef.current) {
        setRepairPreviewError(repairErrorMessage(e));
      }
    } finally {
      if (sequence === repairPreviewSequenceRef.current) {
        setRepairPreviewBusy(false);
      }
    }
  };

  const confirmRepairDamaged = async () => {
    if (repairPendingRef.current) return;
    const targetColonyId = colonyId;
    repairPendingRef.current = true;
    setRepairBusy(true);
    setRepairError(null);
    setRepairResult(null);
    try {
      if (!onRepairDamaged) {
        throw new Error('Reparatur nicht verfügbar');
      }
      const result = await onRepairDamaged();
      if (colonyIdRef.current === targetColonyId) {
        setRepairResult({ colonyId: targetColonyId, result });
      }
    } catch (e: unknown) {
      if (colonyIdRef.current === targetColonyId) {
        setRepairError(repairErrorMessage(e));
      }
    } finally {
      repairPendingRef.current = false;
      setRepairBusy(false);
    }
  };

  const run = async (
    action: 'activate' | 'deactivate',
    fn: typeof onActivate,
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number },
  ) => {
    if (mode === BuildingMassActionMode.SELECTION && selection.length === 0)
      return;

    setBusy(action);
    setError(null);
    setResult(null);
    try {
      setResult(await fn(mode, options));
      if (mode === BuildingMassActionMode.SELECTION) setSelection([]);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Gebäudemanagement fehlgeschlagen',
      );
    } finally {
      setBusy(null);
    }
  };

  const runGroup = (
    action: 'activate' | 'deactivate',
    mode: BuildingMassActionMode,
    commodity = false,
  ) =>
    run(action, action === 'activate' ? onActivate : onDeactivate, mode, {
      ...(commodity ? { commodityId } : {}),
    });

  const fields = [...management.fields].sort((a, b) =>
    a.buildingName.localeCompare(b.buildingName),
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4">
        <div className="border border-swu-border bg-swu-surface px-2 py-1.5">
          Aktiv:{' '}
          <span className="font-mono text-green-400">
            {management.counts.active}
          </span>
        </div>
        <div className="border border-swu-border bg-swu-surface px-2 py-1.5">
          Inaktiv:{' '}
          <span className="font-mono text-yellow-400">
            {management.counts.inactive}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 border border-swu-border bg-swu-surface px-2 py-1.5">
          <span>
            Beschädigt:{' '}
            <span className="font-mono text-red-400">
              {management.counts.damaged}
            </span>
          </span>
          <button
            type="button"
            disabled={management.counts.damaged === 0 || busy !== null || repairPreviewBusy || repairBusy}
            onClick={() => void loadRepairPreview()}
            className="border border-red-500/50 bg-red-900/20 px-1.5 py-1 text-[10px] font-bold text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {repairPreviewBusy ? 'Vorschau …' : 'Alle reparieren'}
          </button>
        </div>
        <div className="border border-swu-border bg-swu-surface px-2 py-1.5">
          Im Bau:{' '}
          <span className="font-mono text-swu-accent">
            {management.counts.building}
          </span>
        </div>
      </div>

      {repairPreviewError && (
        <div role="alert" className="border border-red-500/40 bg-red-950/20 p-2 text-xs text-red-300">
          Reparaturvorschau fehlgeschlagen: {repairPreviewError}
          <button
            type="button"
            onClick={() => void loadRepairPreview()}
            disabled={repairPreviewBusy || repairBusy}
            className="ml-2 underline disabled:opacity-40"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {repairPreview?.colonyId === colonyId &&
        repairPreview.snapshotKey === repairSnapshotKey && (() => {
        const damagedPlans = repairPreview.preview.fields.filter(
          (plan) =>
            plan.buildingId != null &&
            plan.reason !== 'Gebäude im Bau' &&
            plan.maxIntegrity > 0 &&
            plan.integrity < plan.maxIntegrity,
        );
        const repairableCount = damagedPlans.filter(
          (plan) => plan.repairable,
        ).length;
        const skippedPlans = [
          ...damagedPlans.filter((plan) => !plan.repairable),
          ...repairPreview.preview.fields.filter(
            (plan) => plan.reason === 'Gebäude im Bau',
          ),
        ];
        const aggregateShortage = hasRepairCostShortage({
          energyCost: repairPreview.preview.totalEnergyCost,
          costs: repairPreview.preview.totalCosts,
          energyAvailable,
          storageAmounts,
        });
        return (
          <div className="space-y-2 border border-swu-accent/40 bg-swu-surface p-2 text-xs">
            <div className="font-bold text-swu-primary">Reparaturvorschau</div>
            <p className="text-swu-muted">
              {damagedPlans.length} beschädigte Gebäude gefunden, davon {repairableCount} einzeln reparierbar.
            </p>
            <RepairCostList
              energyCost={repairPreview.preview.totalEnergyCost}
              costs={repairPreview.preview.totalCosts}
              energyAvailable={energyAvailable}
              storageAmounts={storageAmounts}
              commodityMap={commodityMap}
            />
            <p className="text-swu-muted">
              Die Vorschau summiert einzeln reparierbare Gebäude. Reparaturen laufen nacheinander; spätere Gebäude können übersprungen werden.
            </p>
            {aggregateShortage && (
              <p className="text-red-300">
                Die Gesamtkosten übersteigen den aktuellen Vorrat. Verfügbar und benötigt stehen oben.
              </p>
            )}
            {skippedPlans.length > 0 && (
              <div>
                <div className="mb-1 font-bold text-red-300">
                  Nicht reparierbar
                </div>
                <ul className="space-y-0.5 text-red-300">
                  {skippedPlans.map((plan) => (
                    <li key={plan.fieldIndex}>
                      Feld {plan.fieldIndex} · {plan.buildingName}: {plan.reason ?? 'Nicht reparierbar'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {repairError && (
              <p role="alert" className="text-red-400">
                {repairError}
              </p>
            )}
            <button
              type="button"
              disabled={repairableCount === 0 || repairBusy || repairPreviewBusy || busy !== null}
              onClick={() => void confirmRepairDamaged()}
              className="border border-green-500/50 bg-green-900/20 px-2 py-1.5 font-bold text-green-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {repairBusy ? 'Reparaturen laufen …' : 'Reparaturen jetzt durchführen'}
            </button>
          </div>
        );
      })()}

      {repairResult?.colonyId === colonyId && (
        <div role="status" className="space-y-1 border border-swu-border bg-swu-surface p-2 text-xs">
          <div className="font-bold text-green-300">
            {repairResult.result.repaired.length} Gebäude repariert
          </div>
          {repairResult.result.repaired.map((item) => (
            <div key={item.fieldIndex} className="text-green-300">
              Feld {item.fieldIndex} · {item.buildingName}
            </div>
          ))}
          {repairResult.result.skipped.map((item) => (
            <div key={item.fieldIndex} className="text-red-300">
              Feld {item.fieldIndex}: {repairErrorMessage(new Error(item.reason))}
            </div>
          ))}
        </div>
      )}

      <div className="border border-swu-border bg-swu-surface p-2 text-xs">
        <div className="mb-1 text-swu-muted">Gebäudegruppen</div>
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
          <GroupActions
            label="Energieverbraucher"
            icon="−"
            disabled={busy !== null}
            onActivate={() =>
              void runGroup('activate', BuildingMassActionMode.EPS_CONSUMERS)
            }
            onDeactivate={() =>
              void runGroup('deactivate', BuildingMassActionMode.EPS_CONSUMERS)
            }
          />
          <GroupActions
            label="Energieerzeuger"
            icon="+"
            disabled={busy !== null}
            onActivate={() =>
              void runGroup('activate', BuildingMassActionMode.EPS_PRODUCERS)
            }
            onDeactivate={() =>
              void runGroup('deactivate', BuildingMassActionMode.EPS_PRODUCERS)
            }
          />
          <GroupActions
            label="Arbeitgeber"
            icon="A"
            disabled={busy !== null}
            onActivate={() =>
              void runGroup('activate', BuildingMassActionMode.INDUSTRY)
            }
            onDeactivate={() =>
              void runGroup('deactivate', BuildingMassActionMode.INDUSTRY)
            }
          />
          <GroupActions
            label="Wohngebäude"
            icon="W"
            disabled={busy !== null}
            onActivate={() =>
              void runGroup('activate', BuildingMassActionMode.RESIDENTIALS)
            }
            onDeactivate={() =>
              void runGroup('deactivate', BuildingMassActionMode.RESIDENTIALS)
            }
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-swu-border/40 pt-2">
          <label htmlFor="building-group-commodity" className="text-swu-muted">
            Ware
          </label>
          <select
            id="building-group-commodity"
            value={commodityId}
            onChange={(event) => setCommodityId(Number(event.target.value))}
            className="border border-swu-border bg-swu-bg px-1.5 py-1 text-swu-text"
          >
            {management.usableCommodities.map((commodity) => (
              <option key={commodity.id} value={commodity.id}>
                {commodity.name}
              </option>
            ))}
          </select>
          <GroupActions
            label="Warenverbraucher"
            icon="↓"
            disabled={busy !== null || commodityId === 0}
            onActivate={() =>
              void runGroup(
                'activate',
                BuildingMassActionMode.COMMODITY_CONSUMERS,
                true,
              )
            }
            onDeactivate={() =>
              void runGroup(
                'deactivate',
                BuildingMassActionMode.COMMODITY_CONSUMERS,
                true,
              )
            }
          />
          <GroupActions
            label="Warenerzeuger"
            icon="↑"
            disabled={busy !== null || commodityId === 0}
            onActivate={() =>
              void runGroup(
                'activate',
                BuildingMassActionMode.COMMODITY_PRODUCERS,
                true,
              )
            }
            onDeactivate={() =>
              void runGroup(
                'deactivate',
                BuildingMassActionMode.COMMODITY_PRODUCERS,
                true,
              )
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border border-swu-border bg-swu-surface px-2 py-1.5 text-xs">
        <span className="text-swu-muted">{selection.length} ausgewählt</span>
        <button
          onClick={() =>
            void run(
              'activate',
              onActivate,
              BuildingMassActionMode.SELECTION,
              { fieldIndexes: selection },
            )
          }
          disabled={selection.length === 0 || busy !== null}
          className="border border-swu-accent bg-swu-accent/20 px-2 py-1 text-swu-accent disabled:opacity-40"
        >
          Aktivieren
        </button>
        <button
          onClick={() =>
            void run(
              'deactivate',
              onDeactivate,
              BuildingMassActionMode.SELECTION,
              { fieldIndexes: selection },
            )
          }
          disabled={selection.length === 0 || busy !== null}
          className="border border-red-500/50 bg-red-900/20 px-2 py-1 text-red-300 disabled:opacity-40"
        >
          Deaktivieren
        </button>
        {result && (
          <span role="status" className="text-swu-muted">
            {result.changed.length} Gebäude geschaltet
            {result.skipped.length > 0 &&
              `, ${result.skipped.length} fehlgeschlagen`}
          </span>
        )}
        {error && <span className="text-red-400">{error}</span>}
      </div>

      <div className="border border-swu-border bg-swu-surface text-xs">
        {fields.map((field) => (
          <label
            key={field.fieldIndex}
            className="flex items-center gap-2 border-b border-swu-border/30 px-2 py-1.5 last:border-b-0"
          >
            <input
              type="checkbox"
              checked={selectedSet.has(field.fieldIndex)}
              onChange={() =>
                setSelection((current) =>
                  selectedSet.has(field.fieldIndex)
                    ? current.filter(
                        (fieldIndex) => fieldIndex !== field.fieldIndex,
                      )
                    : [...current, field.fieldIndex],
                )
              }
            />
            <span className="w-14 shrink-0 font-mono text-[10px] text-swu-muted">
              Feld {field.fieldIndex}
            </span>
            <span
              className="min-w-0 flex-1 truncate text-swu-primary"
              title={field.buildingName}
            >
              {field.buildingName}
            </span>
            <span
              className={`font-mono ${
                field.isBuilding
                  ? 'text-swu-accent'
                  : field.integrity < field.maxIntegrity
                    ? 'text-red-400'
                    : field.isActive
                      ? 'text-green-400'
                      : 'text-yellow-400'
              }`}
            >
              {field.isBuilding
                ? 'im Bau'
                : field.integrity < field.maxIntegrity
                  ? 'beschädigt'
                  : field.isActive
                    ? 'aktiv'
                    : 'inaktiv'}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function GroupActions({
  label,
  icon,
  disabled,
  onActivate,
  onDeactivate,
}: {
  label: string;
  icon: string;
  disabled: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-1 border border-swu-border/50 px-1.5 py-1"
    >
      <span className="mr-auto flex min-w-0 items-center gap-1 truncate text-swu-primary">
        <span aria-hidden="true" className="font-mono text-swu-muted">
          {icon}
        </span>
        {label}
      </span>
      <Tooltip content={`${label} aktivieren`}>
        <button
          type="button"
          aria-label="Aktivieren"
          disabled={disabled}
          onClick={onActivate}
          className="border border-swu-accent/60 px-1.5 text-swu-accent disabled:opacity-40"
        >
          +
        </button>
      </Tooltip>
      <Tooltip content={`${label} deaktivieren`}>
        <button
          type="button"
          aria-label="Deaktivieren"
          disabled={disabled}
          onClick={onDeactivate}
          className="border border-red-500/50 px-1.5 text-red-300 disabled:opacity-40"
        >
          −
        </button>
      </Tooltip>
    </div>
  );
}
