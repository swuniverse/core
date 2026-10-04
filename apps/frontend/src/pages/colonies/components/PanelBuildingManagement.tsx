import { useState } from 'react';
import type {
  BuildingMassActionMode,
  BuildingMassActionResult,
  ColonyDetailV2,
} from '../types';

export function PanelBuildingManagement({
  management,
  onActivate,
  onDeactivate,
}: {
  management: NonNullable<ColonyDetailV2['buildingManagement']>;
  onActivate: (
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[] },
  ) => Promise<BuildingMassActionResult>;
  onDeactivate: (
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[] },
  ) => Promise<BuildingMassActionResult>;
}) {
  const [selection, setSelection] = useState<number[]>([]);
  const [busy, setBusy] = useState<'activate' | 'deactivate' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedSet = new Set(selection);

  const run = async (
    action: 'activate' | 'deactivate',
    fn: typeof onActivate,
  ) => {
    if (selection.length === 0) return;

    setBusy(action);
    setError(null);
    try {
      await fn(2, { fieldIndexes: selection });
      setSelection([]);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Gebäudemanagement fehlgeschlagen',
      );
    } finally {
      setBusy(null);
    }
  };

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
        <div className="border border-swu-border bg-swu-surface px-2 py-1.5">
          Beschädigt:{' '}
          <span className="font-mono text-red-400">
            {management.counts.damaged}
          </span>
        </div>
        <div className="border border-swu-border bg-swu-surface px-2 py-1.5">
          Im Bau:{' '}
          <span className="font-mono text-swu-accent">
            {management.counts.building}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded border border-swu-border bg-swu-surface px-3 py-2 text-xs">
        <span className="text-swu-muted">{selection.length} ausgewählt</span>
        <button
          onClick={() => void run('activate', onActivate)}
          disabled={selection.length === 0 || busy !== null}
          className="rounded border border-swu-accent bg-swu-accent/20 px-3 py-1 text-swu-accent disabled:opacity-40"
        >
          Aktivieren
        </button>
        <button
          onClick={() => void run('deactivate', onDeactivate)}
          disabled={selection.length === 0 || busy !== null}
          className="rounded border border-red-500/50 bg-red-900/20 px-3 py-1 text-red-300 disabled:opacity-40"
        >
          Deaktivieren
        </button>
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
