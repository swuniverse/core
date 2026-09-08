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
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-swu-border bg-swu-surface px-3 py-2">
          Aktiv:{' '}
          <span className="font-mono text-green-400">
            {management.counts.active}
          </span>
        </div>
        <div className="rounded border border-swu-border bg-swu-surface px-3 py-2">
          Inaktiv:{' '}
          <span className="font-mono text-yellow-400">
            {management.counts.inactive}
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

      <div className="rounded border border-swu-border bg-swu-surface text-xs">
        {fields.map((field) => (
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
            <span
              className="min-w-0 flex-1 truncate text-swu-primary"
              title={field.buildingName}
            >
              {field.buildingName}
            </span>
            <span
              className={`font-mono ${field.isActive ? 'text-green-400' : 'text-yellow-400'}`}
            >
              {field.isActive ? 'aktiv' : 'inaktiv'}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
