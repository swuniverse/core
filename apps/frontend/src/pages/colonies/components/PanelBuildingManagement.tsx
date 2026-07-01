import { useMemo, useState } from 'react';
import type {
  BuildingMassActionMode,
  BuildingMassActionResult,
  ColonyDetailV2,
} from '../types';

const MODE_LABELS: Array<{ value: BuildingMassActionMode; label: string }> = [
  { value: 1, label: 'Energieverbraucher' },
  { value: 2, label: 'Auswahl' },
  { value: 3, label: 'Energieproduzenten' },
  { value: 4, label: 'Industrie' },
  { value: 5, label: 'Wohngebäude' },
  { value: 6, label: 'Warenverbraucher' },
  { value: 7, label: 'Warenproduzenten' },
];

export function PanelBuildingManagement({
  management,
  onActivate,
  onDeactivate,
}: {
  management: NonNullable<ColonyDetailV2['buildingManagement']>;
  onActivate: (
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number },
  ) => Promise<BuildingMassActionResult>;
  onDeactivate: (
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number },
  ) => Promise<BuildingMassActionResult>;
}) {
  const [mode, setMode] = useState<BuildingMassActionMode>(2);
  const [commodityId, setCommodityId] = useState<number | undefined>();
  const [selection, setSelection] = useState<number[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<BuildingMassActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selection), [selection]);

  const run = async (
    action: 'activate' | 'deactivate',
    fn: typeof onActivate,
  ) => {
    setBusy(action);
    setError(null);
    try {
      const options = {
        fieldIndexes: mode === 2 ? selection : undefined,
        commodityId: mode === 6 || mode === 7 ? commodityId : undefined,
      };
      setResult(await fn(mode, options));
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Gebäudemanagement fehlgeschlagen',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          Aktiv:{' '}
          <span className="text-green-400 font-mono">
            {management.counts.active}
          </span>
        </div>
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          Inaktiv:{' '}
          <span className="text-yellow-400 font-mono">
            {management.counts.inactive}
          </span>
        </div>
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          Beschädigt:{' '}
          <span className="text-orange-400 font-mono">
            {management.counts.damaged}
          </span>
        </div>
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          Im Bau:{' '}
          <span className="text-swu-muted font-mono">
            {management.counts.building}
          </span>
        </div>
      </div>

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
        {management.fields.some((field) => field.functions?.length) && (
          <div>
            <div className="text-[10px] text-swu-muted uppercase font-bold mb-1">
              Aktive Gebäudefunktionen
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from(
                new Map(
                  management.fields
                    .flatMap((field) => field.functions ?? [])
                    .map((fn) => [fn.id, fn]),
                ).values(),
              ).map((fn) => (
                <span
                  key={fn.id}
                  className="px-1.5 py-0.5 rounded border border-swu-border/60 bg-swu-bg/50 text-[10px] text-swu-primary"
                  title={fn.key}
                >
                  {fn.name}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={mode}
            onChange={(e) =>
              setMode(Number(e.target.value) as BuildingMassActionMode)
            }
            className="px-2 py-1 bg-swu-bg border border-swu-border rounded text-swu-primary"
          >
            {MODE_LABELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {(mode === 6 || mode === 7) && (
            <select
              value={commodityId ?? ''}
              onChange={(e) =>
                setCommodityId(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              className="px-2 py-1 bg-swu-bg border border-swu-border rounded text-swu-primary"
            >
              <option value="">Ware wählen</option>
              {management.usableCommodities.map((commodity) => (
                <option key={commodity.id} value={commodity.id}>
                  {commodity.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => run('activate', onActivate)}
            disabled={busy === 'activate'}
            className="px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent rounded disabled:opacity-40"
          >
            Aktivieren
          </button>
          <button
            onClick={() => run('deactivate', onDeactivate)}
            disabled={busy === 'deactivate'}
            className="px-3 py-1 bg-red-900/20 border border-red-500/50 text-red-300 rounded disabled:opacity-40"
          >
            Deaktivieren
          </button>
        </div>
        {error && <div className="text-red-400">{error}</div>}
        {result && (
          <div className="rounded border border-swu-border/60 bg-swu-bg/40 p-2 space-y-1">
            <div className="text-swu-primary font-bold">
              Geändert: {result.changed.length}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-[10px] text-swu-muted">
              <span>EPS Δ {result.summaryAfter.energyDelta}</span>
              <span>
                Energie {result.summaryAfter.energyCurrent ?? '?'} /
                {result.summaryAfter.energyMax ?? '?'}
              </span>
              <span>Freie Arbeiter {result.summaryAfter.freeWorkers}</span>
              <span>
                Lager frei {result.summaryAfter.storageFree ?? '?'} /
                {result.summaryAfter.maxStorage}
              </span>
            </div>
            {result.skipped.length > 0 && (
              <div className="mt-1 text-swu-muted">
                Übersprungen:{' '}
                {result.skipped
                  .map(
                    (entry) =>
                      `Feld ${entry.fieldIndex}: ${entry.reason}${entry.reasonCode ? ` (${entry.reasonCode})` : ''}`,
                  )
                  .join(' · ')}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-swu-surface border border-swu-border rounded text-xs">
        {[...management.fields]
          .sort((a, b) => a.buildingName.localeCompare(b.buildingName))
          .map((field) => {
          const damaged =
            field.maxIntegrity > 0 && field.integrity < field.maxIntegrity;
          return (
            <label
              key={field.fieldIndex}
              className="flex items-center gap-2 px-3 py-1.5 odd:bg-swu-bg/30"
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
              <span className="w-48 truncate text-swu-primary" title={field.buildingName}>
                {field.buildingName}
              </span>
              <span
                className={`font-mono ${field.isActive ? 'text-green-400' : 'text-yellow-400'}`}
              >
                {field.isActive ? 'aktiv' : 'inaktiv'}
              </span>
              {field.functions && field.functions.length > 0 && (
                <span className="hidden md:flex gap-1 max-w-[220px] overflow-hidden">
                  {field.functions.map((fn) => (
                    <span
                      key={fn.id}
                      className="px-1 rounded border border-swu-border/50 text-[9px] text-swu-primary truncate"
                      title={fn.key}
                    >
                      {fn.name}
                    </span>
                  ))}
                </span>
              )}
              <span className={`font-mono ${damaged ? 'text-orange-400' : 'text-swu-muted'}`}>
                {field.integrity}/{field.maxIntegrity}
              </span>
              <span
                className={`font-mono ${field.epsProc >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                EPS {field.epsProc}
              </span>
              <span className="font-mono text-swu-muted">Arb {field.bevUse}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
